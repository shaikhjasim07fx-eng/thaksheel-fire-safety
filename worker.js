const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const clean = (value, max = 1200) => String(value ?? "").trim().slice(0, max);
const isAdmin = (request, env) => {
  const key = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  return Boolean(env.ADMIN_API_KEY && key && key === env.ADMIN_API_KEY);
};

async function notifyEmail(env, lead) {
  if (!env.RESEND_API_KEY || !env.LEADS_TO_EMAIL || !env.LEADS_FROM_EMAIL) return false;
  const lines = Object.entries(lead).filter(([,v]) => v !== undefined && v !== null && String(v).trim()).map(([k,v]) => `${k}: ${v}`).join("\n");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.LEADS_FROM_EMAIL, to: [env.LEADS_TO_EMAIL], subject: `New Thaksheel website enquiry — ${lead.enquiry_type || "Website enquiry"}`, text: lines })
  });
  return response.ok;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health" && request.method === "GET") return json({ ok: true, databaseConfigured: Boolean(env.DB) });

    if (url.pathname === "/api/products" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT slug, name, description, specifications_json, datasheet_url FROM product_categories WHERE is_active = 1 ORDER BY name").all();
      return json({ ok: true, products: results });
    }

    if (url.pathname === "/api/reviews" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ ok:false, error:"Invalid JSON body." }, 400); }
      const rating = Number(body.rating);
      const displayName = clean(body.displayName, 100) || null;
      const serviceType = clean(body.serviceType, 100);
      const comment = clean(body.comment, 1200);
      const publishConsent = body.publishConsent === true ? 1 : 0;
      if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !serviceType || comment.length < 8) return json({ ok:false, error:"Please provide a rating, service type and a comment of at least 8 characters." }, 400);
      // Public submissions are always pending; the client cannot self-approve a review.
      const result = await env.DB.prepare("INSERT INTO reviews (rating, display_name, service_type, comment, publish_consent, status) VALUES (?, ?, ?, ?, ?, 'pending')")
        .bind(rating, displayName, serviceType, comment, publishConsent).run();
      return json({ ok:true, id:result.meta.last_row_id, status:"pending" }, 201);
    }

    if (url.pathname === "/api/reviews" && request.method === "GET") {
      if (url.searchParams.get("view") === "admin") {
        if (!isAdmin(request, env)) return json({ ok:false, error:"Unauthorized" }, 401);
        const { results } = await env.DB.prepare("SELECT id, rating, display_name, service_type, comment, publish_consent, status, created_at FROM reviews ORDER BY created_at DESC LIMIT 250").all();
        return json({ ok:true, reviews:results });
      }
      const { results } = await env.DB.prepare("SELECT rating, display_name, service_type, comment, created_at FROM reviews WHERE status = 'approved' AND publish_consent = 1 ORDER BY created_at DESC LIMIT 12").all();
      return json({ ok:true, reviews:results });
    }

    if (url.pathname.startsWith("/api/reviews/") && request.method === "PATCH") {
      if (!isAdmin(request, env)) return json({ ok:false, error:"Unauthorized" }, 401);
      const id = Number(url.pathname.split("/").pop());
      let body; try { body = await request.json(); } catch { return json({ ok:false, error:"Invalid JSON body." }, 400); }
      const status = body.status;
      if (!Number.isInteger(id) || !["approved","rejected","pending"].includes(status)) return json({ ok:false, error:"Invalid review ID or status." }, 400);
      await env.DB.prepare("UPDATE reviews SET status = ?, moderated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, id).run();
      return json({ ok:true, id, status });
    }

    if (url.pathname === "/api/lead" && request.method === "POST") {
      let body; try { body = await request.json(); } catch { return json({ ok:false, error:"Invalid JSON body." }, 400); }
      const lead = {
        enquiry_type: clean(body.type || body.enquiry_type || "Website enquiry", 150),
        name: clean(body.name, 120), company: clean(body.company, 160), phone: clean(body.phone, 50),
        email: clean(body.email, 180), location: clean(body.location, 200),
        product_category_slug: clean(body.productCategorySlug, 120), message: clean(body.message, 2000),
        source: clean(body.source || "website", 100)
      };
      if (!lead.name && !lead.phone && !lead.email) return json({ ok:false, error:"Please provide at least one contact detail." }, 400);
      await env.DB.prepare("INSERT INTO enquiries (enquiry_type, name, company, phone, email, location, product_category_slug, message, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(lead.enquiry_type, lead.name, lead.company, lead.phone, lead.email, lead.location, lead.product_category_slug, lead.message, lead.source).run();
      let emailSent = false; try { emailSent = await notifyEmail(env, lead); } catch {}
      return json({ ok:true, stored:true, emailSent });
    }

    if (url.pathname === "/api/enquiries" && request.method === "GET") {
      if (!isAdmin(request, env)) return json({ ok:false, error:"Unauthorized" }, 401);
      const { results } = await env.DB.prepare("SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 250").all();
      return json({ ok:true, enquiries:results });
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      let body; try { body = await request.json(); } catch { return json({ ok:false, error:"Invalid JSON body." }, 400); }
      const message = clean(body.message, 400);
      if (!message) return json({ ok:false, error:"Please enter a question." }, 400);
      const system = "You are Fire Assist, the website customer-care assistant for Thaksheel Fire & Safety in Mangaluru, India. Help visitors find product categories, understand broad services, and prepare sales enquiries. Do not invent product specifications, certifications, prices, client endorsements, or service availability. Do not give site-specific compliance decisions or detailed emergency response instructions. If there is an active fire or immediate danger, tell the user to evacuate and contact local emergency services. For technical suitability, compliance, standards, or exact models, refer to a qualified Thaksheel professional. Contact details provided by the site: +91 82771 94101, +91 96869 49100, +91 95918 89100; info@thaksheelfireandsafety.com. Keep replies concise and offer WhatsApp or the website enquiry form.";
      if (env.AI) {
        try {
          const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { messages:[{role:"system",content:system},{role:"user",content:message}], max_tokens:220 });
          const reply = result?.response || result?.result?.response;
          if (reply) return json({ ok:true, reply });
        } catch (e) { /* Use safe fallback if AI model is not enabled for this account. */ }
      }
      const q = message.toLowerCase();
      let reply = "I can help with product discovery, service enquiries and quotations. For exact product specifications or site-specific fire-safety decisions, Thaksheel's team must verify the details. Contact +91 82771 94101 or info@thaksheelfireandsafety.com.";
      if (/emergency|fire now|burning|smoke|trapped/.test(q)) reply = "If there is an active fire or immediate danger, evacuate, raise the alarm and contact local emergency services immediately. Do not rely on this chatbot for emergency response.";
      else if (/price|cost|quotation|quote|tender/.test(q)) reply = "To request a quotation, share your site/city, product or service category and approximate quantity if known. Use the website enquiry form or WhatsApp; the team will confirm availability and pricing.";
      else if (/human|person|contact|phone|call|whatsapp/.test(q)) reply = "Contact Thaksheel at +91 82771 94101, +91 96869 49100 or +91 95918 89100, or email info@thaksheelfireandsafety.com.";
      else if (/product|extinguisher|hydrant|alarm|ppe|foam|datasheet/.test(q)) reply = "Browse the Equipment section to explore categories. Model-specific ratings, approvals and datasheets must be verified against current manufacturer documents. I can also prepare a WhatsApp product enquiry.";
      return json({ ok:true, reply, mode:"fallback" });
    }

    return env.ASSETS.fetch(request);
  }
};
