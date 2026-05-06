import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ taxId: string }> }) {
  try {
    const token = await getSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taxId } = await params;

    if (!taxId || taxId.length !== 13) {
      return NextResponse.json({ error: 'Tax ID ต้องมี 13 หลัก' }, { status: 400 });
    }

    const apiUrl = process.env.EXTERNAL_TAX_API_URL;
    const apiKey = process.env.EXTERNAL_TAX_API_KEY;

    // หากไม่มี API URL / Key ถูกตั้งไว้ (ใน development environment) ให้จำลองข้อมูลเพื่อทดสอบ
    if (!apiUrl || !apiKey) {
      console.warn('[TAX LOOKUP API] Using mock data because EXTERNAL_TAX_API_URL or EXTERNAL_TAX_API_KEY is not configured in .env');
      
      // ตัวอย่างจำลอง (Mock Data)
      if (taxId === '0105559053036') { // สมมติรหัสตัวอย่าง
        return NextResponse.json({
          companyName: 'บริษัท อินโนเฟรช จำกัด',
          address: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
          status: 'Active'
        });
      }
      
      return NextResponse.json({
        companyName: `บริษัท ตัวอย่างสำหรับ TaxID ${taxId} จำกัด`,
        address: '456 ถนนพหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพมหานคร 10900',
        status: 'Active'
      });
    }

    // ติดต่อ External API จริง
    const response = await fetch(`${apiUrl}/lookup/${taxId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
         return NextResponse.json({ error: 'ไม่พบข้อมูลนิติบุคคล' }, { status: 404 });
      }
      return NextResponse.json({ error: 'External API Error' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Tax lookup error:', error);
    return NextResponse.json({ error: 'ระบบขัดข้อง' }, { status: 500 });
  }
}
