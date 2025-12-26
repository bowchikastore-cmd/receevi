import { SupabaseClientType } from "../_shared/supabase_types.ts";

// Define the shape of the response from Meta/Facebook
interface MetaTemplateData {
  id: string;
  name: string;
  category: string;
  status: string;
  language: string;
  previous_category?: string; // Optional field
  components: any[];          // JSONB data for headers, footers, etc.
}

export async function syncMessageTemplates(supabase: SupabaseClientType) {
  // 1. Retrieve Secrets
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const businessAccountId = Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID");

  if (!accessToken || !businessAccountId) {
    throw new Error(
      "Missing Secrets: WHATSAPP_ACCESS_TOKEN or WHATSAPP_BUSINESS_ACCOUNT_ID is not set in Supabase."
    );
  }

  console.log("Starting template sync for Account ID:", businessAccountId);

  // 2. Fetch Templates from Meta (WhatsApp API)
  const url = `https://graph.facebook.com/v18.0/${businessAccountId}/message_templates?limit=200`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Meta API Error:", errorText);
    throw new Error(`Failed to fetch templates from Meta: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const templates: MetaTemplateData[] = json.data;

  if (!templates || templates.length === 0) {
    console.log("No templates found on Meta to sync.");
    return;
  }

  console.log(`Fetched ${templates.length} templates. Upserting to database...`);

  // 3. Map Data to Your Database Schema
  // We map the API response to the 'message_template' table columns
  const upsertData = templates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    // Handle simplified language object from Meta (sometimes it's a string, sometimes an object)
    language: typeof t.language === 'object' ? (t.language as any).code : t.language,
    status: t.status,
    previous_category: t.previous_category || null,
    components: t.components,
    updated_at: new Date().toISOString(), // Update timestamp
  }));

  // 4. Upsert into the Correct Table ('message_template')
  const { error } = await supabase
    .from("message_template") // <--- CRITICAL FIX: Was 'templates'
    .upsert(upsertData, { onConflict: "id" });

  if (error) {
    console.error("Supabase Database Error:", error);
    throw new Error(`Database Sync Failed: ${error.message}`);
  }

  console.log("Successfully synced message templates!");
}
