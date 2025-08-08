// pages/api/webhook.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const VERIFY_TOKEN = "human";

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = parseInt(req.query['hub.challenge'] as string, 10);

    if (mode === 'subscribe' && token === VERIFY_TOKEN && !isNaN(challenge)) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end(challenge.toString()); // returns a numeric string, no quotes
    } else {
      res.status(403).end('Verification failed');
    }
    return;
  }

  res.status(405).end('Method Not Allowed');
}
