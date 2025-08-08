import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const VERIFY_TOKEN = 'bowchika98101';

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end(challenge); // ✅ No .send — use .end() for raw output
      return;
    }

    res.statusCode = 403;
    res.end('Forbidden');
  } else {
    res.statusCode = 405;
    res.end('Method Not Allowed');
  }
}
