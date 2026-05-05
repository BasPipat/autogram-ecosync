import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email หรือ User ID", type: "text", placeholder: "email@company.com หรือ user123" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("กรุณากรอก Email หรือ User ID และรหัสผ่านให้ครบถ้วน");
        }

        await connectToDatabase();
        
        const user = await User.findOne({
          $or: [
            { email: credentials.email },
            { username: credentials.email }
          ]
        });
        
        if (!user) {
          throw new Error("ไม่พบบัญชีผู้ใช้งานระบบ");
        }

        const isPasswordMatch = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordMatch) {
          throw new Error("รหัสผ่านไม่ถูกต้อง");
        }

        return { 
          id: user._id.toString(), 
          name: user.name, 
          email: user.email, 
          role: user.role,
          companyId: user.companyId ? String(user.companyId) : undefined,
          companyName: user.companyName || undefined,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.companyId = (user as any).companyId;
        token.companyName = (user as any).companyName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).companyId = token.companyId;
        (session.user as any).companyName = token.companyName;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, 
  },
  pages: {
    signIn: '/', 
  },
  secret: process.env.NEXTAUTH_SECRET, 
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };