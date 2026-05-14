'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useLIFF } from '@/components/LIFFProvider';

export default function LIFFRedirectHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isInitializing } = useLIFF();
  const targetPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Capture the target path ONCE if it exists in the URL
    if (!targetPathRef.current) {
      const liffState = searchParams.get('liff.state');
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const liffStateInHash = hashParams.get('liff.state');
      const finalState = liffState || liffStateInHash;
      
      if (finalState) {
        targetPathRef.current = decodeURIComponent(finalState);
        console.log('LIFFRedirectHandler: Captured target path', targetPathRef.current);
      }
    }

    if (isInitializing) return; // Wait for LIFF to be ready at the current URL first

    if (targetPathRef.current) {
      const targetPath = targetPathRef.current;
      // Ensure it's a relative path to our own site
      if (targetPath.startsWith('/') && targetPath !== pathname) {
        console.log('LIFFRedirectHandler: Redirecting to captured path', targetPath);
        // We use origin + path + search to keep everything intact
        router.replace(targetPath + window.location.search);
      }
    }
  }, [searchParams, pathname, router, isInitializing]);

  return null;
}
