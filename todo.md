# Drywall Estimator TODO

## PDF Estimate Export
- [x] Install jspdf + jspdf-autotable on client
- [x] Write generateEstimatePDF utility (wall list, openings, material totals, HalfCup branding)
- [x] Add "Download Report" button to EstimatePanel
- [x] Show project name input before export

## Project Save / Load
- [x] Add `projects` table to drizzle schema (id, userId, name, wallsJson, openingsJson, pxPerFoot, createdAt, updatedAt)
- [x] Run pnpm db:push (created table directly via SQL)
- [x] Add projectRouter tRPC procedures: list, get, save (upsert), delete
- [x] Add ProjectsPanel component (sidebar drawer listing saved projects)
- [x] Add Projects button to app header
- [x] Auto-save on wall changes (debounced 2s)

## Seat-Based Team Plans
- [x] Add `companies` table (id, name, ownerId, seats)
- [x] Add `companyMembers` table (id, companyId, userId, role, inviteToken, inviteEmail, status)
- [x] Run pnpm db:push (tables created via SQL)
- [x] Add teamRouter tRPC procedures: createCompany, inviteMember, acceptInvite, listMembers, removeMember
- [x] Add /team page (manage company, invite by email, member list)
- [x] Add /join page (accept invite via token)
- [x] Add "Team" link in app header
- [x] Send owner notification on new member join
- [x] Gate /app access by company membership (Enterprise team members can access without personal sub)

## Next Steps (Round 4)
- [x] Email invite delivery via Resend (send actual invite email from team.invite procedure)
- [x] Show active project name in app header
- [x] Stripe sandbox claim guidance for halfcupcanada@gmail.com

## Next Steps (Round 5)
- [x] Trial expiry enforcement via Stripe webhook (subscription.deleted / customer.subscription.updated)
- [x] First-run onboarding checklist modal (draw wall → close room → estimate → PDF)
- [x] Resend domain verification guide in admin settings panel

## Bug Fixes
- [x] Mobile popup blocker fix: replaced window.open with window.location.href for Stripe Checkout and Billing Portal
- [x] Admin bypass fix: admin role now bypasses subscription gate immediately without waiting for subscription data
