export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { verifyResetPasswordToken } from '@/lib/jwt';


export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || !password || String(password).length < 8) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบหรือรหัสผ่านสั้นเกินไป (ขั้นต่ำ 8 ตัว)' }, { status: 400 });
    }

    const payload = verifyResetPasswordToken(String(token));
    if (payload.type !== 'password_reset') {
      return NextResponse.json({ error: 'Token ไม่ถูกต้อง' }, { status: 400 });
    }

    await connectToDatabase();
    const hashedPassword = await bcrypt.hash(String(password), 10);
    await User.findByIdAndUpdate(payload.userId, { password: hashedPassword });

    return NextResponse.json({ message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
  } catch (error) {
    console.error('reset-password error', error);
    return NextResponse.json({ error: 'Token หมดอายุหรือไม่ถูกต้อง' }, { status: 400 });
  }
}
