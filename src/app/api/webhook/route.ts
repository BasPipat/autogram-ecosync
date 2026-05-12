export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import {
  FlexMessage,
  Message,
  TextMessage,
  WebhookEvent,
  WebhookRequestBody,
  validateSignature,
} from '@line/bot-sdk';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getLineChannelSecret, getLineClient } from '@/lib/line';
import { DRIVER_DOCUMENT_LABELS, ONBOARDING_DOCUMENT_TYPES, getDocumentLabel, parseBankText } from '@/lib/line-driver-flow';
import { DriverDocument } from '@/models/DriverDocument';
import { DriverDocumentType, ILineDriver, LineDriver } from '@/models/LineDriver';
import { JobOffer, IJobOffer } from '@/models/JobOffer';
import { SharedTruck, ISharedTruck } from '@/models/SharedTruck';
import { Trip } from '@/models/Trip';
import { analyzeDriverDocuments } from '@/lib/gemini';
import { Setting } from '@/models/Setting';

const PAYMENT_NOTIFY_LINE_USER_ID = process.env.LINE_PAYMENT_NOTIFY_USER_ID || process.env.LINE_ADMIN_USER_ID || '';

function sourceUserId(event: WebhookEvent) {
  return event.source.type === 'user' ? event.source.userId : event.source.userId;
}

function isDriverDocumentType(value: string): value is DriverDocumentType {
  return Object.prototype.hasOwnProperty.call(DRIVER_DOCUMENT_LABELS, value);
}

function currency(amount: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount || 0);
}

async function getOrCreateDriver(lineUserId: string) {
  const existing = await LineDriver.findOne({ lineUserId });
  if (existing) return existing;

  let displayName = '';
  let pictureUrl = '';
  try {
    const profile = await getLineClient().getProfile(lineUserId);
    displayName = profile.displayName;
    pictureUrl = profile.pictureUrl;
  } catch {
    // Profile may be unavailable in some contexts
  }

  return LineDriver.create({
    lineUserId,
    displayName,
    pictureUrl,
    status: 'new',
    gpsConsentStatus: 'granted', // Default to granted since we no longer require manual confirmation
  });
}

async function onboardingProgress(lineUserId: string) {
  const documents = await DriverDocument.find({
    lineUserId,
    documentType: { $in: ONBOARDING_DOCUMENT_TYPES },
  }).select('documentType');
  const uploaded = new Set(documents.map(document => document.documentType));
  return {
    uploaded,
    missing: ONBOARDING_DOCUMENT_TYPES.filter(type => !uploaded.has(type)),
  };
}

async function markUnderReviewIfReady(driver: ILineDriver) {
  const progress = await onboardingProgress(driver.lineUserId);
  if (progress.missing.length === 0 && driver.status !== 'approved') {
    await LineDriver.findOneAndUpdate(
      { lineUserId: driver.lineUserId },
      { status: 'under_review', pendingDocumentType: undefined },
      { new: true }
    );
    return true;
  }
  return false;
}

function onboardingMenuMessage(): TextMessage {
  return {
    type: 'text',
    text: [
      'กรุณาส่งรูปเอกสารทั้งหมด (บัตรประชาชน, ใบขับขี่, ทะเบียนรถ, ประกัน, หน้าบัญชีธนาคาร) และเบอร์โทรศัพท์ เข้ามาได้เลยครับ',
      '',
      'เมื่อส่งครบแล้วให้กดปุ่ม "ตรวจสอบข้อมูล" ด้านล่างครับ',
    ].join('\n'),
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: 'ตรวจสอบข้อมูล',
            data: 'action=analyze_onboarding',
            displayText: 'ตรวจสอบข้อมูลที่ส่งมา',
          },
        },
      ],
    },
  };
}

function welcomeMessages(lineUserId: string): Message[] {
  const registerUrl = `https://autogram-ecosync.vercel.app/driver/register?lineUserId=${lineUserId}`;
  
  return [
    {
      type: 'text',
      text: [
        'สวัสดีครับ ยินดีต้อนรับสู่ระบบรถร่วม Autogram EcoSync 🚛✨',
        'เพื่อให้คุณพร้อมรับงานและดูราคาค่าเที่ยวผ่าน LINE OA ได้ รบกวนทำตามขั้นตอนง่ายๆ ดังนี้ครับ:',
        '1️⃣ กดปุ่ม "ลงทะเบียน" เพื่อสร้างโปรไฟล์และข้อมูลรถของคุณในระบบ',
        '2️⃣ เมื่อลงทะเบียนในเว็บเสร็จแล้ว ให้ส่งรูปถ่ายเอกสารเข้ามาในแชทนี้ให้ครบถ้วนครับ',
      ].join('\n'),
    },
    {
      type: 'flex',
      altText: 'ปุ่มลงทะเบียนและส่งเอกสาร',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'เริ่มต้นใช้งาน',
              weight: 'bold',
              size: 'xl',
              color: '#1e293b'
            },
            {
              type: 'text',
              text: 'กรุณากดปุ่มด้านล่างเพื่อลงทะเบียนและส่งเอกสารครับ',
              size: 'sm',
              color: '#64748b',
              margin: 'md',
              wrap: true
            },
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '📝 ลงทะเบียน / ส่งเอกสาร',
                uri: registerUrl
              },
              style: 'primary',
              color: '#2563eb',
              margin: 'xl',
              height: 'sm'
            }
          ]
        }
      }
    }
  ];
}

