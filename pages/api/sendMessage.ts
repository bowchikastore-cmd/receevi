// pages/api/sendMessage.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing "to" or "message"' });
  }

  try {
    const token = process.env.WHATSAPP_TOKEN; // Permanent token from Meta
    const phoneNumberId = process.env.PHONE_NUMBER_ID; // Your phone number ID

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    return res.status(200).json({ success: true, data: response.data });
  } catch (error: any) {
    console.error('Send message error:', error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data || 'Failed to send message',
    });
  }
}
