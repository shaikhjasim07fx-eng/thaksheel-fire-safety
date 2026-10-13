const BUSINESS = {
  name: "Thaksheel Fire & Safety Equipment",
  whatsapp: "918277194101", // Confirm this is the correct WhatsApp-enabled business number before launch.
  email: "info@thaksheelfireandsafety.com"
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

window.addEventListener("load", () => {
  document.body.classList.remove("loading");
  window.setTimeout(() => $("#loader")?.classList.add("done"), 950);
});
document.body.classList.add("loading");
$("#year").textContent = new Date().getFullYear();

const menuToggle = $("#menuToggle");
const nav = $("#nav");
menuToggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});
$$(".nav a").forEach(a => a.addEventListener("click", () => {
  nav.classList.remove("open");
  menuToggle?.setAttribute("aria-expanded", "false");
}));

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in-view");
      revealObserver.unobserve(entry.target);
    }
  });
}, {threshold: 0.12});
$$(".reveal").forEach(el => revealObserver.observe(el));

const backTop = $("#backTop");
window.addEventListener("scroll", () => backTop?.classList.toggle("visible", window.scrollY > 600), {passive:true});
backTop?.addEventListener("click", () => window.scrollTo({top:0,behavior:"smooth"}));

const productSearch = $("#productSearch");
const productCards = $$(".product-card");
let activeFilter = "all";
function filterProducts() {
  const term = (productSearch?.value || "").toLowerCase().trim();
  productCards.forEach(card => {
    const categoryMatch = activeFilter === "all" || card.dataset.category === activeFilter;
    const searchMatch = !term || (card.dataset.search + " " + card.innerText).toLowerCase().includes(term);
    card.classList.toggle("hidden", !(categoryMatch && searchMatch));
  });
}
productSearch?.addEventListener("input", filterProducts);
$$(".filter").forEach(button => button.addEventListener("click", () => {
  $$(".filter").forEach(b => b.classList.remove("active"));
  button.classList.add("active");
  activeFilter = button.dataset.filter;
  filterProducts();
}));

const modal = $("#productModal");
const modalTitle = $("#modalTitle");
const modalProduct = $("#modalProduct");
$$(".product-quote").forEach(button => button.addEventListener("click", () => {
  const product = button.dataset.product;
  modalTitle.textContent = "Request details: " + product;
  modalProduct.value = product;
  if (typeof modal.showModal === "function") modal.showModal();
  else modal.setAttribute("open", "");
}));
$("#modalClose")?.addEventListener("click", () => modal.close());
modal?.addEventListener("click", e => { if (e.target === modal) modal.close(); });

function makeWhatsAppUrl(message) {
  return "https://wa.me/" + BUSINESS.whatsapp + "?text=" + encodeURIComponent(message);
}
function formToMessage(data, title = "Website enquiry") {
  return [
    "THAKSHEEL FIRE & SAFETY — " + title,
    "Enquiry type: " + (data.type || data.product || "Product enquiry"),
    data.name ? "Name: " + data.name : "",
    data.company ? "Organisation: " + data.company : "",
    data.phone ? "Phone: " + data.phone : "",
    data.email ? "Email: " + data.email : "",
    data.location ? "Site / tender: " + data.location : "",
    data.product ? "Product: " + data.product : "",
    data.details ? "Product details: " + data.details : "",
    data.message ? "Requirement: " + data.message : "",
    data.assetId ? "Asset ID: " + data.assetId : "",
    "Source: thaksheelfireandsafety.com"
  ].filter(Boolean).join("\n");
}

