'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function LIFFRedirectHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (didRedirect.current) return;

    // Read liff.state from URL IMMEDIATELY before LIFF SDK clears it
    const search = window.location.search;
    const hash = window.location.hash;

    // Try from query string: ?liff.state=%2Fdriver%2Fmy-mission
    const params = new URLSearchParams(search);
    let liffState = params.get('liff.state');

    // Try from hash: #liff.state=%2Fdriver%2Fmy-mission
    if (!liffState && hash) {
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      liffState = hashParams.get('liff.state');
    }

    if (liffState) {
      const targetPath = decodeURIComponent(liffState);
      if (targetPath.startsWith('/') && targetPath !== pathname) {
        didRedirect.current = true;
        console.log('[LIFFRedirectHandler] Redirecting to:', targetPath);
        // Preserve code/state params for LIFF SDK to process on the target page
        router.replace(targetPath + search);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run ONCE on mount only

  return null;
}
