import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { signResetPasswordToken } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'กรุณาระบุอีเมล' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: String(email).trim().toLowerCase() });

    // Do not leak user existence
    if (!user) {
      return NextResponse.json({ message: 'หากอีเมลมีอยู่ในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้' });
    }

    const token = signResetPasswordToken({
      userId: String(user._id),
      email: user.email,
      type: 'password_reset',
    });

    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${encodeURIComponent(token)}`;
    return NextResponse.json({
      message: 'สร้างลิงก์รีเซ็ตรหัสผ่านสำเร็จ',
      resetUrl,
    });
  } catch (error) {
    console.error('forgot-password error', error);
    return NextResponse.json({ error: 'ไม่สามารถดำเนินการได้' }, { status: 500 });
  }
}
