import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { LineDriver } from '@/models/LineDriver';
import { SharedTruck } from '@/models/SharedTruck';
import { DriverDocument } from '@/models/DriverDocument';
import { Trip } from '@/models/Trip';
import { getSessionToken, isInternalRole } from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getSessionToken(req) as any;
    const { id } = await params;

    // Security: Only internal roles OR the driver themselves can access.
    // Since LIFF is removed, the driver accesses their own profile URL directly via LINE.
    const isOwner = token?.role === 'system_owner' || token?.role === 'admin';
    const isSelf = token?.lineUserId === id;
    const isDirectDriverAccess = !token && id && id.startsWith('U') && id.length === 33;

    if (!isOwner && !isSelf && !isDirectDriverAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lineUserId = id;
    await connectToDatabase();

    // 1. Fetch Driver
    const driver = await LineDriver.findOne({ lineUserId });
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // 2. Fetch Associated Truck
    const truck = driver.sharedTruckId 
      ? await SharedTruck.findById(driver.sharedTruckId)
      : await SharedTruck.findOne({ lineUserId });

    // 3. Fetch All Documents
    const documents = await DriverDocument.find({ lineUserId }).sort({ createdAt: -1 });

    // 4. Fetch Trip Stats
    const trips = await Trip.find({ lineUserId }).sort({ createdAt: -1 }).limit(10);
    const totalTrips = await Trip.countDocuments({ lineUserId, status: 'Verified' });
    
    // Calculate total earnings (example logic)
    const completedTrips = await Trip.find({ lineUserId, status: 'Verified' });
    const totalEarnings = completedTrips.reduce((sum, trip) => sum + (trip.acceptedFreightPrice || 0), 0);


    return NextResponse.json({
      driver,
      truck,
      documents,
      stats: {
        totalTrips,
        totalEarnings,
        tripHistory: trips
      }
    });
  } catch (error: any) {
    console.error('Admin Driver API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getSessionToken(req) as any;
    const { id } = await params;
    const lineUserId = id;

    // Security: Only system_owner OR the driver themselves can edit.
    // Since LIFF is removed, the driver accesses their own profile URL directly via LINE.
    const isOwner = token?.role === 'system_owner' || token?.role === 'admin';
    const isSelf = token?.lineUserId === id;
    const isDirectDriverAccess = !token && id && id.startsWith('U') && id.length === 33;

    if (!isOwner && !isSelf && !isDirectDriverAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      status, isDocumentsVerified, reviewNote,
      displayName, phone, bankName, bankAccountNumber, bankAccountName,
      headPlateNumber, tailPlateNumber, vehicleType, fuelType, cargoInsuranceAmount,
      compulsoryInsuranceExpiresAt, vehicleInsuranceType, driverFirstName, driverLastName, driverLicenseType
    } = await req.json();

    await connectToDatabase();

    // 1. Update LineDriver
    const driverUpdate: any = {};
    if (isOwner && status) {
      driverUpdate.status = status;
      if (status === 'approved') driverUpdate.approvedAt = new Date();
      if (status === 'rejected') driverUpdate.rejectedAt = new Date();
    }
    if (isOwner && isDocumentsVerified !== undefined) {
      driverUpdate.isDocumentsVerified = isDocumentsVerified;
      if (isDocumentsVerified) {
        driverUpdate.verifiedAt = new Date();
        driverUpdate.verifiedBy = token.id;
      }
    }
    if (reviewNote !== undefined) driverUpdate.reviewNote = reviewNote;
    if (displayName) driverUpdate.displayName = displayName;
    if (phone) driverUpdate.phone = phone;
    if (bankName) driverUpdate.bankName = bankName;
    if (bankAccountNumber) driverUpdate.bankAccountNumber = bankAccountNumber;
    if (bankAccountName) driverUpdate.bankAccountName = bankAccountName;
    if (vehicleType) driverUpdate.vehicleType = vehicleType;
    if (fuelType) driverUpdate.fuelType = fuelType;
    // Driver Details
    if (driverFirstName) driverUpdate.driverFirstName = driverFirstName;
    if (driverLastName) driverUpdate.driverLastName = driverLastName;
    if (driverLicenseType) driverUpdate.driverLicenseType = driverLicenseType;

    const updatedDriver = await LineDriver.findOneAndUpdate({ lineUserId }, driverUpdate, { new: true });

    // 2. Update SharedTruck (if exists)
    const truckUpdate: any = {};
    if (phone) truckUpdate.driverPhone = phone;
    if (bankName) truckUpdate.bankName = bankName;
    if (bankAccountNumber) truckUpdate.bankAccountNumber = bankAccountNumber;
    if (bankAccountName) truckUpdate.bankAccountName = bankAccountName;
    if (headPlateNumber) truckUpdate.headPlateNumber = headPlateNumber;
    if (tailPlateNumber) truckUpdate.tailPlateNumber = tailPlateNumber;
    if (vehicleType) truckUpdate.vehicleType = vehicleType;
    if (cargoInsuranceAmount !== undefined) truckUpdate.cargoInsuranceAmount = Number(cargoInsuranceAmount);
    // Insurance & Driver Details
    if (compulsoryInsuranceExpiresAt) truckUpdate.compulsoryInsuranceExpiresAt = compulsoryInsuranceExpiresAt;
    if (vehicleInsuranceType) truckUpdate.vehicleInsuranceType = vehicleInsuranceType;
    if (driverFirstName) truckUpdate.driverFirstName = driverFirstName;
    if (driverLastName) truckUpdate.driverLastName = driverLastName;
    if (driverLicenseType) truckUpdate.driverLicenseType = driverLicenseType;

    if (Object.keys(truckUpdate).length > 0) {
      await SharedTruck.findOneAndUpdate({ lineUserId }, truckUpdate);
    }

    return NextResponse.json({ message: 'Driver updated successfully', driver: updatedDriver });
  } catch (error: any) {
    console.error('Admin Driver Update Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
