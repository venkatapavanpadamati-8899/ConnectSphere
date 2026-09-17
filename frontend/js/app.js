/**
 * ConnectSphere Main Application Controller
 * Entry point orchestrating navigation, animations, micro-effects, and backend REST API calls
 */

document.addEventListener('DOMContentLoaded', async () => {
  // --- SESSION HYDRATION & ROUTE GUARD ---
  const publicPages = ['login', 'signup', 'forgot-password', 'index'];
  const currentPage = document.body.dataset.page || window.location.pathname.split('/').pop().replace('.html', '');
  const isPublicPage = publicPages.includes(currentPage) || currentPage === '' || currentPage === '/';

  if (!isPublicPage && typeof window.AuthService !== 'undefined') {
    // Prevent flash of unauthenticated content
    document.body.style.opacity = '0';
    
    try {
      const isAuthenticated = await window.AuthService.requireAuth('login.html');
      if (!isAuthenticated) return; // Stop executing page logic, redirecting
    } finally {
      // Show content once hydration/check is complete
      document.body.style.transition = 'opacity 0.3s ease';
      document.body.style.opacity = '1';
    }
  }
  // --- END SESSION HYDRATION ---
  // Establish consistent keyboard navigation and semantic landmarks on every page.
  if (typeof initAccessibilitySuite === 'function') initAccessibilitySuite();

  // Initialize Core Effects & UI Components
  if (typeof initScrollProgressBar === 'function') initScrollProgressBar();
  if (typeof initRippleEffects === 'function') initRippleEffects();
  if (typeof initNavigation === 'function') initNavigation();
  if (typeof initDoubleTapHeartBurst === 'function') initDoubleTapHeartBurst();
  if (typeof initStoryViewer === 'function') initStoryViewer();
  if (typeof initPasswordToggles === 'function') initPasswordToggles();
  if (typeof initPasswordStrengthMeter === 'function') initPasswordStrengthMeter();
  if (typeof initThemeToggle === 'function') initThemeToggle();
  if (typeof initVoiceNotePlayer === 'function') initVoiceNotePlayer();

  // Initialize Page-Specific Logic & Listeners
  if (typeof initLikeButtons === 'function') initLikeButtons();
  if (typeof initRepostButtons === 'function') initRepostButtons();
  if (typeof initComments === 'function') initComments();
  if (typeof initCreatePostModal === 'function') initCreatePostModal();
  if (typeof initAICaptionGenerator === 'function') initAICaptionGenerator();
  if (typeof initSearch === 'function') initSearch();
  if (typeof initFollowButtons === 'function') initFollowButtons();
  if (typeof initAuthForms === 'function') initAuthForms();
  if (typeof initSignupFlow === 'function') initSignupFlow();
  if (typeof initForgotPasswordFlow === 'function') initForgotPasswordFlow();
  if (typeof initDashboardFeatures === 'function') initDashboardFeatures();
  if (typeof initCarouselSliders === 'function') initCarouselSliders();
  if (typeof initVideoPlayers === 'function') initVideoPlayers();
  if (typeof initNextGenExperienceSuite === 'function') initNextGenExperienceSuite();
  if (typeof initPlatformSuite === 'function') initPlatformSuite();
});

/**
 * Lightweight, dependency-free accessibility enhancements shared by every view.
 * Pages in ConnectSphere are deliberately visual, so this keeps keyboard and
 * screen-reader navigation just as clear as pointer navigation.
 */
function initAccessibilitySuite() {
  const main = document.querySelector('main, [role="main"]');
  if (main) {
    main.id = main.id || 'main-content';
    main.setAttribute('tabindex', '-1');

    const skipLink = document.createElement('a');
    skipLink.className = 'skip-to-content';
    skipLink.href = `#${main.id}`;
    skipLink.textContent = 'Skip to main content';
    document.body.prepend(skipLink);
  }

  document.querySelectorAll('nav:not([aria-label])').forEach((nav, index) => {
    nav.setAttribute('aria-label', index === 0 ? 'Primary navigation' : 'Page navigation');
  });

  document.querySelectorAll('button').forEach((button) => {
    if (!button.getAttribute('aria-label') && !button.textContent.trim()) {
      const title = button.getAttribute('title');
      if (title) button.setAttribute('aria-label', title);
    }
  });

  // Ensure the Escape key always offers a predictable way out of open dialogs.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openModal = document.querySelector(
      '[role="dialog"].active, [role="dialog"].is-open, .cs-modal-backdrop.active, .modal-overlay.active'
    );
    if (!openModal) return;

    const closeButton = openModal.querySelector(
      '[aria-label^="Close"], .btn-modal-close-custom, .reels-close-btn, .btn-close-chat'
    );
    if (closeButton) {
      event.preventDefault();
      closeButton.click();
    }
  });
}

// Follow / Unfollow Handler
function initFollowButtons() {
  document.addEventListener('click', (e) => {
    const followBtn = e.target.closest('.btn-follow');
    if (!followBtn || followBtn.classList.contains('theme-toggle-btn') || followBtn.id === 'theme-toggle-btn') return;

    if (followBtn.classList.contains('following')) {
      followBtn.classList.remove('following');
      followBtn.textContent = 'Follow';
    } else {
      followBtn.classList.add('following');
      followBtn.textContent = 'Following';
      if (typeof showToast === 'function') showToast('User followed! ✨');
    }
  });
}

// Search Filter
function initSearch() {
  const searchInput = document.getElementById('main-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const items = document.querySelectorAll('.post-card, .explore-item');
      items.forEach((item) => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(term) ? '' : 'none';
      });
    });
  }
}

