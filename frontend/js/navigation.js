/**
 * ConnectSphere Navigation Engine
 * Handles branded page-to-page transitions (Section 38), tab switching, and active link updates
 */

document.addEventListener('DOMContentLoaded', () => {
  initPageTransitions();
  initNavigation();
});

/**
 * Branded ConnectSphere Connecting Transition (Section 38)
 * Connects INDEX <-> LOGIN <-> SIGNUP with high-tech orbital node and light sweep
 */
function initPageTransitions() {
  let overlay = document.getElementById('cs-page-transition');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'cs-page-transition';
    overlay.innerHTML = `
      <div class="cs-transition-streak"></div>
      <div class="cs-transition-orb">
        <div class="cs-transition-halo"></div>
        <svg width="76" height="76" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.14)" stroke-width="1.5" stroke-dasharray="4 6"/>
          <ellipse cx="50" cy="50" rx="42" ry="16" stroke="#00D9FF" stroke-width="3" transform="rotate(32 50 50)" class="spin-orbit-cw"/>
          <ellipse cx="50" cy="50" rx="42" ry="16" stroke="#00F5D4" stroke-width="3" transform="rotate(-32 50 50)" class="spin-orbit-ccw"/>
          <circle cx="50" cy="50" r="10" fill="#00D9FF" class="core-orb-pulse" filter="drop-shadow(0 0 12px #00D9FF)"/>
        </svg>
      </div>
      <div class="cs-transition-label">Connecting Network...</div>
    `;
    document.body.appendChild(overlay);
  }

  // Intercept internal page navigation links between index, login, signup
  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) return;

    const isPortalRoute = href.includes('index.html') || href.includes('login.html') || href.includes('signup.html');
    if (isPortalRoute) {
      link.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || link.target === '_blank') return;
        e.preventDefault();

        overlay.classList.add('active');

        // Smooth transition duration ~520ms before navigating
        setTimeout(() => {
          window.location.href = href;
        }, 520);
      });
    }
  });

  // Handle browser back/forward cache restore
  window.addEventListener('pageshow', () => {
    if (overlay) overlay.classList.remove('active');
  });
}

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
  const tabPages = document.querySelectorAll('.tab-page');
  const headerTitle = document.getElementById('page-title');

  const titles = {
    'home-tab': 'Home Feed',
    'explore-tab': 'Explore Discovery',
    'reels-tab': 'Short Reels',
    'notifications-tab': 'Notifications',
    'messages-tab': 'Direct Messages',
    'profile-tab': 'User Profile',
    'settings-tab': 'Settings',
  };

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      if (!targetTab) return;

      // Update active links
      document.querySelectorAll('.nav-item, .mobile-nav-item').forEach((el) => {
        if (el.getAttribute('data-tab') === targetTab) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });

      // Update active view tabs if multi-tab page
      if (tabPages.length > 0) {
        tabPages.forEach((page) => {
          if (page.id === targetTab) {
            page.classList.add('active');
          } else {
            page.classList.remove('active');
          }
        });
      }

      if (headerTitle && titles[targetTab]) {
        headerTitle.textContent = titles[targetTab];
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}