function welcomeBackMessages(driver: ILineDriver, lineUserId: string): Message[] {
  const missionUrl = `https://autogram-ecosync.vercel.app/driver/my-mission?lineUserId=${lineUserId}`;
  return [
    {
      type: 'text',
      text: [
        `สวัสดีครับพี่ ${driver.displayName || ''} ยินดีต้อนรับกลับครับ! 🚛✨`,
        '',
        'บัญชีรถร่วมของคุณยังคงมีสถานะ "อนุมัติ" และพร้อมรับงานได้ทันทีครับ',
        'คุณสามารถกดดูงานที่ปุ่ม "ดูงาน" ที่เมน้านล่างได้เลยครับ',
      ].join('\n'),
    },
    {
      type: 'flex',
      altText: 'เข้าสู่หน้างานของฉัน',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '🚚 ไปที่หน้างานของฉัน',
                uri: missionUrl
              },
              style: 'primary',
              color: '#059669',
              height: 'sm'
            }
          ]
        }
      }
    }
  ];
}

function documentReceivedMessage(label: string, missingLabels: string[], readyForReview: boolean): Message[] {
  if (readyForReview) {
    return [
      {
        type: 'text',
        text: `รับ${label}เรียบร้อยครับ\nเอกสารครบแล้ว สถานะถูกส่งให้ทีมงานตรวจสอบ`,
      },
    ];
  }

  return [
    {
      type: 'text',
      text: [
        `รับ${label}เรียบร้อยครับ`,
        missingLabels.length > 0 ? `ยังขาด: ${missingLabels.join(', ')}` : 'เอกสารครบแล้ว',
      ].join('\n'),
    },
    onboardingMenuMessage(),
  ];
}

function jobOfferBubble(offer: IJobOffer) {
  return {
    type: 'bubble' as const,
    header: {
      type: 'box' as const,
      layout: 'vertical' as const,
      backgroundColor: '#10B981',
      contents: [
        { type: 'text' as const, text: 'งานพร้อมรับ', color: '#ffffff', weight: 'bold' as const, size: 'md' as const },
        { type: 'text' as const, text: offer.tripCode, color: '#D1FAE5', size: 'xs' as const, margin: 'sm' as const },
      ],
    },
    body: {
      type: 'box' as const,
      layout: 'vertical' as const,
      spacing: 'md' as const,
      contents: [
        { type: 'text' as const, text: `${offer.origin} → ${offer.destination}`, wrap: true, weight: 'bold' as const, size: 'md' as const },
        { type: 'text' as const, text: `ราคาเสนอ: ${currency(offer.driverPrice)}`, color: '#059669', weight: 'bold' as const, size: 'sm' as const },
        { type: 'text' as const, text: 'ราคาแสดงหลังหัก 1%', color: '#94A3B8', size: 'xs' as const },
      ],
    },
    footer: {
      type: 'box' as const,
      layout: 'vertical' as const,
      contents: [
        {
          type: 'button' as const,
          style: 'primary' as const,
          color: '#10B981',
          action: {
            type: 'postback' as const,
            label: 'รับงานนี้',
            data: `action=accept_job&offerId=${offer._id.toString()}`,
            displayText: `รับงาน ${offer.tripCode}`,
          },
        },
      ],
    },
  };
}

function jobBoardFlex(offers: IJobOffer[]): FlexMessage {
  return {
    type: 'flex',
    altText: 'มีงานพร้อมรับ',
    contents: {
      type: 'carousel',
      contents: offers.slice(0, 10).map(jobOfferBubble),
    },
  };
}

