'use client';

import { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function LIFFRedirectHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check for liff.state in query parameters
    const liffState = searchParams.get('liff.state');
    
    // 2. Check for liff.state in URL hash (some LIFF flows use this)
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.replace('#', ''));
    const liffStateInHash = hashParams.get('liff.state');

    const finalState = liffState || liffStateInHash;

    if (finalState) {
      const targetPath = decodeURIComponent(finalState);
      // Ensure it's a relative path to our own site
      if (targetPath.startsWith('/') && targetPath !== pathname) {
        console.log('LIFFRedirectHandler: Redirecting to', targetPath);
        router.replace(targetPath);
      }
    }
  }, [searchParams, pathname, router]);

  return null;
}
