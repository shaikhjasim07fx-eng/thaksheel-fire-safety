# Thaksheel Fire & Safety — Cloudflare Worker + D1 website

This package contains the static website plus a Cloudflare Worker API. The site includes About Thaksheel, an experience/client marquee, product-category QR generation, prefilled WhatsApp enquiries, a customer review form, a Fire Assist chat interface, and a small private admin page for review moderation and enquiry viewing.

## Important status notes

- Product/project claims, named client logos, exact H&M scope, certificate details and product specifications must be verified and approved by Thaksheel before public launch.
- The QR workflow is one QR per product category. It points to the live website's product catalogue. Confirm the final production domain before printing any QR labels.
- WhatsApp opens a prefilled message. The customer must tap Send. It does not silently send messages.
- Review submissions are saved as `pending`. Only an administrator can approve them, and only reviews with public display consent are shown publicly.
- Fire Assist uses Cloudflare Workers AI if the AI binding is available; otherwise it returns safe guided fallback answers. It is not an emergency service and does not replace professional fire-safety advice.
- Database-backed reviews and enquiry storage do not work until the D1 database is created and its ID is added to `wrangler.toml`.

## Deploy using Cloudflare Workers

1. In Cloudflare Dashboard, open **Storage & databases → D1 SQL Database** (or **Workers & Pages → D1** depending on the current dashboard layout).
2. Create a D1 database named `thaksheel-fire-safety-db`.
3. Open the new database's **Settings / Overview** and copy its database ID.
4. In `wrangler.toml`, replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` with that exact ID.
5. In the D1 database's SQL console, execute the full contents of `migrations/0001_initial.sql` once. This creates the product-category QR records, reviews, enquiries and client-project tables.
6. In Cloudflare Workers, configure these Worker secrets/environment variables:
   - `ADMIN_API_KEY` — a long random secret used to access `/admin.html`.
   - `RESEND_API_KEY` — optional, for email notifications.
   - `LEADS_TO_EMAIL` — destination inbox for leads.
   - `LEADS_FROM_EMAIL` — a verified sender address/domain in Resend.
7. Ensure the Workers AI binding is enabled for the account. If it is not available, the chat widget uses its safe fallback responses. Do not add an AI API key to public JavaScript.
8. Deploy from the repository root with `npx wrangler deploy`, or commit this package to the connected GitHub repository and use the configured Cloudflare deployment workflow.

## Admin page

Open `https://YOUR-WORKER-DOMAIN/admin.html`. Enter the `ADMIN_API_KEY` secret. The key is held in session storage for the current browser tab. The admin view can load review submissions, approve/reject/reset reviews and view stored enquiries. Keep the key private. Do not share the admin URL together with the key publicly.

## API endpoints

- `GET /api/health` — simple status response.
- `GET /api/products` — active product-category records from D1.
- `POST /api/reviews` — create a pending review.
- `GET /api/reviews` — approved public reviews with consent only.
- `GET /api/reviews?view=admin` — admin review list; requires `Authorization: Bearer ADMIN_API_KEY`.
- `PATCH /api/reviews/:id` — moderation action; requires admin key.
- `POST /api/lead` — stores an enquiry in D1 and optionally sends an email via Resend.
- `GET /api/enquiries` — admin enquiry list; requires admin key.
- `POST /api/chat` — Fire Assist response via Workers AI if enabled, with fallback replies.

## Updating products and QR categories

The seeded QR category list is in `migrations/0001_initial.sql`. Edit category records in the D1 SQL console using the correct product name, verified description, specifications JSON and datasheet URL. Never invent product ratings, approvals or compliance claims. Each category slug should remain stable after QR labels are printed.

## Final checks before launch

- Confirm the correct WhatsApp-enabled business number in `app.js`.
- Test all navigation, contact links, QR generation, QR scan on a second device, WhatsApp prefill, review submission and admin moderation.
- Test enquiry storage and email delivery with a controlled test submission.
- Replace illustrative project artwork with approved real project photographs.
- Add only client logos/names and testimonials for which the company has permission.
- Publish an appropriate privacy notice for review and enquiry data.
- Do not use this chatbot for emergency response or to make site-specific compliance decisions.
