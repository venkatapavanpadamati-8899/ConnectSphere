# ConnectSphere — Premium Visual QA Report

**Run date:** 2026-09-15  
**Runner:** `node visual_qa.js` (Puppeteer)

## Changes verified

- Corrected the Reels document title and description.
- Kept Reels navigation controls inside the desktop stage; previous negative offsets caused horizontal overflow.
- Replaced deleted landing/dashboard image references with the new `assets/backgrounds/bg_*.jpg` assets.
- Added a local ConnectSphere favicon for the audited shell pages.
- Retained the existing ConnectSphere art direction, restrained motion, and reduced-motion support. This is an original social UI, not a copied third-party interface.

## Screenshot evidence

PNG and JSON evidence is in `qa_reports/visual/`. Each route below was captured at 1440×900, 768×1024, and 390×844.

| Page | Desktop | Tablet | Mobile | Background | Animation | Console / network | Result |
|---|---|---|---|---|---|---|---|
| Landing | PASS | PASS | PASS | PASS | inspected | External CDN errors; no pageerror | WARN |
| Login | PASS | PASS | PASS | PASS | inspected | External CDN errors; no pageerror | WARN |
| Signup | PASS | PASS | PASS | PASS | inspected | External CDN errors; no pageerror | WARN |
| Forgot password | PASS | PASS | PASS | PASS | inspected | External CDN errors; no pageerror | WARN |
| Dashboard | PASS | PASS | PASS | PASS | inspected | External CDN errors; no pageerror | WARN |
| Explore | PASS | PASS | PASS | PASS | inspected | External CDN errors; no pageerror | WARN |
| Reels | PASS | PASS | PASS | PASS | inspected | External CDN errors; no pageerror | WARN |
| Notifications | PASS | PASS | PASS | PASS | inspected | External CDN errors; no pageerror | WARN |
| Settings | PASS | PASS | PASS | PASS | inspected | External CDN errors; no pageerror | WARN |
| Messages | BLOCKED | BLOCKED | BLOCKED | N/A | N/A | Redirected to `/login` without session | BLOCKED |
| Profile | BLOCKED | BLOCKED | BLOCKED | N/A | N/A | Redirected to `/login` without session | BLOCKED |

All 33 captures reported `overflow: false`. Reels desktop was re-captured after the correction and passed.

## Defects and limits found

1. The environment blocks external Google Fonts, Font Awesome, and remote demo media with `net::ERR_NETWORK_ACCESS_DENIED`. There are no `pageerror` records, but clean console/network acceptance is blocked and remote demo images can appear broken. The browser Supabase SDK is now local at `frontend/js/vendor/supabase.js`; the remaining presentation dependencies still need local vendoring or replacement.
2. Messages and Profile correctly redirect to Login with no session, so their logged-in visual states were not reached.
3. PNG screenshots—not only DOM checks—are retained for every viewport.

## Functional-regression evidence

| Command | Outcome |
|---|---|
| `node qa_phase1.js` | PASS — route/environment assertions completed with 200/304 responses. |
| `node qa_full_e2e.js` | BLOCKED — signup ended with `Dialog: Failed to fetch`; Dashboard was not reached. |
| `node qa_phase2.js` | BLOCKED — first signup timed out and reported `Access denied`. |

## Acceptance status

**PASS:** route availability, captured responsive overflow checks, Reels overflow repair.  
**FAIL:** no visual-runner assertion failure.  
**BLOCKED:** live Supabase auth, clean external-resource console/network audit, and logged-in Messages/Profile visual QA.  
**NOT TESTED:** end-to-end Stories, Reels interaction, Notification arrival, Settings persistence, Storage upload/access, realtime delivery, and logout.

The full visual and functional acceptance criteria are **not met yet**. This report deliberately does not claim completion.
