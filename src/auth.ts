import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email or User ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectToDatabase();

        // 🟢 ค้นหาผู้ใช้: ยอมให้ใช้ทั้ง Email หรือ User ID (username) ในการ Login
        const user = await User.findOne({
          $or: [
            { email: credentials.email },
            { username: credentials.email } 
          ]
        });

        if (!user || !user.password) {
          throw new Error("ไม่พบผู้ใช้งานในระบบ");
        }

        // ตรวจสอบรหัสผ่าน
        const isValid = await bcrypt.compare(credentials.password as string, user.password);
        
        if (!isValid) {
          throw new Error("รหัสผ่านไม่ถูกต้อง");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
});