function jobDetailMessage(offer: IJobOffer, truck: ISharedTruck): Message[] {
  return [
    {
      type: 'text',
      text: [
        'รับงานสำเร็จครับ',
        `รหัสงาน: ${offer.tripCode}`,
        `เส้นทาง: ${offer.origin} → ${offer.destination}`,
        `ราคา: ${currency(offer.driverPrice)}`,
        `ทะเบียนหัว: ${truck.headPlateNumber}`,
        `ทะเบียนหาง: ${truck.tailPlateNumber || '-'}`,
        '',
        offer.originMapUrl ? `📌 พิกัดต้นทาง: ${offer.originMapUrl}` : '',
        offer.destinationMapUrl ? `📌 พิกัดปลายทาง: ${offer.destinationMapUrl}` : '',
        '',
        'เมื่อเริ่มเดินทาง พิมพ์ "เริ่มงาน"',
        'เมื่อส่งของเสร็จ พิมพ์ "ส่งของเสร็จ"',
        'แล้วถ่ายรูปส่งงานครับ',
      ].filter(Boolean).join('\n'),
    },
  ];
}

async function showAvailableJobs(lineUserId: string, replyToken: string) {
  const driver = await getOrCreateDriver(lineUserId);
  if (driver.status !== 'approved') {
    await getLineClient().replyMessage(replyToken, [
      { type: 'text', text: 'บัญชีรถร่วมของพี่ยังไม่ผ่านการตรวจสอบเอกสารครับ' },
      onboardingMenuMessage(),
    ]);
    return;
  }

  const now = new Date();
  const offers = await JobOffer.find({
    status: 'open',
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }],
  }).sort({ sentAt: -1 }).limit(10);

  if (offers.length === 0) {
    await getLineClient().replyMessage(replyToken, { type: 'text', text: 'ตอนนี้ยังไม่มีงานพร้อมรับครับ ระบบจะแจ้งให้อีกครั้งเมื่อมีงานใหม่' });
    return;
  }

  await getLineClient().replyMessage(replyToken, jobBoardFlex(offers));
}

async function acceptJob(lineUserId: string, offerId: string, replyToken: string) {
  if (!mongoose.Types.ObjectId.isValid(offerId)) {
    await getLineClient().replyMessage(replyToken, { type: 'text', text: 'ไม่พบข้อมูลงานนี้ครับ' });
    return;
  }

  const driver = await getOrCreateDriver(lineUserId);
  if (driver.status !== 'approved') {
    await getLineClient().replyMessage(replyToken, { type: 'text', text: 'เอกสารยังไม่ผ่านการตรวจสอบ จึงยังรับงานไม่ได้ครับ' });
    return;
  }

  // Check if driver already has an active trip
  if (driver.activeTripId) {
    await getLineClient().replyMessage(replyToken, { 
      type: 'text', 
      text: 'พี่มีงานที่กำลังดำเนินการอยู่ครับ กรุณาปิดงานเดิมให้เรียบร้อยก่อนจึงจะรับงานใหม่ได้ครับ' 
    });
    return;
  }

  const truck = driver.sharedTruckId
    ? await SharedTruck.findById(driver.sharedTruckId)
    : await SharedTruck.findOne({ lineUserId });

  if (!truck) {
    await getLineClient().replyMessage(replyToken, { type: 'text', text: 'ยังไม่พบข้อมูลรถร่วมที่ผูกกับ LINE นี้ กรุณาให้ทีมงานตรวจสอบก่อนรับงานครับ' });
    return;
  }

  const now = new Date();
  const offer = await JobOffer.findOneAndUpdate(
    {
      _id: offerId,
      status: 'open',
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }],
    },
    {
      status: 'accepted',
      acceptedAt: now,
      acceptedByLineUserId: lineUserId,
      acceptedSharedTruckId: truck._id,
      acceptedDriverName: `${truck.driverFirstName} ${truck.driverLastName}`,
      acceptedHeadPlateNumber: truck.headPlateNumber,
      acceptedTailPlateNumber: truck.tailPlateNumber,
    },
    { new: true }
  );

  if (!offer) {
    await getLineClient().replyMessage(replyToken, { type: 'text', text: 'งานนี้ถูกคนอื่นรับไปแล้ว หรือหมดเวลารับงานแล้วครับ' });
    return;
  }

  await Trip.findByIdAndUpdate(offer.tripId, {
    sharedTruckId: truck._id,
    lineUserId,
    licensePlate: truck.headPlateNumber,
    tailLicensePlate: truck.tailPlateNumber,
    driverName: `${truck.driverFirstName} ${truck.driverLastName}`,
    acceptedFreightPrice: offer.driverPrice,
    lineAssignmentStatus: 'accepted',
    lineJobOfferId: offer._id,
    lineAcceptedAt: now,
  });

  await LineDriver.findOneAndUpdate({ lineUserId }, {
    activeTripId: offer.tripId,
    activeJobOfferId: offer._id,
    pendingDocumentType: undefined,
  });

  await getLineClient().replyMessage(replyToken, jobDetailMessage(offer, truck));
}