// Auth Forms API Connection (Login / Signup)
function initAuthForms() {
  const authForm = document.querySelector('.auth-form-submit');
  if (!authForm) return;

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isSignup = window.location.pathname.includes('signup') || document.title.toLowerCase().includes('sign up');
    const inputs = authForm.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
    const submitBtn = authForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';

    if (isSignup) {
      if (inputs.length >= 4) {
        const name = inputs[0].value.trim();
        const username = inputs[1].value.trim();
        const email = inputs[2].value.trim();
        const password = inputs[3].value.trim();

        if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

        if (window.AuthService) {
          try {
            const res = await window.AuthService.signUp({ email, password, username, fullName: name });
            if (res && (res.user || res.session)) {
              if (typeof showToast === 'function') showToast('Account created successfully! 🚀');
              const target = window.location.pathname.includes('/pages/') ? 'dashboard.html' : '/dashboard';
              setTimeout(() => { window.location.href = target; }, 600);
              return;
            }
          } catch (err) {
            console.warn('[Auth] SignUp error:', err);
            if (submitBtn) submitBtn.innerHTML = originalBtnText;
            if (typeof showToast === 'function') {
              if (err.status === 429 || (err.message && err.message.toLowerCase().includes('rate limit'))) {
                showToast('Email sending rate limit reached (429). Please wait a moment and try again.');
              } else {
                showToast(err.message || 'Signup failed. Please check your details and try again.');
              }
            }
            return;
          }
        }

        // Demo fallback if Supabase not configured
        if (typeof showToast === 'function') showToast('Account created! Welcome to ConnectSphere 🚀');
        const target = window.location.pathname.includes('/pages/') ? 'dashboard.html' : '/dashboard';
        setTimeout(() => { window.location.href = target; }, 800);
      }
    } else {
      if (inputs.length >= 2) {
        const emailOrUsername = inputs[0].value.trim();
        const password = inputs[1].value.trim();

        if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

        if (window.AuthService) {
          try {
            const res = await window.AuthService.signIn({ email: emailOrUsername, password });
            if (res && (res.user || res.session)) {
              if (typeof showToast === 'function') showToast('Login successful! 🚀');
              const target = window.location.pathname.includes('/pages/') ? 'dashboard.html' : '/dashboard';
              setTimeout(() => { window.location.href = target; }, 600);
              return;
            }
          } catch (err) {
            console.warn('[Auth] SignIn error:', err);
            if (submitBtn) submitBtn.innerHTML = originalBtnText;
            if (typeof showToast === 'function') {
              if (err.status === 429 || (err.message && err.message.toLowerCase().includes('rate limit'))) {
                showToast('Email rate limit reached (429). Please wait a moment and try again.');
              } else {
                showToast(err.message || 'Login failed. Please check your credentials and try again.');
              }
            }
            return;
          }
        }

        // Demo fallback
        if (typeof showToast === 'function') showToast('Welcome back! 🚀');
        const target = window.location.pathname.includes('/pages/') ? 'dashboard.html' : '/dashboard';
        setTimeout(() => { window.location.href = target; }, 800);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// OTP Grid Helper: Auto-advance, Backspace Navigation & Paste
// ---------------------------------------------------------------------------
function setupOtpGrid(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const inputs = container.querySelectorAll('.otp-box');
  if (!inputs.length) return;

  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val.length >= 1) {
        input.value = val[val.length - 1]; // enforce single digit
        if (index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!input.value && index > 0) {
          inputs[index - 1].focus();
        }
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
      if (/^\d{6}$/.test(pasteData)) {
        pasteData.split('').forEach((char, i) => {
          if (inputs[i]) inputs[i].value = char;
        });
        inputs[inputs.length - 1].focus();
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Multi-Step Registration Flow with Demo OTP (Part 20 & 21)
// ---------------------------------------------------------------------------
function initSignupFlow() {
  const panel1 = document.getElementById('reg-panel-1');
  if (!panel1) return; // not on signup page

  setupOtpGrid('signup-otp-grid');

  const panel2 = document.getElementById('reg-panel-2');
  const panel3 = document.getElementById('reg-panel-3');
  const quickAuth = document.getElementById('quick-auth-section');

  const ind1 = document.getElementById('indicator-step-1');
  const ind2 = document.getElementById('indicator-step-2');
  const ind3 = document.getElementById('indicator-step-3');

  function setStep(step) {
    [panel1, panel2, panel3].forEach((p, idx) => {
      if (p) p.classList.toggle('active', idx + 1 === step);
    });

    if (ind1) {
      ind1.classList.toggle('active', step === 1);
      ind1.classList.toggle('completed', step > 1);
    }
    if (ind2) {
      ind2.classList.toggle('active', step === 2);
      ind2.classList.toggle('completed', step > 2);
    }
    if (ind3) {
      ind3.classList.toggle('active', step === 3);
      ind3.classList.toggle('completed', step === 3);
    }

    if (quickAuth) {
      quickAuth.style.display = step === 1 ? 'block' : 'none';
    }
  }

  // Step 1 -> Step 2 (Validate All Fields & Send OTP)
  let countdownTimer = null;
  const countdownEl = document.getElementById('signup-countdown');

  function startCountdown() {
    let timeLeft = 60;
    if (countdownEl) countdownEl.textContent = `${timeLeft}s`;
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      timeLeft--;
      if (countdownEl) countdownEl.textContent = `${timeLeft}s`;
      if (timeLeft <= 0) {
        clearInterval(countdownTimer);
        if (countdownEl) countdownEl.textContent = 'Expired';
      }
    }, 1000);
  }

  const btnGotoStep2 = document.getElementById('btn-goto-step-2');
  if (btnGotoStep2) {
    btnGotoStep2.addEventListener('click', async () => {
      const name = document.getElementById('signup-fullname')?.value.trim();
      const user = document.getElementById('signup-username')?.value.trim();
      const email = document.getElementById('signup-email')?.value.trim();
      const mobile = document.getElementById('signup-mobile')?.value.trim();
      const pass = document.getElementById('signup-password-input')?.value.trim();

      if (!name) {
        if (typeof showToast === 'function') showToast('Please enter your full name');
        document.getElementById('signup-fullname')?.focus();
        return;
      }
      if (!user) {
        if (typeof showToast === 'function') showToast('Please choose a username');
        document.getElementById('signup-username')?.focus();
        return;
      }
      if (!email || !email.includes('@')) {
        if (typeof showToast === 'function') showToast('Please enter a valid email address');
        document.getElementById('signup-email')?.focus();
        return;
      }
      if (!mobile || mobile.length < 7) {
        if (typeof showToast === 'function') showToast('Please enter a valid mobile number (min 7 digits)');
        document.getElementById('signup-mobile')?.focus();
        return;
      }
      if (!pass || pass.length < 6) {
        if (typeof showToast === 'function') showToast('Please enter a secure password (min 6 chars)');
        document.getElementById('signup-password-input')?.focus();
        return;
      }

      btnGotoStep2.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registering...';
      btnGotoStep2.disabled = true;

      if (window.AuthService) {
        try {
          await window.AuthService.signUp({ email, password: pass, username: user, fullName: name });
          if (typeof showToast === 'function') showToast('Identity Verified! Welcome to ConnectSphere ✨');
          setStep(3); // Skip OTP step, go directly to completion
        } catch (err) {
          console.warn('[SignupFlow] Registration error:', err);
          if (typeof showToast === 'function') showToast('Registration failed. Please try again.');
        } finally {
          btnGotoStep2.innerHTML = 'Create Account <i class="fa-solid fa-arrow-right"></i>';
          btnGotoStep2.disabled = false;
        }
      } else {
        if (typeof showToast === 'function') showToast('AuthService not found.');
        btnGotoStep2.innerHTML = 'Create Account <i class="fa-solid fa-arrow-right"></i>';
        btnGotoStep2.disabled = false;
      }
    });
  }

  // Step 2 and OTP verification removed, as we authenticate directly via Supabase
}

// ---------------------------------------------------------------------------
// Dedicated Forgot Password Recovery Modal Flow (Part 22 & 23)
// ---------------------------------------------------------------------------
function initForgotPasswordFlow() {
  const modal = document.getElementById('forgot-password-modal');
  const trigger = document.getElementById('forgot-password-trigger');
  const closeBtn = document.getElementById('close-recovery-modal');

  if (!modal) return;

  setupOtpGrid('rec-otp-grid');

  const step1 = document.getElementById('recovery-step-1');
  const step2 = document.getElementById('recovery-step-2');
  const step3 = document.getElementById('recovery-step-3');
  const step4 = document.getElementById('recovery-step-4');

  function setRecoveryStep(step) {
    [step1, step2, step3, step4].forEach((s, idx) => {
      if (s) s.classList.toggle('active', idx + 1 === step);
    });
  }

  function openModal() {
    setRecoveryStep(1);
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    const input = document.getElementById('recovery-identifier');
    if (input) setTimeout(() => input.focus(), 150);
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }

  if (trigger) trigger.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Step 1: Continue -> Step 2
  let recTimer = null;
  const countdownEl = document.getElementById('rec-countdown');
  function startRecCountdown() {
    let timeLeft = 45;
    if (countdownEl) countdownEl.textContent = `${timeLeft}s`;
    clearInterval(recTimer);
    recTimer = setInterval(() => {
      timeLeft--;
      if (countdownEl) countdownEl.textContent = `${timeLeft}s`;
      if (timeLeft <= 0) {
        clearInterval(recTimer);
        if (countdownEl) countdownEl.textContent = 'Expired';
      }
    }, 1000);
  }

  const btnStep1 = document.getElementById('btn-recovery-step1');
  if (btnStep1) {
    btnStep1.addEventListener('click', async () => {
      const val = document.getElementById('recovery-identifier')?.value.trim();
      if (!val) {
        if (typeof showToast === 'function') showToast('Please enter your email');
        document.getElementById('recovery-identifier')?.focus();
        return;
      }
      
      btnStep1.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
      btnStep1.disabled = true;

      if (window.AuthService) {
        try {
          await window.AuthService.resetPasswordForEmail(val);
          if (typeof showToast === 'function') showToast('Recovery code sent 📬');
          window.recoveryEmail = val; // store for step 2
          setRecoveryStep(2);
          startRecCountdown();
          const firstOtp = document.getElementById('rec-otp-1');
          if (firstOtp) setTimeout(() => firstOtp.focus(), 150);
        } catch (err) {
          console.warn('[Recovery] Error sending code:', err);
          if (typeof showToast === 'function') showToast('Failed to send recovery code. Please try again.');
        } finally {
          btnStep1.innerHTML = 'Continue';
          btnStep1.disabled = false;
        }
      }
    });
  }

  // Resend OTP in Step 2
  const btnResend = document.getElementById('btn-rec-resend');
  if (btnResend) {
    btnResend.addEventListener('click', async () => {
      if (window.AuthService && window.recoveryEmail) {
        try {
          await window.AuthService.resetPasswordForEmail(window.recoveryEmail);
          if (typeof showToast === 'function') showToast('Recovery code resent 📬');
          startRecCountdown();
        } catch(err) {
           if (typeof showToast === 'function') showToast('Failed to resend recovery code. Please try again.');
        }
      }
    });
  }

  // Step 2: Verify OTP -> Step 3
  const btnVerify = document.getElementById('btn-recovery-verify');
  if (btnVerify) {
    btnVerify.addEventListener('click', async () => {
      let code = '';
      for (let i = 1; i <= 6; i++) {
        const box = document.getElementById(`rec-otp-${i}`);
        if (box) code += box.value.trim();
      }
      if (code.length !== 6) {
        if (typeof showToast === 'function') showToast('Please enter a 6-digit OTP ⚠️');
        return;
      }

      btnVerify.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
      btnVerify.disabled = true;

      try {
        if (window.AuthService && window.recoveryEmail) {
          await window.AuthService.verifyOtp({ email: window.recoveryEmail, token: code, type: 'recovery' });
          if (typeof showToast === 'function') showToast('Identity confirmed! Set new password 🔑');
          setRecoveryStep(3);
        }
      } catch (err) {
        console.warn('[Recovery] OTP Error:', err);
        if (typeof showToast === 'function') showToast('Invalid code. Please try again.');
      } finally {
        btnVerify.innerHTML = 'Verify Code';
        btnVerify.disabled = false;
      }
    });
  }

  // Step 3: Reset Password -> Step 4
  const btnReset = document.getElementById('btn-recovery-reset');
  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      const p1 = document.getElementById('recovery-new-password')?.value.trim();
      const p2 = document.getElementById('recovery-confirm-password')?.value.trim();

      if (!p1 || p1.length < 6) {
        if (typeof showToast === 'function') showToast('Password must be at least 6 characters');
        document.getElementById('recovery-new-password')?.focus();
        return;
      }
      if (p1 !== p2) {
        if (typeof showToast === 'function') showToast('Passwords do not match ⚠️');
        document.getElementById('recovery-confirm-password')?.focus();
        return;
      }

      if (window.AuthService && window.SupabaseClient?.isConfigured()) {
        try {
          await window.AuthService.updatePassword(p1);
        } catch (err) {
          console.warn('[Recovery] Password update error:', err);
        }
      }

      setRecoveryStep(4);
      if (typeof showToast === 'function') showToast('Password reset successfully! 🔒');
    });
  }

  // Step 4: Done -> Close
  const btnDone = document.getElementById('btn-recovery-done');
  if (btnDone) {
    btnDone.addEventListener('click', () => {
      closeModal();
      document.getElementById('login-password')?.focus();
    });
  }
}

