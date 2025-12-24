import { NextResponse } from "next/server";

// FACEBOOK VERIFY (GET)
export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WEBHOOK_VERIFY_TOKEN
  ) {
    console.log("✅ Webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// RECEIVE MESSAGES (POST)
export async function POST(req) {
  const body = await req.json();
  console.log("📩 Incoming WhatsApp webhook:", JSON.stringify(body, null, 2));

  return NextResponse.json({ success: true });
}
