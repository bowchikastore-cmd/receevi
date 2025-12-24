import fetch from "node-fetch";
import { Client, Databases, ID } from "node-appwrite";

export default async ({ req, res, log }) => {
  try {
    // Sirf POST pe sync karega
    if (req.method !== "POST") {
      return res.json({ message: "Use POST to sync templates" });
    }

    log("🚀 WhatsApp template sync started");

    // ---------- Appwrite setup ----------
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // ---------- WhatsApp API ----------
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;

    const url = `https://graph.facebook.com/v19.0/${wabaId}/message_templates`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    const json = await response.json();
    const templates = json.data || [];

    log(`📦 Templates fetched: ${templates.length}`);

    // ---------- Save templates ----------
    for (const tpl of templates) {
      await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_COLLECTION_ID,
        ID.unique(),
        {
          template_id: tpl.id,
          name: tpl.name,
          language: tpl.language,
          status: tpl.status,
          category: tpl.category,
          previous_category: tpl.previous_category || null,
          components: JSON.stringify(tpl.components),
          waba_id: wabaId,
        }
      );
    }

    return res.json({
      success: true,
      templates_synced: templates.length,
    });
  } catch (err) {
    log("❌ Sync failed");
    log(err.message);

    return res.json(
      {
        success: false,
        error: err.message,
      },
      500
    );
  }
};