// Fetch Live Feed from Backend API if Server Running
// Helper: Highlight Hashtags in Text
function highlightHashtags(str) {
  return str.replace(/#([\w\u0080-\uFFFF]+)/g, '<span class="post-hashtag">#$1</span>');
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ---------------------------------------------------------------------------
// Dashboard Interactive Features & Real-Time Simulation
// ---------------------------------------------------------------------------
function initDashboardFeatures() {
  const feedList = document.getElementById('feed-list');
  const emptyState = document.getElementById('feed-empty-state');
  const activeFilterBanner = document.getElementById('active-filter-banner');
  const activeFilterText = document.getElementById('active-filter-text');
  const clearFilterBtn = document.getElementById('btn-clear-feed-filter');
  const emptyResetBtn = document.getElementById('btn-empty-reset');

  // Initialize PostService (loads posts from Supabase)
  if (typeof window.PostService !== 'undefined' && window.PostService.init) {
    window.PostService.init();
  }

  let currentFeedTab = 'for-you';
  let currentSearchQuery = '';

  // 1. Logged-in User Profile & Dynamic Logout
  const currentUserRaw = localStorage.getItem('currentUser') || localStorage.getItem('user');
  if (currentUserRaw) {
    try {
      const userObj = JSON.parse(currentUserRaw);
      const nameEl = document.querySelector('#sidebar-user-widget .user-info .name span');
      const handleEl = document.querySelector('#sidebar-user-widget .user-info .username');
      const avatarEl = document.querySelector('#sidebar-user-widget .avatar');
      const compAvatar = document.getElementById('composer-user-avatar');
      const modalAvatar = document.getElementById('modal-user-avatar');
      const modalName = document.getElementById('modal-author-name');

      if (userObj.name && nameEl) nameEl.textContent = userObj.name;
      if (userObj.username && handleEl) handleEl.textContent = '@' + userObj.username;
      if (userObj.profileImage) {
        if (avatarEl) avatarEl.src = userObj.profileImage;
        if (compAvatar) compAvatar.src = userObj.profileImage;
        if (modalAvatar) modalAvatar.src = userObj.profileImage;
      }
      if (userObj.name && modalName) modalName.textContent = userObj.name;
    } catch (_) {}
  }

  // Logout Trigger
  const logoutBtn = document.querySelector('.btn-sidebar-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      // Call Supabase sign out
      if (typeof AuthService !== 'undefined' && AuthService.signOut) {
        await AuthService.signOut();
      }
      
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('user');
      
      if (typeof showToast === 'function') showToast('Signed out of ConnectSphere! 👋');
      const target = window.location.pathname.includes('/pages/') ? 'login.html' : '/login';
      setTimeout(() => {
        window.location.href = target;
      }, 500);
    });
  }

  // 2. Inline Post Composer (Photo, Video, Poll & AI Sparkle)
  const publishBtn = document.getElementById('btn-publish-inline-post');
  const composerText = document.getElementById('composer-post-text');
  const composerPhotoBtn = document.getElementById('btn-media-photo');
  const composerPhotoInput = document.getElementById('composer-photo-input');
  const composerPreviewBox = document.getElementById('composer-media-preview');
  const composerPreviewImg = document.getElementById('composer-preview-img');
  const removeComposerMediaBtn = document.getElementById('btn-remove-composer-media');
  const pollTriggerBtn = document.getElementById('btn-media-poll');
  const pollBuilder = document.getElementById('composer-poll-builder');
  const closePollBuilderBtn = document.getElementById('btn-close-poll-builder');
  const pollInput1 = document.getElementById('poll-option-1');
  const pollInput2 = document.getElementById('poll-option-2');
  const videoBtn = document.getElementById('btn-media-video');

  let attachedComposerMedia = '';

  // Photo Input Handling
  if (composerPhotoBtn && composerPhotoInput) {
    composerPhotoBtn.addEventListener('click', () => composerPhotoInput.click());
    composerPhotoInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          attachedComposerMedia = evt.target.result;
          if (composerPreviewImg && composerPreviewBox) {
            composerPreviewImg.src = attachedComposerMedia;
            composerPreviewBox.classList.add('active');
          }
          if (typeof showToast === 'function') showToast('Media visual attached! 📷');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (removeComposerMediaBtn) {
    removeComposerMediaBtn.addEventListener('click', () => {
      attachedComposerMedia = '';
      if (composerPreviewBox) composerPreviewBox.classList.remove('active');
      if (composerPhotoInput) composerPhotoInput.value = '';
    });
  }

  // Poll Builder Handling
  if (pollTriggerBtn && pollBuilder) {
    pollTriggerBtn.addEventListener('click', () => {
      pollBuilder.classList.toggle('active');
      if (pollBuilder.classList.contains('active') && pollInput1) {
        setTimeout(() => pollInput1.focus(), 150);
      }
    });
  }

  if (closePollBuilderBtn && pollBuilder) {
    closePollBuilderBtn.addEventListener('click', () => {
      pollBuilder.classList.remove('active');
      if (pollInput1) pollInput1.value = '';
      if (pollInput2) pollInput2.value = '';
    });
  }

  // Video Tag Handling
  if (videoBtn && composerText) {
    videoBtn.addEventListener('click', () => {
      if (!composerText.value.includes('#SpatialStream')) {
        composerText.value = (composerText.value.trim() + ' 🎥 [Spatial Stream Active] #SpatialStream').trim();
        composerText.focus();
        if (typeof showToast === 'function') showToast('Spatial video stream attached! 🎥⚡');
      }
    });
  }

  // Inline Publish Button
  if (publishBtn && composerText && feedList) {
    publishBtn.addEventListener('click', async () => {
      const text = composerText.value.trim();
      const hasPoll = pollBuilder && pollBuilder.classList.contains('active') && pollInput1 && pollInput1.value.trim();
      
      if (!text && !attachedComposerMedia && !hasPoll) {
        composerText.focus();
        if (typeof showToast === 'function') showToast('Please enter your thoughts before posting! ✍️');
        return;
      }

      const opt1 = pollInput1 ? pollInput1.value.trim() : '';
      const opt2 = pollInput2 ? pollInput2.value.trim() : '';

      // Construct Poll Markup if present
      let pollHtml = '';
      if (hasPoll) {
        pollHtml = `
          <div class="feed-poll-widget" data-total-votes="1">
            <button type="button" class="poll-option-btn" data-votes="1" data-percent="100">
              <span class="poll-text-content">${escapeHTML(opt1)}</span>
              <span class="poll-percent-tag">100%</span>
              <div class="poll-fill-bar" style="width: 100%;"></div>
            </button>
            ${opt2 ? `
            <button type="button" class="poll-option-btn" data-votes="0" data-percent="0">
              <span class="poll-text-content">${escapeHTML(opt2)}</span>
              <span class="poll-percent-tag">0%</span>
              <div class="poll-fill-bar" style="width: 0%;"></div>
            </button>
            ` : ''}
            <div class="poll-meta-row">
              <span class="poll-total-count"><i class="fa-solid fa-chart-simple"></i> 1 creator vote</span>
              <span class="poll-time-left">24 hours left</span>
            </div>
          </div>
        `;
      }

      // Construct Media Markup
      const mediaHtml = attachedComposerMedia ? `
        <div class="post-media-container interactive-media">
          <img src="${attachedComposerMedia}" alt="Uploaded Visual">
          <div class="heart-burst-overlay"><i class="fa-solid fa-heart"></i></div>
          ${text.toLowerCase().includes('spatial') ? '<div class="media-tag-badge"><i class="fa-solid fa-volume-high"></i> Spatial 3D Audio</div>' : ''}
        </div>
      ` : '';

      const isSpatial = text.toLowerCase().includes('spatial') || text.includes('#Spatial');

      const newPost = document.createElement('article');
      newPost.className = 'post-card';
      newPost.setAttribute('data-post-id', 'post-' + Date.now());
      newPost.setAttribute('data-category', isSpatial ? 'spatial' : 'for-you');
      newPost.setAttribute('data-creator', 'Alex Johnson');
      newPost.style.animation = 'fadeInStep 0.4s ease both';
      newPost.innerHTML = `
        <div class="post-header">
          <div class="post-user-details">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" class="avatar" alt="Alex Johnson">
            <div>
              <div class="post-user-name">
                <span>Alex Johnson</span>
                <i class="fa-solid fa-circle-check badge-verified"></i>
                <span class="post-creator-tag">Verified Creator</span>
              </div>
              <div class="post-time">Just now &bull; Neural Mesh Active</div>
            </div>
          </div>
          <button class="action-btn-icon" title="Post Options"><i class="fa-solid fa-ellipsis"></i></button>
        </div>
        <div class="post-caption">${highlightHashtags(escapeHTML(text))}</div>
        ${mediaHtml}
        ${pollHtml}
        <div class="post-actions">
          <button class="action-btn btn-like" data-likes="1">
            <i class="fa-solid fa-heart" style="color: #FF4757;"></i>
            <span class="like-count">1</span>
          </button>
          <button class="action-btn btn-comment-toggle">
            <i class="fa-regular fa-comment"></i>
            <span class="comment-count">0</span>
          </button>
          <button class="action-btn btn-share-post" title="Share Post">
            <i class="fa-regular fa-paper-plane"></i>
            <span>0</span>
          </button>
          <button class="action-btn btn-bookmark-post" title="Bookmark">
            <i class="fa-regular fa-bookmark"></i>
          </button>
        </div>
        <div class="comment-section">
          <div class="comment-list"></div>
          <div class="comment-input-row">
            <input type="text" class="comment-input" placeholder="Write a thoughtful comment...">
            <button class="btn-send-comment"><i class="fa-solid fa-arrow-up"></i></button>
          </div>
        </div>
      `;

      feedList.prepend(newPost);

      // Attempt live Supabase API call
      if (typeof window.PostService !== 'undefined') {
        window.PostService.createPost({ text: text, caption: text, mediaData: attachedComposerMedia }).catch(() => {});
      }

      // Reset inline composer
      composerText.value = '';
      attachedComposerMedia = '';
      if (composerPreviewBox) composerPreviewBox.classList.remove('active');
      if (composerPhotoInput) composerPhotoInput.value = '';
      if (pollBuilder) pollBuilder.classList.remove('active');
      if (pollInput1) pollInput1.value = '';
      if (pollInput2) pollInput2.value = '';

      if (typeof showToast === 'function') showToast('Published to ConnectSphere Global Feed! 🚀✨');
    });
  }

  // 3. AI Caption Sparkle Assistant
  const aiBtn = document.getElementById('btn-media-ai');
  if (aiBtn && composerText) {
    aiBtn.addEventListener('click', () => {
      const prompts = [
        "✨ Exploring spatial audio protocols on ConnectSphere! The binaural depth in Protocol 2.4 is groundbreaking. 🎧 #SpatialAudio #WebInnovation",
        "🚀 Decentralized creator networks are redefining digital sovereignty. No middleman, direct connection. 💎 #CreatorEconomy #ZeroKnowledge",
        "🎨 Testing dynamic glassmorphism and cursor lighting reflections in our new design system. Pure fluid art! ⚡ #DesignSystem #Frontend",
        "🛡️ Verifying zero-knowledge proofs on mainnet nodes across 142 regions. Cryptographic privacy for everyone! 🌐 #ZeroKnowledge #QuantumNetwork",
        "🌟 Community consensus protocol upgrade is live! Decentralized governance in action. Cast your vote! 🗳️ #CreatorEconomy"
      ];
      composerText.value = prompts[Math.floor(Math.random() * prompts.length)];
      composerText.focus();
      if (typeof showToast === 'function') showToast('AI Creative Caption Generated! 🤖✨');
    });
  }

  // 4. Feed Tab Switching (For You / Following / Spatial 3D)
  function filterFeed() {
    const posts = document.querySelectorAll('#feed-list .post-card');
    let visibleCount = 0;

    posts.forEach(post => {
      const creator = (post.getAttribute('data-creator') || '').trim().toLowerCase();
      const category = (post.getAttribute('data-category') || '').trim().toLowerCase();
      const postText = post.textContent.toLowerCase();

      // Category check
      let matchesTab = true;
      if (currentFeedTab === 'following') {
        // Match followed creators or creators marked following
        const followedBtns = document.querySelectorAll('.btn-follow-toggle[data-following="true"]');
        const followedNames = Array.from(followedBtns).map(b => {
          const item = b.closest('.suggested-user-item');
          return item ? (item.querySelector('.name')?.textContent || '').toLowerCase() : '';
        });
        followedNames.push('marcus vance', 'elena rostova'); // Default network
        matchesTab = followedNames.some(name => name && creator.includes(name.replace(/[^a-z]/g, '')));
      } else if (currentFeedTab === 'spatial') {
        matchesTab = category === 'spatial' || postText.includes('spatial') || postText.includes('binaural') || postText.includes('quantum');
      }

      // Search query check
      let matchesSearch = true;
      if (currentSearchQuery) {
        matchesSearch = postText.includes(currentSearchQuery.toLowerCase());
      }

      if (matchesTab && matchesSearch) {
        post.style.display = '';
        visibleCount++;
      } else {
        post.style.display = 'none';
      }
    });

    if (emptyState) {
      if (visibleCount === 0) {
        emptyState.classList.add('active');
      } else {
        emptyState.classList.remove('active');
      }
    }
  }

  document.querySelectorAll('.feed-tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.feed-tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFeedTab = tab.getAttribute('data-tab') || 'for-you';
      filterFeed();
      if (typeof showToast === 'function') showToast(`Stream switched to "${tab.textContent.trim()}" 🌐`);
    });
  });

  // 5. Real-Time Search & Hashtag Filtering
  const desktopSearchInput = document.getElementById('widget-search-input');
  const mobileSearchInput = document.getElementById('mobile-search-input');
  const mobileSearchBtn = document.getElementById('btn-mobile-search');
  const mobileSearchOverlay = document.getElementById('mobile-search-overlay');
  const closeMobileSearchBtn = document.getElementById('btn-close-mobile-search');

  function updateSearch(query) {
    currentSearchQuery = query.trim();
    if (currentSearchQuery) {
      if (activeFilterBanner && activeFilterText) {
        activeFilterBanner.classList.add('active');
        activeFilterText.textContent = `"${currentSearchQuery}"`;
      }
    } else {
      if (activeFilterBanner) activeFilterBanner.classList.remove('active');
    }
    filterFeed();
  }

  if (desktopSearchInput) {
    desktopSearchInput.addEventListener('input', (e) => {
      updateSearch(e.target.value);
    });
  }

  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', (e) => {
      updateSearch(e.target.value);
    });
  }

  if (mobileSearchBtn && mobileSearchOverlay) {
    mobileSearchBtn.addEventListener('click', () => {
      mobileSearchOverlay.classList.add('active');
      if (mobileSearchInput) setTimeout(() => mobileSearchInput.focus(), 150);
    });
  }

  if (closeMobileSearchBtn && mobileSearchOverlay) {
    closeMobileSearchBtn.addEventListener('click', () => {
      mobileSearchOverlay.classList.remove('active');
      if (mobileSearchInput) mobileSearchInput.value = '';
      updateSearch('');
    });
  }

  // Clear Filter Buttons
  if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', () => {
      if (desktopSearchInput) desktopSearchInput.value = '';
      if (mobileSearchInput) mobileSearchInput.value = '';
      updateSearch('');
      if (typeof showToast === 'function') showToast('Filter cleared ⚡');
    });
  }

  if (emptyResetBtn) {
    emptyResetBtn.addEventListener('click', () => {
      if (desktopSearchInput) desktopSearchInput.value = '';
      if (mobileSearchInput) mobileSearchInput.value = '';
      currentFeedTab = 'for-you';
      document.querySelectorAll('.feed-tab-btn').forEach(t => {
        t.classList.toggle('active', t.getAttribute('data-tab') === 'for-you');
      });
      updateSearch('');
      if (typeof showToast === 'function') showToast('Feed stream restored! ⚡');
    });
  }

  // Trending Discoveries Click -> Filter Feed
  document.querySelectorAll('.trending-item').forEach(item => {
    item.addEventListener('click', () => {
      const topicEl = item.querySelector('.trending-topic');
      if (!topicEl) return;
      const tag = topicEl.textContent.trim();
      if (desktopSearchInput) desktopSearchInput.value = tag;
      if (mobileSearchInput) mobileSearchInput.value = tag;
      updateSearch(tag);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (typeof showToast === 'function') showToast(`Filtering discoveries for ${tag} 🔥`);
    });
  });

  // Hashtag Clicks inside Post Captions -> Filter Feed
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('post-hashtag')) {
      const tag = e.target.textContent.trim();
      if (desktopSearchInput) desktopSearchInput.value = tag;
      if (mobileSearchInput) mobileSearchInput.value = tag;
      updateSearch(tag);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (typeof showToast === 'function') showToast(`Filtered stream by ${tag} ✨`);
    }
  });

  // 6. Interactive Spatial Story Viewer
  const storyModal = document.getElementById('story-modal');
  const closeStoryBtn = document.getElementById('btn-close-story-modal');
  const storyProgress = document.getElementById('story-progress-bar');
  const storyAvatar = document.getElementById('story-viewer-avatar');
  const storyName = document.getElementById('story-viewer-name');
  const storyTime = document.getElementById('story-viewer-time');
  const storyMedia = document.getElementById('story-viewer-media');
  const storyCaption = document.getElementById('story-viewer-caption');
  const storyReplyInput = document.getElementById('story-reply-input');

  const storyData = {
    'Elena Rostova': {
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      time: 'Active in Tokyo Mesh Node',
      media: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&auto=format&fit=crop&q=80',
      caption: 'Live from the Tokyo Spatial Audio Lab! Zero-latency binaural mesh nodes active across 142 regions. 🎧✨'
    },
    'Marcus Vance': {
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      time: '45m ago &bull; Berlin Creative Hub',
      media: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
      caption: 'Testing dynamic reflection shaders with our new glassmorphic fluid UI momentum! ⚡🎨'
    },
    'Sofia Chen': {
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
      time: '2h ago &bull; Singapore AI Lab',
      media: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1000&auto=format&fit=crop&q=80',
      caption: 'Decentralized identity guarantees that your audience belongs to YOU. Sovereign creators unite! 💎'
    },
    'David Kim': {
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      time: '3h ago &bull; Seoul Nexus',
      media: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1000&auto=format&fit=crop&q=80',
      caption: 'Post-quantum cryptographic pass-through verified across 10,000 node clusters. 🛡️'
    },
    'Maya Lin': {
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80',
      time: '4h ago &bull; Kyoto Studio',
      media: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000&auto=format&fit=crop&q=80',
      caption: 'Spatial generative art collection launching tomorrow night! Check the VR portal preview. 🎨✨'
    },
    'Your Story': {
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      time: 'Just now &bull; Neural Mesh Active',
      media: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop&q=80',
      caption: 'Broadcasting live creative telemetry across the global ConnectSphere network! 🚀✨'
    }
  };

  let storyTimer;

  document.querySelectorAll('.story-card').forEach(story => {
    story.addEventListener('click', () => {
      const creator = story.getAttribute('data-creator') || 'Your Story';
      const data = storyData[creator] || storyData['Elena Rostova'];

      if (storyModal) {
        if (storyAvatar) storyAvatar.src = data.avatar;
        if (storyName) storyName.textContent = creator;
        if (storyTime) storyTime.innerHTML = data.time;
        if (storyMedia) storyMedia.src = data.media;
        if (storyCaption) storyCaption.textContent = data.caption;

        storyModal.classList.add('active');

        // Progress bar animation
        if (storyProgress) {
          storyProgress.style.transition = 'none';
          storyProgress.style.width = '0%';
          setTimeout(() => {
            storyProgress.style.transition = 'width 5s linear';
            storyProgress.style.width = '100%';
          }, 30);
        }

        clearTimeout(storyTimer);
        storyTimer = setTimeout(() => {
          storyModal.classList.remove('active');
        }, 5000);
      }

      const ring = story.querySelector('.story-ring-wrapper');
      if (ring && ring.classList.contains('unread')) {
        ring.classList.remove('unread');
        ring.classList.add('seen');
      }
    });
  });

  if (closeStoryBtn && storyModal) {
    closeStoryBtn.addEventListener('click', () => {
      storyModal.classList.remove('active');
      clearTimeout(storyTimer);
    });
  }

  if (storyModal) {
    storyModal.addEventListener('click', (e) => {
      if (e.target === storyModal) {
        storyModal.classList.remove('active');
        clearTimeout(storyTimer);
      }
    });
  }

  // Story Reactions
  document.querySelectorAll('.story-reaction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.getAttribute('data-emoji') || '❤️';
      if (typeof showToast === 'function') showToast(`Reaction sent: ${emoji} ✨`);
      btn.style.transform = 'scale(1.4)';
      setTimeout(() => btn.style.transform = '', 200);
    });
  });

  if (storyReplyInput) {
    storyReplyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && storyReplyInput.value.trim()) {
        if (typeof showToast === 'function') showToast('Encrypted transmission dispatched to creator! 📡');
        storyReplyInput.value = '';
        setTimeout(() => {
          if (storyModal) storyModal.classList.remove('active');
          clearTimeout(storyTimer);
        }, 800);
      }
    });
  }

  // 7. Interactive Poll Voting in Feed
  document.addEventListener('click', (e) => {
    const optionBtn = e.target.closest('.poll-option-btn');
    if (!optionBtn) return;

    const pollWidget = optionBtn.closest('.feed-poll-widget');
    if (!pollWidget) return;

    if (pollWidget.classList.contains('voted')) {
      if (typeof showToast === 'function') showToast('Your vote is already confirmed on ledger! 🗳️');
      return;
    }

    const allOptions = pollWidget.querySelectorAll('.poll-option-btn');
    let totalVotes = parseInt(pollWidget.getAttribute('data-total-votes')) || 0;
    totalVotes++;
    pollWidget.setAttribute('data-total-votes', totalVotes);

    const currentVotes = parseInt(optionBtn.getAttribute('data-votes')) || 0;
    optionBtn.setAttribute('data-votes', currentVotes + 1);

    allOptions.forEach(opt => {
      const votes = parseInt(opt.getAttribute('data-votes')) || 0;
      const pct = Math.round((votes / totalVotes) * 100);
      const fillBar = opt.querySelector('.poll-fill-bar');
      const pctTag = opt.querySelector('.poll-percent-tag');

      if (fillBar) fillBar.style.width = pct + '%';
      if (pctTag) pctTag.textContent = pct + '%';
    });

    const totalSpan = pollWidget.querySelector('.poll-total-count');
    if (totalSpan) {
      totalSpan.innerHTML = `<i class="fa-solid fa-chart-simple"></i> ${totalVotes.toLocaleString()} verified creator votes`;
    }

    pollWidget.classList.add('voted');
    if (typeof showToast === 'function') showToast('Consensus vote recorded on decentralized ledger! 🗳️✨');
  });

  // 8. Post Share & Clipboard Feature
  document.addEventListener('click', (e) => {
    const shareBtn = e.target.closest('.btn-share-post');
    if (!shareBtn) return;

    const postCard = shareBtn.closest('.post-card');
    const postId = postCard ? postCard.getAttribute('data-post-id') : 'post';
    const shareUrl = `${window.location.origin}${window.location.pathname}#${postId}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }

    const countSpan = shareBtn.querySelector('span');
    if (countSpan) {
      const current = parseInt(countSpan.textContent) || 0;
      countSpan.textContent = current + 1;
    }

    if (typeof showToast === 'function') showToast('Post transmission link copied to clipboard! 📋🚀');
  });

  // 9. Post Options Contextual Dropdown
  const globalPostDropdown = document.getElementById('post-options-dropdown-global');
  let activePostForOptions = null;

  document.addEventListener('click', (e) => {
    const optionsBtn = e.target.closest('.action-btn-icon');
    if (optionsBtn) {
      e.stopPropagation();
      activePostForOptions = optionsBtn.closest('.post-card');
      if (globalPostDropdown) {
        const rect = optionsBtn.getBoundingClientRect();
        globalPostDropdown.style.top = `${rect.bottom + window.scrollY + 6}px`;
        globalPostDropdown.style.left = `${Math.max(16, rect.right + window.scrollX - 190)}px`;
        globalPostDropdown.classList.toggle('active');
      }
      return;
    }

    // Click outside -> close options menu
    if (globalPostDropdown && !e.target.closest('#post-options-dropdown-global')) {
      globalPostDropdown.classList.remove('active');
    }
  });

  // Dropdown Item Actions
  const optCopyLink = document.getElementById('opt-copy-link');
  const optSaveBookmark = document.getElementById('opt-save-bookmark');
  const optMuteAuthor = document.getElementById('opt-mute-author');
  const optReportPost = document.getElementById('opt-report-post');

  if (optCopyLink) {
    optCopyLink.addEventListener('click', () => {
      if (globalPostDropdown) globalPostDropdown.classList.remove('active');
      const shareUrl = `${window.location.origin}${window.location.pathname}`;
      if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).catch(() => {});
      if (typeof showToast === 'function') showToast('Post permalink copied! 🔗');
    });
  }

  if (optSaveBookmark) {
    optSaveBookmark.addEventListener('click', () => {
      if (globalPostDropdown) globalPostDropdown.classList.remove('active');
      if (activePostForOptions) {
        const bm = activePostForOptions.querySelector('.btn-bookmark-post');
        if (bm) bm.click();
      }
    });
  }

  if (optMuteAuthor) {
    optMuteAuthor.addEventListener('click', () => {
      if (globalPostDropdown) globalPostDropdown.classList.remove('active');
      if (activePostForOptions) {
        const creator = activePostForOptions.getAttribute('data-creator') || 'creator';
        activePostForOptions.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
        activePostForOptions.style.opacity = '0';
        activePostForOptions.style.transform = 'scale(0.95)';
        setTimeout(() => activePostForOptions.remove(), 350);
        if (typeof showToast === 'function') showToast(`Muted posts from ${creator} 🔕`);
      }
    });
  }

  if (optReportPost) {
    optReportPost.addEventListener('click', () => {
      if (globalPostDropdown) globalPostDropdown.classList.remove('active');
      if (typeof showToast === 'function') showToast('Report submitted to ConnectSphere Safety Node 🛡️');
    });
  }

  // 10. Floating Quick Chat Drawer Toggle & Messaging
  const chatToggleBtn = document.getElementById('btn-toggle-floating-chat');
  const chatCloseBtn = document.getElementById('btn-close-floating-chat');
  const chatDrawer = document.getElementById('floating-chat-drawer');
  const chatForm = document.getElementById('floating-chat-form');
  const chatInput = document.getElementById('floating-chat-input');
  const chatMessages = document.getElementById('chat-drawer-messages');

  if (chatToggleBtn && chatDrawer) {
    chatToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chatDrawer.classList.toggle('open');
      if (chatDrawer.classList.contains('open') && chatInput) {
        setTimeout(() => chatInput.focus(), 250);
      }
    });
  }

  if (chatCloseBtn && chatDrawer) {
    chatCloseBtn.addEventListener('click', () => {
      chatDrawer.classList.remove('open');
    });
  }

  if (chatForm && chatInput && chatMessages) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = chatInput.value.trim();
      if (!msg) return;

      // Append Outgoing Message
      const userBubble = document.createElement('div');
      userBubble.className = 'chat-bubble outgoing';
      userBubble.textContent = msg;
      chatMessages.appendChild(userBubble);
      chatInput.value = '';
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Simulated Instant Creator Reply
      setTimeout(() => {
        const replies = [
          "That's fantastic Alex! Let's connect on the Tokyo mesh node later today! 🚀",
          "Totally agreed! Zero-latency encrypted streaming changes everything. 🎧✨",
          "Working on the next spatial 3D prototype right now. Sending you early preview access! 💎",
          "Got your transmission loud and clear! Deploying the next consensus block now. ⚡"
        ];
        const botBubble = document.createElement('div');
        botBubble.className = 'chat-bubble incoming';
        botBubble.textContent = replies[Math.floor(Math.random() * replies.length)];
        chatMessages.appendChild(botBubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }, 1000);
    });
  }

  // 11. Feed Refresh Button
  const refreshBtn = document.getElementById('btn-feed-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      const icon = refreshBtn.querySelector('i');
      if (icon) {
        icon.style.transform = 'rotate(360deg)';
        icon.style.transition = 'transform 0.5s ease';
        setTimeout(() => {
          icon.style.transform = 'rotate(0deg)';
          icon.style.transition = 'none';
          loadLiveFeed();
          if (typeof showToast === 'function') showToast('Feed synchronized with decentralized nodes ⚡');
        }, 500);
      }
    });
  }

  // 12. Notifications Dropdown Handler
  const desktopNotifBtn = document.getElementById('btn-desktop-notifications-toggle');
  const mobileNotifBtn = document.getElementById('btn-mobile-notifications');
  const notifDropdown = document.getElementById('notifications-dropdown-menu');
  const markAllReadBtn = document.getElementById('btn-mark-all-read');

  function toggleNotificationsDropdown(e) {
    if (e) e.preventDefault();
    if (!notifDropdown) return;
    notifDropdown.classList.toggle('active');
  }

  if (desktopNotifBtn) {
    desktopNotifBtn.addEventListener('click', toggleNotificationsDropdown);
  }
  if (mobileNotifBtn) {
    mobileNotifBtn.addEventListener('click', toggleNotificationsDropdown);
  }

  if (markAllReadBtn && notifDropdown) {
    markAllReadBtn.addEventListener('click', () => {
      notifDropdown.querySelectorAll('.notif-dropdown-item.unread').forEach(item => {
        item.classList.remove('unread');
        const indicator = item.querySelector('.notif-indicator');
        if (indicator) indicator.remove();
      });
      const unreadPill = notifDropdown.querySelector('.unread-pill');
      if (unreadPill) unreadPill.textContent = '0 New';
      document.querySelectorAll('.badge-dot, .nav-count-badge').forEach(badge => {
        if (badge.closest('#btn-desktop-notifications-toggle') || badge.closest('#btn-mobile-notifications') || badge.closest('.nav-item[href*="notifications"]')) {
          badge.style.display = 'none';
        }
      });
      if (typeof showToast === 'function') showToast('All notifications marked as read! ✓');
    });
  }

  // Click outside to dismiss notifications dropdown
  document.addEventListener('click', (e) => {
    if (!notifDropdown || !notifDropdown.classList.contains('active')) return;
    if (
      !notifDropdown.contains(e.target) &&
      (!desktopNotifBtn || !desktopNotifBtn.contains(e.target)) &&
      (!mobileNotifBtn || !mobileNotifBtn.contains(e.target))
    ) {
      notifDropdown.classList.remove('active');
    }
  });

  // 13. Mobile Navigation Drawer & Backdrop
  const mobileMenuBtn = document.getElementById('btn-mobile-menu');
  const mobileDrawer = document.getElementById('mobile-nav-drawer');
  const mobileDrawerBackdrop = document.getElementById('mobile-drawer-backdrop');
  const closeDrawerBtn = document.getElementById('btn-close-mobile-drawer');

  function openMobileDrawer() {
    if (mobileDrawer) mobileDrawer.classList.add('open');
    if (mobileDrawerBackdrop) mobileDrawerBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileDrawer() {
    if (mobileDrawer) mobileDrawer.classList.remove('open');
    if (mobileDrawerBackdrop) mobileDrawerBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileDrawer);
  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeMobileDrawer);
  if (mobileDrawerBackdrop) mobileDrawerBackdrop.addEventListener('click', closeMobileDrawer);

  if (mobileDrawer) {
    mobileDrawer.querySelectorAll('.drawer-nav-item').forEach(link => {
      link.addEventListener('click', () => {
        closeMobileDrawer();
      });
    });
  }

  // 14. Stories Navigation & Smooth Scrolling
  const sidebarStoriesLink = document.getElementById('sidebar-link-stories');
  const drawerStoriesLink = document.getElementById('drawer-link-stories');
  const storiesContainer = document.getElementById('dashboard-stories-container');

  function scrollToStories(e) {
    if (e) e.preventDefault();
    if (storiesContainer) {
      storiesContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      storiesContainer.style.transition = 'box-shadow 0.4s ease';
      storiesContainer.style.boxShadow = '0 0 25px rgba(22, 217, 255, 0.4)';
      setTimeout(() => {
        storiesContainer.style.boxShadow = '';
      }, 1200);
      if (typeof showToast === 'function') showToast('Viewing active creator stories ✨');
    }
  }

  if (sidebarStoriesLink) sidebarStoriesLink.addEventListener('click', scrollToStories);
  if (drawerStoriesLink) drawerStoriesLink.addEventListener('click', scrollToStories);

  // 15. Dynamic Story Upload Feature
  const storyUploadInput = document.getElementById('story-upload-file-input');
  const addStoryBtn = document.getElementById('add-story-trigger');

  if (addStoryBtn && storyUploadInput) {
    addStoryBtn.addEventListener('click', () => {
      storyUploadInput.click();
    });

    storyUploadInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        if (typeof showToast === 'function') showToast('Uploading story to sphere... 📸', 'info');
        try {
          let publicUrl = '';
          if (window.StorageService) {
             const result = await window.StorageService.uploadFile('story-media', file);
             publicUrl = result.publicUrl;
          } else {
             // Fallback to FileReader if no backend
             const reader = new FileReader();
             publicUrl = await new Promise((resolve) => {
               reader.onload = (evt) => resolve(evt.target.result);
               reader.readAsDataURL(file);
             });
          }
          
          if (window.StoryService) {
             await window.StoryService.createStory({
               type: file.type.startsWith('video') ? 'video' : 'photo',
               mediaUrl: publicUrl
             });
          }
          
          const ring = addStoryBtn.querySelector('.story-ring-wrapper');
          if (ring) {
            ring.style.boxShadow = '0 0 16px #00E6C3';
            const badgeIcon = addStoryBtn.querySelector('.add-story-badge i');
            if (badgeIcon) badgeIcon.className = 'fa-solid fa-check';
          }
          if (typeof showToast === 'function') showToast('New story published to your sphere! 📸✨');
        } catch (err) {
          console.error('UPLOAD ERROR:', err);
          if (typeof showToast === 'function') showToast('Error uploading story.', 'error');
        }
      }
    });
  }

  // 16. Sphere Connect AI Recommendations Widget
  const refreshAiRecsBtn = document.getElementById('btn-refresh-ai-recs');
  const aiRecsText = document.getElementById('ai-recs-text');
  const aiActionExploreBtn = document.getElementById('btn-ai-action-explore');
  const aiActionSparkleBtn = document.getElementById('btn-ai-action-sparkle');

  const aiMeshRecommendations = [
    "Based on your interest in <strong>#SpatialAudio</strong> & <strong>#QuantumNetwork</strong>, 14 creators in Tokyo & Berlin published new protocol drafts today.",
    "Mesh telemetry reveals <strong>89% of your network</strong> is exploring <strong>#ZeroKnowledge</strong> proofs this week. Join the Tokyo Consensus Node!",
    "Recommended creator: <strong>Elena Rostova</strong> just released zero-latency binaural renderers for Spatial 3D soundstages.",
    "Smart Affinity Insight: Your published content aligns <strong>94% with Berlin Creative Hub</strong>. Connect with Marcus Vance & Aria Montgomery."
  ];

  if (refreshAiRecsBtn && aiRecsText) {
    let recIndex = 0;
    refreshAiRecsBtn.addEventListener('click', () => {
      const icon = refreshAiRecsBtn.querySelector('i');
      if (icon) {
        icon.style.transform = 'rotate(360deg)';
        icon.style.transition = 'transform 0.5s ease';
        setTimeout(() => {
          icon.style.transform = 'rotate(0deg)';
          icon.style.transition = 'none';
        }, 500);
      }
      recIndex = (recIndex + 1) % aiMeshRecommendations.length;
      aiRecsText.style.opacity = '0';
      setTimeout(() => {
        aiRecsText.innerHTML = aiMeshRecommendations[recIndex];
        aiRecsText.style.transition = 'opacity 0.35s ease';
        aiRecsText.style.opacity = '1';
        if (typeof showToast === 'function') showToast('Sphere AI synthesized fresh mesh insights! 🤖✨');
      }, 200);
    });
  }

  if (aiActionExploreBtn) {
    aiActionExploreBtn.addEventListener('click', () => {
      const desktopSearch = document.getElementById('widget-search-input');
      const mobileSearch = document.getElementById('mobile-search-input');
      if (desktopSearch) desktopSearch.value = '#SpatialAudio';
      if (mobileSearch) mobileSearch.value = '#SpatialAudio';
      updateSearch('#SpatialAudio');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (typeof showToast === 'function') showToast('Filtering stream for AI recommended topic #SpatialAudio 🔍');
    });
  }

  if (aiActionSparkleBtn) {
    aiActionSparkleBtn.addEventListener('click', () => {
      const feedCards = document.querySelectorAll('#feed-list .post-card');
      feedCards.forEach(card => {
        card.style.animation = 'pulseGlow 0.8s ease 1';
        setTimeout(() => card.style.animation = '', 800);
      });
      if (typeof showToast === 'function') showToast('Sphere AI synthesized high-affinity creators! ⚡✨');
    });
  }

  // 17. Composer Audience Privacy Selector & Character Counter
  const audienceSelectBtn = document.getElementById('composer-audience-select');
  const audienceLabel = document.getElementById('composer-audience-label');
  const audienceOptions = [
    { label: 'Public Feed', icon: 'fa-globe' },
    { label: 'Followers Only', icon: 'fa-user-group' },
    { label: 'Close Friends', icon: 'fa-star' }
  ];
  let audienceIndex = 0;

  if (audienceSelectBtn && audienceLabel) {
    audienceSelectBtn.addEventListener('click', () => {
      audienceIndex = (audienceIndex + 1) % audienceOptions.length;
      const current = audienceOptions[audienceIndex];
      audienceLabel.textContent = current.label;
      const icon = audienceSelectBtn.querySelector('i:first-child');
      if (icon) icon.className = `fa-solid ${current.icon}`;
      if (typeof showToast === 'function') showToast(`Audience set to: ${current.label} 🔒`);
    });
  }

  if (composerText) {
    const charCountEl = document.getElementById('composer-char-count');
    composerText.addEventListener('input', () => {
      if (charCountEl) charCountEl.textContent = composerText.value.length;
    });
  }

  // 18. Reels Teaser Card Interaction
  const reelsTeaserCard = document.getElementById('widget-reels-teaser');
  if (reelsTeaserCard) {
    reelsTeaserCard.addEventListener('click', () => {
      if (typeof showToast === 'function') showToast('Launching Trending Short Reel Stage... 🎬✨');
      setTimeout(() => {
        window.location.href = 'explore.html#reels';
      }, 400);
    });
  }

  // 19. Quick Messages Preview Widget Interaction
  const messagesPreviewCard = document.getElementById('widget-messages-preview');
  if (messagesPreviewCard && chatDrawer) {
    messagesPreviewCard.addEventListener('click', () => {
      chatDrawer.classList.toggle('open');
      if (chatDrawer.classList.contains('open')) {
        if (chatInput) setTimeout(() => chatInput.focus(), 250);
        if (typeof showToast === 'function') showToast('Live Transmission channel opened with Elena 💬⚡');
      } else {
        if (typeof showToast === 'function') showToast('Transmission minimized');
      }
    });
  }

  // 20. Spatial Voice Room Join Interaction
  const joinVoiceBtn = document.getElementById('btn-join-voice-room');
  if (joinVoiceBtn) {
    let isInRoom = false;
    joinVoiceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isInRoom = !isInRoom;
      if (isInRoom) {
        joinVoiceBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i><span>Listening</span>';
        joinVoiceBtn.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
        if (typeof showToast === 'function') showToast('Connected to Tokyo Spatial Audio Lab! 🎧⚡');
      } else {
        joinVoiceBtn.innerHTML = '<i class="fa-solid fa-headphones"></i><span>Listen In</span>';
        joinVoiceBtn.style.background = '';
        if (typeof showToast === 'function') showToast('Disconnected from Voice Node');
      }
    });
  }

  // 21. Community Hubs Join Toggle
  document.querySelectorAll('.btn-join-hub').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isJoined = btn.classList.contains('active');
      if (isJoined) {
        btn.classList.remove('active');
        btn.textContent = 'Join';
        if (typeof showToast === 'function') showToast('Left community hub');
      } else {
        btn.classList.add('active');
        btn.textContent = 'Joined';
        if (typeof showToast === 'function') showToast('Joined decentralized community hub! 🌐✨');
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Multi-Image Carousel Slider Controller
// ---------------------------------------------------------------------------
function initCarouselSliders() {
  document.querySelectorAll('.post-carousel-container').forEach(carousel => {
    const track = carousel.querySelector('.carousel-slides-track');
    const slides = carousel.querySelectorAll('.carousel-slide-item');
    const prevBtn = carousel.querySelector('.carousel-nav-btn.prev');
    const nextBtn = carousel.querySelector('.carousel-nav-btn.next');
    const counter = carousel.querySelector('.carousel-counter-badge');
    const dots = carousel.querySelectorAll('.carousel-dot');
    
    if (!track || slides.length === 0) return;

    let currentIndex = parseInt(carousel.getAttribute('data-current-slide')) || 0;
    const total = slides.length;

    function goToSlide(index) {
      if (index < 0) index = 0;
      if (index >= total) index = total - 1;
      currentIndex = index;
      carousel.setAttribute('data-current-slide', currentIndex);

      // Slide track horizontally
      track.style.transform = `translateX(-${currentIndex * 100}%)`;

      // Update slide items active
      slides.forEach((s, idx) => s.classList.toggle('active', idx === currentIndex));

      // Update dots
      dots.forEach((d, idx) => d.classList.toggle('active', idx === currentIndex));

      // Update Counter Badge
      if (counter) counter.textContent = `${currentIndex + 1} / ${total}`;

      // Update prev/next disabled opacity
      if (prevBtn) prevBtn.style.opacity = currentIndex === 0 ? '0.4' : '1';
      if (nextBtn) nextBtn.style.opacity = currentIndex === total - 1 ? '0.4' : '1';
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        goToSlide(currentIndex - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        goToSlide(currentIndex + 1);
      });
    }

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        goToSlide(idx);
      });
    });

    // Touch Swipe gesture support
    let touchStartX = 0;
    carousel.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    carousel.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      if (diff > 40) {
        goToSlide(currentIndex + 1);
      } else if (diff < -40) {
        goToSlide(currentIndex - 1);
      }
    }, { passive: true });

    goToSlide(currentIndex);
  });
}

// ---------------------------------------------------------------------------
// In-Feed Video Players Controller (Play, Pause, Progress Scrubber & Mute)
// ---------------------------------------------------------------------------
function initVideoPlayers() {
  document.querySelectorAll('.post-video-player-container').forEach(player => {
    const video = player.querySelector('.post-video-element');
    const overlayBtn = player.querySelector('.video-play-overlay-btn');
    const playToggleBtn = player.querySelector('.btn-video-play-toggle');
    const progressFill = player.querySelector('.video-progress-fill');
    const progressWrap = player.querySelector('.video-progress-wrap');
    const timeDisplay = player.querySelector('.video-time-display');
    const muteBtn = player.querySelector('.video-mute-btn');

    if (!video) return;

    function formatTime(sec) {
      if (isNaN(sec) || sec === Infinity) sec = 0;
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function togglePlay() {
      if (video.paused) {
        video.play().then(() => {
          if (overlayBtn) overlayBtn.style.opacity = '0';
          if (overlayBtn) overlayBtn.style.pointerEvents = 'none';
          if (playToggleBtn) playToggleBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        }).catch(() => {});
      } else {
        video.pause();
        if (overlayBtn) overlayBtn.style.opacity = '1';
        if (overlayBtn) overlayBtn.style.pointerEvents = 'auto';
        if (playToggleBtn) playToggleBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }

    if (overlayBtn) overlayBtn.addEventListener('click', togglePlay);
    if (playToggleBtn) playToggleBtn.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);

    video.addEventListener('timeupdate', () => {
      const duration = video.duration || 15;
      const pct = (video.currentTime / duration) * 100;
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (timeDisplay) timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(duration)}`;
    });

    video.addEventListener('ended', () => {
      if (overlayBtn) overlayBtn.style.opacity = '1';
      if (overlayBtn) overlayBtn.style.pointerEvents = 'auto';
      if (playToggleBtn) playToggleBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    });

    if (progressWrap) {
      progressWrap.addEventListener('click', (e) => {
        const rect = progressWrap.getBoundingClientRect();
        const clickPos = (e.clientX - rect.left) / rect.width;
        const duration = video.duration || 15;
        video.currentTime = clickPos * duration;
      });
    }

    if (muteBtn) {
      muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
        if (video.muted) {
          muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
          if (typeof showToast === 'function') showToast('Video audio muted 🔇');
        } else {
          muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
          if (typeof showToast === 'function') showToast('Spatial audio unmuted 🔊');
        }
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Next-Gen Interactive Experience Suite Controllers
// (Reels, Video Theater, Calling, Snap Media, Creator Studio, Search, Profile)
// ---------------------------------------------------------------------------

function initNextGenExperienceSuite() {
  initReelsExperience();
  initVideoTheater();
  initCallingFeature();
  initSnapMedia();
  initCreatorStudio();
  initUniversalSearch();
  initProfileModal();
}

// 1. Dedicated Reels Experience Controller
function initReelsExperience() {
  const modal = document.getElementById('reels-modal');
  const closeBtn = document.getElementById('btn-close-reels-modal');
  const video = document.getElementById('reel-active-video');
  const likeBtn = document.getElementById('btn-reel-like');
  const likeIcon = document.getElementById('reel-like-icon');
  const likesCount = document.getElementById('reel-likes-count');
  const followBtn = document.getElementById('btn-reel-follow');
  const audioToggle = document.getElementById('btn-reel-audio-toggle');
  const volumeIcon = document.getElementById('reel-volume-icon');
  const prevBtn = document.getElementById('btn-reel-prev');
  const nextBtn = document.getElementById('btn-reel-next');
  const progressIndicator = document.getElementById('reels-progress-indicator');
  const creatorName = document.getElementById('reel-creator-name');
  const caption = document.getElementById('reel-caption');
  const avatar = document.getElementById('reel-creator-avatar');

  const reelsData = [
    {
      creator: '@aria_vance',
      name: 'Aria Vance',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      caption: 'Rendering live volumetric holograms inside the Tokyo spatial engine! 🌐✨ What do you think of this framerate? #Spatial3D #ConnectSphere',
      video: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-flying-cars-and-skyscrapers-41551-large.mp4',
      likes: '84.2K'
    },
    {
      creator: '@elena_rostova',
      name: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      caption: 'Binaural 3D acoustics frequency spectrum visualization in real-time. Put on your headphones! 🎧⚡ #AudioSphere',
      video: 'https://assets.mixkit.co/videos/preview/mixkit-curved-futuristic-tunnel-with-lights-41554-large.mp4',
      likes: '96.5K'
    },
    {
      creator: '@marcus_vance',
      name: 'Marcus Vance',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      caption: 'Testing 120fps fluid UI refraction in WebGL. The speed of ConnectSphere is insane! 🚀 #DesignSystem',
      video: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-flying-cars-and-skyscrapers-41551-large.mp4',
      likes: '52.1K'
    }
  ];

  let currentReelIndex = 0;

  function loadReel(idx) {
    if (idx < 0) idx = reelsData.length - 1;
    if (idx >= reelsData.length) idx = 0;
    currentReelIndex = idx;
    const item = reelsData[currentReelIndex];
    if (creatorName) creatorName.textContent = item.creator;
    if (caption) caption.textContent = item.caption;
    if (avatar) avatar.src = item.avatar;
    if (likesCount) likesCount.textContent = item.likes;
    if (video) {
      video.src = item.video;
      video.play().catch(() => {});
    }
  }

  function openReelsModal(e) {
    if (e) e.preventDefault();
    if (modal) {
      modal.classList.add('active');
      loadReel(0);
      if (typeof showToast === 'function') showToast('Launching ConnectSphere Reels 🎬');
    }
  }

  function closeReelsModal() {
    if (modal) {
      modal.classList.remove('active');
      if (video) video.pause();
    }
  }

  // Open triggers
  const sidebarReelsLink = document.getElementById('sidebar-link-reels');
  if (sidebarReelsLink) sidebarReelsLink.addEventListener('click', openReelsModal);

  document.querySelectorAll('a[href*="#reels"], .mobile-nav-item[title="Reels"]').forEach(el => {
    el.addEventListener('click', openReelsModal);
  });

  if (closeBtn) closeBtn.addEventListener('click', closeReelsModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeReelsModal();
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', () => loadReel(currentReelIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => loadReel(currentReelIndex + 1));

  if (likeBtn && likeIcon && likesCount) {
    let liked = false;
    likeBtn.addEventListener('click', () => {
      liked = !liked;
      if (liked) {
        likeIcon.style.color = '#EF4444';
        if (typeof showToast === 'function') showToast('Liked reel! ❤️');
      } else {
        likeIcon.style.color = '';
      }
    });
  }

  if (followBtn) {
    let following = false;
    followBtn.addEventListener('click', () => {
      following = !following;
      followBtn.textContent = following ? 'Following' : '+ Follow';
      followBtn.style.background = following ? '#00D2FF' : '';
      followBtn.style.color = following ? '#080B11' : '';
      if (typeof showToast === 'function') showToast(following ? 'Creator followed! ✨' : 'Unfollowed');
    });
  }

  if (audioToggle && video && volumeIcon) {
    audioToggle.addEventListener('click', () => {
      video.muted = !video.muted;
      if (video.muted) {
        volumeIcon.className = 'fa-solid fa-volume-xmark';
        if (typeof showToast === 'function') showToast('Muted');
      } else {
        volumeIcon.className = 'fa-solid fa-volume-high';
        if (typeof showToast === 'function') showToast('Audio active 🔊');
      }
    });
  }

  if (video && progressIndicator) {
    video.addEventListener('timeupdate', () => {
      const pct = (video.currentTime / (video.duration || 1)) * 100;
      progressIndicator.style.width = pct + '%';
    });
  }
}

// 2. Long-Form Video Theater Controller
function initVideoTheater() {
  const modal = document.getElementById('video-theater-modal');
  const closeBtn = document.getElementById('btn-close-theater-modal');
  const video = document.getElementById('theater-active-video');
  const title = document.getElementById('theater-title');
  const channelName = document.getElementById('theater-channel-name');
  const likeBtn = document.getElementById('btn-theater-like');
  const likesCount = document.getElementById('theater-likes-count');
  const subscribeBtn = document.getElementById('btn-theater-subscribe');
  const postCommentBtn = document.getElementById('btn-theater-post-comment');
  const commentInput = document.getElementById('input-theater-comment');

  function openTheater(streamTitle, creator) {
    if (modal) {
      if (title && streamTitle) title.textContent = streamTitle;
      if (channelName && creator) channelName.innerHTML = `${creator} <i class="fa-solid fa-circle-check badge-verified"></i>`;
      modal.classList.add('active');
      if (video) video.play().catch(() => {});
      if (typeof showToast === 'function') showToast('Joined stream in Theater Mode 🎥');
    }
  }

  function closeTheater() {
    if (modal) {
      modal.classList.remove('active');
      if (video) video.pause();
    }
  }

  document.querySelectorAll('.btn-open-theater-modal, .live-stream-item').forEach(item => {
    item.addEventListener('click', () => {
      const st = item.getAttribute('data-title') || 'Tokyo Spatial Meetup & Live Protocol Review';
      const cr = item.getAttribute('data-creator') || 'Elena Rostova';
      openTheater(st, cr);
    });
  });

  const sidebarLive = document.getElementById('sidebar-link-live');
  if (sidebarLive) {
    sidebarLive.addEventListener('click', (e) => {
      e.preventDefault();
      openTheater('Global Spatial Stream & Binaural Hub', 'ConnectSphere Live');
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', closeTheater);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeTheater();
    });
  }

  if (likeBtn && likesCount) {
    let liked = false;
    likeBtn.addEventListener('click', () => {
      liked = !liked;
      likeBtn.style.color = liked ? '#00D2FF' : '';
      if (typeof showToast === 'function') showToast(liked ? 'Liked video stream! 👍' : 'Like removed');
    });
  }

  if (subscribeBtn) {
    let subbed = true;
    subscribeBtn.addEventListener('click', () => {
      subbed = !subbed;
      subscribeBtn.textContent = subbed ? 'Subscribed' : 'Subscribe';
      subscribeBtn.classList.toggle('active', subbed);
      if (typeof showToast === 'function') showToast(subbed ? 'Subscribed to channel 🔔' : 'Unsubscribed');
    });
  }

  if (postCommentBtn && commentInput) {
    postCommentBtn.addEventListener('click', () => {
      const text = commentInput.value.trim();
      if (!text) return;
      commentInput.value = '';
      if (typeof showToast === 'function') showToast('Transmission sent to live stream discussion! 💬✨');
    });
  }
}

// 3. Calling Feature Controller (Voice & Video)
function initCallingFeature() {
  const modal = document.getElementById('calling-modal');
  const micBtn = document.getElementById('btn-call-toggle-mic');
  const micIcon = document.getElementById('icon-call-mic');
  const camBtn = document.getElementById('btn-call-toggle-cam');
  const camIcon = document.getElementById('icon-call-cam');
  const endCallBtn = document.getElementById('btn-call-end');
  const callTimer = document.getElementById('call-timer');
  const screenshareBtn = document.getElementById('btn-call-screenshare');
  const addUserBtn = document.getElementById('btn-call-add-user');

  let callSeconds = 134;
  let timerInterval = null;

  function formatTime(s) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function startCall(partnerName) {
    if (modal) {
      if (partnerName) {
        const nameEl = document.getElementById('call-partner-name');
        if (nameEl) nameEl.textContent = partnerName;
      }
      modal.classList.add('active');
      callSeconds = 0;
      if (callTimer) callTimer.textContent = '00:00';
      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        callSeconds++;
        if (callTimer) callTimer.textContent = formatTime(callSeconds);
      }, 1000);
      if (typeof showToast === 'function') showToast('Encrypted peer transmission connected! 📞✨');
    }
  }

  function endCall() {
    if (modal) {
      modal.classList.remove('active');
      clearInterval(timerInterval);
      if (typeof showToast === 'function') showToast('Transmission terminated');
    }
  }

  // Trigger from messages drawer call buttons
  const drawerVoiceCall = document.getElementById('btn-drawer-voice-call');
  const drawerVideoCall = document.getElementById('btn-drawer-video-call');
  if (drawerVoiceCall) drawerVoiceCall.addEventListener('click', () => startCall('Elena Rostova'));
  if (drawerVideoCall) drawerVideoCall.addEventListener('click', () => startCall('Elena Rostova'));

  if (endCallBtn) endCallBtn.addEventListener('click', endCall);

  if (micBtn && micIcon) {
    let muted = false;
    micBtn.addEventListener('click', () => {
      muted = !muted;
      micBtn.classList.toggle('active', muted);
      micIcon.className = muted ? 'fa-solid fa-microphone-slash' : 'fa-solid fa-microphone';
      if (typeof showToast === 'function') showToast(muted ? 'Microphone muted 🔇' : 'Microphone unmuted 🎙️');
    });
  }

  if (camBtn && camIcon) {
    let camOff = false;
    camBtn.addEventListener('click', () => {
      camOff = !camOff;
      camBtn.classList.toggle('active', camOff);
      camIcon.className = camOff ? 'fa-solid fa-video-slash' : 'fa-solid fa-video';
      if (typeof showToast === 'function') showToast(camOff ? 'Camera stream stopped' : 'Camera stream active 📹');
    });
  }

  if (screenshareBtn) {
    let sharing = false;
    screenshareBtn.addEventListener('click', () => {
      sharing = !sharing;
      screenshareBtn.classList.toggle('active', sharing);
      if (typeof showToast === 'function') showToast(sharing ? 'Zero-latency screen stream shared 🖥️' : 'Screen share ended');
    });
  }

  if (addUserBtn) {
    addUserBtn.addEventListener('click', () => {
      if (typeof showToast === 'function') showToast('Mesh invite dispatched to Marcus Vance & Sofia Chen! 👥');
    });
  }
}

