/**
 * ConnectSphere Micro-Interactions, Particle Background Engine & Visual Effects
 * Includes interactive Mouse-Reactive Canvas Particles, Button Ripples, Toasts & Magnetic Pull
 */

// Initialize Background Effects on Load
document.addEventListener('DOMContentLoaded', () => {
  initParticleCanvas();
  initMagneticButtons();
  initPasswordToggles();
  initFaqAccordion();
  initPasswordStrengthMeter();
  initSubtleParallax();
  initCursorLighting();
});

// Mouse-Reactive Interactive Canvas Particle Network Background Engine
function initParticleCanvas() {
  let canvas = document.getElementById('particle-bg-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'particle-bg-canvas';
    document.body.prepend(canvas);
  }

  // Always force fixed background positioning so it never interferes with flexbox layout
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '0';
  canvas.style.opacity = '0.22';

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const mouse = { x: null, y: null, radius: 150 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  const pageMode = document.body.getAttribute('data-page') || 
                   (window.location.pathname.includes('login') ? 'login' : 
                   (window.location.pathname.includes('signup') ? 'signup' : 
                   (window.location.pathname.includes('dashboard') ? 'dashboard' : 'index')));

  let colors = ['#7357FF', '#16D9FF', '#00E6C3', '#F7F8FC'];
  let threadRgb = '115, 87, 255';
  
  if (pageMode === 'login') {
    // Login: Secure Gateway (Royal Violet + Electric Cyan + Silver)
    colors = ['#6D4AFF', '#8B5CF6', '#00D8FF', '#A78BFA', '#E2E8F0'];
    threadRgb = '109, 74, 255';
  } else if (pageMode === 'signup') {
    // Signup: Human Community (Teal + Turquoise + Warm Gold + Soft Coral)
    colors = ['#00D5B5', '#19D9E6', '#F2B95E', '#FF7B7B', '#FFF9F0'];
    threadRgb = '0, 213, 181';
  } else if (pageMode === 'dashboard') {
    // Dashboard: Subtle, dark neutral, minimal particles
    colors = ['rgba(148, 163, 184, 0.4)', 'rgba(0, 210, 255, 0.3)', 'rgba(139, 92, 246, 0.3)', 'rgba(255, 255, 255, 0.25)'];
    threadRgb = '148, 163, 184';
    canvas.style.opacity = '0.18';
  }

  const particlesCount = pageMode === 'dashboard' ? Math.min(Math.floor(width / 55), 24) : Math.min(Math.floor(width / 26), 50);
  const particles = [];

  class GlobalNode {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      if (pageMode === 'login') {
        // Subtle vertical signal flow for security gateway
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() * -0.5) - 0.15;
      } else {
        this.vx = (Math.random() - 0.5) * 0.45;
        this.vy = (Math.random() - 0.5) * 0.45;
      }
      this.size = Math.random() * 2 + 1;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.pulsePhase = Math.random() * Math.PI * 2;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.fill();
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0) this.x = width;
      if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height;
      if (this.y > height) this.y = 0;

      // Subtle mouse interaction - gentle curving
      if (mouse.x != null && mouse.y != null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;
          this.x -= (dx / distance) * force * 0.8;
          this.y -= (dy / distance) * force * 0.8;
        }
      }
    }
  }

  for (let i = 0; i < particlesCount; i++) {
    particles.push(new GlobalNode());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Render delicate constellation/security threads
    for (let a = 0; a < particles.length; a++) {
      for (let b = a + 1; b < particles.length; b++) {
        const dx = particles[a].x - particles[b].x;
        const dy = particles[a].y - particles[b].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 135) {
          const opacity = (1 - dist / 135) * 0.24;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.strokeStyle = `rgba(${threadRgb}, ${opacity})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    particles.forEach((p) => {
      p.update();
      p.draw();
    });

    requestAnimationFrame(animate);
  }

  animate();
}


// Magnetic Pull Buttons Effect
function initMagneticButtons() {
  document.querySelectorAll('.btn-create-post, .btn-hero-primary, .btn-primary-block, .btn-portal').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px) scale(1.03)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = `translate(0px, 0px) scale(1)`;
    });
  });
}

// Top Scroll Progress Bar Indicator
function initScrollProgressBar() {
  let progressBar = document.getElementById('scroll-progress-bar');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'scroll-progress-bar';
    document.body.appendChild(progressBar);
  }

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = scrollPercent + '%';
  });
}

// Button Ripple Effect Handler
function initRippleEffects() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('button, .btn-create-post, .btn-hero-primary, .action-btn, .btn-social');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

// Password Eye Reveal Toggle (Floating & Input Wrappers)
function initPasswordToggles() {
  document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.password-toggle-btn');
    if (!toggleBtn) return;
    e.preventDefault();

    const parent = toggleBtn.closest('.floating-group, .input-wrapper, .form-group');
    if (!parent) return;

    const input = parent.querySelector('input[type="password"], input[type="text"]');
    if (!input) return;

    if (input.type === 'password') {
      input.type = 'text';
      toggleBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
      toggleBtn.setAttribute('aria-label', 'Hide password');
    } else {
      input.type = 'password';
      toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
      toggleBtn.setAttribute('aria-label', 'Show password');
    }
  });
}

// Interactive FAQ Accordion Engine
function initFaqAccordion() {
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (!item) return;

      const isActive = item.classList.contains('active');

      // Optional: Close other items
      document.querySelectorAll('.faq-item.active').forEach((openItem) => {
        if (openItem !== item) {
          openItem.classList.remove('active');
          const otherBtn = openItem.querySelector('.faq-question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });

      item.classList.toggle('active');
      btn.setAttribute('aria-expanded', !isActive);
    });
  });
}

// Password Strength Meter for Signup
function initPasswordStrengthMeter() {
  const passwordInput = document.getElementById('signup-password-input');
  const strengthBar = document.getElementById('password-strength-bar');
  const strengthLabel = document.getElementById('password-strength-label');
  if (!passwordInput || !strengthBar) return;

  const reqLength = document.getElementById('req-length');
  const reqUpper = document.getElementById('req-upper');
  const reqNumber = document.getElementById('req-number');
  const reqSymbol = document.getElementById('req-symbol');

  passwordInput.addEventListener('input', () => {
    const val = passwordInput.value;
    let score = 0;

    const hasLength = val.length >= 8;
    const hasUpper = /[A-Z]/.test(val);
    const hasNumber = /[0-9]/.test(val);
    const hasSymbol = /[^A-Za-z0-9]/.test(val);

    if (hasLength) score += 25;
    if (hasUpper) score += 25;
    if (hasNumber) score += 25;
    if (hasSymbol) score += 25;

    // Update requirements visual state
    function updateReq(el, isValid) {
      if (!el) return;
      if (isValid) {
        el.classList.add('valid');
        const icon = el.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-circle-check';
      } else {
        el.classList.remove('valid');
        const icon = el.querySelector('i');
        if (icon) icon.className = 'fa-regular fa-circle';
      }
    }

    updateReq(reqLength, hasLength);
    updateReq(reqUpper, hasUpper);
    updateReq(reqNumber, hasNumber);
    updateReq(reqSymbol, hasSymbol);

    strengthBar.style.width = `${score}%`;

    if (score === 0) {
      strengthBar.style.width = '0%';
      if (strengthLabel) strengthLabel.textContent = '';
    } else if (score <= 25) {
      strengthBar.style.backgroundColor = '#EF4444'; // Red
      strengthBar.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.6)';
      if (strengthLabel) {
        strengthLabel.textContent = 'Weak';
        strengthLabel.style.color = '#EF4444';
      }
    } else if (score <= 50) {
      strengthBar.style.backgroundColor = '#F97316'; // Orange
      strengthBar.style.boxShadow = '0 0 10px rgba(249, 115, 22, 0.6)';
      if (strengthLabel) {
        strengthLabel.textContent = 'Fair';
        strengthLabel.style.color = '#F97316';
      }
    } else if (score <= 75) {
      strengthBar.style.backgroundColor = '#F59E0B'; // Amber
      strengthBar.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.6)';
      if (strengthLabel) {
        strengthLabel.textContent = 'Good';
        strengthLabel.style.color = '#F59E0B';
      }
    } else {
      strengthBar.style.backgroundColor = '#22C55E'; // Emerald
      strengthBar.style.boxShadow = '0 0 12px rgba(34, 197, 94, 0.7)';
      if (strengthLabel) {
        strengthLabel.textContent = 'Strong';
        strengthLabel.style.color = '#22C55E';
      }
    }
  });
}


// Simulated Voice Note Player
function initVoiceNotePlayer() {
  document.addEventListener('click', (e) => {
    const voiceBtn = e.target.closest('.btn-play-voice');
    if (!voiceBtn) return;

    const icon = voiceBtn.querySelector('i');
    if (icon.classList.contains('fa-play')) {
      icon.className = 'fa-solid fa-pause';
      showToast('Playing voice note 🎙️');
      setTimeout(() => { icon.className = 'fa-solid fa-play'; }, 3000);
    } else {
      icon.className = 'fa-solid fa-play';
    }
  });
}

// Theme Switcher (Dark / Light)
function initThemeToggle() {
  const themeToggles = document.querySelectorAll('.theme-toggle-btn, #theme-toggle-btn');
  themeToggles.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      showToast(`Switched to ${newTheme} mode 🌙`);
    });
  });
}

// Dynamic Toast System
function showToast(message) {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: rgba(11, 11, 20, 0.95);
    border: 1px solid var(--primary);
    color: white;
    padding: 12px 22px;
    border-radius: 16px;
    font-size: 14px;
    font-weight: 700;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(14px);
    animation: toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  `;
  toast.innerHTML = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Cinematic 3D Layer Parallax Engine (Reduced/Disabled on Mobile & Reduced Motion)
function initSubtleParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth < 1024) return;

  const bgBackdrop = document.querySelector('.cinematic-backdrop-layer');
  const holoContainer = document.querySelector('.holo-floating-container');
  const heroCard = document.querySelector('.portal-hero-card, .auth-card');

  if (!bgBackdrop && !holoContainer && !heroCard) return;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let isTicking = false;

  window.addEventListener('mousemove', (e) => {
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    targetX = (e.clientX - halfW) / halfW;
    targetY = (e.clientY - halfH) / halfH;

    if (!isTicking) {
      isTicking = true;
      requestAnimationFrame(updateParallax);
    }
  }, { passive: true });

  function updateParallax() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    // Background: very slow (approx 6-8px, scaled to prevent border clipping)
    if (bgBackdrop) {
      bgBackdrop.style.transform = `translate3d(${(-currentX * 7).toFixed(2)}px, ${(-currentY * 7).toFixed(2)}px, 0) scale(1.03)`;
    }

    // Floating UI: slightly stronger (approx 12-16px)
    if (holoContainer) {
      holoContainer.style.transform = `translate3d(${(currentX * 14).toFixed(2)}px, ${(currentY * 14).toFixed(2)}px, 0)`;
    }

    // Hero: almost stationary (approx 2-3px)
    if (heroCard) {
      heroCard.style.transform = `translate3d(${(-currentX * 3).toFixed(2)}px, ${(-currentY * 3).toFixed(2)}px, 0)`;
    }

    if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
      requestAnimationFrame(updateParallax);
    } else {
      isTicking = false;
    }
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth < 1024) {
      if (bgBackdrop) bgBackdrop.style.transform = '';
      if (holoContainer) holoContainer.style.transform = '';
      if (heroCard) heroCard.style.transform = '';
    }
  });
}

// Interactive Cursor Spotlight Lighting & Glass Reflection
function initCursorLighting() {
  const cards = document.querySelectorAll('.portal-hero-card, .auth-card, .recovery-card');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--cursor-x', `${x.toFixed(1)}px`);
      card.style.setProperty('--cursor-y', `${y.toFixed(1)}px`);
    }, { passive: true });
  });
}
