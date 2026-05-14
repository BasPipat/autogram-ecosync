'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

interface LIFFContextType {
  lineUserId: string | null;
  isLoggedIn: boolean;
  isInitializing: boolean;
  liffRedirectTarget: string | null;
  error: string | null;
}

const LIFFContext = createContext<LIFFContextType>({
  lineUserId: null,
  isLoggedIn: false,
  isInitializing: true,
  liffRedirectTarget: null,
  error: null,
});

export const useLIFF = () => useContext(LIFFContext);

export default function LIFFProvider({ children }: { children: React.ReactNode }) {
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [liffRedirectTarget, setLiffRedirectTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ============================================================
    // STEP 1: Capture liff.state BEFORE liff.init() clears the URL
    // ============================================================
    const params = new URLSearchParams(window.location.search);
    const rawState = params.get('liff.state');
    if (rawState) {
      const decoded = decodeURIComponent(rawState);
      if (decoded.startsWith('/')) {
        console.log('[LIFFProvider] Captured redirect target:', decoded);
        setLiffRedirectTarget(decoded);
      }
    }

    // ============================================================
    // STEP 2: Initialize LIFF (processes the code, stores session)
    // ============================================================
    const initLiff = async () => {
      const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || '2010054204-bv5oRtcL';
      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLineUserId(profile.userId);
          setIsLoggedIn(true);
          console.log('[LIFFProvider] Logged in as:', profile.userId);
        } else {
          console.log('[LIFFProvider] Not logged in after init');
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
    <LIFFContext.Provider
      value={{ lineUserId, isLoggedIn, isInitializing, liffRedirectTarget, error }}
    >
      {children}
    </LIFFContext.Provider>
  );
}
