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
- [ ] Auto-save on wall changes (debounced 2s) — future enhancement

## Seat-Based Team Plans
- [x] Add `companies` table (id, name, ownerId, seats)
- [x] Add `companyMembers` table (id, companyId, userId, role, inviteToken, inviteEmail, status)
- [x] Run pnpm db:push (tables created via SQL)
- [x] Add teamRouter tRPC procedures: createCompany, inviteMember, acceptInvite, listMembers, removeMember
- [x] Add /team page (manage company, invite by email, member list)
- [x] Add /join page (accept invite via token)
- [x] Add "Team" link in app header
- [x] Send owner notification on new member join
- [ ] Gate /app access by company membership — future enhancement