async function sendEmailNotification(payload) {
  try {
    const response = await fetch("/api/lead", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    return {ok: response.ok && result.ok, stored: Boolean(result.stored), emailSent: Boolean(result.emailSent), message: result.emailSent ? "Email notification sent." : (result.stored ? "Enquiry saved. Email notifications still need configuration." : (result.message || "Email automation is not configured yet."))};
  } catch (error) {
    return {ok:false, message:"Email endpoint is not available in this preview. WhatsApp can still be used."};
  }
}

$("#enquiryForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $("#formStatus");
  const button = $(".btn-submit", form);
  const data = Object.fromEntries(new FormData(form).entries());
  const query = new URLSearchParams(window.location.search);
  if (query.has("asset")) data.assetId = query.get("asset");
  const message = formToMessage(data);
  status.classList.remove("error");
  status.textContent = "Preparing your enquiry…";
  button.disabled = true;
  $(".submit-label", button).textContent = "Preparing…";

  // Email notification is attempted first; WhatsApp remains the customer-facing fallback.
  const emailResult = await sendEmailNotification({...data, source:"website-enquiry", assetId:data.assetId || ""});
  status.textContent = emailResult.emailSent
    ? "Enquiry saved and email notification sent. WhatsApp will open so you can send the message to Thaksheel."
    : emailResult.stored
      ? "Enquiry saved. Email notifications need configuration. WhatsApp will open so you can send the message to Thaksheel."
      : "WhatsApp will open with your enquiry. " + emailResult.message;

  window.open(makeWhatsAppUrl(message), "_blank", "noopener");
  button.disabled = false;
  $(".submit-label", button).textContent = "Send enquiry";
});

$("#productModalForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const message = formToMessage({...data, type:"Equipment quotation"}, "Product specification & quotation request");
  window.open(makeWhatsAppUrl(message), "_blank", "noopener");
  modal.close();
});

// Product-category QR workflow: one reusable QR per category, not per individual asset.
const categories = {
  "Fire extinguishers": {slug:"fire-extinguishers", search:"extinguisher"},
  "Fire hydrant systems": {slug:"fire-hydrant-systems", search:"hydrant"},
  "Fire alarm and detection": {slug:"fire-alarm-detection", search:"fire alarm"},
  "Emergency lights and signage": {slug:"emergency-lights-signage", search:"emergency light"},
  "Personal protective equipment": {slug:"personal-protective-equipment", search:"helmet"},
  "Rescue and safety equipment": {slug:"rescue-safety-equipment", search:"rescue"},
  "Foam and special applications": {slug:"foam-special-applications", search:"foam"}
};
let currentQrUrl = "";
function getSelectedCategory() { return $("#categorySelect")?.value || "Fire extinguishers"; }
function makeCategoryUrl(name) {
  const url = new URL(window.location.origin + "/");
  url.searchParams.set("productCategory", categories[name]?.slug || "fire-extinguishers");
  url.hash = "products";
  return url.toString();
}
function renderQr() {
  const name = getSelectedCategory();
  $("#categoryName").textContent = name;
  currentQrUrl = makeCategoryUrl(name);
  const target = $("#qrCode");
  if (!target) return;
  target.innerHTML = "";
  if (window.QRCode) {
    new QRCode(target, {text: currentQrUrl, width: 140, height: 140, colorDark:"#101d2b", colorLight:"#ffffff", correctLevel:QRCode.CorrectLevel.H});
  } else {
    target.innerHTML = '<div class="qr-placeholder">QR<br>LIBRARY<br>LOADING</div>';
    setTimeout(() => { if (window.QRCode) renderQr(); }, 500);
  }
}
$("#categorySelect")?.addEventListener("change", renderQr);
window.addEventListener("load", renderQr);
$("#printQr")?.addEventListener("click", () => {
  const name = getSelectedCategory();
  const qr = $("#qrCode img")?.src || $("#qrCode canvas")?.toDataURL("image/png");
  if (!qr) return alert("QR code is still loading. Try again in a moment.");
  const printWindow = window.open("", "_blank", "width=460,height=560");
  if (!printWindow) return alert("Allow pop-ups to print this QR code.");
  printWindow.document.write(`<!doctype html><html><head><title>${name} QR</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:30px;color:#101d2b}img{width:220px;height:220px}h1{font-size:22px}.brand{font-weight:bold;letter-spacing:3px;color:#f05a28}</style></head><body><div class="brand">THAKSHEEL / FIRE & SAFETY</div><h1>${name}</h1><p>Scan to view product information</p><img src="${qr}" alt="QR code"><p>${currentQrUrl}</p><script>window.onload=()=>window.print()<\/script></body></html>`);
  printWindow.document.close();
});
$("#downloadQr")?.addEventListener("click", () => {
  const canvas = $("#qrCode canvas"); const img = $("#qrCode img");
  const source = canvas ? canvas.toDataURL("image/png") : img?.src;
  if (!source) return alert("QR code is still loading. Try again in a moment.");
  const link = document.createElement("a"); link.href = source;
  link.download = (categories[getSelectedCategory()]?.slug || "product-category") + "-qr.png"; link.click();
});
$("#categoryWhatsApp")?.addEventListener("click", () => {
  const name = getSelectedCategory();
  window.open(makeWhatsAppUrl(`Hello Thaksheel Fire & Safety, I am interested in ${name}. Please share available products, verified specifications, datasheets and a quotation.`), "_blank", "noopener");
});
// Category QR visits land on the equipment section and prefill the catalogue search.
const params = new URLSearchParams(window.location.search);
if (params.has("productCategory")) {
  const slug = params.get("productCategory").slice(0,100);
  const mapping = Object.entries(categories).find(([, value]) => value.slug === slug);
  if (mapping && $("#productSearch")) {
    const friendly = mapping[1].search;
    $("#productSearch").value = friendly;
    $("#productSearch").dispatchEvent(new Event("input", {bubbles:true}));
  }
  setTimeout(() => $("#products")?.scrollIntoView({behavior:"smooth"}), 500);
}