// 4. Snap-Style Temporary Media Controller
function initSnapMedia() {
  const modal = document.getElementById('snap-media-modal');
  const timerSpan = document.getElementById('snap-seconds-left');
  const replyInput = document.getElementById('snap-quick-reply');
  const sendReplyBtn = document.getElementById('btn-send-snap-reply');
  let snapCountdown = 10;
  let snapInterval = null;

  function openSnap(senderName, mediaSrc) {
    if (!modal) return;
    if (senderName) {
      const s = document.getElementById('snap-sender-name');
      if (s) s.textContent = senderName;
    }
    if (mediaSrc) {
      const img = document.getElementById('snap-image-view');
      if (img) img.src = mediaSrc;
    }
    modal.classList.add('active');
    snapCountdown = 10;
    if (timerSpan) timerSpan.textContent = snapCountdown + 's';

    clearInterval(snapInterval);
    snapInterval = setInterval(() => {
      snapCountdown--;
      if (timerSpan) timerSpan.textContent = snapCountdown + 's';
      if (snapCountdown <= 0) {
        clearInterval(snapInterval);
        closeSnap();
        if (typeof showToast === 'function') showToast('Transmission self-destructed 💥');
      }
    }, 1000);
  }

  function closeSnap() {
    if (modal) modal.classList.remove('active');
    clearInterval(snapInterval);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSnap();
    });
  }

  if (sendReplyBtn && replyInput) {
    sendReplyBtn.addEventListener('click', () => {
      if (!replyInput.value.trim()) return;
      replyInput.value = '';
      if (typeof showToast === 'function') showToast('Temporary reply delivered! 🚀');
      setTimeout(closeSnap, 500);
    });
  }

  // Hook into any snap triggers if present
  window.openSnapModal = openSnap;
}

