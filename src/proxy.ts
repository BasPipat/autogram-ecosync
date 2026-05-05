import { withAuth } from "next-auth/middleware";

const proxy = withAuth({
  callbacks: {
    authorized: ({ token }) => !!token, // ถ้ามี Token (ล็อกอินแล้ว) ให้ผ่านได้
  },
  pages: {
    signIn: '/',
  }
});

export default proxy;

export const config = { 
  // ล็อคเฉพาะหน้า Dashboard และหน้าแอดมิน
  // เว้นหน้าแรก (/), /login, /register และ /api/ อื่นๆ ไว้ให้คนใช้งานทั่วไปเข้าได้
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*"
  ] 
};