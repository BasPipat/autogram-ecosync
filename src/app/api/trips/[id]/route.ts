export const dynamic = 'force-dynamic';

import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getSessionToken, isInternalRole } from '@/lib/access';
import type { SessionTokenInfo } from '@/lib/access';
import { JobOffer } from '@/models/JobOffer';
import { LineDriver } from '@/models/LineDriver';
import { SharedTruck } from '@/models/SharedTruck';
import { Trip } from '@/models/Trip';

type AccessInfo = {
  role: 'admin' | 'driver';
  canViewFinancials: boolean;
  lineUserId?: string;
};

type IdLike = mongoose.Types.ObjectId;

type DbPin = {
  lat?: unknown;
  lng?: unknown;
  address?: unknown;
  googleMapsUrl?: unknown;
  speed?: unknown;
  heading?: unknown;
  timestamp?: unknown;
};

type LeanTrip = {
  _id: IdLike;
  companyId?: IdLike;
  sharedTruckId?: IdLike;
  tripId: string;
  companyName?: string;
  customerName?: string;
  origin: string;
  originMapUrl?: string;
  scheduledOriginDate?: Date | string | null;
  scheduledOriginTime?: string;
  originContactName?: string;
  originContactPhone?: string;
  destination: string;
  destinationMapUrl?: string;
  scheduledDestinationDate?: Date | string | null;
  scheduledDestinationTime?: string;
  destinationContactName?: string;
  destinationContactPhone?: string;
  originPin?: DbPin;
  destinationPin?: DbPin;
  distance?: number;
  weight?: number;
  carbon?: number;
  emissionKgCo2e?: number;
  cargoType?: string;
  cargoName?: string;
  status?: string;
  lineUserId?: string;
  acceptedFreightPrice?: number;
  lineAssignmentStatus?: string;
  opsStatus?: string;
  driverName?: string;
  licensePlate?: string;
  tailLicensePlate?: string;
  driverPhone?: string;
  podImageUrl?: string;
  deliveredAt?: Date | string | null;
  gpsSession?: {
    source?: string;
    status?: string;
    isTracking?: boolean;
    startedAt?: Date | string | null;
    stoppedAt?: Date | string | null;
    lastPingAt?: Date | string | null;
    currentPin?: DbPin;
    locationHistory?: DbPin[];
  };
};

type LeanDriver = {
  activeTripId?: IdLike;
  displayName?: string;
  phone?: string;
  lastLocation?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    updatedAt?: Date | string;
  };
};

type LeanTruck = {
  headPlateNumber?: string;
  tailPlateNumber?: string;
  driverPhone?: string;
};

type LeanOffer = {
  basePrice?: number;
  driverPrice?: number;
  status?: string;
  discountPercent?: number;
};

type PatchBody = {
  action?: unknown;
  lineUserId?: unknown;
  podUrl?: unknown;
};

function objectId(value: string) {
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
}

function tripLookup(id: string) {
  const conditions: Record<string, unknown>[] = [{ tripId: id }];
  const oid = objectId(id);
  if (oid) conditions.push({ _id: oid });
  return { $or: conditions };
}

function serializePin(pin?: any, fallbackUrl?: string) {
  let lat: number | typeof NaN = NaN;
  let lng: number | typeof NaN = NaN;
  let address = '';
  let googleMapsUrl = fallbackUrl || '';

  if (pin) {
    lat = Number(pin.lat);
    lng = Number(pin.lng);
    if (pin.lat && typeof pin.lat === 'object' && pin.lat.$numberDecimal) lat = Number(pin.lat.$numberDecimal);
    if (pin.lng && typeof pin.lng === 'object' && pin.lng.$numberDecimal) lng = Number(pin.lng.$numberDecimal);
    if (typeof pin.address === 'string') address = pin.address;
    if (typeof pin.googleMapsUrl === 'string' && pin.googleMapsUrl) googleMapsUrl = pin.googleMapsUrl;
  }

  // Fallback: extract lat,lng from URL if missing
  if ((isNaN(lat) || isNaN(lng)) && googleMapsUrl) {
    const match = googleMapsUrl.match(/[?&]q=([-.\d]+),([-.\d]+)/);
    if (match) {
      lat = parseFloat(match[1]);
      lng = parseFloat(match[2]);
    }
  }

  if (isNaN(lat) || isNaN(lng)) return null;

  return {
    lat,
    lng,
    address,
    googleMapsUrl: googleMapsUrl || `https://www.google.com/maps?q=${lat},${lng}`,
    speed: typeof pin?.speed === 'number' ? pin.speed : null,
    heading: typeof pin?.heading === 'number' ? pin.heading : null,
    timestamp: typeof pin?.timestamp === 'number' ? pin.timestamp : null,
  };
}