$$("[data-enquiry]").forEach(link => link.addEventListener("click", () => {
  const type = link.dataset.enquiry;
  if ($("#enquiryType")) $("#enquiryType").value = type.includes("tender") || type.includes("Tender") ? "Government / institutional tender" : "Commercial fire protection";
}));

// Display only database-approved reviews for which public display consent was recorded.
async function loadPublishedReviews() {
  const target = $("#publishedReviews"); if (!target) return;
  try {
    const response = await fetch("/api/reviews"); const data = await response.json();
    const reviews = (response.ok && data.ok && Array.isArray(data.reviews)) ? data.reviews : [];
    if (!reviews.length) { target.innerHTML = "<p>Be among the first customers to share genuine feedback. Reviews will appear here after approval and consent.</p>"; return; }
    target.innerHTML = "";
    reviews.forEach(r => {
      const article = document.createElement("article"); article.className = "published-review";
      const stars = document.createElement("div"); stars.className = "published-stars";
      const rating = Math.max(0, Math.min(5, Number(r.rating) || 0)); stars.textContent = "★".repeat(rating) + "☆".repeat(5-rating);
      const comment = document.createElement("p"); comment.textContent = r.comment || "";
      const byline = document.createElement("span"); byline.textContent = `${r.display_name || "Customer"} · ${r.service_type || ""}`;
      article.append(stars, comment, byline); target.appendChild(article);
    });
  } catch { target.innerHTML = "<p>Customer reviews will appear here once the review database is connected.</p>"; }
}
loadPublishedReviews();

// Review form: stores submissions through /api/reviews. API/database must be configured before launch.
$("#reviewForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $("#reviewStatus");
  const button = $(".review-submit-label", form);
  const data = Object.fromEntries(new FormData(form).entries());
  data.publishConsent = data.publishConsent === "yes";
  status.classList.remove("error"); status.textContent = "Submitting your feedback…";
  button.textContent = "Submitting…";
  try {
    const response = await fetch("/api/reviews", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data)});
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || "Review storage is not configured yet.");
    form.reset(); status.textContent = "Thank you. Your review has been received and will be checked before publication.";
  } catch (err) {
    status.classList.add("error"); status.textContent = "Review database is not connected yet. Please contact Thaksheel directly for now.";
  } finally { button.textContent = "Submit review"; }
});

