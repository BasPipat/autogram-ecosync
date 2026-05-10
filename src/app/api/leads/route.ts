export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Lead } from '@/models/Lead';
import nodemailer from 'nodemailer';


export async function POST(req: NextRequest) {
  try {
    const { name, companyName, email, phone } = await req.json();

    if (!name || !companyName || !email || !phone) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 1. บันทึกลง Database
    const newLead = await Lead.create({
      name,
      companyName,
      email,
      phone,
      status: 'pending',
    });

    // 2. ส่งอีเมลแจ้งเตือน
    // กรุณาตั้งค่า EMAIL_USER และ EMAIL_PASS ใน Environment Variables
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail', // หรือ SMTP Server อื่นๆ
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: `"Autogram Eco-Sync" <${process.env.EMAIL_USER}>`,
        to: 'l3aspipat@gmail.com', // อีเมลของ System Owner
        subject: `[New Lead] มีผู้สนใจนัดหมายสาธิตระบบจาก ${companyName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
            <h2 style="color: #10b981; margin-top: 0;">คำขอสาธิตระบบใหม่ (Request a Demo)</h2>
            <p>มีผู้ใช้งานใหม่สนใจระบบ Autogram Eco-Sync รายละเอียดดังนี้:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 120px;">ชื่อ-นามสกุล:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #1f2937;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">บริษัท:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #1f2937;">${companyName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">อีเมล:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #1f2937;">
                  <a href="mailto:${email}" style="color: #3b82f6; text-decoration: none;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">เบอร์โทรศัพท์:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #1f2937;">${phone}</td>
              </tr>
            </table>
            <p style="margin-top: 20px; font-size: 13px; color: #9ca3af;">
              ระบบได้บันทึกข้อมูลนี้ลงในฐานข้อมูล (Collection: leads) แล้ว
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } else {
      console.warn('EMAIL_USER or EMAIL_PASS not set in environment variables. Email notification was not sent.');
    }

    return NextResponse.json({
      message: 'ส่งข้อมูลนัดหมายสำเร็จ',
      leadId: newLead._id,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Lead submission error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}