function deriveOpsStatus(trip: LeanTrip) {
  if (trip.opsStatus) return trip.opsStatus;
  if (trip.lineAssignmentStatus === 'in_progress') return 'en_route_pickup';
  if (trip.lineAssignmentStatus === 'delivered') return 'delivered';
  if (trip.lineAssignmentStatus === 'documents_submitted') return 'documents_submitted';
  if (trip.lineAssignmentStatus === 'payment_requested') return 'payment_requested';
  if (trip.lineAssignmentStatus === 'paid') return 'paid';
  if (trip.lineAssignmentStatus === 'accepted') return 'accepted';
  return trip.lineAssignmentStatus || 'accepted';
}

function sameTenant(token: SessionTokenInfo, trip: LeanTrip) {
  const tripCompanyId = trip.companyId?.toString?.();
  return (
    (!!token.companyId && !!tripCompanyId && token.companyId === tripCompanyId) ||
    (!!token.companyName && !!trip.companyName && token.companyName === trip.companyName)
  );
}

async function authorizeTrip(req: NextRequest, trip: LeanTrip, explicitLineUserId?: string): Promise<AccessInfo | null> {
  const token = await getSessionToken(req);
  if (token) {
    if (isInternalRole(token.role)) {
      return { role: 'admin', canViewFinancials: token.role === 'system_owner' || token.role === 'owner' };
    }
    // For other internal roles, check tenant if available, or just allow if it's admin role
    if (token.role === 'admin' || sameTenant(token, trip)) {
      return { role: 'admin', canViewFinancials: false };
    }
  }

  const lineUserId = explicitLineUserId || req.nextUrl.searchParams.get('lineUserId')?.trim();
  if (!lineUserId) return null;

  const driver = await LineDriver.findOne({ lineUserId }).select('activeTripId lineUserId').lean() as LeanDriver | null;
  const ownsByTrip = trip.lineUserId === lineUserId;
  const ownsByDriver = driver?.activeTripId?.toString() === trip._id.toString();
  if (!ownsByTrip && !ownsByDriver) return null;

  return { role: 'driver', canViewFinancials: false, lineUserId };
}

async function getTripWithAccess(req: NextRequest, id: string, lineUserId?: string) {
  await connectToDatabase();
  
  let query: any;
  let sort: any = { createdAt: -1 };

  // If ID is a LINE User ID (starts with U and length 33)
  if (id.startsWith('U') && id.length === 33) {
    // Find latest trip that is NOT yet fully completed/paid
    query = { 
      lineUserId: id,
      opsStatus: { $nin: ['paid', 'documents_submitted'] } 
    };
  } else {
    query = tripLookup(id);
  }

  let trip = await Trip.findOne(query).sort(sort).lean() as LeanTrip | null;
  
  // If no active trip found for LINE ID, try to find the latest one overall for them
  if (!trip && id.startsWith('U') && id.length === 33) {
    trip = await Trip.findOne({ lineUserId: id }).sort({ createdAt: -1 }).lean() as LeanTrip | null;
  }

  if (!trip) {
    return { response: NextResponse.json({ error: 'ไม่พบข้อมูลงานของคุณในระบบ' }, { status: 404 }) };
  }

  // --- AUTO-LINK LOGIC START ---
  // If trip has driver info but no lineUserId, try to auto-bind from LineDriver database
  if (!trip.lineUserId && (trip.driverName || trip.licensePlate)) {
    try {
      const searchConditions = [];
      if (trip.driverName) {
        searchConditions.push({ displayName: trip.driverName });
        // Also try matching by first/last name if the displayName is split
        const names = trip.driverName.split(' ');
        if (names.length >= 2) {
          searchConditions.push({ driverFirstName: names[0], driverLastName: names[1] });
        }
      }
      if (trip.licensePlate) searchConditions.push({ licensePlate: trip.licensePlate });
      
      const matchedDriver = await LineDriver.findOne({ 
        $or: searchConditions,
        status: 'approved' 
      }).populate('sharedTruckId').lean() as any;

      if (matchedDriver) {
        console.log(`[AutoLink] Matching trip ${trip.tripId} to driver ${matchedDriver.displayName} (${matchedDriver.lineUserId})`);
        const truck = matchedDriver.sharedTruckId;
        
        // Update the Trip document in background
        await Trip.findByIdAndUpdate(trip._id, {
          lineUserId: matchedDriver.lineUserId,
          driverName: matchedDriver.displayName || trip.driverName,
          licensePlate: matchedDriver.licensePlate || truck?.headPlateNumber || trip.licensePlate,
          tailLicensePlate: truck?.tailPlateNumber || trip.tailLicensePlate,
          driverPhone: matchedDriver.phone || truck?.driverPhone || trip.driverPhone,
          sharedTruckId: matchedDriver.sharedTruckId,
          lineAssignmentStatus: 'accepted',
          opsStatus: trip.opsStatus || 'accepted',
          lineAcceptedAt: new Date(),
        });
        
        // Update local trip object for immediate return
        trip.lineUserId = matchedDriver.lineUserId;
        trip.lineAssignmentStatus = 'accepted';
      }
    } catch (err) {
      console.error('[AutoLink] Failed to auto-link driver:', err);
    }
  }
  // --- AUTO-LINK LOGIC END ---

  const access = await authorizeTrip(req, trip, lineUserId);
  if (!access) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { trip, access };
}