async function saveTextDocument(driver: ILineDriver, text: string, replyToken: string) {
  const documentType = driver.pendingDocumentType;
  if (documentType === 'phone_number') {
    await DriverDocument.create({
      lineUserId: driver.lineUserId,
      documentType,
      mediaType: 'text',
      textValue: text,
    });
    await LineDriver.findOneAndUpdate({ lineUserId: driver.lineUserId }, { phone: text, pendingDocumentType: undefined, status: 'awaiting_documents' });
  } else if (documentType === 'bank_account') {
    const bank = parseBankText(text);
    await DriverDocument.create({
      lineUserId: driver.lineUserId,
      documentType,
      mediaType: 'text',
      textValue: text,
    });
    await LineDriver.findOneAndUpdate({ lineUserId: driver.lineUserId }, {
      bankName: bank.bankName,
      bankAccountNumber: bank.bankAccountNumber,
      bankAccountName: bank.bankAccountName,
      pendingDocumentType: undefined,
      status: 'awaiting_documents',
    });
  } else {
    return false;
  }

  const refreshedDriver = await LineDriver.findOne({ lineUserId: driver.lineUserId });
  const ready = refreshedDriver ? await markUnderReviewIfReady(refreshedDriver) : false;
  const progress = await onboardingProgress(driver.lineUserId);
  await getLineClient().replyMessage(
    replyToken,
    documentReceivedMessage(getDocumentLabel(documentType), progress.missing.map(getDocumentLabel), ready)
  );
  return true;
}

async function handleTextMessage(lineUserId: string, text: string, replyToken: string) {
  const driver = await getOrCreateDriver(lineUserId);
  const normalized = text.trim();

  if (driver.status === 'approved') {
    if (normalized === 'ดูงาน' || normalized === 'งาน') {
      await showAvailableJobs(lineUserId, replyToken);
      return;
    }

    if (normalized === 'เริ่มงาน' && driver.activeTripId) {
      await Trip.findByIdAndUpdate(driver.activeTripId, {
        lineAssignmentStatus: 'in_progress',
        gpsSession: {
          source: 'line_oa',
          status: 'active',
          isTracking: true,
          startedAt: new Date(),
          lastPingAt: new Date(),
        },
      });
      await getLineClient().replyMessage(replyToken, { type: 'text', text: 'เริ่มงานเรียบร้อยครับ กรุณาส่งพิกัดเป็นระยะ และพิมพ์ "ส่งของเสร็จ" เมื่อส่งสินค้าแล้ว' });
      return;
    }

    if (normalized === 'ส่งของเสร็จ' && driver.activeTripId) {
      await LineDriver.findOneAndUpdate({ lineUserId }, { pendingDocumentType: 'pod_image' });
      await getLineClient().replyMessage(replyToken, {
        type: 'text',
        text: 'กรุณาถ่ายรูปหลักฐานส่งงานครับ',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'camera', label: 'ถ่ายรูปส่งงาน' } },
            { type: 'action', action: { type: 'cameraRoll', label: 'เลือกรูป' } },
          ],
        },
      });
      return;
    }

    if (normalized === 'สถานะ') {
      await getLineClient().replyMessage(replyToken, { type: 'text', text: 'บัญชีของคุณได้รับการอนุมัติและพร้อมรับงานแล้วครับ' });
      return;
    }

    // Default for approved drivers
    await getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: 'คุณได้รับการอนุมัติแล้วครับ! พิมพ์ "งาน" หรือ "ดูงาน" เพื่อดูงานที่เปิดรับครับ',
    });
    return;
  }

  if (driver.pendingDocumentType && ['phone_number', 'bank_account'].includes(driver.pendingDocumentType)) {
    const saved = await saveTextDocument(driver, normalized, replyToken);
    if (saved) return;
  }

  if (normalized === 'ดูงาน' || normalized === 'งาน') {
    await showAvailableJobs(lineUserId, replyToken);
    return;
  }

  if (normalized === 'ลงทะเบียน' || normalized === 'ส่งเอกสาร' || normalized === 'กดส่งเอกสาร') {
    await getLineClient().replyMessage(replyToken, welcomeMessages(lineUserId));
    return;
  }

  if (normalized === 'ดูโปรไฟล์' || normalized === 'โปรไฟล์') {
    const profileUrl = `https://autogram-ecosync.vercel.app/driver/profile?lineUserId=${lineUserId}`;
    await getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: 'กดลิงก์ด้านล่างเพื่อดูโปรไฟล์ของคุณครับ 👇',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'uri',
              label: 'ดูโปรไฟล์ของฉัน',
              uri: profileUrl
            }
          }
        ]
      }
    });
    return;
  }

  if (normalized === 'สถานะ') {
    const progress = await onboardingProgress(lineUserId);
    await getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: [
        `สถานะ: ${driver.status}`,
        progress.missing.length ? `เอกสารที่ส่งแล้ว: ${progress.uploaded.size} ชนิด` : 'เอกสารครบแล้ว',
      ].join('\n'),
    });
    return;
  }

  if (normalized === 'เริ่มงาน' && driver.activeTripId) {
    await Trip.findByIdAndUpdate(driver.activeTripId, {
      lineAssignmentStatus: 'in_progress',
      gpsSession: {
        source: 'line_oa',
        status: 'active',
        isTracking: true,
        startedAt: new Date(),
        lastPingAt: new Date(),
      },
    });
    await getLineClient().replyMessage(replyToken, { type: 'text', text: 'เริ่มงานเรียบร้อยครับ กรุณาส่งพิกัดเป็นระยะ และพิมพ์ "ส่งของเสร็จ" เมื่อส่งสินค้าแล้ว' });
    return;
  }

  if (normalized === 'ส่งของเสร็จ' && driver.activeTripId) {
    await LineDriver.findOneAndUpdate({ lineUserId }, { pendingDocumentType: 'pod_image' });
    await getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: 'กรุณาถ่ายรูปหลักฐานส่งงานครับ',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'camera', label: 'ถ่ายรูปส่งงาน' } },
          { type: 'action', action: { type: 'cameraRoll', label: 'เลือกรูป' } },
        ],
      },
    });
    return;
  }

  await getLineClient().replyMessage(replyToken, onboardingMenuMessage());
}

