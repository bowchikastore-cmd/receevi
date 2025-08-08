import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const VERIFY_TOKEN = 'human';
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send("Forbidden");
    }
  }

  if (req.method === 'POST') {
    try {
      const entry = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = entry?.messages?.[0];
      const contact = entry?.contacts?.[0];

      if (!message || !contact) {
        console.log("📭 No message or contact in webhook");
        return res.status(200).send("No message or contact found");
      }

      const wa_id = contact.wa_id;
      const profile_name = contact.profile?.name || '';
      const text = message.text?.body || '';
      const timestamp = new Date(Number(message.timestamp) * 1000).toISOString();

      // Step 1: Upsert contact
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .upsert(
          {
            wa_id,
            profile_name,
            last_message_at: timestamp,
            last_message_received_at: timestamp,
            in_chat: true
          },
          { onConflict: 'wa_id', returning: 'representation' }
        )
        .select();

      if (contactError) {
        console.error('❌ Failed to upsert contact:', contactError);
        return res.status(500).json({ error: contactError.message });
      }

      const user_id = contactData?.[0]?.id;

      if (!user_id) {
        console.error('❌ No user_id found after contact upsert');
        return res.status(500).json({ error: 'Contact upsert failed' });
      }

      // Step 2: Insert message
      const { error: messageError } = await supabase.from('messages').insert({
        user_id,
        direction: 'inbound',
        message: text,
        wa_message_id: message.id,
        timestamp,
      });

      if (messageError) {
        console.error('❌ Failed to insert message:', messageError);
        return res.status(500).json({ error: messageError.message });
      }

      console.log('✅ Message saved:', text);
      return res.status(200).send("Message received and saved");
    } catch (error) {
      console.error('❌ Webhook error:', error);
      return res.status(500).json({ error: 'Unexpected error' });
    }
  }

  return res.status(405).send("Method Not Allowed");
}
