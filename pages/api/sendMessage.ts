// pages/api/sendMessage.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, message } = req.body || {};
  if (!to || !message) return res.status(400).json({ error: 'Missing "to" or "message"' });

  const token = process.env.WHATSAPP_ACCESS_TOKEN as string;
  const phoneNumberId = process.env.WHATSAPP_API_PHONE_NUMBER_ID as string;
  if (!token || !phoneNumberId) return res.status(500).json({ error: 'WA envs missing' });

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const payload = { messaging_product: 'whatsapp', to, type: 'text', text: { body: message, preview_url: false } };
    const { data } = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('Send message error:', err?.response?.data || err?.message);
    return res.status(502).json({ error: 'WhatsApp API failed', details: err?.response?.data || err?.message });
  }
}
