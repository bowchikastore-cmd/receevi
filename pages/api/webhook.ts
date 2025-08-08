import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const VERIFY_TOKEN = 'bowchika98101';

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(`${challenge}`);
    } else {
      return res.status(403).send('Verification failed');
    }
  }

  // Optional: log webhook messages later here
  return res.status(200).send('Webhook received');
}
