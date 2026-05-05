import { redirect } from 'next/navigation';

export default function LoginPage() {
  // Redirect the old /login route to the new Landing Page (/)
  redirect('/');
}
