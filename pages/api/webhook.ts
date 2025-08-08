const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const VERIFY_TOKEN = 'human';
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      const entry = body.entry?.[0]?.changes?.[0]?.value;
      const message = entry?.messages?.[0];
      const contact = entry?.contacts?.[0];

      if (!message || !contact) return res.status(200).send('No content');

      const wa_id = contact.wa_id;
      const profile_name = contact.profile?.name;
      const text = message.text?.body;
      const timestamp = new Date(+message.timestamp * 1000).toISOString();

      // 1. Upsert contact
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .upsert(
          {
            wa_id,
            profile_name,
            last_message_at: timestamp,
            last_message_received_at: timestamp,
            in_chat: true,
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
        console.error("❌ No user_id found after upsert");
        return res.status(500).json({ error: "No contact ID found" });
      }

      // 2. Insert message
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

      console.log("✅ Message saved successfully.");
      return res.status(200).send('OK');
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      return res.status(500).json({ error: 'Unexpected error' });
    }
  }

  res.status(405).send('Method Not Allowed');
};
