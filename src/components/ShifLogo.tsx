'use client';

import React from 'react';
import Image from 'next/image';

interface ShifLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  variant?: 'light' | 'dark' | 'color';
  style?: React.CSSProperties;
}

export default function ShifLogo({
  className = '',
  size = 'md',
  showTagline = false,
  variant = 'color',
  style,
}: ShifLogoProps) {
  // 2:1 Aspect Ratio matching the premium SVG (viewBox 800x400)
  const { width, height } = {
    sm: { width: 120, height: 60 },
    md: { width: 180, height: 90 },
    lg: { width: 260, height: 130 },
    xl: { width: 360, height: 180 },
  }[size] || { width: 180, height: 90 };

  // Use the premium transparent SVG by default for UI integration
  const logoSrc = '/shif-logo-premium-transparent.svg';

  return (
    <div className={`inline-flex flex-col items-start ${className}`} style={style}>
      <div 
        style={{ 
          position: 'relative', 
          width: width, 
          height: height 
        }}
      >
        <Image
          src={logoSrc}
          alt="SHIF Logo"
          fill
          className="object-contain object-left"
          priority
        />
      </div>
      <span className="sr-only">SHIF — Carbon Intelligence Platform</span>
    </div>
  );
}