// 5. Creator Studio & Analytics Dashboard Controller
function initCreatorStudio() {
  const modal = document.getElementById('creator-studio-modal');
  const closeBtn = document.getElementById('btn-close-creator-modal');
  const exportBtn = document.getElementById('btn-export-analytics');
  const toolsBtn = document.getElementById('btn-creator-tools');
  const learnMoreBtn = document.getElementById('btn-vip-learn-more');

  function openStudio() {
    if (modal) {
      modal.classList.add('active');
      if (typeof showToast === 'function') showToast('Creator Hub & Analytics synchronized 📊✨');
    }
  }

  function closeStudio() {
    if (modal) modal.classList.remove('active');
  }

  if (learnMoreBtn) learnMoreBtn.addEventListener('click', openStudio);
  if (closeBtn) closeBtn.addEventListener('click', closeStudio);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeStudio();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (typeof showToast === 'function') showToast('Analytics report exported as PDF/JSON 📄');
    });
  }

  if (toolsBtn) {
    toolsBtn.addEventListener('click', () => {
      if (typeof showToast === 'function') showToast('Sphere AI generated 3 growth strategies for your account! 🤖✨');
    });
  }
}

// 6. Universal Search Overlay Controller (Ctrl+K or Header Input)
function initUniversalSearch() {
  const modal = document.getElementById('universal-search-modal');
  const closeBtn = document.getElementById('btn-close-search-modal');
  const searchInput = document.getElementById('universal-search-input');
  const topInput = document.getElementById('masterpiece-top-search-input');
  const widgetInput = document.getElementById('widget-search-input');
  const filterTabs = document.querySelectorAll('.search-tab-pill');
  const resultsContainer = document.getElementById('universal-search-results');

  function openSearch(initialQuery = '') {
    if (modal) {
      modal.classList.add('active');
      if (searchInput) {
        searchInput.value = initialQuery;
        setTimeout(() => searchInput.focus(), 150);
      }
    }
  }

  function closeSearch() {
    if (modal) modal.classList.remove('active');
  }

  // Ctrl+K Global Shortcut
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  if (topInput) {
    topInput.addEventListener('click', () => openSearch(topInput.value));
    topInput.addEventListener('focus', () => openSearch(topInput.value));
  }

  if (widgetInput) {
    widgetInput.addEventListener('click', () => openSearch(widgetInput.value));
  }

  if (closeBtn) closeBtn.addEventListener('click', closeSearch);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSearch();
    });
  }

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.getAttribute('data-filter');
      if (resultsContainer) {
        const items = resultsContainer.querySelectorAll('.search-result-item');
        items.forEach(item => {
          if (filter === 'all' || item.getAttribute('data-type') === filter) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      }
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (resultsContainer) {
        const items = resultsContainer.querySelectorAll('.search-result-item');
        items.forEach(item => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(q) ? 'flex' : 'none';
        });
      }
    });
  }
}

