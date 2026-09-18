/**
 * ConnectSphere Notifications Renderer
 * Renders dynamic notifications from Supabase, supports read state, follow back, and profile navigation.
 */

const NotificationsRenderer = {
  containerId: 'notifications-list',

  async init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) return;

    this.renderLoading();

    // Fetch notifications from Supabase
    if (window.NotificationService) {
      await window.NotificationService.init();
      await window.NotificationService.fetchNotificationsFromSupabase();
    }

    // Subscribe to store updates
    if (window.csStore) {
      window.csStore.subscribe('notifications', () => this.render());
      window.csStore.subscribe('notification:received', () => this.render());
      window.csStore.subscribe('notification:all_read', () => this.render());
    }

    this.render();
    this.bindEvents();
  },

  renderLoading() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div style="text-align: center; padding: 48px 20px; color: var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 28px; color: var(--primary); margin-bottom: 12px; display: block;"></i>
        <p style="font-size: 0.9rem;">Loading notifications…</p>
      </div>
    `;
  },

  render() {
    if (!this.container) return;
    const notifs = window.NotificationService ? window.NotificationService.getNotifications() : [];

    if (!notifs.length) {
      this.container.innerHTML = `
        <div style="text-align: center; padding: 60px 24px; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px solid var(--border-color);">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-surface-elevated); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--text-muted); font-size: 24px;">
            <i class="fa-regular fa-bell"></i>
          </div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">No notifications yet</h3>
          <p style="font-size: 0.88rem; color: var(--text-muted); max-width: 380px; margin: 0 auto; line-height: 1.5;">When someone follows you, likes your posts, or leaves a comment, you'll see it here.</p>
        </div>
      `;
      return;
    }

    const typeIcons = {
      like: { icon: 'fa-solid fa-heart', color: 'var(--danger, #ef4444)' },
      follow: { icon: 'fa-solid fa-user-plus', color: 'var(--primary, #4F46E5)' },
      comment: { icon: 'fa-solid fa-comment', color: 'var(--secondary, #3B82F6)' },
      reply: { icon: 'fa-solid fa-reply', color: 'var(--secondary, #3B82F6)' },
      mention: { icon: 'fa-solid fa-at', color: 'var(--accent, #8B5CF6)' },
      message: { icon: 'fa-solid fa-envelope', color: 'var(--accent-teal, #10B981)' },
      community: { icon: 'fa-solid fa-users', color: 'var(--primary-light, #818CF8)' },
      system: { icon: 'fa-solid fa-wand-magic-sparkles', color: 'var(--primary, #4F46E5)' }
    };

    this.container.innerHTML = notifs.map(n => {
      const typeInfo = typeIcons[n.type] || typeIcons.system;
      const unreadBadge = !n.isRead ? `<span style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary); display: inline-block; flex-shrink: 0;"></span>` : '';
      const actorName = ConnectSphereSecurity ? ConnectSphereSecurity.sanitize(n.actorName || n.title || 'Someone') : (n.actorName || n.title || 'Someone');
      const actorHandle = n.actorUsername ? `@${ConnectSphereSecurity ? ConnectSphereSecurity.sanitize(n.actorUsername) : n.actorUsername}` : '';
      const bodyText = ConnectSphereSecurity ? ConnectSphereSecurity.sanitize(n.body || n.message || '') : (n.body || n.message || '');
      const profileLink = n.actorId ? `profile.html?id=${encodeURIComponent(n.actorId)}` : '#';

      return `
        <div class="post-card notif-card ${n.isRead ? 'read' : 'unread'}" data-notif-id="${n.id}" style="padding: 16px 20px; border-radius: var(--radius-lg); background: ${n.isRead ? 'var(--bg-card)' : 'var(--bg-surface-elevated)'}; border: 1px solid ${n.isRead ? 'var(--border-color)' : 'rgba(79, 70, 229, 0.25)'}; display: flex; align-items: center; gap: 14px; transition: var(--transition-fast); margin-bottom: 10px; cursor: pointer;">
          <div style="font-size: 20px; color: ${typeInfo.color}; width: 28px; text-align: center; flex-shrink: 0;">
            <i class="${typeInfo.icon}"></i>
          </div>
          
          <a href="${profileLink}" class="notif-actor-link" style="text-decoration: none; flex-shrink: 0;" onclick="event.stopPropagation();">
            <img src="${n.actorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="avatar" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color);" alt="${actorName}">
          </a>

          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.92rem; color: var(--text-main); line-height: 1.4;">
              <a href="${profileLink}" style="font-weight: 700; color: var(--text-main); text-decoration: none;" onclick="event.stopPropagation();">${actorName}</a>
              ${actorHandle ? `<span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 4px;">${actorHandle}</span>` : ''}
              <span style="color: var(--text-muted); margin-left: 4px;">${bodyText}</span>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
              ${n.time || 'Recently'}
            </div>
          </div>

          ${unreadBadge}

          ${n.type === 'follow' && n.actorId ? `
            <button class="cs-btn-secondary btn-follow-back" data-user-id="${n.actorId}" style="height: 32px; padding: 0 14px; font-size: 0.82rem; flex-shrink: 0;" onclick="event.stopPropagation();">
              Follow Back
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  bindEvents() {
    // Click notification to mark as read
    if (this.container) {
      this.container.addEventListener('click', (e) => {
        const card = e.target.closest('.notif-card');
        if (!card) return;
        const notifId = card.getAttribute('data-notif-id');
        if (notifId && window.NotificationService) {
          window.NotificationService.markAsRead(notifId);
          card.classList.remove('unread');
          card.classList.add('read');
          card.style.background = 'var(--bg-card)';
          card.style.borderColor = 'var(--border-color)';
        }
      });

      // Follow back button
      this.container.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-follow-back');
        if (!btn) return;
        const targetUserId = btn.getAttribute('data-user-id');
        if (!targetUserId || !window.ProfileService) return;

        btn.disabled = true;
        btn.textContent = 'Following…';
        const ok = await window.ProfileService.followUser(targetUserId);
        if (ok) {
          btn.textContent = 'Following';
          btn.classList.remove('cs-btn-secondary');
          btn.classList.add('cs-btn-primary');
        } else {
          btn.textContent = 'Follow';
          btn.disabled = false;
        }
      });
    }

    // Mark all read button in top header if present
    const markAllBtn = document.getElementById('btn-mark-all-read');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', async () => {
        if (window.NotificationService) {
          await window.NotificationService.markAllAsRead();
          if (typeof showToast === 'function') {
            showToast('All notifications marked as read ✨');
          }
        }
      });
    }
  }
};

// Expose globally
if (typeof window !== 'undefined') {
  window.NotificationsRenderer = NotificationsRenderer;
}
