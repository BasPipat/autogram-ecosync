'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

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
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initLiff = async () => {
      const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || '2010054204-bv5oRtcL';

      try {
        // Dynamically import liff to avoid SSR issues
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLineUserId(profile.userId);
          setIsLoggedIn(true);
        }
      } catch (err: any) {
        console.error('[LIFFProvider] Init Error:', err);
        setError(err.message || 'LIFF init failed');
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
