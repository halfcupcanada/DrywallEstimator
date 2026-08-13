# DrywallPro External Deployment Guide

This application is a **Node.js + Express + React + MySQL-compatible database** application. It cannot run on a static-only host because authentication, project storage, Stripe webhooks, and email delivery use the server process.

> Do not copy existing Manus environment values into another provider. Create new credentials under the HalfCup-controlled Stripe, Resend, and database accounts, then store them in the new host's encrypted environment-variable settings.

## Build and Run Commands

| Setting | Value |
|---|---|
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |
| Start command | `pnpm start` |
| Production process | `NODE_ENV=production node dist/index.js` |
| Required service type | Web service with a Node.js runtime and a MySQL-compatible database |

The server respects the host-provided `PORT` variable. Configure the host to forward HTTPS traffic to the running web service.

## Required for the Core App

The following values are necessary for email/password sign-in, session security, saved projects, teams, and the calculation tool.

| Variable | Required | Example or format | Where to obtain it |
|---|---:|---|---|
| `NODE_ENV` | Yes | `production` | Set in the host dashboard. |
| `DATABASE_URL` | Yes | `mysql://USER:PASSWORD@HOST:3306/DATABASE?ssl={}` | A new MySQL- or TiDB-compatible database connection string. |
| `JWT_SECRET` | Yes | A unique random secret of at least 32 bytes | Generate a new value, for example with `openssl rand -base64 48`. |
| `PORT` | Host-provided | `3000` locally | Usually set automatically by the host; do not hard-code it. |

After setting `DATABASE_URL`, initialize the fresh database using `pnpm db:push` **once** from a trusted deployment or local administrative environment. Do not run migrations against an unknown production database without a backup.

## Stripe Billing: Required Only for Paid Subscriptions

The estimation app, email/password sign-in, and 14-day local trial can operate without Stripe. Stripe is required when users must start Checkout, manage a billing portal, or have Stripe webhook events update their subscription state.

| Variable | Required for billing | Source |
|---|---:|---|
| `STRIPE_SECRET_KEY` | Yes | Stripe Dashboard → Developers → API keys. Use a test key for testing and a live key only after launch. |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe Dashboard → Developers → Webhooks → the endpoint signing secret. |

Create a Stripe webhook endpoint at:

```text
https://YOUR_DOMAIN/api/stripe/webhook
```

Enable these events because they are handled by the current code:

```text
checkout.session.completed
invoice.payment_failed
invoice.paid
customer.subscription.updated
customer.subscription.deleted
```

The server creates its Stripe products and CAD monthly prices on first checkout if the configured lookup keys do not yet exist. The Checkout flow is configured for a 14-day trial with payment collected after the trial, subject to the Stripe account and price configuration.[1]

## Resend Email: Required Only for Sending Emails

Resend is required for team invitations and any welcome or trial-reminder email features you enable.

| Variable | Required for email | Recommended value |
|---|---:|---|
| `RESEND_API_KEY` | Yes | A new Resend API key created in the HalfCup Resend account. |
| `EMAIL_FROM` | Yes | `DrywallPro by HalfCup <noreply@drywall.halfcup.ca>` |

The sending domain `drywall.halfcup.ca` must remain verified in the same Resend account as the new `RESEND_API_KEY`; otherwise Resend rejects the email request.[2]

## No OAuth or AI Key Is Required for the Current Customer Flow

DrywallPro currently uses its built-in **email/password** authentication routes (`/login` and `/signup`) with bcrypt password hashing and a signed session cookie. You do **not** need Google OAuth, Manus OAuth, or an AI-model API key for normal user login, drawing, estimating, PDF export, projects, team membership, or billing.

The codebase still contains legacy Manus fallback modules. For a completely independent deployment, remove or conditionally disable the following startup registrations before relying on the app outside Manus:

```ts
registerOAuthRoutes(app);
registerStorageProxy(app);
```

They are registered in `server/_core/index.ts`. The email/password routes remain active independently.

## Manus-Only / Optional Variables

Do not provide these values on an external host unless you intentionally keep the corresponding Manus service integration. They are not required by the current email/password product flow.

| Variable | Purpose | External-host action |
|---|---|---|
| `VITE_APP_ID` | Legacy Manus OAuth fallback | Leave unset after disabling Manus OAuth. |
| `OAUTH_SERVER_URL` | Legacy Manus OAuth fallback | Leave unset after disabling Manus OAuth. |
| `OWNER_OPEN_ID`, `OWNER_NAME` | Manus owner-notification helpers | Leave unset unless replacing notifications with your own service. |
| `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Manus Forge storage, LLM, maps, and transcription proxy | Leave unset. Replace with your own storage/AI/map service only if adding those features. |
| `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY` | Browser-side Manus Forge access | Leave unset. |
| `VITE_OAUTH_PORTAL_URL` | Manus OAuth portal | Leave unset. |
| `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID` | Manus analytics | Leave unset or replace with a non-Manus analytics integration. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Not used by the present Checkout implementation | Optional; the server creates Checkout sessions. |

## Minimum External `.env` Template

```dotenv
NODE_ENV=production
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/drywallpro?ssl={}
JWT_SECRET=REPLACE_WITH_A_NEW_HIGH_ENTROPY_SECRET

# Required only when enabling Stripe billing
STRIPE_SECRET_KEY=sk_live_or_test_REPLACE_ME
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME

# Required only when sending Resend email
RESEND_API_KEY=re_REPLACE_ME
EMAIL_FROM="DrywallPro by HalfCup <noreply@drywall.halfcup.ca>"
```

## Recommended Deployment Sequence

1. Provision a MySQL-compatible database and set `DATABASE_URL` and a new `JWT_SECRET`.
2. Deploy the service with the build and start commands above, then test `/signup`, `/login`, project saving, and the PDF export over HTTPS.
3. Add Resend values and send a test invitation from the deployed domain.
4. Add Stripe keys, configure the production webhook URL, and complete a test Checkout flow.
5. Disable the legacy Manus OAuth and Forge startup routes or replace them with non-Manus equivalents before treating the external host as fully independent.

## References

[1]: https://docs.stripe.com/billing/subscriptions/trials "Stripe subscription trials"
[2]: https://resend.com/docs/dashboard/domains/introduction "Resend domain verification"
