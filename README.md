# Thaksheel Fire & Safety — Cloudflare Pages Website

A responsive static website concept with a Cloudflare Pages Function for email notifications.

## Included

- Responsive homepage and section-based corporate website
- Custom SVG logo and favicon
- Animated fire-inspired loading screen
- Scroll reveal and smooth navigation
- Searchable/filterable equipment categories
- Product specification/quote modal
- QR asset service demo with printable/downloadable QR labels
- WhatsApp enquiry message builder
- Cloudflare Pages Function that sends email notifications through Resend
- Tender, credentials and project sections designed for verified evidence

## Important publishing notes

This is a strong functional prototype, but it is **not yet a complete production backend**. The QR flow currently demonstrates asset IDs and prefilled service requests. A real asset register, login, service history, scheduled reminders, certificate/document storage and recurring maintenance alerts require a database and backend workflow.

The supplied official website lists these contact details:
- +91 82771 94101
- +91 96869 49100
- +91 95918 89100
- thaksheel.fse@gmail.com
- info@thaksheelfireandsafety.com
- Door No. 1 2-T-68/1(6), Pranam House, Nagakannika Temple Road, Derebail, Konchady, Mangaluru – 575008, Karnataka

A Justdial listing also shows 08460293135. Confirm the current official WhatsApp number before launch. The site currently uses +91 82771 94101 as a placeholder WhatsApp recipient in `app.js`; change `BUSINESS.whatsapp` to the verified WhatsApp-enabled number.

## Deploy to Cloudflare Pages

### Option A — Upload the folder
1. Unzip the package.
2. In Cloudflare Dashboard, open **Workers & Pages** → **Create** → **Pages** → **Upload assets** (the labels may change).
3. Upload the website folder contents, including `index.html`, `styles.css`, `app.js`, `assets/`, and `functions/`.
4. For Pages Functions, Git integration is recommended. If you use direct upload and the Functions folder is not built/deployed by that path, use Option B.

### Option B — Git-connected Cloudflare Pages (recommended for email function)
1. Create a Git repository and upload all files preserving the `functions/api/lead.js` path.
2. Connect the repository to Cloudflare Pages.
3. Framework preset: **None**.
4. Build command: leave blank.
5. Build output directory: `/` or the repository root, according to the Pages setup UI.
6. Ensure `functions/api/lead.js` is included in the deployed repository. The endpoint becomes `/api/lead`.

The static website itself does not need Wrangler or a build step.

## Configure automated email notifications

The form will open WhatsApp with the enquiry text. Email notification only works after configuring the Cloudflare Pages Function.

1. Create a Resend account and verify a sender domain/email as required by Resend.
2. In Cloudflare Pages → Settings → Environment variables, add:
   - `RESEND_API_KEY` — secret
   - `LEADS_TO_EMAIL` — destination inbox for new enquiries
   - `LEADS_FROM_EMAIL` — verified sender, e.g. `Thaksheel Website <leads@your-verified-domain>`
3. Redeploy the project.
4. Test `/api/lead` with a real test enquiry and verify the inbox/spam folder.

Do not put API keys in `app.js` or any public file. Email sending is not active until those environment variables are configured.

## WhatsApp

`app.js` currently contains:
```js
whatsapp: "918277194101"
```
Replace this with the confirmed WhatsApp-enabled business number in international digits only (no `+`, spaces or hyphens). If a different official number is approved, use that.

## QR asset workflow

The QR demo uses a browser QR-code library loaded from a CDN. It creates a URL on the deployed website with `?asset=TFSE-EXT-001` and scrolls to the enquiry form, prefilled with that asset ID.

For a production rollout:
- Create unique IDs for each actual asset/site.
- Generate QR labels using the real production domain.
- Store asset metadata in a secure database.
- Authenticate staff-only service history and inspection data.
- Avoid encoding sensitive personal, customer or facility details in the QR itself.

## Certificates and project photos

The official website lists MSME and ISO certification and participation in GeM, KPPP and CPPP. This prototype displays upload-ready credential cards, not fabricated certificate images. Before launch:
- Upload current certificate scans and verify validity, certificate number, issuer and scope.
- Upload real project photographs with permission.
- Confirm exact H&M project scope and approved reference wording.
- Keep historical tender awards separate from completed fire-protection installation projects.
- Replace illustrative equipment art with approved manufacturer/product images where available.
- Verify every product model specification against the manufacturer's current datasheet.

## Product specification policy

The catalogue contains product categories drawn from the company website, such as extinguishers, hydrant accessories, alarms/detectors, PPE, rescue equipment, safety signage, emergency lights and foam-related equipment. It intentionally does not invent capacities, performance ratings, standards, prices or model numbers.

## Security and privacy

Before public launch, add a privacy policy and consent wording reviewed by the business. If you later add uploads, CRM, analytics or an asset register, implement file limits, validation, access controls, spam prevention/rate limiting and a retention policy. Do not treat the demo asset IDs as a live maintenance register.
