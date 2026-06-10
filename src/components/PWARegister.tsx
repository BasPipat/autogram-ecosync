"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SHIF Service Worker registered: ", registration.scope);
        })
        .catch((error) => {
          console.error("SHIF Service Worker registration failed: ", error);
        });
    }
  }, []);

  return null;
}
