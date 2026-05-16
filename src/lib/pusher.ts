import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

const PUSHER_CLUSTER = 'ap1';

// Server-side instance (for API routes)
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: PUSHER_CLUSTER,
  useTLS: true,
});

// Client-side instance (for React components)
// Note: In client-side, we only need the key and cluster
export const getPusherClient = () => {
  if (typeof window === 'undefined') return null;
  return new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
    cluster: PUSHER_CLUSTER,
  });
};
