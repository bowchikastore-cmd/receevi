import fetch from "node-fetch";
import { Client, Databases, ID } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  if (req.method !== "POST") {
    return res.json({ ok: true, message: "Use POST to sync templates" });
  }

  try {
    // ============================
    // 1️⃣ ENV VARIABLES
    // ============================
    const {
      WHATSAPP_ACCESS_TOKEN,
      WHATSAPP_BUSINESS_ACCOUNT_ID,
      APPWRITE_ENDPOINT,
      APPWRITE_PROJECT_ID,
      APPWRITE_API_KEY,
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_ID,
    } = process.env;

    if (
      !WHATSAPP_ACCESS_TOKEN ||
      !WHATSAPP_BUSINESS_ACCOUNT_ID ||
      !APPWRITE_ENDPOINT ||
      !APPWRITE_PROJECT_ID ||
      !APPWRITE_API_KEY ||
      !APPWRITE_DATABASE_ID ||
      !APPWRITE_COLLECTION_ID
    ) {
      throw new Error("❌ Missing environment variables");
    }

    // ============================
    // 2️⃣ INIT APPWRITE
    // ============================
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const databases = new Databases(client);

    // ============================
    // 3️⃣ CALL WHATSAPP API
    // ============================
    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`;

    const waRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
    });

    const waData = await waRes.json();

    if (!waData.data) {
      throw new Error("❌ WhatsApp API returned no templates");
    }

    log(`📩 Templates fetched: ${waData.data.length}`);

    // ============================
    // 4️⃣ SAVE TO APPWRITE
    // ============================
    let saved = 0;

    for (const tpl of waData.data) {
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID,
        ID.unique(),
        {
          template_id: tpl.id,
          name: tpl.name,
          language: tpl.language,
          status: tpl.status,
          category: tpl.category,
          previous_category: tpl.previous_category || null,
          components: JSON.stringify(tpl.components),
          waba_id: WHATSAPP_BUSINESS_ACCOUNT_ID,
        }
      );

      saved++;
    }

    // ============================
    // 5️⃣ DONE
    // ============================
    return res.json({
      success: true,
      fetched: waData.data.length,
      saved,
    });

  } catch (err) {
    error(err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
