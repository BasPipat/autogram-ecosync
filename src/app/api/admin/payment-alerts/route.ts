export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { getSessionToken } from '@/lib/access';

/**
 * GET /api/admin/payment-alerts
 * Returns counts of trips that need admin attention for payments.
 * Used by SidebarLayout to show notification badges.
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) return NextResponse.json({ driverPayouts: 0, pendingSlips: 0 });

    await connectToDatabase();

    const [driverPayouts, pendingSlips] = await Promise.all([
      // Trips where driver has submitted VDO and is waiting to be paid
      Trip.countDocuments({
        $or: [
          { opsStatus: 'payment_requested' },
          { lineAssignmentStatus: 'payment_requested' },
        ],
        driverPayoutStatus: { $ne: 'paid' },
      }),
      // Customer payment slips awaiting admin approval
      Trip.countDocuments({
        paymentType: 'cash',
        paymentStatus: 'pending_verification',
      }),
    ]);

    return NextResponse.json({ driverPayouts, pendingSlips, total: driverPayouts + pendingSlips });
  } catch {
    return NextResponse.json({ driverPayouts: 0, pendingSlips: 0, total: 0 });
  }
}
