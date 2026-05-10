
function ensureHttps(url) {
  if (!url) return '';
  let trimmed = url.trim();
  
  while (trimmed.startsWith('/')) {
    trimmed = trimmed.substring(1);
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  
  if (trimmed.startsWith('maps.google.com') || 
      trimmed.startsWith('google.com/maps') || 
      trimmed.startsWith('maps.app.goo.gl')) {
    return `https://${trimmed}`;
  }
  
  if (trimmed.startsWith('www.')) {
    return `https://${trimmed}`;
  }
  
  if (trimmed.includes('google.com') || trimmed.includes('goo.gl')) {
    return `https://${trimmed}`;
  }

  return `https://${trimmed}`;
}

console.log('1:', ensureHttps('maps.google.com/?q=14.28,101.04'));
console.log('2:', ensureHttps('https://maps.google.com/?q=14.28,101.04'));
console.log('3:', ensureHttps('/maps.google.com/?q=14.28,101.04'));
console.log('4:', ensureHttps('www.google.com/maps?q=14.28,101.04'));
