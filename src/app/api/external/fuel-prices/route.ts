export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

/**
 * Fetch current Diesel B7 price from Bangchak API.
 * The price is typically updated daily at 5:00 AM.
 * We fetch live and fallback to the latest known price.
 */
export async function GET() {
  try {
    const response = await fetch('https://oil-price.bangchak.co.th/apioilprice2/en', {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) throw new Error('Failed to fetch from Bangchak');
    
    const data = await response.json();
    
    // The response is an array of objects. Usually the first one contains the list.
    // OilList is a stringified JSON array.
    if (data && data[0] && data[0].OilList) {
      const oilList = JSON.parse(data[0].OilList);
      
      // Look for Diesel S B7 or similar
      const dieselB7 = oilList.find((oil: any) => 
        oil.OilName.includes('Diesel') && oil.OilName.includes('B7') && !oil.OilName.includes('Premium')
      );
      
      if (dieselB7) {
        return NextResponse.json({
          diesel_b7: dieselB7.PriceToday,
          lastUpdated: new Date().toISOString(),
          source: 'Bangchak Real-time API',
          allPrices: oilList
        });
      }
    }

    throw new Error('Diesel B7 not found in API response');
  } catch (error) {
    console.error('Fuel Price API Error:', error);
    // Fallback to latest known price if API fails
    return NextResponse.json({ 
      diesel_b7: 39.94, 
      error: 'Failed to fetch live prices, using last known value',
      lastUpdated: new Date().toISOString()
    });
  }
}
