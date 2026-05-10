
function ensureHttps(url) {
  if (!url) return '';
  const trimmed = url.trim();
  
  // Nuclear Option: Extract coordinates and reconstruct
  const coordMatch = trimmed.match(/q=([\d.-]+),([\d.-]+)/) || trimmed.match(/@([\d.-]+),([\d.-]+)/);
  if (coordMatch) {
    return `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  
  let clean = trimmed;
  while (clean.startsWith('/') || clean.startsWith('.') || clean.startsWith(' ')) {
    clean = clean.substring(1);
  }

  if (clean.startsWith('maps.google.com') || clean.startsWith('maps.app.goo.gl')) {
    return `https://${clean}`;
  }
  
  if (clean.startsWith('google.com/maps')) {
    return `https://www.${clean}`;
  }

  if (clean.startsWith('www.')) return `https://${clean}`;
  
  if (clean.includes('google.com') || clean.includes('goo.gl')) {
    return `https://${clean}`;
  }

  return `https://${clean}`;
}

console.log('1:', ensureHttps('maps.google.com/?q=14.28,101.04'));
console.log('2:', ensureHttps('https://maps.google.com/?q=14.28,101.04'));
console.log('3:', ensureHttps('/maps.google.com/?q=14.28,101.04'));
console.log('4:', ensureHttps('www.google.com/maps?q=14.28,101.04'));
console.log('5:', ensureHttps('q=14.28,101.04'));
console.log('6:', ensureHttps('  /maps.google.com/?q=14.28,101.04'));
