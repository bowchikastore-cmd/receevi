import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Supabase client
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

      // Step 1: Check if contact exists
      const { data: existingContact, error: fetchErr } = await supabase
        .from('contacts')
        .select('id')
        .eq('wa_id', wa_id)
        .maybeSingle();

      if (fetchErr) {
        console.error("❌ Failed to fetch contact:", fetchErr);
        return res.status(500).json({ error: fetchErr.message });
      }

      let user_id = existingContact?.id;

      // Step 2: If not, insert new contact
      if (!user_id) {
        const { data: newContact, error: insertErr } = await supabase
          .from('contacts')
          .insert({
            wa_id,
            profile_name,
            last_message_at: timestamp,
            last_message_received_at: timestamp,
            in_chat: true,
          })
          .select()
          .single();

        if (insertErr) {
          console.error("❌ Failed to insert contact:", insertErr);
          return res.status(500).json({ error: insertErr.message });
        }

        user_id = newContact.id;
      }

      // Step 3: Insert message
      const { error: msgError } = await supabase.from('messages').insert({
        user_id,
        direction: 'inbound',
        message: text,
        wa_message_id: message.id,
        timestamp,
      });

      if (msgError) {
        console.error('❌ Failed to insert message:', msgError);
        return res.status(500).json({ error: msgError.message });
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
