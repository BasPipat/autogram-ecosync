import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { LineDriver } from '@/models/LineDriver';
import { SharedTruck } from '@/models/SharedTruck';
import { JobOffer } from '@/models/JobOffer';
import { Trip } from '@/models/Trip';
import { getLineClient } from '@/lib/line';

export async function assignPendingJobToDriver(lineUserId: string): Promise<boolean> {
  await connectToDatabase();
  const driver = await LineDriver.findOne({ lineUserId });
  if (!driver || driver.status !== 'approved' || !driver.pendingJobOfferCode) {
    return false;
  }

  const tripCode = driver.pendingJobOfferCode;

  // Check if driver has active trips first
  const activeTrip = await Trip.findOne({ 
    lineUserId, 
    lineAssignmentStatus: { $in: ['accepted', 'in_progress', 'arrived_pickup', 'en_route_pickup', 'en_route_dropoff', 'delivered'] } 
  });

  const lineClient = getLineClient();

  if (activeTrip) {
    // Clear pending code and notify
    await LineDriver.findOneAndUpdate({ lineUserId }, { $unset: { pendingJobOfferCode: 1 } });
    try {
      await lineClient.pushMessage(lineUserId, {
        type: 'text',
        text: `⚠️ ระบบไม่สามารถจองงาน ${tripCode} ให้คุณได้ เนื่องจากคุณมีงานที่กำลังดำเนินการอยู่ครับ`,
      });
    } catch (e) {
      console.error('Failed to notify driver of active trip conflict:', e);
    }
    return false;
  }

  const truck = driver.sharedTruckId
    ? await SharedTruck.findById(driver.sharedTruckId)
    : await SharedTruck.findOne({ lineUserId });

  if (!truck) {
    console.warn(`No SharedTruck found for driver ${lineUserId} to assign pending job ${tripCode}`);
    return false;
  }

  const now = new Date();
  const offer = await JobOffer.findOneAndUpdate(
    {
      tripCode: tripCode,
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
    // Job is no longer available
    await LineDriver.findOneAndUpdate({ lineUserId }, { $unset: { pendingJobOfferCode: 1 } });
    try {
      await lineClient.pushMessage(lineUserId, {
        type: 'text',
        text: `😔 ขออภัยครับ งาน ${tripCode} ถูกคนอื่นรับไปแล้ว หรือปิดรับสมัครแล้วครับ`,
      });
    } catch (e) {
      console.error('Failed to notify driver of unavailable job:', e);
    }
    return false;
  }

  // Update Trip
  const updatedTrip = await Trip.findByIdAndUpdate(offer.tripId, {
    sharedTruckId: truck._id,
    lineUserId,
    licensePlate: truck.headPlateNumber,
    tailLicensePlate: truck.tailPlateNumber,
    driverName: `${truck.driverFirstName} ${truck.driverLastName}`,
    acceptedFreightPrice: offer.driverPrice,
    lineAssignmentStatus: 'accepted',
    opsStatus: 'accepted',
    lineJobOfferId: offer._id,
    lineAcceptedAt: now,
  }, { new: true });

  // Clear pendingJobOfferCode
  await LineDriver.findOneAndUpdate({ lineUserId }, { $unset: { pendingJobOfferCode: 1 } });

  // Send success message to private chat
  if (updatedTrip) {
    const currency = (amount: number) => {
      return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount || 0);
    };

    const details = [
      `🎉 ระบบทำการจองงานสำเร็จให้คุณแล้วครับ!`,
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
    ].filter(Boolean).join('\n');

    try {
      await lineClient.pushMessage(lineUserId, {
        type: 'text',
        text: details,
      });
    } catch (e) {
      console.error('Failed to notify driver of successful direct booking:', e);
    }
  }

  return true;
}