async function saveMediaDocument(
  lineUserId: string,
  lineMessageId: string,
  mediaType: 'image' | 'video' | 'file',
  replyToken: string,
  fileName?: string
) {
  const driver = await getOrCreateDriver(lineUserId);

  if (driver.status === 'approved' && !driver.activeTripId && !driver.pendingDocumentType) {
    await getLineClient().replyMessage(replyToken, { type: 'text', text: 'ได้รับไฟล์แล้วครับ แต่เนื่องจากคุณได้รับการอนุมัติแล้ว และไม่มีงานที่กำลังดำเนินการอยู่ ระบบจึงไม่ได้นำไปประมวลผลครับ' });
    return;
  }

  let documentType = driver.pendingDocumentType ||
    (driver.activeTripId && mediaType === 'image' ? 'pod_image' : undefined) ||
    (driver.activeTripId && mediaType === 'video' ? 'delivery_documents_video' : undefined) ||
    ((driver.status === 'new' || driver.status === 'awaiting_documents') ? 'onboarding_media' : undefined);

  // If driver sent an image but the pending type is for text (like phone/bank), 
  // let's treat it as a general onboarding_media so it doesn't get stuck as "Phone Number" in the UI
  if (mediaType === 'image' && (documentType === 'phone_number' || documentType === 'bank_account')) {
    documentType = 'onboarding_media';
  }

  if (!documentType) {
    await getLineClient().replyMessage(replyToken, [
      { type: 'text', text: 'ได้รับไฟล์แล้วครับ กรุณาส่งเอกสารทั้งหมดแล้วกด "ตรวจสอบข้อมูล"' },
      onboardingMenuMessage(),
    ]);
    return;
  }

  const lineClient = getLineClient();
  let content: Buffer | undefined;
  let mimeType: string | undefined;

  try {
    const stream = await lineClient.getMessageContent(lineMessageId);
    const chunks: any[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    content = Buffer.concat(chunks);
    
    // Attempt to guess mimeType if not provided
    if (mediaType === 'image') mimeType = 'image/jpeg';
    else if (mediaType === 'video') mimeType = 'video/mp4';
    else if (fileName?.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
  } catch (e) {
    console.error('Failed to download LINE content during webhook:', e);
  }

  await DriverDocument.create({
    lineUserId,
    documentType,
    mediaType,
    lineMessageId,
    fileName,
    mimeType,
    content,
    size: content?.length,
    tripId: driver.activeTripId,
    jobOfferId: driver.activeJobOfferId,
  });

  if (documentType === 'pod_image' && driver.activeTripId) {
    await Trip.findByIdAndUpdate(driver.activeTripId, {
      podImageUrl: `line-message:${lineMessageId}`,
      lineAssignmentStatus: 'delivered',
      deliveredAt: new Date(),
      status: 'Pending',
    });
    await LineDriver.findOneAndUpdate({ lineUserId }, { pendingDocumentType: 'delivery_documents_video' });
    await getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: 'รับรูปส่งงานแล้วครับ กรุณาถ่ายวิดีโอเอกสารเพื่อเข้าสู่ขั้นตอนจ่ายเงิน',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'camera', label: 'ถ่ายวิดีโอ' } },
          { type: 'action', action: { type: 'cameraRoll', label: 'เลือกวิดีโอ' } },
        ],
      },
    });
    return;
  }

  if (documentType === 'delivery_documents_video' && driver.activeTripId) {
    const trip = await Trip.findByIdAndUpdate(driver.activeTripId, {
      deliveryDocumentVideoMessageId: lineMessageId,
      lineAssignmentStatus: 'payment_requested',
      paymentRequestedAt: new Date(),
    }, { new: true });

    await LineDriver.findOneAndUpdate({ lineUserId }, { 
      pendingDocumentType: undefined,
      activeTripId: undefined,
      activeJobOfferId: undefined 
    });

    if (PAYMENT_NOTIFY_LINE_USER_ID && trip) {
      await getLineClient().pushMessage(PAYMENT_NOTIFY_LINE_USER_ID, {
        type: 'text',
        text: [
          'แจ้งเตือนจ่ายเงินรถร่วม',
          `รหัสงาน: ${trip.tripId}`,
          `คนขับ: ${trip.driverName || driver.displayName || lineUserId}`,
          `ทะเบียน: ${trip.licensePlate || '-'} / ${trip.tailLicensePlate || '-'}`,
          `จำนวนเงิน: ${currency(trip.acceptedFreightPrice || 0)}`,
        ].join('\n'),
      });
    }

    await getLineClient().replyMessage(replyToken, { type: 'text', text: 'รับวิดีโอเอกสารแล้วครับ ระบบแจ้งทีมงานเพื่อดำเนินการจ่ายเงินเรียบร้อย' });
    return;
  }

  await LineDriver.findOneAndUpdate({ lineUserId }, { pendingDocumentType: undefined, status: 'awaiting_documents' });
  const refreshedDriver = await LineDriver.findOne({ lineUserId });
  const ready = refreshedDriver ? await markUnderReviewIfReady(refreshedDriver) : false;
  const progress = await onboardingProgress(lineUserId);

  await getLineClient().replyMessage(
    replyToken,
    documentReceivedMessage(getDocumentLabel(documentType), progress.missing.map(getDocumentLabel), ready)
  );
}

