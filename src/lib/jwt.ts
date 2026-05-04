import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'eco-sync-dev-secret';

export type ResetPasswordPayload = {
  userId: string;
  email: string;
  type: 'password_reset';
};

export function signResetPasswordToken(
  payload: ResetPasswordPayload,
  expiresIn: jwt.SignOptions['expiresIn'] = '15m'
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyResetPasswordToken(token: string): ResetPasswordPayload {
  return jwt.verify(token, JWT_SECRET) as ResetPasswordPayload;
}