// 7. Profile Quick-View Modal Controller
function initProfileModal() {
  const modal = document.getElementById('profile-modal');
  const closeBtn = document.getElementById('btn-close-profile-modal');
  const headerCapsule = document.getElementById('header-user-capsule');
  const sidebarUser = document.getElementById('sidebar-user-widget');
  const connectBtn = document.getElementById('btn-profile-modal-connect');
  const messageBtn = document.getElementById('btn-profile-modal-message');

  let currentProfileId = null;

  async function openProfile(identifier) {
    if (modal) {
      modal.classList.add('active');
      const nameEl = document.getElementById('profile-modal-name');
      const handleEl = document.getElementById('profile-modal-handle');
      const avatarEl = document.getElementById('profile-modal-avatar');
      const bioEl = document.getElementById('profile-modal-bio');
      const followersEl = document.getElementById('profile-modal-followers-count');
      const followingEl = document.getElementById('profile-modal-following-count');
      
      // Initial loading state
      if (nameEl) nameEl.textContent = 'Loading...';
      if (handleEl) handleEl.textContent = identifier;
      
      try {
        const profile = await window.ProfileService?.getProfile(identifier);
        if (profile) {
          currentProfileId = profile.id;
          if (nameEl) nameEl.textContent = profile.full_name || 'Creator';
          if (handleEl) handleEl.textContent = profile.username ? `@${profile.username}` : '@creator';
          if (avatarEl) avatarEl.src = profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
          if (bioEl) bioEl.textContent = profile.bio || 'No bio provided.';
          
          const stats = await window.ProfileService?.getProfileStats(profile.id);
          if (followersEl) followersEl.textContent = formatCount(stats?.followers || 0);
          if (followingEl) followingEl.textContent = formatCount(stats?.following || 0);

          if (connectBtn) {
            const isFollowing = await window.ProfileService?.isFollowing(profile.id);
            connectBtn.dataset.following = isFollowing;
            connectBtn.classList.toggle('active', isFollowing);
            connectBtn.innerHTML = isFollowing ? '<i class="fa-solid fa-user-check"></i> Connected' : '<i class="fa-solid fa-user-plus"></i> Connect';
          }
        } else {
           if (nameEl) nameEl.textContent = 'User Not Found';
        }
      } catch (err) {
      }
    }
  }

  function formatCount(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  function closeProfile() {
    if (modal) modal.classList.remove('active');
  }

  if (headerCapsule) headerCapsule.addEventListener('click', () => {
    const user = window.csStore?.get('currentUser');
    if (user && user.id) openProfile(user.id);
  });
  
  if (sidebarUser) {
    const avatar = sidebarUser.querySelector('.avatar-wrapper');
    if (avatar) avatar.addEventListener('click', () => {
      const user = window.csStore?.get('currentUser');
      if (user && user.id) openProfile(user.id);
    });
  }

  // Author clicks in feed
  document.addEventListener('click', (e) => {
    const authorRow = e.target.closest('.post-user-details');
    if (authorRow) {
      const handle = authorRow.querySelector('.post-user-meta div')?.textContent?.trim();
      if (handle && handle.startsWith('@')) {
        openProfile(handle);
      }
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', closeProfile);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeProfile();
    });
  }

  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      if (!currentProfileId) return;
      
      const isFollowing = connectBtn.dataset.following === 'true';
      const originalText = connectBtn.innerHTML;
      
      // Optimistic UI update
      connectBtn.classList.toggle('active', !isFollowing);
      connectBtn.dataset.following = !isFollowing;
      connectBtn.innerHTML = !isFollowing ? '<i class="fa-solid fa-user-check"></i> Connected' : '<i class="fa-solid fa-user-plus"></i> Connect';
      
      let success = false;
      if (isFollowing) {
        success = await window.ProfileService?.unfollowUser(currentProfileId);
      } else {
        success = await window.ProfileService?.followUser(currentProfileId);
      }
      
      if (success) {
        if (typeof showToast === 'function') showToast(!isFollowing ? 'Peer connection active ✨' : 'Connection removed');
        // Refresh stats
        const stats = await window.ProfileService?.getProfileStats(currentProfileId);
        const followersEl = document.getElementById('profile-modal-followers-count');
        if (followersEl) followersEl.textContent = formatCount(stats?.followers || 0);
      } else {
        // Revert on failure
        connectBtn.classList.toggle('active', isFollowing);
        connectBtn.dataset.following = isFollowing;
        connectBtn.innerHTML = originalText;
        if (typeof showToast === 'function') showToast('Failed to update connection state');
      }
    });
  }

  if (messageBtn) {
    messageBtn.addEventListener('click', () => {
      closeProfile();
      const chatDrawer = document.getElementById('chat-drawer');
      if (chatDrawer) chatDrawer.classList.add('open');
      if (typeof showToast === 'function') showToast('Direct transmission channel opened 💬');
    });
  }
}

