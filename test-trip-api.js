const fetch = require('node-fetch');

async function test() {
  console.log('Getting CSRF token...');
  const csrfRes = await fetch('https://autogram-ecosync.vercel.app/api/auth/csrf');
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  
  const csrfCookies = csrfRes.headers.get('set-cookie') || '';
  const parsedCookies = csrfCookies.split(',').map(c => c.split(';')[0]).join('; ');

  console.log('Logging in...');
  const loginRes = await fetch('https://autogram-ecosync.vercel.app/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': parsedCookies
    },
    body: `email=l3aspipat%40gmail.com&password=zxcvbnm%2C&csrfToken=${csrfToken}`,
    redirect: 'manual'
  });

  const cookies = loginRes.headers.get('set-cookie');
  if (!cookies) {
    console.error('Login failed, no cookies', loginRes.status);
    return;
  }
  
  const sessionCookie = cookies.split(',').find(c => c.includes('next-auth.session-token') || c.includes('__Secure-next-auth.session-token'));
  if (!sessionCookie) {
    console.error('No session token in cookies:', cookies);
    return;
  }

  const allCookies = `${parsedCookies}; ${sessionCookie.split(';')[0]}`;

  console.log('Fetching trip...');
  const tripRes = await fetch('https://autogram-ecosync.vercel.app/api/trips/69fb888caab0016bc450aae8', {
    headers: {
      'Cookie': allCookies
    }
  });

  const data = await tripRes.json();
  console.log(JSON.stringify(data, null, 2));
}

test();
