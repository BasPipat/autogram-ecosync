import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export type SessionTokenInfo = {
  id?: string;
  role?: string;
  email?: string;
  companyId?: string;
  companyName?: string;
};

// system_owner and owner both get God Mode (multi-tenant) access.
// Admin and Operator are scoped to their own company only.
const INTERNAL_ROLES = new Set(['system_owner', 'owner']);

export async function getSessionToken(req: NextRequest): Promise<SessionTokenInfo | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return null;
  return {
    id: typeof token.id === 'string' ? token.id : undefined,
    role: typeof token.role === 'string' ? token.role : undefined,
    email: typeof token.email === 'string' ? token.email : undefined,
    companyId: typeof token.companyId === 'string' ? token.companyId : undefined,
    companyName: typeof token.companyName === 'string' ? token.companyName : undefined,
  };
}

export function isInternalRole(role?: string): boolean {
  return !!role && INTERNAL_ROLES.has(role);
}
