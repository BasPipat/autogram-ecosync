export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { FlexMessage } from '@line/bot-sdk';
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
  let trimmed = url.trim();
  while (trimmed.startsWith('/')) trimmed = trimmed.substring(1);

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  
  if (trimmed.startsWith('maps.google.com') || trimmed.startsWith('maps.app.goo.gl')) {
    return `https://${trimmed}`;
  }
  if (trimmed.startsWith('google.com/maps')) {
    return `https://www.${trimmed}`;
  }
  if (trimmed.startsWith('www.')) return `https://${trimmed}`;
  return `https://${trimmed}`;
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

function jobOfferFlex(offer: IJobOffer): FlexMessage {
  // Ensure we have valid Google Maps URLs or fallback
  const originUrl = ensureHttps(offer.originMapUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(offer.origin)}`;
  const destUrl = ensureHttps(offer.destinationMapUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(offer.destination)}`;

  return {
    type: 'flex',
    altText: `มีงานใหม่ ${offer.origin} ไป ${offer.destination}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#10B981',
        contents: [
          { type: 'text', text: 'งานใหม่พร้อมรับ', color: '#ffffff', weight: 'bold', size: 'lg' },
          { type: 'text', text: offer.tripCode, color: '#D1FAE5', size: 'xs', margin: 'sm' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: `${offer.origin} → ${offer.destination}`, weight: 'bold', size: 'md', wrap: true },
          
          // Location Map Section
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'button',
                action: { type: 'uri', label: '📍 แผนที่จุดรับสินค้า (Origin)', uri: originUrl },
                style: 'secondary',
                height: 'sm',
                color: '#3B82F6'
              },
              {
                type: 'button',
                action: { type: 'uri', label: '🏁 แผนที่จุดส่งสินค้า (Dest)', uri: destUrl },
                style: 'secondary',
                height: 'sm',
                color: '#10B981'
              }
            ]
          },

          { type: 'separator', margin: 'lg' },

          { type: 'text', text: `ราคาเสนอหลังหัก 1%: ${formatCurrency(offer.driverPrice)}`, color: '#059669', weight: 'bold', size: 'sm', margin: 'md' },
          { type: 'text', text: `ราคาตั้งต้น: ${formatCurrency(offer.basePrice)}`, color: '#94A3B8', size: 'xs' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#10B981',
            action: {
              type: 'postback',
              label: 'รับงานนี้',
              data: `action=accept_job&offerId=${offer._id.toString()}`,
              displayText: `รับงาน ${offer.tripCode}`,
            },
          },
        ],
      },
    },
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

    const body = await req.json() as CreateOfferBody;
    const tripId = text(body.tripId);
    const basePrice = amount(body.basePrice);

    if (!mongoose.Types.ObjectId.isValid(tripId) || basePrice === null) {
      return NextResponse.json({ error: 'กรุณาระบุงานและราคาตั้งต้นให้ถูกต้อง' }, { status: 400 });
    }

    await connectToDatabase();
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return NextResponse.json({ error: 'ไม่พบงานขนส่ง' }, { status: 404 });
    }

    const driverPrice = Math.round(basePrice * 0.99);
    const expiresAtText = text(body.expiresAt);
    const expiresAt = expiresAtText ? new Date(expiresAtText) : undefined;

    const offer = await JobOffer.findOneAndUpdate(
      { tripId: trip._id, status: 'open' },
      {
        tripId: trip._id,
        tripCode: trip.tripId,
        origin: trip.origin,
        originMapUrl: ensureHttps(trip.originMapUrl),
        destination: trip.destination,
        destinationMapUrl: ensureHttps(trip.destinationMapUrl),
        basePrice,
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

    const drivers = await LineDriver.find({ status: 'approved' }).select('lineUserId');
    const lineUserIds = drivers.map(driver => driver.lineUserId).filter(Boolean);
    if (lineUserIds.length > 0) {
      await getLineClient().multicast(lineUserIds, jobOfferFlex(offer));
    }

    return NextResponse.json({
      message: `ส่งงานให้รถร่วม ${lineUserIds.length} คนสำเร็จ`,
      offer: serializeOffer(offer),
      sentCount: lineUserIds.length,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'ส่งงานให้รถร่วมไม่สำเร็จ' }, { status: 500 });
  }
}
