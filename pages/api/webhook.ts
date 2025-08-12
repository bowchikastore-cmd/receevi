import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE as string
);
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'human';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge as string);
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    try {
      const entry: any = req.body?.entry?.[0]?.changes?.[0]?.value;
      const message = entry?.messages?.[0];
      const contact = entry?.contacts?.[0];
      if (!message || !contact) return res.status(200).send('ok'); // statuses, etc.

      const wa_id = contact.wa_id as string;
      const profile_name = contact.profile?.name ?? '';
      const ts = message.timestamp ? new Date(+message.timestamp * 1000).toISOString() : new Date().toISOString();
      const text = message.text?.body ?? message?.button?.text ?? '';

      // upsert contact by wa_id
      const { data: c, error: cErr } = await supabase
        .from('contacts')
        .upsert(
          { wa_id, profile_name, in_chat: true, last_message_at: ts, last_message_received_at: ts },
          { onConflict: 'wa_id' }
        )
        .select('id')
        .single();
      if (cErr) return res.status(500).json({ error: cErr.message });

      // idempotent message insert by wa_message_id
      const { error: mErr } = await supabase.from('messages').upsert({
        user_id: c.id, direction: 'inbound', message: text, wa_message_id: message.id, timestamp: ts
      }, { onConflict: 'wa_message_id' } as any);
      if (mErr) return res.status(500).json({ error: mErr.message });

      return res.status(200).send('ok');
    } catch (e) {
      console.error('webhook error', e);
      return res.status(500).json({ error: 'server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).send('Method Not Allowed');
}
