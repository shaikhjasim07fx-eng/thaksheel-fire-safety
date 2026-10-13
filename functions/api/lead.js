export async function onRequestPost({ request, env }) {
  const cors = {
    "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors }
  });

  if (request.method !== "POST") return json({ ok:false, message:"Method not allowed." }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ ok:false, message:"Invalid JSON." }, 400); }

  const clean = value => String(value ?? "").trim().slice(0, 5000);
  const name = clean(body.name);
  const phone = clean(body.phone);
  const email = clean(body.email);
  const type = clean(body.type || body.product || "Website enquiry");
  const company = clean(body.company);
  const location = clean(body.location);
  const message = clean(body.message || body.details);
  const assetId = clean(body.assetId);
  const source = clean(body.source || "website");

  if (!name || !phone) return json({ ok:false, message:"Name and phone are required." }, 400);
  if (!env.RESEND_API_KEY || !env.LEADS_TO_EMAIL || !env.LEADS_FROM_EMAIL) {
    return json({ ok:false, message:"Email notification is not configured. WhatsApp enquiry remains available." }, 503);
  }

  const text = [
    "New Thaksheel website enquiry",
    "",
    `Enquiry type: ${type}`,
    `Name: ${name}`,
    `Company: ${company || "Not provided"}`,
    `Phone: ${phone}`,
    `Email: ${email || "Not provided"}`,
    `Site / tender: ${location || "Not provided"}`,
    `Asset ID: ${assetId || "Not applicable"}`,
    `Source: ${source}`,
    "",
    "Requirement:",
    message || "Not provided"
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.LEADS_FROM_EMAIL,
        to: [env.LEADS_TO_EMAIL],
        reply_to: email || undefined,
        subject: `[Thaksheel Website] ${type} — ${name}`,
        text
      })
    });
    if (!response.ok) {
      const details = await response.text();
      console.error("Resend email error", response.status, details.slice(0, 500));
      return json({ ok:false, message:"Email provider could not accept the enquiry. Please use WhatsApp." }, 502);
    }
    return json({ ok:true, message:"Email notification sent." });
  } catch (error) {
    console.error("Email send failed", error);
    return json({ ok:false, message:"Email notification failed. Please use WhatsApp." }, 502);
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    }
  });
}
