'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import liff from '@line/liff';

interface LIFFContextType {
  lineUserId: string | null;
  isLoggedIn: boolean;
  isInitializing: boolean;
  error: string | null;
}

const LIFFContext = createContext<LIFFContextType>({
  lineUserId: null,
  isLoggedIn: false,
  isInitializing: true,
  error: null
});

export const useLIFF = () => useContext(LIFFContext);

export default function LIFFProvider({ children }: { children: React.ReactNode }) {
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || '2010054204-bv5oRtcL';
      
      try {
        await liff.init({ liffId });

        // If we detect a login callback, wait slightly for LIFF to finalize internal session
        const search = typeof window !== 'undefined' ? window.location.search : '';
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        const hasCode = search.includes('code=') || search.includes('liff.state=') || hash.includes('code=') || hash.includes('liff.state=');
        
        if (!liff.isLoggedIn() && hasCode) {
          await new Promise(r => setTimeout(r, 1000));
        }
        
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLineUserId(profile.userId);
          setIsLoggedIn(true);
        }
      } catch (err: any) {
        console.error('Global LIFF Init Error:', err);
        setError(err.message || 'Failed to initialize LINE LIFF');
      } finally {
        setIsInitializing(false);
      }
    };

    initLiff();
  }, []);

  return (
    <LIFFContext.Provider value={{ lineUserId, isLoggedIn, isInitializing, error }}>
      {children}
    </LIFFContext.Provider>
  );
}
