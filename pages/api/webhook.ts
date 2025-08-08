// pages/api/webhook.ts

import type { NextApiRequest, NextApiResponse } from 'next';

const VERIFY_TOKEN = 'human'; // Match this with Meta

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook Verified');
      return res.status(200).send(challenge);
    } else {
      console.log('❌ Webhook Verification Failed');
      return res.status(403).send('Verification failed');
    }
  }

  if (req.method === 'POST') {
    console.log('📩 Webhook Received:');
    console.dir(req.body, { depth: null });
    return res.status(200).send('EVENT_RECEIVED');
  }

  res.status(405).send(`Method ${req.method} Not Allowed`);
}
