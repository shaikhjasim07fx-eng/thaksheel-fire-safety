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
    return {ok: response.ok && result.ok, message: result.message || (response.ok ? "Email notification sent." : "Email automation is not configured yet.")};
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
  status.textContent = emailResult.ok
    ? "Email notification sent. WhatsApp will open so you can send the enquiry to Thaksheel."
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

// QR demo: QR URLs are based on the deployed host and prefill the asset service request.
const assets = {
  "TFSE-EXT-001": {type:"Fire extinguisher", label:"Fire extinguisher"},
  "TFSE-HYD-014": {type:"Hydrant point", label:"Hydrant point"},
  "TFSE-ALM-003": {type:"Fire alarm panel", label:"Fire alarm panel"}
};
let currentQrUrl = "";
function renderQr() {
  const id = $("#assetSelect")?.value || "TFSE-EXT-001";
  const item = assets[id];
  $("#assetId").textContent = id;
  $("#assetType").textContent = item.type;
  const url = new URL(window.location.origin + "/");
  url.searchParams.set("asset", id);
  url.hash = "contact";
  currentQrUrl = url.toString();
  const target = $("#qrCode");
  target.innerHTML = "";
  if (window.QRCode) {
    new QRCode(target, {text: currentQrUrl, width: 124, height: 124, colorDark:"#101d2b", colorLight:"#ffffff", correctLevel:QRCode.CorrectLevel.H});
  } else {
    target.innerHTML = '<div class="qr-placeholder">QR<br>LIBRARY<br>LOADING</div>';
    setTimeout(() => { if (window.QRCode) renderQr(); }, 500);
  }
}
$("#assetSelect")?.addEventListener("change", renderQr);
window.addEventListener("load", renderQr);
$("#printQr")?.addEventListener("click", () => {
  const id = $("#assetSelect").value;
  const item = assets[id];
  const qr = $("#qrCode img")?.src || $("#qrCode canvas")?.toDataURL("image/png");
  if (!qr) { window.print(); return; }
  const printWindow = window.open("", "_blank", "width=460,height=560");
  if (!printWindow) return alert("Allow pop-ups to print this QR label.");
  printWindow.document.write(`<!doctype html><html><head><title>${id} QR Label</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:30px;color:#101d2b}img{width:220px;height:220px}h1{font-size:22px}p{font-size:12px;color:#53616b}.brand{font-weight:bold;letter-spacing:3px;color:#f05a28}</style></head><body><div class="brand">THAKSHEEL / FIRE & SAFETY</div><h1>${id}</h1><p>${item.type} · Scan to request service</p><img src="${qr}" alt="QR code"><p>${currentQrUrl}</p><script>window.onload=()=>window.print()<\/script></body></html>`);
  printWindow.document.close();
});
$("#downloadQr")?.addEventListener("click", () => {
  const canvas = $("#qrCode canvas");
  const img = $("#qrCode img");
  const source = canvas ? canvas.toDataURL("image/png") : img?.src;
  if (!source) return alert("QR code is still loading. Try again in a moment.");
  const link = document.createElement("a");
  link.href = source;
  link.download = ($("#assetSelect").value || "thaksheel-asset") + "-qr.png";
  link.click();
});

// Convert QR URL visits into a prefilled service request.
const params = new URLSearchParams(window.location.search);
if (params.has("asset")) {
  const assetId = params.get("asset").slice(0,80);
  $("#enquiryType").value = "QR asset service request";
  $("#enquiryLocation").value = "Asset ID: " + assetId;
  $("#enquiryMessage").value = "Please contact me about service for asset " + assetId + ".";
  setTimeout(() => $("#contact").scrollIntoView({behavior:"smooth"}), 1300);
}

$$("[data-enquiry]").forEach(link => link.addEventListener("click", () => {
  const type = link.dataset.enquiry;
  if ($("#enquiryType")) $("#enquiryType").value = type.includes("tender") || type.includes("Tender") ? "Government / institutional tender" : "Commercial fire protection";
}));

$("#floatingWhatsApp")?.addEventListener("click", event => {
  event.currentTarget.href = makeWhatsAppUrl("Hello Thaksheel Fire & Safety, I would like to discuss a fire safety requirement.");
});