async function serializeTrip(trip: LeanTrip, access: AccessInfo) {
  const [offer, driver, truck] = await Promise.all([
    JobOffer.findOne({ tripId: trip._id }).sort({ createdAt: -1 }).lean() as Promise<LeanOffer | null>,
    trip.lineUserId ? LineDriver.findOne({ lineUserId: trip.lineUserId }).lean() as Promise<LeanDriver | null> : Promise.resolve(null),
    trip.sharedTruckId ? SharedTruck.findById(trip.sharedTruckId).lean() as Promise<LeanTruck | null> : Promise.resolve(null),
  ]);

  const gpsCurrentPin = serializePin(trip.gpsSession?.currentPin);
  const driverLastPin = driver?.lastLocation
    ? serializePin({
        lat: driver.lastLocation.latitude,
        lng: driver.lastLocation.longitude,
        address: driver.lastLocation.address,
        timestamp: driver.lastLocation.updatedAt ? new Date(driver.lastLocation.updatedAt).getTime() : null,
      })
    : null;
  const history = Array.isArray(trip.gpsSession?.locationHistory)
    ? trip.gpsSession.locationHistory.map(pin => serializePin(pin)).filter(Boolean)
    : [];

  const basePrice = typeof offer?.basePrice === 'number' ? offer.basePrice : null;
  const driverPrice =
    typeof trip.acceptedFreightPrice === 'number'
      ? trip.acceptedFreightPrice
      : typeof offer?.driverPrice === 'number'
        ? offer.driverPrice
        : null;
  const platformFee = basePrice !== null && driverPrice !== null ? basePrice - driverPrice : null;

  return {
    _id: trip._id.toString(),
    tripId: trip.tripId,
    origin: trip.origin,
    originMapUrl: trip.originMapUrl || '',
    scheduledOriginDate: trip.scheduledOriginDate || null,
    scheduledOriginTime: trip.scheduledOriginTime || '',
    originContactName: trip.originContactName || '',
    originContactPhone: trip.originContactPhone || '',
    destination: trip.destination,
    destinationMapUrl: trip.destinationMapUrl || '',
    scheduledDestinationDate: trip.scheduledDestinationDate || null,
    scheduledDestinationTime: trip.scheduledDestinationTime || '',
    destinationContactName: trip.destinationContactName || '',
    destinationContactPhone: trip.destinationContactPhone || '',
    originPin: serializePin(trip.originPin, trip.originMapUrl),
    destinationPin: serializePin(trip.destinationPin, trip.destinationMapUrl),
    distance: trip.distance || 0,
    weight: trip.weight || 0,
    carbon: trip.carbon || trip.emissionKgCo2e || 0,
    cargoType: trip.cargoType || '',
    cargoName: trip.cargoName || '',
    status: trip.status,
    lineAssignmentStatus: trip.lineAssignmentStatus || 'none',
    opsStatus: deriveOpsStatus(trip),
    driverName: trip.driverName || driver?.displayName || '',
    licensePlate: trip.licensePlate || truck?.headPlateNumber || '',
    tailLicensePlate: trip.tailLicensePlate || truck?.tailPlateNumber || '',
    driverPhone: truck?.driverPhone || driver?.phone || '',
    companyName: trip.companyName || '',
    customerName: trip.customerName || '',
    acceptedFreightPrice: driverPrice,
    podImageUrl: trip.podImageUrl || '',
    deliveredAt: trip.deliveredAt || null,
    gpsSession: {
      source: trip.gpsSession?.source || 'line_oa',
      status: trip.gpsSession?.status || 'inactive',
      isTracking: !!trip.gpsSession?.isTracking,
      startedAt: trip.gpsSession?.startedAt || null,
      stoppedAt: trip.gpsSession?.stoppedAt || null,
      lastPingAt: trip.gpsSession?.lastPingAt || null,
      currentPin: gpsCurrentPin || driverLastPin,
    },
    gpsHistory: access.canViewFinancials ? history.slice(-120) : history.slice(-30),
    financials: access.canViewFinancials
      ? {
          basePrice,
          driverPrice,
          platformFee,
          grossMarginPercent: basePrice && platformFee !== null ? Math.round((platformFee / basePrice) * 1000) / 10 : null,
          offerStatus: offer?.status || '',
          discountPercent: offer?.discountPercent ?? null,
        }
      : null,
    access,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await getTripWithAccess(req, id);
    if ('response' in result) return result.response;
    return NextResponse.json(await serializeTrip(result.trip, result.access));
  } catch (error) {
    console.error('Trip hub fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json() as PatchBody;
    const action = typeof body.action === 'string' ? body.action : '';
    const lineUserId = typeof body.lineUserId === 'string' ? body.lineUserId.trim() : '';

    const result = await getTripWithAccess(req, id, lineUserId);
    if ('response' in result) return result.response;

    const now = new Date();
    const update: Record<string, unknown> = {};
    const set: Record<string, unknown> = {};

    if (action === 'start_to_pickup') {
      set.lineAssignmentStatus = 'in_progress';
      set.opsStatus = 'en_route_pickup';
      set['gpsSession.source'] = lineUserId ? 'web_platform' : 'line_oa';
      set['gpsSession.status'] = 'active';
      set['gpsSession.isTracking'] = true;
      set['gpsSession.startedAt'] = result.trip.gpsSession?.startedAt || now;
      set['gpsSession.lastPingAt'] = now;
    } else if (action === 'arrive_pickup') {
      set.opsStatus = 'arrived_pickup';
      set.lineAssignmentStatus = 'in_progress';
    } else if (action === 'start_to_dropoff') {
      set.opsStatus = 'en_route_dropoff';
      set.lineAssignmentStatus = 'in_progress';
    } else if (action === 'complete_delivery') {
      set.opsStatus = 'delivered';
      set.lineAssignmentStatus = 'delivered';
      set.deliveredAt = now;
      set.status = 'Pending';
      set['gpsSession.status'] = 'stopped';
      set['gpsSession.isTracking'] = false;
      set['gpsSession.stoppedAt'] = now;
    } else if (action === 'request_pod') {
      const targetLineUserId = result.trip.lineUserId || lineUserId;
      if (targetLineUserId) {
        await LineDriver.findOneAndUpdate({ lineUserId: targetLineUserId }, { pendingDocumentType: 'pod_image' });
      }
    } else if (action === 'submit_pod_url') {
      const podUrl = typeof body.podUrl === 'string' ? body.podUrl.trim() : '';
      if (!podUrl) {
        return NextResponse.json({ error: 'Missing POD URL' }, { status: 400 });
      }
      set.podImageUrl = podUrl;
      set.opsStatus = 'documents_submitted';
      set.lineAssignmentStatus = 'documents_submitted';
      set.status = 'Pending';
      set.deliveredAt = result.trip.deliveredAt || now;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (Object.keys(set).length > 0) update.$set = set;
    const updatedTrip = Object.keys(update).length > 0
      ? await Trip.findByIdAndUpdate(result.trip._id, update, { new: true }).lean() as LeanTrip | null
      : result.trip;
    if (!updatedTrip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Trip updated',
      trip: await serializeTrip(updatedTrip, result.access),
    });
  } catch (error) {
    console.error('Trip hub update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
