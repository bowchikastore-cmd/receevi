import fetch from "node-fetch";
import { Client, Databases, ID } from "node-appwrite";

export default async ({ req, res, log }) => {
  try {
    log("🚀 WhatsApp template sync started");

    // ---------- Appwrite Client ----------
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // ---------- WhatsApp API ----------
    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`WhatsApp API error: ${text}`);
    }

    const data = await response.json();
    const templates = data.data || [];

    log(`📦 Templates fetched: ${templates.length}`);

    // ---------- Save to Appwrite ----------
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
          waba_id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
        }
      );
    }

    return res.json({
      success: true,
      templates_synced: templates.length,
    });
  } catch (error) {
    log("❌ Error syncing templates");
    log(error.message);

    return res.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
};