async function handleLocation(lineUserId: string, latitude: number, longitude: number, address: string, replyToken: string) {
  const now = new Date();
  const driver = await LineDriver.findOneAndUpdate(
    { lineUserId },
    {
      gpsConsentStatus: 'granted',
      gpsConsentAt: now,
      lastLocation: { latitude, longitude, address, updatedAt: now },
    },
    { upsert: true, new: true }
  );

  if (driver.activeTripId) {
    await Trip.findByIdAndUpdate(driver.activeTripId, {
      'gpsSession.source': 'line_oa',
      'gpsSession.status': 'active',
      'gpsSession.isTracking': true,
      'gpsSession.lastPingAt': now,
      'gpsSession.currentPin': {
        lat: latitude,
        lng: longitude,
        address: address || '',
        googleMapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}`
      }
    });
  }

  await getLineClient().replyMessage(replyToken, { type: 'text', text: 'รับพิกัดเรียบร้อยครับ' });
}

async function handleAnalyzeOnboarding(lineUserId: string, replyToken: string) {
  const lineClient = getLineClient();
  await lineClient.replyMessage(replyToken, { type: 'text', text: 'กำลังวิเคราะห์ข้อมูลจากเอกสารที่ส่งมา กรุณารอสักครู่ครับ...' });

  try {
    const documents = await DriverDocument.find({
      lineUserId,
      mediaType: 'image',
      documentType: { $in: ['onboarding_media', 'national_id', 'driving_license', 'head_registration', 'tail_registration', 'vehicle_insurance', 'phone_number', 'bank_account'] },
    }).sort({ createdAt: -1 }).limit(10);

    if (documents.length === 0) {
      await lineClient.pushMessage(lineUserId, { type: 'text', text: 'ยังไม่พบรูปเอกสารที่ส่งมาครับ กรุณาส่งรูปบัตรประชาชน ใบขับขี่ หรือทะเบียนรถเข้ามาก่อนครับ' });
      return;
    }

    const images: { buffer: Buffer; mimeType: string }[] = [];
    for (const doc of documents) {
      if (!doc.lineMessageId) continue;
      try {
        const content = await lineClient.getMessageContent(doc.lineMessageId);
        const chunks = [];
        for await (const chunk of content) chunks.push(chunk);
        images.push({ buffer: Buffer.concat(chunks), mimeType: doc.mimeType || 'image/jpeg' });
      } catch (e) {
        console.error(`Failed to fetch content for message ${doc.lineMessageId}:`, e);
      }
    }

    if (images.length === 0) {
      await lineClient.pushMessage(lineUserId, { type: 'text', text: 'ไม่สามารถดึงรูปภาพจาก LINE มาวิเคราะห์ได้ในขณะนี้ แต่ระบบได้รับเอกสารของคุณแล้วครับ' });
      await LineDriver.findOneAndUpdate({ lineUserId }, { status: 'under_review' });
      return;
    }

    try {
      const result = await analyzeDriverDocuments(images);
      
      // Update driver with analyzed data and set status to under_review
      await LineDriver.findOneAndUpdate(
        { lineUserId },
        { 
          status: 'under_review',
          phone: result.data?.phone,
          bankName: result.data?.bankName,
          bankAccountNumber: result.data?.bankAccountNumber,
          bankAccountName: result.data?.bankAccountName,
        }
      );

      await lineClient.pushMessage(lineUserId, { 
        type: 'text', 
        text: 'วิเคราะห์ข้อมูลเบื้องต้นเสร็จสิ้น! ระบบได้รับเอกสารของคุณเรียบร้อยแล้วครับ\n\nขณะนี้อยู่ระหว่าง "รอการอนุมัติ" จากเจ้าหน้าที่ กรุณารอการแจ้งเตือนผ่านช่องทางนี้ครับ' 
      });
    } catch (e) {
      console.error('Gemini Analysis Error:', e);
      await LineDriver.findOneAndUpdate({ lineUserId }, { status: 'under_review' });
      await lineClient.pushMessage(lineUserId, { 
        type: 'text', 
        text: 'ระบบได้รับเอกสารของคุณแล้วครับ! ขณะนี้อยู่ระหว่างการรอ "อนุมัติ" จากเจ้าหน้าที่ กรุณารอการแจ้งเตือนผ่านช่องทางนี้ครับ' 
      });
    }
  } catch (error) {
    console.error('Handle analyze onboarding error:', error);
  }
}

async function handleConfirmRegistration(lineUserId: string, replyToken: string) {
  try {
    const driver = await getOrCreateDriver(lineUserId);
    const data = driver.tempAnalysisResult;

    if (!data) {
      await getLineClient().replyMessage(replyToken, { type: 'text', text: 'ไม่พบข้อมูลที่ต้องยืนยัน กรุณากดปุ่มตรวจสอบข้อมูลใหม่อีกครั้งครับ' });
      return;
    }

    // Create or update SharedTruck
    let truck = await SharedTruck.findOne({ lineUserId });
    const truckData = {
      lineUserId,
      driverFirstName: data.driverFirstName,
      driverLastName: data.driverLastName,
      driverPhone: data.driverPhone,
      headPlateNumber: data.headPlateNumber,
      tailPlateNumber: data.tailPlateNumber,
      driverLicenseType: data.driverLicenseType,
      bankName: data.bankName,
      bankAccountNumber: data.bankAccountNumber,
      bankAccountName: data.bankAccountName,
      onboardingStatus: 'approved' as const,
    };

    if (!truck) {
      truck = await SharedTruck.create(truckData);
    } else {
      truck = await SharedTruck.findByIdAndUpdate(truck._id, truckData, { new: true });
    }

    if (!truck) {
      throw new Error('Failed to create or update truck data');
    }

    await LineDriver.findOneAndUpdate({ lineUserId }, {
      status: 'approved',
      phone: data.driverPhone,
      bankName: data.bankName,
      bankAccountNumber: data.bankAccountNumber,
      bankAccountName: data.bankAccountName,
      sharedTruckId: truck._id,
      approvedAt: new Date(),
      tempAnalysisResult: undefined, // Clear temp data
    });

    await getLineClient().replyMessage(replyToken, {
      type: 'text',
      text: 'ยินดีด้วยครับ! ข้อมูลของคุณได้รับการยืนยันและอนุมัติเรียบร้อยแล้ว พี่ยังสามารถเริ่มรับงานได้ทันทีครับ พิมพ์ "งาน" เพื่อดูงานปัจจุบัน',
    });
  } catch (error) {
    console.error('Confirmation error:', error);
    await getLineClient().replyMessage(replyToken, { type: 'text', text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาติดต่อเจ้าหน้าที่ครับ' });
  }
}

async function handlePostback(lineUserId: string, data: string, replyToken: string) {
  const params = new URLSearchParams(data);
  const action = params.get('action') || '';

  if (action === 'analyze_onboarding') {
    await handleAnalyzeOnboarding(lineUserId, replyToken);
    return;
  }

  if (action === 'confirm_reg') {
    await handleConfirmRegistration(lineUserId, replyToken);
    return;
  }

  if (action === 'retry_onboarding') {
    await getLineClient().replyMessage(replyToken, { type: 'text', text: 'ได้รับทราบครับ รบกวนพี่ส่งรูปเอกสารที่ชัดเจนเข้ามาใหม่อีกครั้งนะครับ' });
    return;
  }

  if (action === 'set_doc_type') {
    const docType = params.get('docType') || '';
    if (!isDriverDocumentType(docType)) {
      await getLineClient().replyMessage(replyToken, { type: 'text', text: 'ประเภทเอกสารไม่ถูกต้องครับ' });
      return;
    }

    const driver = await getOrCreateDriver(lineUserId);
    if (driver.status === 'approved') {
      await getLineClient().replyMessage(replyToken, { type: 'text', text: 'คุณได้รับการอนุมัติเรียบร้อยแล้ว ไม่จำเป็นต้องส่งเอกสารเพิ่มเติมครับ' });
      return;
    }

    await LineDriver.findOneAndUpdate(
      { lineUserId },
      { pendingDocumentType: docType, status: 'awaiting_documents' },
      { upsert: true }
    );

    const label = getDocumentLabel(docType);
    const text = docType === 'phone_number'
      ? 'กรุณาพิมพ์เบอร์โทรศัพท์ เช่น 0812345678'
      : docType === 'bank_account'
        ? 'กรุณาพิมพ์บัญชีในรูปแบบ: บัญชี ธนาคาร เลขบัญชี ชื่อบัญชี'
        : `กรุณาส่งรูปหรือไฟล์: ${label}`;

    await getLineClient().replyMessage(replyToken, { type: 'text', text });
    return;
  }

  if (action === 'accept_job') {
    await acceptJob(lineUserId, params.get('offerId') || '', replyToken);
    return;
  }

  await getLineClient().replyMessage(replyToken, { type: 'text', text: 'ไม่พบคำสั่งนี้ครับ' });
}

async function handleEvent(event: WebhookEvent) {
  const lineUserId = sourceUserId(event);
  if (!lineUserId || event.mode === 'standby') return;

  if (event.type === 'follow') {
    const driver = await getOrCreateDriver(lineUserId);
    
    // Sync Rich Menu based on approval status
    try {
      const config = await Setting.findOne({ key: 'line_config', scope: 'global' });
      if (driver.status === 'approved') {
        if (config?.lineRichMenuIdDriver) {
          // Link directly to overwrite (No unlink before as per user request to avoid race condition)
          await getLineClient().linkRichMenuToUser(lineUserId, config.lineRichMenuIdDriver);
        }
      } else {
        // For new, pending, or rejected drivers: 
        // Explicitly unlink to force them to use the Default (Restricted) menu
        await getLineClient().unlinkRichMenuFromUser(lineUserId);
      }
    } catch (e) {
      console.error('Failed to sync Rich Menu on follow:', e);
    }
    
    const messages = driver.status === 'approved' 
      ? welcomeBackMessages(driver, lineUserId)
      : welcomeMessages(lineUserId);
      
    await getLineClient().replyMessage(event.replyToken, messages);
    return;
  }

  if (event.type === 'postback') {
    await handlePostback(lineUserId, event.postback.data, event.replyToken);
    return;
  }

  if (event.type !== 'message') return;

  if (event.message.type === 'text') {
    await handleTextMessage(lineUserId, event.message.text, event.replyToken);
    return;
  }

  if (event.message.type === 'image') {
    await saveMediaDocument(lineUserId, event.message.id, 'image', event.replyToken);
    return;
  }

  if (event.message.type === 'video') {
    await saveMediaDocument(lineUserId, event.message.id, 'video', event.replyToken);
    return;
  }

  if (event.message.type === 'file') {
    await saveMediaDocument(lineUserId, event.message.id, 'file', event.replyToken, event.message.fileName);
    return;
  }

  if (event.message.type === 'location') {
    await handleLocation(lineUserId, event.message.latitude, event.message.longitude, event.message.address, event.replyToken);
  }
}

export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get('x-line-signature') || '';
    const channelSecret = getLineChannelSecret();

    if (!validateSignature(bodyText, channelSecret, signature)) {
      return NextResponse.json({ error: 'Invalid LINE signature' }, { status: 401 });
    }

    const body = JSON.parse(bodyText) as WebhookRequestBody;
    if (!body.events || body.events.length === 0) {
      return NextResponse.json({ message: 'OK' }, { status: 200 });
    }

    await connectToDatabase();
    for (const event of body.events) {
      await handleEvent(event);
    }

    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

