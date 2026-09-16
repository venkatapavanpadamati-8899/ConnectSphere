/**
 * ConnectSphere Universal Search Renderer
 * Controls search modal queries, multi-category tabs, recent queries, and results rendering.
 */

const SearchRenderer = {
  modalId: 'universal-search-modal',

  init() {
    this.modal = document.getElementById(this.modalId);
    if (!this.modal) return;

    this.activeCategory = 'all';
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
      <span class="search-chip btn-recent-search-chip" data-query="${ConnectSphereSecurity.sanitize(item)}" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
        ${ConnectSphereSecurity.sanitize(item)}
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
    
    // Simple loading state
    resultsContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: rgba(255,255,255,0.4); font-size: 0.8rem;">Searching...</div>';

    const results = await SearchService.search(query, this.activeCategory);
    let html = '';

    // People
    if (results.people && results.people.length) {
      html += `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: #00D2FF; text-transform: uppercase; margin-bottom: 8px;">Creators & People</div>
          ${results.people.map(p => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${p.avatar}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
                <div>
                  <div style="font-size: 0.86rem; font-weight: 700; color: #FFFFFF;">${ConnectSphereSecurity.sanitize(p.name)}</div>
                  <div style="font-size: 0.70rem; color: rgba(255,255,255,0.5);">${ConnectSphereSecurity.sanitize(p.role)}</div>
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
          <div style="font-size: 0.76rem; font-weight: 700; color: #7357FF; text-transform: uppercase; margin-bottom: 8px;">Transmissions & Posts</div>
          ${results.posts.map(p => `
            <div style="padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 6px; font-size: 0.82rem; color: #FFFFFF;">
              <div style="font-weight: 700; font-size: 0.76rem; color: #00D2FF; margin-bottom: 2px;">${p.author.name}</div>
              <div style="color: rgba(255,255,255,0.85);">${ConnectSphereSecurity.sanitize(p.caption)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Communities
    if (results.communities && results.communities.length) {
      html += `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: #10B981; text-transform: uppercase; margin-bottom: 8px;">Communities</div>
          ${results.communities.map(c => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 6px;">
              <div>
                <div style="font-size: 0.86rem; font-weight: 700; color: #FFFFFF;">${ConnectSphereSecurity.sanitize(c.name)}</div>
                <div style="font-size: 0.70rem; color: rgba(255,255,255,0.5);">${ConnectSphereSecurity.sanitize(c.description)}</div>
              </div>
              <button type="button" class="btn-join-community" style="padding: 4px 12px; font-size: 0.74rem;">Join</button>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (!html) {
      html = `<div style="text-align: center; padding: 24px; color: rgba(255,255,255,0.4); font-size: 0.8rem;">No matching mesh entities found for "${ConnectSphereSecurity.sanitize(query)}"</div>`;
    }

    resultsContainer.innerHTML = html;
  },

  bindEvents() {
    if (!this.modal) return;

    // Search inputs (Header input, shortcut Ctrl K)
    const headerInput = document.getElementById('masterpiece-top-search-input');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const modalInput = this.modal.querySelector('#universal-search-input');
    const closeBtn = this.modal.querySelector('#btn-close-universal-search');
    const clearHistoryBtn = this.modal.querySelector('#btn-clear-search-history');

    if (headerInput) {
      headerInput.addEventListener('click', () => this.open());
      headerInput.addEventListener('focus', () => this.open());
    }

    let searchTimeout = null;
    const debouncedSearch = (val) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.executeSearch(val);
      }, 300);
    };

    if (mobileSearchInput) {
      mobileSearchInput.addEventListener('input', (e) => {
        this.open();
        if (modalInput) modalInput.value = e.target.value;
        debouncedSearch(e.target.value);
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
      modalInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
      });
      modalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          SearchService.addRecentSearch(e.target.value);
          this.renderRecentTags();
        }
      });
    }

    // Category Tabs in modal
    this.modal.querySelectorAll('.search-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.modal.querySelectorAll('.search-filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeCategory = tab.getAttribute('data-category') || 'all';
        if (modalInput && modalInput.value.trim()) {
          this.executeSearch(modalInput.value.trim());
        }
      });
    });

    // Recent Chip click
    this.modal.addEventListener('click', (e) => {
      const chip = e.target.closest('.btn-recent-search-chip');
      if (chip) {
        const q = chip.getAttribute('data-query');
        if (modalInput) modalInput.value = q;
        this.executeSearch(q);
      }
    });

    // Global Ctrl + K keybinding
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        this.open();
      }
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchRenderer;
}
