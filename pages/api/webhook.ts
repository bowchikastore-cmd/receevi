// pages/api/webhook.ts

import type { NextApiRequest, NextApiResponse } from 'next';

const VERIFY_TOKEN = 'human'; // Your new verify token

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Verification failed');
    }
  } else if (req.method === 'POST') {
    console.log('Webhook received', JSON.stringify(req.body, null, 2));
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
