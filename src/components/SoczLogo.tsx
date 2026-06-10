'use client';

import React from 'react';
import ShifLogo from './ShifLogo';

interface SoczLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  variant?: 'light' | 'dark' | 'color';
  style?: React.CSSProperties;
}

export default function SoczLogo(props: SoczLogoProps) {
  // Proxy all props to the new ShifLogo component
  return <ShifLogo {...props} />;
}
