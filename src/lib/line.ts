import { Client } from '@line/bot-sdk';

let client: Client | null = null;

export function getLineClient() {
  if (!client) {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (!channelAccessToken || !channelSecret) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET must be configured');
    }

    client = new Client({ channelAccessToken, channelSecret });
  }

  return client;
}

export function getLineChannelSecret() {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    throw new Error('LINE_CHANNEL_SECRET must be configured');
  }
  return channelSecret;
}