// Fire Assist chat UI. Uses a connected Worker AI endpoint when configured; otherwise guided replies.
const botPanel = $("#firebotPanel");
const botMessages = $("#firebotMessages");
function botBubble(text, who="bot") {
  const node = document.createElement("div"); node.className = who === "user" ? "user-message" : "bot-message";
  node.textContent = text; botMessages.appendChild(node); botMessages.scrollTop = botMessages.scrollHeight;
}
function botFallback(text) {
  const q = text.toLowerCase();
  if (/(extinguisher|hydrant|alarm|ppe|foam|product|equipment|datasheet)/.test(q)) return "I can help you find equipment. Browse the Equipment section for categories and available information. For model-specific ratings, approvals, compatibility or datasheets, Thaksheel's team must verify the exact product. Would you like a WhatsApp product enquiry?";
  if (/(price|cost|quotation|quote|estimate|tender)/.test(q)) return "I can help prepare a quotation enquiry. Please share the site/city, product or service category and approximate quantity if known. Tap ‘Request a quotation’ or use the WhatsApp enquiry button to send the details to Thaksheel.";
  if (/(install|inspection|service|maintenance|refill|project|mall|shop|factory)/.test(q)) return "Thaksheel accepts enquiries for fire-safety equipment, commercial requirements and service work. The right scope depends on the site and applicable requirements. Use the enquiry form to share your location and requirement so the team can follow up.";
  if (/(human|person|contact|phone|call|whatsapp|team)/.test(q)) return "You can contact Thaksheel at +91 82771 94101, +91 96869 49100 or +91 95918 89100. Email: info@thaksheelfireandsafety.com. Tap below to open WhatsApp with a ready-made message.";
  if (/(emergency|fire now|burning|smoke|trapped)/.test(q)) return "If there is an active fire or immediate danger, evacuate, raise the alarm and contact local emergency services immediately. Do not rely on this website chatbot for emergency response or equipment-use instructions.";
  return "I can help with product discovery, service enquiries, quotations and contacting the team. Tell me which product or service you need, or choose one of the quick options below. For technical compliance and site-specific advice, Thaksheel must confirm the details.";
}
async function askFireAssist(text) {
  const question = String(text || "").trim().slice(0,400); if (!question) return;
  botBubble(question, "user");
  const quick = $("#firebotQuick"); if (quick) quick.style.display = "none";
  try {
    const response = await fetch("/api/chat", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:question})});
    const result = await response.json();
    botBubble(response.ok && result.reply ? result.reply : botFallback(question));
  } catch { botBubble(botFallback(question)); }
  const actions = document.createElement("div"); actions.className = "bot-message";
  const link = document.createElement("a"); link.href = makeWhatsAppUrl("Hello Thaksheel Fire & Safety, I need help with: " + question); link.target="_blank"; link.rel="noopener"; link.textContent="Continue on WhatsApp ↗"; link.style.color="#d84d22"; link.style.fontWeight="700";
  actions.appendChild(link); botMessages.appendChild(actions); botMessages.scrollTop=botMessages.scrollHeight;
}
$("#firebotLauncher")?.addEventListener("click", () => { botPanel.hidden = !botPanel.hidden; if (!botPanel.hidden) $("#firebotInput")?.focus(); });
$("#firebotClose")?.addEventListener("click", () => { botPanel.hidden = true; });
$("#firebotQuick")?.addEventListener("click", event => {
  const button = event.target.closest("button[data-bot]"); if (!button) return;
  const prompts = {products:"Help me find a product",services:"What services does Thaksheel provide?",quote:"I want to request a quotation",human:"I want to talk to customer care"};
  askFireAssist(prompts[button.dataset.bot] || "Help me");
});
$("#firebotForm")?.addEventListener("submit", event => { event.preventDefault(); const input=$("#firebotInput"); const value=input.value; input.value=""; askFireAssist(value); });

$("#floatingWhatsApp")?.addEventListener("click", event => {
  event.currentTarget.href = makeWhatsAppUrl("Hello Thaksheel Fire & Safety, I would like to discuss a fire safety requirement.");
});
