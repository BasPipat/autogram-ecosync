export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { TextMessage } from '@line/bot-sdk';
import { connectToDatabase } from '@/lib/mongodb';
import { getSessionToken, isInternalRole } from '@/lib/access';
import { getLineClient } from '@/lib/line';
import { LineDriver } from '@/models/LineDriver';
import { JobOffer, IJobOffer } from '@/models/JobOffer';
import { Trip } from '@/models/Trip';


type CreateOfferBody = {
  tripId?: unknown;
  basePrice?: unknown;
  expiresAt?: unknown;
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function amount(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function requireInternal(req: NextRequest) {
  const token = await getSessionToken(req);
  if (!token) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isInternalRole(token.role)) {
    return { response: NextResponse.json({ error: 'เฉพาะ System Owner เท่านั้น' }, { status: 403 }) };
  }

  return { token };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value);
}

function ensureHttps(url: string | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  
  // Nuclear Option: Extract coordinates and reconstruct from scratch
  const coordMatch = trimmed.match(/q=([\d.-]+),([\d.-]+)/) || trimmed.match(/@([\d.-]+),([\d.-]+)/);
  if (coordMatch) {
    return `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  
  let clean = trimmed;
  while (clean.startsWith('/') || clean.startsWith('.') || clean.startsWith(' ')) {
    clean = clean.substring(1);
  }

  if (clean.startsWith('maps.google.com') || clean.startsWith('maps.app.goo.gl')) {
    return `https://${clean}`;
  }
  if (clean.startsWith('google.com/maps')) {
    return `https://www.${clean}`;
  }
  if (clean.startsWith('www.')) return `https://${clean}`;
  
  // Final fallback for map-like strings
  if (clean.includes('google.com') || clean.includes('goo.gl')) {
    return `https://${clean}`;
  }

  return `https://${clean}`;
}

function serializeOffer(offer: IJobOffer) {
  return {
    _id: offer._id.toString(),
    tripId: offer.tripId.toString(),
    tripCode: offer.tripCode,
    origin: offer.origin,
    destination: offer.destination,
    basePrice: offer.basePrice,
    driverPrice: offer.driverPrice,
    discountPercent: offer.discountPercent,
    status: offer.status,
    sentAt: offer.sentAt?.toISOString(),
    expiresAt: offer.expiresAt?.toISOString(),
    acceptedAt: offer.acceptedAt?.toISOString(),
    acceptedByLineUserId: offer.acceptedByLineUserId || '',
    acceptedDriverName: offer.acceptedDriverName || '',
    acceptedHeadPlateNumber: offer.acceptedHeadPlateNumber || '',
    acceptedTailPlateNumber: offer.acceptedTailPlateNumber || '',
    createdBy: offer.createdBy || '',
  };
}

function formatThaiDate(date: Date | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String((d.getFullYear() + 543) % 100).padStart(2, '0');
  return `${day}.${month}.${year}`;
}

function getDayLabel(date: Date | undefined): string {
  if (!date) return 'วันวิ่ง';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'วันนี้';
  if (diffDays === 1) return 'พรุ่งนี้';
  
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  return `วัน${days[target.getDay()]}`;
}

