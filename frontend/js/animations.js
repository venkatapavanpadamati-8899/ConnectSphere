/**
 * ConnectSphere Visual Animations Engine
 * Handles double-tap heart particle bursts, password strength meter, story progress bars & scroll reveals
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveals();
});

// Scroll-Triggered Reveal Animations Observer
function initScrollReveals() {
  const revealElements = document.querySelectorAll('.post-card, .explore-item, .widget-card, .reveal-on-scroll');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealElements.forEach((el) => observer.observe(el));
}

// Double Tap Heart Burst Animation on Media Container
function initDoubleTapHeartBurst() {
  let lastTap = 0;

  document.addEventListener('touchend', handleDoubleTap);
  document.addEventListener('dblclick', (e) => {
    const mediaContainer = e.target.closest('.post-media-container');
    if (mediaContainer) triggerHeartBurst(mediaContainer);
  });

  function handleDoubleTap(e) {
    const mediaContainer = e.target.closest('.post-media-container');
    if (!mediaContainer) return;

    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
      triggerHeartBurst(mediaContainer);
      e.preventDefault();
    }
    lastTap = currentTime;
  }

  function triggerHeartBurst(container) {
    let overlay = container.querySelector('.heart-burst-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'heart-burst-overlay';
      overlay.innerHTML = '<i class="fa-solid fa-heart"></i>';
      container.appendChild(overlay);
    }

    overlay.classList.remove('animate');
    void overlay.offsetWidth; // Force Reflow
    overlay.classList.add('animate');

    const postCard = container.closest('.post-card');
    if (postCard) {
      const likeBtn = postCard.querySelector('.btn-like');
      if (likeBtn && !likeBtn.classList.contains('liked')) {
        likeBtn.click();
      }
    }
  }
}

// Password Strength Meter Handler
function initPasswordStrengthMeter() {
  const passwordInput = document.getElementById('signup-password-input');
  const strengthBar = document.getElementById('password-strength-bar');

  if (passwordInput && strengthBar) {
    passwordInput.addEventListener('input', () => {
      const val = passwordInput.value;
      let score = 0;
      if (val.length >= 6) score += 25;
      if (val.match(/[A-Z]/)) score += 25;
      if (val.match(/[0-9]/)) score += 25;
      if (val.match(/[^A-Za-z0-9]/)) score += 25;

      strengthBar.style.width = `${score}%`;
      if (score <= 25) strengthBar.style.background = '#FF7675';
      else if (score <= 50) strengthBar.style.background = '#FDCB6E';
      else if (score <= 75) strengthBar.style.background = '#00CEC9';
      else strengthBar.style.background = '#10B981';
    });
  }
}

// Story Progress Bar Simulator
function initStoryViewer() {
  const storyCards = document.querySelectorAll('.story-card');
  const storyModal = document.getElementById('story-modal');
  const closeStoryBtn = document.getElementById('btn-close-story-modal');
  const storyProgress = document.getElementById('story-progress-bar');

  let storyTimer;

  storyCards.forEach((card) => {
    if (card.classList.contains('btn-open-create-modal')) return;

    card.addEventListener('click', () => {
      if (!storyModal) return;
      storyModal.classList.add('active');
      if (storyProgress) {
        storyProgress.style.width = '0%';
        setTimeout(() => (storyProgress.style.width = '100%'), 50);
      }

      clearTimeout(storyTimer);
      storyTimer = setTimeout(() => {
        storyModal.classList.remove('active');
      }, 5000);
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
}
