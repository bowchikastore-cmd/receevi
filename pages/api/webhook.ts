import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VERIFY_TOKEN = 'human' // Your token for webhook verification

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook Verified')
      return res.status(200).send(challenge)
    } else {
      console.log('❌ Webhook Verification Failed')
      return res.status(403).send('Verification failed')
    }
  }

  if (req.method === 'POST') {
    console.log('📩 Webhook Received:')
    console.dir(req.body, { depth: null })

    const entry = req.body.entry?.[0]
    const change = entry?.changes?.[0]
    const message = change?.value?.messages?.[0]
    const contact = change?.value?.contacts?.[0]

    if (message && contact) {
      const { from, id: wa_message_id, timestamp, text, type } = message
      const name = contact.profile?.name || null

      // Insert message into `messages` table
      const { error: messageError } = await supabase.from('messages').insert([
        {
          user_id: from,
          direction: 'inbound',
          message: text?.body || '',
          wa_message_id,
          timestamp: new Date(Number(timestamp) * 1000).toISOString()
        }
      ])

      if (messageError) {
        console.error('❌ Failed to insert message:', messageError)
      } else {
        console.log('✅ Message stored successfully')
      }

      // Upsert contact into `contacts` table
      const { error: contactError } = await supabase.from('contacts').upsert(
        [
          {
            wa_id: from,
            name,
            in_chat: true,
            last_message_at: new Date(Number(timestamp) * 1000).toISOString(),
            last_message_received_at: new Date(Number(timestamp) * 1000).toISOString()
          }
        ],
        { onConflict: 'wa_id' }
      )

      if (contactError) {
        console.error('❌ Failed to upsert contact:', contactError)
      } else {
        console.log('✅ Contact upserted successfully')
      }
    }

    return res.status(200).send('EVENT_RECEIVED')
  }

  return res.status(405).end()
}
