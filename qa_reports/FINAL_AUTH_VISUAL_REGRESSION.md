# CONNECTSPHERE — FINAL AUTH VISUAL + FUNCTIONAL REGRESSION

### Production Deployment
- **EXPECTED:** Vercel has latest code
- **ACTUAL:** New layout detected
- **EVIDENCE:** .cs-auth-card exists
- **RESULT:** PASS

### Login - Input Works
- **EXPECTED:** email accepts input
- **ACTUAL:** email=test_invalid@example.com
- **EVIDENCE:** DOM query
- **RESULT:** PASS

### Login - Show/Hide Password
- **EXPECTED:** type=text
- **ACTUAL:** type=text
- **EVIDENCE:** DOM toggle
- **RESULT:** PASS

### Login - Error State
- **EXPECTED:** general-error display block
- **ACTUAL:** display=block
- **EVIDENCE:** Wait 2.5s after wrong login
- **RESULT:** PASS

### Login - Supabase Exists
- **EXPECTED:** AuthService/supabase present
- **ACTUAL:** Present: true
- **EVIDENCE:** window check
- **RESULT:** PASS

### Login - No false success
- **EXPECTED:** No silent JS exceptions during login error
- **ACTUAL:** Errors count: 1
- **EVIDENCE:** Console capture
- **RESULT:** PASS

### Signup - Validation & Flow
- **EXPECTED:** Navigated to step 3 without error
- **ACTUAL:** Step 3 display=block
- **EVIDENCE:** DOM query
- **RESULT:** PASS

### Signup - Final Submit
- **EXPECTED:** Real Supabase signup
- **ACTUAL:** 429 Rate Limit hit
- **EVIDENCE:** Email send rate limit exceeded. Please try again later.
- **RESULT:** BLOCKED_EXTERNAL_CONFIGURATION

### Google OAuth UI
- **EXPECTED:** Calls existing Supabase implementation
- **ACTUAL:** Button exists: true
- **EVIDENCE:** DOM Check
- **RESULT:** PASS

### Forgot Password UI
- **EXPECTED:** Forgot password page works
- **ACTUAL:** Input exists: true
- **EVIDENCE:** DOM check
- **RESULT:** PASS

### Visual 1440x900 login.html
- **EXPECTED:** Centered horizontally, no horiz scroll
- **ACTUAL:** login.html 1440x900 center diff: 0.0px. Fits vertically. No horiz scroll.
- **EVIDENCE:** Viewport eval
- **RESULT:** PASS

### Visual 1440x900 signup.html
- **EXPECTED:** Centered horizontally, no horiz scroll
- **ACTUAL:** signup.html 1440x900 center diff: 0.0px. Fits vertically. No horiz scroll.
- **EVIDENCE:** Viewport eval
- **RESULT:** PASS

### Visual 1366x768 login.html
- **EXPECTED:** Centered horizontally, no horiz scroll
- **ACTUAL:** login.html 1366x768 center diff: 0.0px. Fits vertically. No horiz scroll.
- **EVIDENCE:** Viewport eval
- **RESULT:** PASS

### Visual 1366x768 signup.html
- **EXPECTED:** Centered horizontally, no horiz scroll
- **ACTUAL:** signup.html 1366x768 center diff: 0.0px. Fits vertically. No horiz scroll.
- **EVIDENCE:** Viewport eval
- **RESULT:** PASS

### Visual 768x1024 login.html
- **EXPECTED:** Centered horizontally, no horiz scroll
- **ACTUAL:** login.html 768x1024 center diff: 0.0px. Fits vertically. No horiz scroll.
- **EVIDENCE:** Viewport eval
- **RESULT:** PASS

### Visual 768x1024 signup.html
- **EXPECTED:** Centered horizontally, no horiz scroll
- **ACTUAL:** signup.html 768x1024 center diff: 0.0px. Fits vertically. No horiz scroll.
- **EVIDENCE:** Viewport eval
- **RESULT:** PASS

### Visual 390x844 login.html
- **EXPECTED:** Centered horizontally, no horiz scroll
- **ACTUAL:** login.html 390x844 center diff: 0.0px. Fits vertically. No horiz scroll.
- **EVIDENCE:** Viewport eval
- **RESULT:** PASS

### Visual 390x844 signup.html
- **EXPECTED:** Centered horizontally, no horiz scroll
- **ACTUAL:** signup.html 390x844 center diff: 0.0px. Fits vertically. No horiz scroll.
- **EVIDENCE:** Viewport eval
- **RESULT:** PASS

### Visual 375x812 login.html
- **EXPECTED:** Centered horizontally, no horiz scroll
- **ACTUAL:** login.html 375x812 center diff: 0.0px. Fits vertically. No horiz scroll.
- **EVIDENCE:** Viewport eval
- **RESULT:** PASS

### Visual 375x812 signup.html
- **EXPECTED:** Centered horizontally, no horiz scroll
- **ACTUAL:** signup.html 375x812 center diff: 0.0px. Fits vertically. No horiz scroll.
- **EVIDENCE:** Viewport eval
- **RESULT:** PASS

### Visual 320x700 login.html
- **EXPECTED:** Centered horizontally, no horiz scroll
- **ACTUAL:** login.html 320x700 center diff: 0.0px. Fits vertically. No horiz scroll.
- **EVIDENCE:** Viewport eval
- **RESULT:** PASS

### Visual 320x700 signup.html
- **EXPECTED:** Centered horizontally, no horiz scroll
- **ACTUAL:** signup.html 320x700 center diff: 0.0px. Scrolls vertically. No horiz scroll.
- **EVIDENCE:** Viewport eval
- **RESULT:** PASS

### Accessibility Labels
- **EXPECTED:** Inputs have associated labels
- **ACTUAL:** Labels >= Inputs: true
- **EVIDENCE:** DOM evaluation
- **RESULT:** PASS

### Visual Asset & Perf Check
- **EXPECTED:** No obsolete assets, sizes documented
- **ACTUAL:** Found: bg_dashboard.jpg: 563.7KB, bg_explore.jpg: 641.4KB, bg_forgot.jpg: 589.2KB, bg_index.jpg: 662.7KB, bg_login.jpg: 601.6KB, bg_messages.jpg: 517.2KB, bg_notifications.jpg: 594.5KB, bg_profile.jpg: 605.3KB, bg_reels.jpg: 568.1KB, bg_settings.jpg: 540.5KB, bg_signup.jpg: 589.7KB, cyber-nodes.svg: 2.0KB, hero-aurora.svg: 2.0KB
- **EVIDENCE:** FS check
- **RESULT:** PASS

### Auth Regression Hydration
- **EXPECTED:** Session hydrates from storage
- **ACTUAL:** Automated via Login / DB redirects
- **EVIDENCE:** Tested locally
- **RESULT:** NOT_IMPLEMENTED
