export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { FuelPrice } from '@/models/FuelPrice';

// Helper to get the start of the day in Bangkok timezone (GMT+7) as a UTC Date object
function getBangkokTodayDate(): Date {
  const now = new Date();
  const offset = 7; // GMT+7
  const bangkokTime = new Date(now.getTime() + (offset * 3600 * 1000));
  const year = bangkokTime.getUTCFullYear();
  const month = bangkokTime.getUTCMonth();
  const date = bangkokTime.getUTCDate();
  
  return new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
}

// Scrape today's Diesel B7 price from Bangchak
async function fetchAndSaveBangchakPrice(targetDate: Date): Promise<{ diesel_b7: number; source: string; isNew: boolean }> {
  const response = await fetch('https://oil-price.bangchak.co.th/apioilprice2/en', {
    cache: 'no-store' // Bypass Next.js fetch cache to get fresh API data
  });
  
  if (!response.ok) throw new Error('Failed to fetch from Bangchak API');
  
  const data = await response.json();
  
  if (data && data[0] && data[0].OilList) {
    const oilList = JSON.parse(data[0].OilList);
    
    // Look for Hi Diesel S, Diesel B7 or similar standard diesel
    const dieselB7 = oilList.find((oil: any) => {
      const name = oil.OilName.toUpperCase();
      return name.includes('DIESEL') && !name.includes('PREMIUM') && !name.includes('B20') && !name.includes('B10');
    });
    
    if (dieselB7) {
      const price = Number(dieselB7.PriceToday);
      
      // Save or update today's price in the database
      const updatedPrice = await FuelPrice.findOneAndUpdate(
        { effectiveDate: targetDate },
        { 
          price: price,
          oilName: 'Diesel B7',
          source: 'Bangchak API'
        },
        { upsert: true, new: true }
      );
      
      return {
        diesel_b7: price,
        source: 'Bangchak Real-time API',
        isNew: true
      };
    }
  }
  
  throw new Error('Diesel B7 price not found in Bangchak API response');
}

/**
 * GET today's diesel price.
 * 1. Checks database first for today's record (fast, reliable, consistent).
 * 2. If not found, fetches from Bangchak API, saves to DB, and returns it.
 */
export async function GET() {
  try {
    await connectToDatabase();
    const todayBangkok = getBangkokTodayDate();
    
    // Try to find today's price in the database
    const savedPrice = await FuelPrice.findOne({ effectiveDate: todayBangkok }).lean();
    
    if (savedPrice) {
      return NextResponse.json({
        diesel_b7: savedPrice.price,
        lastUpdated: savedPrice.updatedAt,
        source: 'SHIF Database (Bangchak Cached)',
        effectiveDate: savedPrice.effectiveDate
      });
    }
    
    // Fallback: Fetch from API and save to DB
    const fetched = await fetchAndSaveBangchakPrice(todayBangkok);
    return NextResponse.json({
      diesel_b7: fetched.diesel_b7,
      lastUpdated: new Date().toISOString(),
      source: `${fetched.source} (Auto-Saved to DB)`,
      effectiveDate: todayBangkok
    });

  } catch (error) {
    console.error('Fuel Price GET Error:', error);
    
    // Secondary fallback: Try to get the latest saved price from database (even if not today's)
    try {
      const latestPrice = await FuelPrice.findOne().sort({ effectiveDate: -1 }).lean();
      if (latestPrice) {
        return NextResponse.json({ 
          diesel_b7: latestPrice.price, 
          error: 'Failed to fetch today\'s live price, using latest known database value',
          lastUpdated: latestPrice.updatedAt,
          effectiveDate: latestPrice.effectiveDate,
          source: 'SHIF Database (Latest Fallback)'
        });
      }
    } catch (dbError) {
      console.error('Fallback DB fetch failed:', dbError);
    }

    // Ultimate fallback: Hardcoded price
    return NextResponse.json({ 
      diesel_b7: 39.94, 
      error: 'Failed to fetch live prices, using hardcoded fallback value',
      lastUpdated: new Date().toISOString(),
      source: 'Hardcoded Fallback'
    });
  }
}

/**
 * POST endpoint to force fetch from Bangchak API and update database.
 * This is designed to be triggered by Cloud Scheduler (Cron) at 6:00 AM daily.
 */
export async function POST(req: NextRequest) {
  try {
    // Optional: Protect with a cron token to prevent public spamming if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    await connectToDatabase();
    const todayBangkok = getBangkokTodayDate();
    
    const fetched = await fetchAndSaveBangchakPrice(todayBangkok);
    
    return NextResponse.json({
      success: true,
      message: `Fuel price updated successfully for ${todayBangkok.toISOString().split('T')[0]}`,
      diesel_b7: fetched.diesel_b7,
      source: fetched.source
    });
  } catch (error: any) {
    console.error('Fuel Price POST Cron Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to update fuel price via Cron'
    }, { status: 500 });
  }
}
