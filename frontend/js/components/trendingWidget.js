/**
 * ConnectSphere Trending & Suggested Creators Widget
 * Connects right-sidebar modules on Dashboard to live Supabase RPC and profiles table.
 */

const TrendingWidget = {
  trendingContainerId: 'trending-widget-list',
  creatorsContainerId: 'suggested-creators-list',

  async init() {
    await Promise.all([
      this.loadTrendingHashtags(),
      this.loadSuggestedCreators()
    ]);
  },

  async loadTrendingHashtags() {
    const container = document.getElementById(this.trendingContainerId);
    if (!container) return;

    try {
      let hashtags = [];
      if (window.ReelService && window.ReelService.getTrendingHashtags) {
        hashtags = await window.ReelService.getTrendingHashtags(5);
      }

      if (!hashtags || hashtags.length === 0) {
        // Fallback default topics if database has not accumulated hashtags yet
        hashtags = [
          { hashtag: 'ConnectSphere', post_count: 142 },
          { hashtag: 'Innovation', post_count: 98 },
          { hashtag: 'TechTalk', post_count: 76 },
          { hashtag: 'GlobalFeed', post_count: 53 },
          { hashtag: 'AI', post_count: 42 }
        ];
      }

      container.innerHTML = hashtags.slice(0, 5).map((item, idx) => {
        const tag = item.hashtag.replace(/^#/, '');
        const countText = item.post_count ? `${item.post_count} posts` : 'Trending';
        return `
          <div class="trending-topic-item" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; cursor: pointer;" onclick="window.location.href='explore.html?q=%23${encodeURIComponent(tag)}'">
            <div>
              <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">
                ${idx + 1} &bull; Trending
              </div>
              <div style="font-weight: 700; color: var(--text-main); margin: 2px 0;">
                <a href="explore.html?q=%23${encodeURIComponent(tag)}" class="cs-hashtag" onclick="event.stopPropagation();">#${tag}</a>
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${countText}</div>
            </div>
            <i class="fa-solid fa-arrow-trend-up" style="color: var(--primary-light); font-size: 14px; opacity: 0.7;"></i>
          </div>
        `;
      }).join('');

    } catch (err) {
      console.warn('[TrendingWidget] loadTrendingHashtags error:', err);
    }
  },

  async loadSuggestedCreators() {
    const container = document.getElementById(this.creatorsContainerId);
    if (!container) return;

    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const currentUser = window.csStore?.get('currentUser');
      const currentUserId = currentUser?.supabase_id || currentUser?.id;

      let creators = [];

      if (client && window.SupabaseClient.isConfigured()) {
        let query = client
          .from('profiles')
          .select('id, full_name, username, avatar_url, bio, is_verified')
          .limit(4);

        if (currentUserId) {
          query = query.neq('id', currentUserId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          creators = data;
        }
      }

      if (!creators.length) {
        // Fallback default creators
        creators = [
          {
            id: 'c1',
            full_name: 'Elena Rostova',
            username: 'elena_r',
            avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
            is_verified: true
          },
          {
            id: 'c2',
            full_name: 'Marcus Vance',
            username: 'marcus_v',
            avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
            is_verified: false
          },
          {
            id: 'c3',
            full_name: 'Sophia Lin',
            username: 'sophia_tech',
            avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
            is_verified: true
          }
        ];
      }

      container.innerHTML = creators.map(c => {
        const name = ConnectSphereSecurity ? ConnectSphereSecurity.sanitize(c.full_name || 'Creator') : (c.full_name || 'Creator');
        const handle = c.username ? (c.username.startsWith('@') ? c.username : '@' + c.username) : '@creator';
        const profileUrl = c.id ? `profile.html?id=${encodeURIComponent(c.id)}` : '#';

        return `
          <div style="display: flex; align-items: center; gap: 12px; padding: 4px 0;">
            <a href="${profileUrl}" style="text-decoration: none; flex-shrink: 0;">
              <img src="${c.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color);" alt="${name}">
            </a>
            <div style="flex: 1; min-width: 0;">
              <a href="${profileUrl}" style="font-weight: 700; font-size: 0.9rem; color: var(--text-main); text-decoration: none; display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <span>${name}</span>
                ${c.is_verified ? '<i class="fa-solid fa-circle-check badge-verified" style="color: var(--primary); font-size: 11px;"></i>' : ''}
              </a>
              <div style="font-size: 0.8rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${handle}</div>
            </div>
            <button class="cs-btn-secondary btn-widget-follow" data-user-id="${c.id}" style="height: 30px; padding: 0 12px; font-size: 0.8rem; flex-shrink: 0;">Follow</button>
          </div>
        `;
      }).join('');

      // Bind follow actions
      container.querySelectorAll('.btn-widget-follow').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const targetUserId = btn.getAttribute('data-user-id');
          if (!targetUserId || !window.ProfileService) return;

          btn.disabled = true;
          btn.textContent = 'Following…';
          const success = await window.ProfileService.followUser(targetUserId);
          if (success) {
            btn.textContent = 'Following';
            btn.classList.remove('cs-btn-secondary');
            btn.classList.add('cs-btn-primary');
          } else {
            btn.textContent = 'Follow';
            btn.disabled = false;
          }
        });
      });

    } catch (err) {
      console.warn('[TrendingWidget] loadSuggestedCreators error:', err);
    }
  }
};

// Expose globally
if (typeof window !== 'undefined') {
  window.TrendingWidget = TrendingWidget;
}
