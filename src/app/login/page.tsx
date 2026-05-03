'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // 👈 เพิ่ม State ควบคุมการมองเห็น

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn('credentials', { email, password, callbackUrl: '/' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">AUTOGRAM</h2>
        <p className="text-center text-slate-500 mb-8">Eco-Sync Customer Portal</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email Address</label>
            <input 
              type="email" 
              className="w-full mt-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* 👇 แก้ไขช่อง Password ตรงนี้ครับ */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input 
              type={showPassword ? "text" : "password"} // สลับ type ระหว่าง text กับ password
              className="w-full mt-1 p-3 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {/* ปุ่มลูกตา */}
            <button
              type="button"
              className="absolute right-3 top-9 text-slate-500 hover:text-orange-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <button 
            type="submit" 
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600 border-t pt-4">
          ยังไม่มีบัญชีผู้ใช้งาน?{' '}
          <Link href="/register" className="text-orange-500 font-semibold hover:underline">
            สมัครสมาชิกที่นี่
          </Link>
        </div>
      </div>
    </div>
  );
}