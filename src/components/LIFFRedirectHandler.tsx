'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLIFF } from '@/components/LIFFProvider';

export default function LIFFRedirectHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const { isInitializing, liffRedirectTarget } = useLIFF();
  const didRedirect = useRef(false);

  useEffect(() => {
    // Wait for LIFF to fully initialize (and process the code token)
    if (isInitializing) return;

    // Already redirected
    if (didRedirect.current) return;

    // No target to redirect to
    if (!liffRedirectTarget) return;

    // Already on the target page
    if (liffRedirectTarget === pathname) return;

    // ============================================================
    // Redirect WITHOUT code params - session is already stored
    // by liff.init() above. The target page will call liff.init()
    // again and find the session in storage → isLoggedIn() = true
    // ============================================================
    didRedirect.current = true;
    console.log('[LIFFRedirectHandler] Redirecting to:', liffRedirectTarget);
    router.replace(liffRedirectTarget);
  }, [isInitializing, liffRedirectTarget, pathname, router]);

  return null;
}
