import { withAuth } from "next-auth/middleware";

// ประกาศตัวแปรรับค่าฟังก์ชันให้ชัดเจน Turbopack จะได้ไม่งง
const proxy = withAuth({
  callbacks: {
    authorized: ({ token }) => token?.role === "customer" || token?.role === "admin",
  },
});

// ส่งออกฟังก์ชัน
export default proxy;

// กำหนดเส้นทางที่ต้องการล็อคประตู
export const config = { 
  matcher: ["/", "/dashboard/:path*"] 
};