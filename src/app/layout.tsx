import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ClientSessionProvider from "@/components/SessionProvider";
import PWARegister from "@/components/PWARegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SHIF",
  description: "Asset-light logistics carbon intelligence platform",
  manifest: "/manifest.json?v=4",
  icons: {
    icon: "/icons/icon-192x192.png?v=4",
    shortcut: "/icons/icon-192x192.png?v=4",
    apple: "/icons/icon-192x192.png?v=4",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SHIF",
    startupImage: [
      {
        url: "/splash/iphone5.png?v=4",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/iphone6.png?v=4",
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/iphoneplus.png?v=4",
        media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/iphonex.png?v=4",
        media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/iphonex.png?v=4",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/iphonex.png?v=4",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/iphonex.png?v=4",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/iphonex.png?v=4",
        media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/iphonex.png?v=4",
        media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/iphonex.png?v=4",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/ipad.png?v=4",
        media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/ipadpro1.png?v=4",
        media: "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/ipadpro1.png?v=4",
        media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/ipadpro2.png?v=4",
        media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClientSessionProvider>
          {children}
        </ClientSessionProvider>
        <PWARegister />
      </body>
    </html>
  );
}


