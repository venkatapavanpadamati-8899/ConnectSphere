/**
 * ConnectSphere Search Renderer
 *
 * Two controllers:
 *   1. SearchRenderer      — Modal-based universal search (Ctrl+K, header input).
 *                            Used on dashboard.html, profile.html, etc.
 *   2. ExploreSearchController — Inline search-first experience on explore.html.
 *                            Full-page results rendered in #explore-search-results.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Helper: safe HTML escaping (uses ConnectSphereSecurity if available)
// ═══════════════════════════════════════════════════════════════════════════
function _safeHtml(str) {
  if (typeof ConnectSphereSecurity !== 'undefined' && ConnectSphereSecurity.sanitize) {
    return ConnectSphereSecurity.sanitize(str);
  }
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. SearchRenderer — Modal overlay (Ctrl+K, header search input)
//    Used on all pages EXCEPT explore.html (which uses ExploreSearchController)
// ═══════════════════════════════════════════════════════════════════════════
const SearchRenderer = {
  modalId: 'universal-search-modal',

  init() {
    this.modal = document.getElementById(this.modalId);
    if (!this.modal) return;

    this.activeCategory = 'all';
    this._debounceTimer = null;
    this.bindEvents();
    this.renderRecentTags();
  },

  open(initialQuery = '') {
    if (!this.modal) return;
    this.modal.classList.add('active');
    const input = this.modal.querySelector('#universal-search-input');
    if (input) {
      if (initialQuery) input.value = initialQuery;
      input.focus();
      if (input.value.trim()) this.executeSearch(input.value.trim());
    }
  },

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
  },

  renderRecentTags() {
    const container = this.modal?.querySelector('#universal-search-recent-tags');
    if (!container) return;

    const history = SearchService.getRecentSearches();
    if (!history.length) {
      container.innerHTML = '<span style="font-size: 0.72rem; color: rgba(255,255,255,0.4);">No recent searches</span>';
      return;
    }

    container.innerHTML = history.map(item => `
      <span class="search-chip btn-recent-search-chip" data-query="${_safeHtml(item)}"
        style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
        ${_safeHtml(item)}
      </span>
    `).join('');
  },

  async executeSearch(query) {
    const resultsContainer = this.modal?.querySelector('#universal-search-results');
    if (!resultsContainer) return;

    if (!query || !query.trim()) {
      resultsContainer.innerHTML = '';
      return;
    }

    resultsContainer.innerHTML = `
      <div style="text-align: center; padding: 24px; color: rgba(255,255,255,0.4); font-size: 0.8rem;">
        <i class="fa-solid fa-circle-notch fa-spin" style="margin-right:6px;"></i>Searching...
      </div>`;

    const results = await SearchService.search(query, this.activeCategory);
    let html = '';

    // People / Profiles
    if (results.profiles && results.profiles.length) {
      html += `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: #00D2FF; text-transform: uppercase; margin-bottom: 8px;">People</div>
          ${results.profiles.map(p => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 6px; cursor: pointer;"
                data-profile-id="${_safeHtml(p.id)}" class="search-result-profile-row">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${_safeHtml(p.avatar)}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" loading="lazy">
                <div>
                  <div style="font-size: 0.86rem; font-weight: 700; color: #FFFFFF;">
                    ${_safeHtml(p.name)}
                    ${p.isVerified ? '<i class="fa-solid fa-circle-check" style="color:#00D2FF;font-size:11px;margin-left:3px;"></i>' : ''}
                  </div>
                  <div style="font-size: 0.70rem; color: rgba(255,255,255,0.5);">${_safeHtml(p.handle)}</div>
                </div>
              </div>
              <button type="button" class="btn-connect-pill" style="padding: 4px 12px; font-size: 0.74rem;">Connect</button>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Posts
    if (results.posts && results.posts.length) {
      html += `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: #7357FF; text-transform: uppercase; margin-bottom: 8px;">Posts</div>
          ${results.posts.map(p => `
            <div style="padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 6px; font-size: 0.82rem; color: #FFFFFF;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <img src="${_safeHtml(p.authorAvatar)}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;" loading="lazy">
                <span style="font-weight: 700; font-size: 0.76rem; color: #00D2FF;">${_safeHtml(p.author)}</span>
                <span style="color: rgba(255,255,255,0.3); font-size: 0.72rem;">${_timeAgo(p.createdAt)}</span>
              </div>
              <div style="color: rgba(255,255,255,0.85); line-height:1.4;">${_safeHtml(p.caption.slice(0, 120))}${p.caption.length > 120 ? '…' : ''}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Hashtags
    if (results.hashtags && results.hashtags.length) {
      html += `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: #10B981; text-transform: uppercase; margin-bottom: 8px;">Hashtags</div>
          ${results.hashtags.map(h => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width:36px; height:36px; border-radius:50%; background: rgba(16,185,129,0.15); display:flex; align-items:center; justify-content:center;">
                  <i class="fa-solid fa-hashtag" style="color:#10B981; font-size:14px;"></i>
                </div>
                <div>
                  <div style="font-size: 0.86rem; font-weight: 700; color: #FFFFFF;">${_safeHtml(h.tag)}</div>
                  <div style="font-size: 0.70rem; color: rgba(255,255,255,0.5);">${h.postCount} post${h.postCount !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <i class="fa-solid fa-arrow-trend-up" style="color: #10B981; font-size: 13px;"></i>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (!html) {
      html = `
        <div style="text-align: center; padding: 32px 24px; color: rgba(255,255,255,0.4); font-size: 0.82rem;">
          <i class="fa-solid fa-magnifying-glass" style="font-size:2rem; margin-bottom:12px; display:block; opacity:0.3;"></i>
          No results for <strong style="color:rgba(255,255,255,0.6);">"${_safeHtml(query)}"</strong>
        </div>`;
    }

    resultsContainer.innerHTML = html;
  },

  bindEvents() {
    if (!this.modal) return;

    const headerInput = document.getElementById('masterpiece-top-search-input');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const modalInput = this.modal.querySelector('#universal-search-input');
    const closeBtn = this.modal.querySelector('#btn-close-search-modal') || this.modal.querySelector('#btn-close-universal-search');
    const clearHistoryBtn = this.modal.querySelector('#btn-clear-search-history');

    const debounced = (val) => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => this.executeSearch(val), 300);
    };

    if (headerInput) {
      headerInput.addEventListener('click', () => this.open());
      headerInput.addEventListener('focus', () => this.open());
    }

    if (mobileSearchInput) {
      mobileSearchInput.addEventListener('input', (e) => {
        this.open();
        if (modalInput) modalInput.value = e.target.value;
        debounced(e.target.value);
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        SearchService.clearRecentSearches();
        this.renderRecentTags();
      });
    }

    if (modalInput) {
      modalInput.addEventListener('input', (e) => debounced(e.target.value));
      modalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          SearchService.addRecentSearch(e.target.value);
          this.renderRecentTags();
        }
        if (e.key === 'Escape') this.close();
      });
    }

    // Category tabs (modal)
    this.modal.querySelectorAll('[data-filter]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.modal.querySelectorAll('[data-filter]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeCategory = tab.getAttribute('data-filter') || 'all';
        if (modalInput && modalInput.value.trim()) debounced(modalInput.value.trim());
      });
    });

    // Recent chip click
    this.modal.addEventListener('click', (e) => {
      const chip = e.target.closest('.btn-recent-search-chip');
      if (chip) {
        const q = chip.getAttribute('data-query');
        if (modalInput) modalInput.value = q;
        this.executeSearch(q);
      }
    });

    // Ctrl+K / Cmd+K global shortcut
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        this.open();
      }
    });

    // Close on backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// 2. ExploreSearchController — Inline search UI for explore.html
//    Renders results directly into the page, not a modal.
// ═══════════════════════════════════════════════════════════════════════════
const ExploreSearchController = {
  _debounceTimer: null,
  _activeCategory: 'all',

  /**
   * Call this once from the explore page after DOM is ready.
   */
  async init() {
    this._inputEl = document.getElementById('explore-search-input');
    this._clearBtn = document.getElementById('explore-search-clear');
    this._resultsEl = document.getElementById('explore-search-results');
    this._emptyStateEl = document.getElementById('explore-empty-state');
    this._loadingEl = document.getElementById('explore-search-loading');
    this._categoryTabs = document.querySelectorAll('[data-explore-category]');

    if (!this._inputEl || !this._resultsEl) {
      console.warn('[ExploreSearchController] Required DOM elements not found.');
      return;
    }

    this._bindEvents();

    // Show initial empty state with trending + suggested
    await this._renderEmptyState();
  },

  _bindEvents() {
    // Input with debounce
    this._inputEl.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      this._setClearVisible(val.length > 0);
      clearTimeout(this._debounceTimer);
      if (!val) {
        this._renderEmptyState();
        return;
      }
      this._showLoading();
      this._debounceTimer = setTimeout(() => this._runSearch(val), 300);
    });

    // Enter key — save to history
    this._inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this._inputEl.value.trim()) {
        SearchService.addRecentSearch(this._inputEl.value.trim());
      }
      if (e.key === 'Escape') {
        this._inputEl.value = '';
        this._setClearVisible(false);
        this._renderEmptyState();
      }
    });

    // Clear button
    if (this._clearBtn) {
      this._clearBtn.addEventListener('click', () => {
        this._inputEl.value = '';
        this._inputEl.focus();
        this._setClearVisible(false);
        this._renderEmptyState();
      });
    }

    // Category tabs
    this._categoryTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this._categoryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._activeCategory = tab.getAttribute('data-explore-category') || 'all';
        const q = this._inputEl.value.trim();
        if (q) {
          this._showLoading();
          clearTimeout(this._debounceTimer);
          this._debounceTimer = setTimeout(() => this._runSearch(q), 150);
        }
      });
    });

    // Result clicks (delegated)
    this._resultsEl.addEventListener('click', (e) => {
      const profileRow = e.target.closest('[data-explore-profile-id]');
      const hashtagRow = e.target.closest('[data-explore-hashtag]');

      if (profileRow) {
        const id = profileRow.getAttribute('data-explore-profile-id');
        if (id) window.location.href = `profile.html?id=${encodeURIComponent(id)}`;
      }
      if (hashtagRow) {
        const tag = hashtagRow.getAttribute('data-explore-hashtag');
        if (tag) {
          this._inputEl.value = tag;
          this._setClearVisible(true);
          this._activeCategory = 'hashtags';
          this._categoryTabs.forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-explore-category') === 'hashtags');
          });
          this._runSearch(tag);
        }
      }
    });
  },

  _setClearVisible(visible) {
    if (this._clearBtn) {
      this._clearBtn.style.display = visible ? 'flex' : 'none';
    }
  },

  _showLoading() {
    if (this._emptyStateEl) this._emptyStateEl.style.display = 'none';
    if (this._loadingEl) this._loadingEl.style.display = 'flex';
    if (this._resultsEl) this._resultsEl.style.display = 'none';
  },

  _hideLoading() {
    if (this._loadingEl) this._loadingEl.style.display = 'none';
  },

  async _runSearch(query) {
    try {
      const results = await SearchService.search(query, this._activeCategory);
      this._hideLoading();
      this._renderResults(query, results);
      SearchService.addRecentSearch(query);
    } catch (err) {
      this._hideLoading();
      this._renderError();
      console.warn('[ExploreSearchController] search failed:', err);
    }
  },

  _renderResults(query, results) {
    if (!this._resultsEl) return;
    if (this._emptyStateEl) this._emptyStateEl.style.display = 'none';
    this._resultsEl.style.display = 'block';

    const total = (results.profiles?.length || 0) + (results.posts?.length || 0) + (results.hashtags?.length || 0);

    if (total === 0) {
      this._resultsEl.innerHTML = `
        <div class="explore-no-results">
          <i class="fa-solid fa-magnifying-glass" style="font-size:2.5rem; opacity:0.25; margin-bottom:16px;"></i>
          <p style="font-size:1rem; font-weight:600; color:var(--text-main);">No results for "${_safeHtml(query)}"</p>
          <p style="font-size:0.875rem; color:var(--text-muted); margin-top:4px;">Try a different spelling or search term.</p>
        </div>`;
      return;
    }

    let html = '';

    // ── Profiles section
    if (results.profiles && results.profiles.length > 0) {
      html += `
        <div class="explore-results-section">
          <div class="explore-section-label"><i class="fa-solid fa-user" style="color:var(--primary);"></i> People</div>
          <div class="explore-results-grid explore-grid-profiles">
            ${results.profiles.map(p => `
              <div class="explore-profile-card" data-explore-profile-id="${_safeHtml(p.id)}" role="button" tabindex="0"
                  aria-label="View ${_safeHtml(p.name)}'s profile">
                <img src="${_safeHtml(p.avatar)}" class="explore-profile-avatar" alt="${_safeHtml(p.name)}" loading="lazy"
                    onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'">
                <div class="explore-profile-info">
                  <div class="explore-profile-name">
                    ${_safeHtml(p.name)}
                    ${p.isVerified ? '<i class="fa-solid fa-circle-check explore-verified-badge"></i>' : ''}
                  </div>
                  <div class="explore-profile-handle">${_safeHtml(p.handle)}</div>
                  ${p.bio ? `<div class="explore-profile-bio">${_safeHtml(p.bio.slice(0, 80))}${p.bio.length > 80 ? '…' : ''}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    // ── Posts section
    if (results.posts && results.posts.length > 0) {
      html += `
        <div class="explore-results-section">
          <div class="explore-section-label"><i class="fa-solid fa-file-lines" style="color:#7357FF;"></i> Posts</div>
          <div class="explore-results-list">
            ${results.posts.map(p => `
              <div class="explore-post-card">
                <div class="explore-post-header">
                  <img src="${_safeHtml(p.authorAvatar)}" class="explore-post-avatar" alt="${_safeHtml(p.author)}" loading="lazy"
                      onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'">
                  <div class="explore-post-meta">
                    <span class="explore-post-author">
                      ${_safeHtml(p.author)}
                      ${p.authorVerified ? '<i class="fa-solid fa-circle-check explore-verified-badge"></i>' : ''}
                    </span>
                    <span class="explore-post-handle-time">${_safeHtml(p.authorHandle)} · ${_timeAgo(p.createdAt)}</span>
                  </div>
                </div>
                <div class="explore-post-caption">${_safeHtml(p.caption.slice(0, 200))}${p.caption.length > 200 ? '…' : ''}</div>
                ${p.mediaUrl && p.mediaType === 'image' ? `
                  <img src="${_safeHtml(p.mediaUrl)}" class="explore-post-media" alt="Post media" loading="lazy">` : ''}
                ${p.tags && p.tags.length ? `
                  <div class="explore-post-tags">
                    ${p.tags.slice(0, 4).map(t => `<span class="explore-tag-chip">${_safeHtml(t.startsWith('#') ? t : '#' + t)}</span>`).join('')}
                  </div>` : ''}
                <div class="explore-post-stats">
                  <span><i class="fa-regular fa-heart"></i> ${p.likesCount || 0}</span>
                  <span><i class="fa-regular fa-comment"></i> ${p.commentsCount || 0}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    // ── Hashtags section
    if (results.hashtags && results.hashtags.length > 0) {
      html += `
        <div class="explore-results-section">
          <div class="explore-section-label"><i class="fa-solid fa-hashtag" style="color:#10B981;"></i> Hashtags</div>
          <div class="explore-hashtag-list">
            ${results.hashtags.map(h => `
              <div class="explore-hashtag-card" data-explore-hashtag="${_safeHtml(h.tag)}" role="button" tabindex="0"
                  aria-label="Search ${_safeHtml(h.tag)}">
                <div class="explore-hashtag-icon"><i class="fa-solid fa-hashtag"></i></div>
                <div class="explore-hashtag-info">
                  <div class="explore-hashtag-name">${_safeHtml(h.tag)}</div>
                  <div class="explore-hashtag-count">${h.postCount} post${h.postCount !== 1 ? 's' : ''}</div>
                </div>
                <i class="fa-solid fa-arrow-trend-up" style="color:#10B981; margin-left:auto;"></i>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    this._resultsEl.innerHTML = html;
  },

  async _renderEmptyState() {
    if (this._loadingEl) this._loadingEl.style.display = 'none';
    if (this._resultsEl) this._resultsEl.style.display = 'none';
    if (!this._emptyStateEl) return;
    this._emptyStateEl.style.display = 'block';

    // Try to load trending hashtags + suggested profiles
    try {
      const [trending, suggested] = await Promise.all([
        SearchService.getTrendingHashtags(),
        SearchService.getSuggestedProfiles()
      ]);

      let html = '';

      if (trending && trending.length > 0) {
        html += `
          <div class="explore-empty-section">
            <div class="explore-section-label"><i class="fa-solid fa-fire" style="color:#F59E0B;"></i> Trending</div>
            <div class="explore-hashtag-list">
              ${trending.map((h, i) => `
                <div class="explore-hashtag-card" data-explore-hashtag="${_safeHtml(h.tag)}" role="button" tabindex="0">
                  <div class="explore-hashtag-rank">${i + 1}</div>
                  <div class="explore-hashtag-info">
                    <div class="explore-hashtag-name">${_safeHtml(h.tag)}</div>
                    <div class="explore-hashtag-count">${h.postCount} post${h.postCount !== 1 ? 's' : ''} · Trending</div>
                  </div>
                  <i class="fa-solid fa-arrow-trend-up" style="color:#10B981; margin-left:auto;"></i>
                </div>
              `).join('')}
            </div>
          </div>`;
      }

      if (suggested && suggested.length > 0) {
        html += `
          <div class="explore-empty-section" style="margin-top:28px;">
            <div class="explore-section-label"><i class="fa-solid fa-user-plus" style="color:var(--primary);"></i> Suggested Creators</div>
            <div class="explore-results-grid explore-grid-profiles">
              ${suggested.map(p => `
                <div class="explore-profile-card" data-explore-profile-id="${_safeHtml(p.id)}" role="button" tabindex="0">
                  <img src="${_safeHtml(p.avatar)}" class="explore-profile-avatar" alt="${_safeHtml(p.name)}" loading="lazy"
                      onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'">
                  <div class="explore-profile-info">
                    <div class="explore-profile-name">
                      ${_safeHtml(p.name)}
                      ${p.isVerified ? '<i class="fa-solid fa-circle-check explore-verified-badge"></i>' : ''}
                    </div>
                    <div class="explore-profile-handle">${_safeHtml(p.handle)}</div>
                    ${p.bio ? `<div class="explore-profile-bio">${_safeHtml(p.bio.slice(0, 60))}${p.bio.length > 60 ? '…' : ''}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>`;
      }

      if (!html) {
        html = `
          <div style="text-align:center; padding: 48px 24px; color: var(--text-muted);">
            <i class="fa-solid fa-compass" style="font-size:3rem; opacity:0.2; margin-bottom:16px; display:block;"></i>
            <p style="font-size:1rem; font-weight:600;">Start searching ConnectSphere</p>
            <p style="font-size:0.875rem; margin-top:4px;">Search for people, posts, or hashtags</p>
          </div>`;
      }

      this._emptyStateEl.innerHTML = html;

      // Wire clicks in empty state
      this._emptyStateEl.querySelectorAll('[data-explore-hashtag]').forEach(el => {
        el.addEventListener('click', () => {
          const tag = el.getAttribute('data-explore-hashtag');
          if (tag && this._inputEl) {
            this._inputEl.value = tag;
            this._setClearVisible(true);
            this._activeCategory = 'all';
            this._categoryTabs.forEach(t => {
              t.classList.toggle('active', t.getAttribute('data-explore-category') === 'all');
            });
            this._showLoading();
            this._runSearch(tag);
          }
        });
      });

      this._emptyStateEl.querySelectorAll('[data-explore-profile-id]').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.getAttribute('data-explore-profile-id');
          if (id) window.location.href = `profile.html?id=${encodeURIComponent(id)}`;
        });
      });
    } catch (err) {
      console.warn('[ExploreSearchController] _renderEmptyState error:', err);
      this._emptyStateEl.innerHTML = `
        <div style="text-align:center; padding: 48px 24px; color: var(--text-muted);">
          <i class="fa-solid fa-compass" style="font-size:3rem; opacity:0.2; margin-bottom:16px; display:block;"></i>
          <p style="font-size:1rem; font-weight:600;">Search ConnectSphere</p>
          <p style="font-size:0.875rem; margin-top:4px;">Find people, posts, and hashtags</p>
        </div>`;
    }
  },

  _renderError() {
    if (!this._resultsEl) return;
    if (this._emptyStateEl) this._emptyStateEl.style.display = 'none';
    this._resultsEl.style.display = 'block';
    this._resultsEl.innerHTML = `
      <div class="explore-no-results">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem; color:var(--accent-amber); margin-bottom:12px;"></i>
        <p style="font-size:0.9rem; font-weight:600; color:var(--text-main);">Search unavailable</p>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Please check your connection and try again.</p>
      </div>`;
  }
};


// ─── Module Export ────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SearchRenderer, ExploreSearchController };
}

if (typeof window !== 'undefined') {
  window.SearchRenderer = SearchRenderer;
  window.ExploreSearchController = ExploreSearchController;
}
