/**
 * ConnectSphere Navigation Renderer
 * Standardizes global navigation across all pages to ensure consistency.
 */

const NavigationRenderer = {
  init: function(page = 'home') {
    const container = document.getElementById('standard-navigation-container');
    if (container) {
      const user = window.csStore?.get('currentUser') || {};
      const name = user.name || user.full_name || 'Alex Johnson';
      const handle = user.handle || (user.username ? (user.username.startsWith('@') ? user.username : '@' + user.username) : '@alexjohnson');
      const avatar = user.avatar || user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

      container.innerHTML = `
        <aside class="cs-sidebar-nav">
           <a href="dashboard.html" class="cs-brand-logo">
             <i class="fa-solid fa-globe"></i> Connect<span>Sphere</span>
           </a>

           <div class="cs-nav-links">
              <a href="dashboard.html" class="cs-nav-link ${page === 'home' ? 'active' : ''}" id="sidebar-link-home"><i class="fa-solid fa-house"></i> Home</a>
              <a href="explore.html" class="cs-nav-link ${page === 'explore' ? 'active' : ''}" id="sidebar-link-explore"><i class="fa-solid fa-compass"></i> Explore</a>
              <a href="dashboard.html#stories" class="cs-nav-link ${page === 'stories' ? 'active' : ''}" id="sidebar-link-stories"><i class="fa-solid fa-circle-notch"></i> Stories</a>
              <a href="reels.html" class="cs-nav-link ${page === 'reels' ? 'active' : ''}" id="sidebar-link-reels"><i class="fa-solid fa-video"></i> Reels</a>
              <a href="messages.html" class="cs-nav-link ${page === 'messages' ? 'active' : ''}" id="sidebar-link-messages"><i class="fa-solid fa-envelope"></i> Messages</a>
              <a href="explore.html#communities" class="cs-nav-link ${page === 'communities' ? 'active' : ''}" id="sidebar-link-communities"><i class="fa-solid fa-users"></i> Communities</a>
              <a href="notifications.html" class="cs-nav-link ${page === 'notifications' ? 'active' : ''}" id="sidebar-link-notifications"><i class="fa-solid fa-bell"></i> Notifications</a>
              <a href="profile.html" class="cs-nav-link ${page === 'profile' ? 'active' : ''}" id="sidebar-link-profile"><i class="fa-solid fa-user"></i> Profile</a>
              <a href="settings.html" class="cs-nav-link ${page === 'settings' ? 'active' : ''}" id="sidebar-link-settings"><i class="fa-solid fa-gear"></i> Settings</a>
           </div>
           
           <button class="cs-btn-primary" id="btn-open-create-modal" style="width: 100%; margin-top: 24px;">
             <i class="fa-solid fa-feather"></i> Post
           </button>
           
           <div id="header-user-capsule" style="margin-top: 32px; display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: var(--radius-full); background: var(--bg-surface-elevated); cursor: pointer; transition: var(--transition-fast);">
              <img id="nav-user-avatar" src="${avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
              <div class="info" style="display: flex; flex-direction: column; overflow: hidden;">
                 <span id="nav-user-name" style="font-weight: 700; font-size: 0.95rem; color: var(--text-main); white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${name}</span>
                 <span id="nav-user-handle" style="color: var(--text-muted); font-size: 0.85rem; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${handle}</span>
              </div>
           </div>
        </aside>
      `;

      // Bind capsule click -> profile
      const capsule = container.querySelector('#header-user-capsule');
      if (capsule) {
        capsule.addEventListener('click', () => { window.location.href = 'profile.html'; });
      }

      // Bind post button -> dashboard create modal
      const postBtn = container.querySelector('#btn-open-create-modal');
      if (postBtn && page !== 'home') {
        postBtn.addEventListener('click', () => { window.location.href = 'dashboard.html#compose'; });
      }

      // Subscribe to store updates for current user
      if (window.csStore) {
        window.csStore.subscribe('currentUser', (u) => {
          if (!u) return;
          const navAvatar = document.getElementById('nav-user-avatar');
          const navName = document.getElementById('nav-user-name');
          const navHandle = document.getElementById('nav-user-handle');
          if (navAvatar && (u.avatar || u.avatar_url)) navAvatar.src = u.avatar || u.avatar_url;
          if (navName && (u.name || u.full_name)) navName.textContent = u.name || u.full_name;
          if (navHandle && (u.handle || u.username)) navHandle.textContent = u.handle || (u.username.startsWith('@') ? u.username : '@' + u.username);
        });
      }
    }

    // Add mobile bottom navigation if not already on the page
    if (!document.querySelector('.cs-mobile-bottom-nav')) {
      const bottomNav = document.createElement('nav');
      bottomNav.className = 'cs-mobile-bottom-nav';
      bottomNav.innerHTML = `
        <a href="dashboard.html" class="${page === 'home' ? 'active' : ''}"><i class="fa-solid fa-house"></i></a>
        <a href="explore.html" class="${page === 'explore' ? 'active' : ''}"><i class="fa-solid fa-compass"></i></a>
        <a href="reels.html" class="${page === 'reels' ? 'active' : ''}"><i class="fa-solid fa-video"></i></a>
        <a href="messages.html" class="${page === 'messages' ? 'active' : ''}"><i class="fa-solid fa-envelope"></i></a>
        <a href="notifications.html" class="${page === 'notifications' ? 'active' : ''}"><i class="fa-solid fa-bell"></i></a>
        <a href="profile.html" class="${page === 'profile' ? 'active' : ''}"><i class="fa-solid fa-user"></i></a>
      `;
      document.body.appendChild(bottomNav);
    }
  },
  renderMobileSearchOverlay: () => `
    <div class="mobile-search-overlay" id="mobile-search-overlay">
      <div class="mobile-search-input-wrap">
        <i class="fa-solid fa-magnifying-glass" style="color: #16D9FF;"></i>
        <input type="text" id="mobile-search-input" placeholder="Search ConnectSphere mesh...">
      </div>
      <button type="button" class="btn-close-mobile-search" id="btn-close-mobile-search" aria-label="Close search">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `,

  renderMobileTopHeader: () => `
    <header class="mobile-top-header">
      <div style="display: flex; align-items: center; gap: 10px;">
        <button type="button" class="mobile-action-btn" id="btn-mobile-menu" aria-label="Open navigation menu">
          <i class="fa-solid fa-bars"></i>
        </button>
        <a href="dashboard.html" class="mobile-brand-link">
          <div class="mobile-logo-orb">
            <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
              <ellipse cx="50" cy="50" rx="38" ry="14" stroke="#7357FF" stroke-width="3" transform="rotate(32 50 50)"/>
              <ellipse cx="50" cy="50" rx="38" ry="14" stroke="#16D9FF" stroke-width="3" transform="rotate(-32 50 50)"/>
              <circle cx="50" cy="50" r="9" fill="#00E6C3"/>
            </svg>
          </div>
          <span class="mobile-brand-text">Connect<span>Sphere</span></span>
        </a>
      </div>
      <div class="mobile-header-actions">
        <button type="button" class="mobile-action-btn" id="btn-mobile-search" aria-label="Search">
          <i class="fa-solid fa-magnifying-glass"></i>
        </button>
        <button type="button" class="mobile-action-btn" id="btn-mobile-notifications" aria-label="Notifications">
          <i class="fa-solid fa-bell"></i>
          <span class="badge-dot"></span>
        </button>
      </div>
    </header>
  `,

  renderMasterpieceTopHeader: () => `
    <header class="masterpiece-top-header">
      <a href="dashboard.html" class="masterpiece-brand-block">
        <div class="masterpiece-brand-icon pulse-badge">
          <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
            <ellipse cx="50" cy="50" rx="38" ry="14" stroke="#7357FF" stroke-width="3.5" transform="rotate(32 50 50)"/>
            <ellipse cx="50" cy="50" rx="38" ry="14" stroke="#16D9FF" stroke-width="3.5" transform="rotate(-32 50 50)"/>
            <circle cx="50" cy="50" r="10" fill="#00E6C3"/>
          </svg>
        </div>
        <div class="masterpiece-brand-text">
          <span class="title">Connect<span>Sphere</span></span>
          <span class="tagline">Connect &bull; Share &bull; Belong</span>
        </div>
      </a>
      <div class="masterpiece-top-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="masterpiece-top-search-input" placeholder="Search people, topics, communities...">
        <span class="search-shortcut-pill">Ctrl K</span>
      </div>
      <div class="masterpiece-top-actions">
        <button type="button" class="btn-header-plus btn-open-create-modal" title="Create New Post">
          <i class="fa-solid fa-plus"></i>
        </button>
        <a href="notifications.html" class="header-action-icon-btn" id="btn-desktop-notifications-toggle" title="Notifications">
          <i class="fa-regular fa-bell"></i>
          <span class="red-notification-badge">3</span>
        </a>
        <a href="messages.html" class="header-action-icon-btn" id="btn-header-messages-toggle" title="Messages">
          <i class="fa-regular fa-message"></i>
        </a>
        <a href="profile.html" class="header-user-capsule" id="header-user-capsule" style="text-decoration:none;">
          <div class="avatar-wrapper">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" class="avatar" alt="Alex Johnson">
            <span class="status-online-dot"></span>
          </div>
          <div class="user-meta">
            <span class="name">Alex Johnson</span>
            <span class="handle">@alexjohnson</span>
          </div>
        </a>
      </div>
    </header>
  `,

  renderDesktopSidebar: (activePage = 'home') => {
    return `
      <aside class="sidebar-left dashboard-sidebar">
        <nav class="nav-menu masterpiece-nav-list">
          <a href="dashboard.html" class="nav-item ${activePage === 'home' ? 'active' : ''}" id="nav-item-home" title="Home Feed">
            <i class="fa-solid fa-house"></i>
            <span>Home</span>
          </a>
          <a href="explore.html" class="nav-item ${activePage === 'explore' ? 'active' : ''}" id="nav-item-explore" title="Explore">
            <i class="fa-regular fa-compass"></i>
            <span>Explore</span>
          </a>
          <a href="dashboard.html#stories" class="nav-item ${activePage === 'stories' ? 'active' : ''}" id="sidebar-link-stories" title="Stories">
            <i class="fa-regular fa-circle-play"></i>
            <span>Stories</span>
          </a>
          <a href="dashboard.html#reels" class="nav-item ${activePage === 'reels' ? 'active' : ''}" id="sidebar-link-reels" title="Reels">
            <i class="fa-solid fa-film"></i>
            <span>Reels</span>
          </a>
          <a href="messages.html" class="nav-item ${activePage === 'messages' ? 'active' : ''}" id="sidebar-link-messages" title="Messages">
            <i class="fa-regular fa-message"></i>
            <span>Messages</span>
            <span class="nav-pill-badge-red">2</span>
          </a>
          <a href="communities.html" class="nav-item ${activePage === 'communities' ? 'active' : ''}" id="sidebar-link-communities" title="Communities">
            <i class="fa-solid fa-users"></i>
            <span>Communities</span>
          </a>
          <a href="creator.html" class="nav-item ${activePage === 'creator' ? 'active' : ''}" id="sidebar-link-creator" title="Creator Studio">
            <i class="fa-solid fa-chart-line"></i>
            <span>Creator</span>
          </a>
          <a href="notifications.html" class="nav-item ${activePage === 'notifications' ? 'active' : ''}" id="sidebar-link-notifications" title="Notifications">
            <i class="fa-regular fa-bell"></i>
            <span>Notifications</span>
            <span class="nav-pill-badge-red">3</span>
          </a>
          <a href="profile.html" class="nav-item ${activePage === 'profile' ? 'active' : ''}" id="sidebar-link-profile" title="Profile">
            <i class="fa-regular fa-user"></i>
            <span>Profile</span>
          </a>
          <a href="settings.html" class="nav-item ${activePage === 'settings' ? 'active' : ''}" id="sidebar-link-settings" title="Settings">
            <i class="fa-solid fa-gear"></i>
            <span>Settings</span>
          </a>
        </nav>

        <button type="button" class="btn-sidebar-create-masterpiece btn-open-create-modal" id="btn-open-create-modal" title="Create New Post">
          <i class="fa-solid fa-plus"></i>
          <span>Create Post</span>
        </button>

        <div class="vip-upgrade-card">
          <div class="vip-card-header">
            <div class="crown-icon-wrap">
              <i class="fa-solid fa-crown"></i>
            </div>
            <div>
              <div class="vip-label">Upgrade to</div>
              <div class="vip-brand-name">ConnectSphere+</div>
            </div>
          </div>
          <ul class="vip-perks-list">
            <li><i class="fa-solid fa-check"></i> Unlock 3D Spaces</li>
            <li><i class="fa-solid fa-check"></i> AI Creator Tools</li>
            <li><i class="fa-solid fa-check"></i> Higher Upload Limits</li>
            <li><i class="fa-solid fa-check"></i> Exclusive Communities</li>
          </ul>
          <button type="button" class="btn-vip-learn-more" id="btn-vip-learn-more">Learn More</button>
        </div>

        <div class="sidebar-user-card-v3" id="sidebar-user-widget">
          <div class="sidebar-user-top">
            <div class="avatar-wrapper">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80" class="avatar" alt="Alex Johnson">
              <span class="status-online-dot"></span>
            </div>
            <div class="user-info">
              <div class="name">
                <span>Alex Johnson</span>
              </div>
              <div class="username">@alexjohnson</div>
            </div>
            <a href="login.html" class="btn-sidebar-logout" title="Sign Out" style="margin-left: auto; color: rgba(255,255,255,0.4); font-size: 13px;">
              <i class="fa-solid fa-arrow-right-from-bracket"></i>
            </a>
          </div>
          <div class="user-stats-bar">
            <div class="stat-col"><span class="stat-num">248</span><span class="stat-lbl">Posts</span></div>
            <div class="stat-col"><span class="stat-num">12.4K</span><span class="stat-lbl">Followers</span></div>
            <div class="stat-col"><span class="stat-num">896</span><span class="stat-lbl">Following</span></div>
          </div>
          <div class="sidebar-motto-footer">
            <div>Connect People</div>
            <div>&mdash; Create Opportunities</div>
            <div>&mdash; Belong Anywhere</div>
          </div>
        </div>
      </aside>
    `;
  }
};

window.NavigationRenderer = NavigationRenderer;