function jobOfferText(offer: IJobOffer, trip: any): TextMessage {
  const dateStr = formatThaiDate(trip.scheduledOriginDate);
  const dayLabel = getDayLabel(trip.scheduledOriginDate);
  
  const weightStr = trip.weight ? `${trip.weight} ตัน` : '';
  const cargoSuffix = trip.cargoType === 'ตู้' ? 'รวมตู้' : (trip.cargoType || '');
  const cargoStr = weightStr ? `${weightStr}${cargoSuffix}` : cargoSuffix;

  const priceStr = `${offer.basePrice.toLocaleString()}-1% (เงินสด)`;
  const acceptLink = `https://line.me/R/oaMessage/${process.env.LINE_OA_ID || '@782wnmvm'}/?%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%87%E0%B8%B2%E0%B8%99%20${offer.tripCode}`;
  
  const lines = [
    `🔊รับ${dayLabel} ${dateStr} 🔊`,
    '',
    `${offer.origin} - ${offer.destination}`,
    '',
    cargoStr,
    '',
    priceStr,
    '',
    `${trip.vehicleCount || 1} คัน`,
    '',
    'กดรับงานที่นี่ 👇',
    acceptLink
  ].filter(line => line !== undefined);

  return {
    type: 'text',
    text: lines.join('\n')
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireInternal(req);
    if ('response' in auth) return auth.response;

    await connectToDatabase();
    const offers = await JobOffer.find({}).sort({ createdAt: -1 }).limit(200);
    return NextResponse.json(offers.map(serializeOffer));
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลงานที่ส่งรถร่วมได้' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireInternal(req);
    if ('response' in auth) return auth.response;

    const body = await req.json();
    let offersData: { tripId: string; basePrice: number; expiresAt?: string }[] = [];

    if (body && Array.isArray(body.offers)) {
      offersData = body.offers.map((o: any) => ({
        tripId: text(o.tripId),
        basePrice: amount(o.basePrice) as number,
        expiresAt: o.expiresAt ? text(o.expiresAt) : undefined,
      }));
    } else if (body) {
      const tripId = text(body.tripId);
      const basePrice = amount(body.basePrice);
      if (tripId && basePrice !== null) {
        offersData = [{
          tripId,
          basePrice,
          expiresAt: body.expiresAt ? text(body.expiresAt) : undefined,
        }];
      }
    }

    if (offersData.length === 0) {
      return NextResponse.json({ error: 'ข้อมูลงานหรือราคาไม่ถูกต้อง' }, { status: 400 });
    }

    // Validate all items
    for (const item of offersData) {
      if (!mongoose.Types.ObjectId.isValid(item.tripId) || item.basePrice === null || item.basePrice <= 0) {
        return NextResponse.json({ error: 'ข้อมูลงานและราคาไม่ถูกต้องสำหรับบางรายการ' }, { status: 400 });
      }
    }

    await connectToDatabase();
    const createdOffers = [];
    const lineMessages = [];

    for (const item of offersData) {
      const trip = await Trip.findById(item.tripId);
      if (!trip) continue;

      const driverPrice = Math.round(item.basePrice * 0.99);
      const expiresAt = item.expiresAt ? new Date(item.expiresAt) : undefined;

      const offer = await JobOffer.findOneAndUpdate(
        { tripId: trip._id, status: 'open' },
        {
          tripId: trip._id,
          tripCode: trip.tripId,
          origin: trip.origin,
          originMapUrl: ensureHttps(trip.originMapUrl),
          destination: trip.destination,
          destinationMapUrl: ensureHttps(trip.destinationMapUrl),
          basePrice: item.basePrice,
          driverPrice,
          discountPercent: 1,
          status: 'open',
          sentAt: new Date(),
          expiresAt,
          createdBy: auth.token.email,
        },
        { upsert: true, new: true }
      );

      await Trip.findByIdAndUpdate(trip._id, {
        lineAssignmentStatus: 'offered',
        lineJobOfferId: offer._id,
      });

      createdOffers.push(offer);
      lineMessages.push(jobOfferText(offer, trip));
    }

    if (createdOffers.length === 0) {
      return NextResponse.json({ error: 'ไม่พบงานขนส่งตามที่ระบุ' }, { status: 404 });
    }

    const groupIdsStr = process.env.LINE_NOTIFICATION_GROUP_ID || '';
    const groupIds = groupIdsStr.split(',').map(id => id.trim()).filter(Boolean);
    let sentCount = 0;
    let message = '';
    const lineClient = getLineClient();

    if (groupIds.length > 0) {
      for (const msg of lineMessages) {
        for (const gid of groupIds) {
          try {
            await lineClient.pushMessage(gid, msg);
          } catch (err) {
            console.error(`Failed to send message to group ${gid}:`, err);
          }
        }
        sentCount++;
      }
      message = `ส่งงานเข้ากลุ่ม LINE สำเร็จทั้งหมด ${sentCount} งาน (ส่งเข้า ${groupIds.length} กลุ่ม)`;
    } else {
      const drivers = await LineDriver.find({ status: 'approved' }).select('lineUserId');
      const lineUserIds = drivers.map(driver => driver.lineUserId).filter(Boolean);
      if (lineUserIds.length > 0) {
        for (const msg of lineMessages) {
          try {
            await lineClient.multicast(lineUserIds, msg);
            sentCount++;
          } catch (err) {
            console.error('Failed to multicast message:', err);
          }
        }
      }
      message = `ส่งงานให้รถร่วมสำเร็จทั้งหมด ${sentCount} งาน (Fallback Multicast)`;
    }

    return NextResponse.json({
      message,
      sentCount,
      offers: createdOffers.map(serializeOffer),
    }, { status: 201 });
  } catch (error) {
    console.error('Job offer post error:', error);
    return NextResponse.json({ error: 'ส่งงานไม่สำเร็จ' }, { status: 500 });
  }
}
