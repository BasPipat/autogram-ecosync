"use client";

import React from 'react';
import { useJsApiLoader, GoogleMap } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '1rem',
};

const center = {
  lat: 13.7563,
  lng: 100.5018
};

const mapDarkStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

export default function OverviewPage() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const activeVehicles = 0;

  return (
    // กำหนดสีพื้นหลังให้เป็น Deep Navy และดันให้เต็มจอ เพื่อให้กลืนกับระบบ
    <div className="flex-1 w-full p-8 min-h-screen bg-[#0a192f] text-white font-sans">
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xs font-bold tracking-widest text-[#10b981] uppercase mb-1">Overview</h1>
          <h2 className="text-3xl font-extrabold text-white">Overview Dashboard</h2>
          <p className="text-gray-400 mt-2 text-sm">แสดงตำแหน่งรถที่สถานะ Active พร้อมข้อมูลคนขับแบบเรียลไทม์</p>
        </div>
        
        <div className="bg-[#112240] px-4 py-2 rounded-full border border-gray-700 flex items-center gap-3 shadow-sm">
          <span className="text-xs text-gray-400">Google Maps Key:</span>
          <span className="text-xs font-bold text-[#10b981] flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            Configured
          </span>
        </div>
      </div>

      <div className="bg-[#112240] rounded-2xl shadow-2xl border border-gray-800 p-2 mb-6 relative overflow-hidden">
        {!isLoaded ? (
          <div className="h-[500px] flex items-center justify-center text-gray-400 flex-col gap-3">
            <div className="w-8 h-8 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
            <p>กำลังโหลดแผนที่ระบบอัจฉริยะ...</p>
          </div>
        ) : loadError ? (
          <div className="h-[500px] flex items-center justify-center text-red-400 bg-red-900/20 rounded-xl">
            <p>เกิดปัญหาในการเชื่อมต่อ Google Maps API กรุณาตรวจสอบ Key</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden shadow-inner">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={11}
              options={{
                styles: mapDarkStyle,
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
              }}
            >
            </GoogleMap>
          </div>
        )}
      </div>

      <div className="bg-[#e6fcf5] text-[#047857] px-5 py-4 rounded-xl flex items-center gap-3 font-semibold shadow-sm border border-[#a7f3d0]">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Active Vehicles: <span className="text-xl mx-1">{activeVehicles}</span> คัน</span>
      </div>
      
    </div>
  );
}