// ---------------------------------------------------------------------------
// ConnectSphere Platform Suite Orchestrator (Phase 3 Architecture)
// ---------------------------------------------------------------------------
function initPlatformSuite() {
  if (typeof window.csStore === 'undefined') return;

  // Initialize modular component renderers
  if (typeof FeedRenderer !== 'undefined' && FeedRenderer.init) FeedRenderer.init();
  if (typeof StoryRenderer !== 'undefined' && StoryRenderer.init) StoryRenderer.init();
  if (typeof ReelsRenderer !== 'undefined' && ReelsRenderer.init) ReelsRenderer.init();
  if (typeof ChatRenderer !== 'undefined' && ChatRenderer.init) ChatRenderer.init();
  if (typeof CallingRenderer !== 'undefined' && CallingRenderer.init) CallingRenderer.init();
  if (typeof TheaterRenderer !== 'undefined' && TheaterRenderer.init) TheaterRenderer.init();
  if (typeof SearchRenderer !== 'undefined' && SearchRenderer.init) SearchRenderer.init();
  if (typeof CreatorRenderer !== 'undefined' && CreatorRenderer.init) CreatorRenderer.init();

  // Category Tabs synchronization with State Store
  document.querySelectorAll('.feed-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dataTab = btn.getAttribute('data-tab');
      let mapped = 'forYou';
      if (dataTab === 'following') mapped = 'following';
      else if (dataTab === 'latest') mapped = 'latest';
      else if (dataTab === 'communities') mapped = 'communities';
      else if (dataTab === 'spatial') mapped = 'spatial';
      else if (dataTab === 'global') mapped = 'global';

      window.csStore.set('activeTab', mapped);
    });
  });

  // Trending topic click filter sync
  document.querySelectorAll('.trending-item, .community-pill-item').forEach(item => {
    item.addEventListener('click', () => {
      const tag = item.getAttribute('data-tag') || item.querySelector('.trending-topic')?.textContent?.trim();
      if (tag) {
        window.csStore.set('activeFilterTag', tag);
      }
    });
  });

  // AI Sparkle button in inline composer
  const aiBtn = document.getElementById('btn-media-ai');
  const compText = document.getElementById('composer-post-text');
  if (aiBtn) {
    aiBtn.addEventListener('click', async () => {
      aiBtn.disabled = true;
      const origHtml = aiBtn.innerHTML;
      aiBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color:#F472B6;"></i>';
      try {
        const draft = compText ? compText.value : '';
        const suggestion = await SphereAIService.generateCaption(draft || 'ConnectSphere spatial mesh');
        if (compText) {
          compText.value = suggestion;
          compText.focus();
        }
        if (typeof showToast === 'function') showToast('Sphere AI enhanced your transmission! 🤖✨');
      } catch (err) {
        if (compText && !compText.value) {
          compText.value = 'Exploring holographic mesh interfaces and decentralized protocols on ConnectSphere! 🌐✨ #SpatialWeb #ZeroKnowledge';
        }
      } finally {
        aiBtn.disabled = false;
        aiBtn.innerHTML = origHtml;
      }
    });
  }

  // Sync Notification unread count badge
  function updateNotifBadges() {
    if (typeof NotificationService !== 'undefined') {
      const count = NotificationService.getUnreadCount();
      const badge = document.querySelector('.red-notification-badge');
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
    }
  }
  window.csStore.subscribe('notifications', updateNotifBadges);
  updateNotifBadges();
}


  // --- Feed Deep Interactions (Likes, Comments, Shares) ---
  document.querySelectorAll('.cs-post-card .post-actions button').forEach(btn => {
    btn.addEventListener('click', function() {
      const icon = this.querySelector('i');
      if (icon.classList.contains('fa-heart')) {
        // Toggle Like
        const countTextNode = Array.from(this.childNodes).find(node => node.nodeType === 3);
        let count = parseInt((countTextNode.textContent || '0').replace(/[^0-9]/g, ''));
        if (icon.classList.contains('fa-regular')) {
          icon.classList.remove('fa-regular');
          icon.classList.add('fa-solid');
          icon.style.color = '#e0245e'; // Heart red
          icon.style.transform = 'scale(1.2)';
          setTimeout(() => icon.style.transform = 'scale(1)', 200);
          count++;
        } else {
          icon.classList.remove('fa-solid');
          icon.classList.add('fa-regular');
          icon.style.color = '';
          count--;
        }
        if(count > 0 && countTextNode) countTextNode.textContent = ' ' + count;
      }
      else if (icon.classList.contains('fa-retweet')) {
        // Toggle Share/Retweet
        const countTextNode = Array.from(this.childNodes).find(node => node.nodeType === 3);
        let count = parseInt((countTextNode.textContent || '0').replace(/[^0-9]/g, ''));
        if (this.style.color !== 'rgb(23, 191, 99)') { // Share green
          this.style.color = 'rgb(23, 191, 99)';
          icon.style.transform = 'scale(1.2)';
          setTimeout(() => icon.style.transform = 'scale(1)', 200);
          count++;
        } else {
          this.style.color = '';
          count--;
        }
        if(count > 0 && countTextNode) countTextNode.textContent = ' ' + count;
      }
    });
  });
