// /pages/api/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// ---- ENV (server-only) ----
const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'human';

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL');
if (!SUPABASE_SERVICE_ROLE) throw new Error('Missing SUPABASE_SERVICE_ROLE');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// (Optional) force Node runtime (not Edge) so process.env works
export const config = { runtime: 'nodejs' };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // --- GET: webhook verification ---
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge as string);
    }
    return res.status(403).send('Forbidden');
  }

  // --- POST: message events ---
  if (req.method === 'POST') {
    try {
      const entry: any = req.body?.entry?.[0]?.changes?.[0]?.value;
      const message = entry?.messages?.[0];
      const contact = entry?.contacts?.[0];

      // Ignore status-only payloads
      if (!message || !contact) return res.status(200).send('ok');

      const wa_id: string = contact.wa_id;
      const profile_name: string = contact.profile?.name ?? '';

      // text fallbacks (text / quick reply / button)
      const text: string =
        message?.text?.body ??
        message?.interactive?.button_reply?.title ??
        message?.button?.text ??
        '';

      const ts: string = message?.timestamp
        ? new Date(Number(message.timestamp) * 1000).toISOString()
        : new Date().toISOString();

      // 1) Upsert contact by wa_id
      const { data: c, error: cErr } = await supabase
        .from('contacts')
        .upsert(
          {
            wa_id,
            profile_name,
            in_chat: true,
            last_message_at: ts,
            last_message_received_at: ts,
          },
          { onConflict: 'wa_id' }
        )
        .select('id')
        .single();

      if (cErr) {
        console.error('❌ Contact upsert error:', cErr);
        return res.status(500).json({ error: cErr.message });
      }

      // 2) Upsert message (idempotent via wa_message_id) + FE expects chat_id = wa_id
      const { error: mErr } = await supabase
        .from('messages')
        .upsert(
          {
            user_id: c.id,
            chat_id: wa_id,           // 👈 important for your UI
            direction: 'inbound',
            message: text,
            wa_message_id: message.id,
            timestamp: ts,
          },
          { onConflict: 'wa_message_id' }
        );

      if (mErr) {
        console.error('❌ Message upsert error:', mErr);
        return res.status(500).json({ error: mErr.message });
      }

      return res.status(200).send('ok');
    } catch (e) {
      console.error('❌ Webhook exception:', e);
      return res.status(500).json({ error: 'server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).send('Method Not Allowed');
}
