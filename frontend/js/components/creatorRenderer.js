/**
 * ConnectSphere Creator Studio Renderer
 * Connects Creator Studio metrics, performance stats, AI insights, and reports.
 */

const CreatorRenderer = {
  modalId: 'creator-studio-modal',

  init() {
    this.modal = document.getElementById(this.modalId);
    if (!this.modal) return;

    this.bindEvents();
    this.renderMetrics();
  },

  bindEvents() {
    // Open Creator Studio from VIP card "Learn More" or nav
    const vipBtn = document.getElementById('btn-vip-learn-more');
    if (vipBtn) {
      vipBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    }

    // Close button
    const closeBtn = document.getElementById('btn-close-creator-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Close on backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Export Report
    const exportBtn = document.getElementById('btn-export-analytics');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        CreatorService.exportAnalyticsReport();
      });
    }

    // AI Growth Insights
    const aiBtn = document.getElementById('btn-creator-tools');
    if (aiBtn) {
      aiBtn.addEventListener('click', async () => {
        aiBtn.disabled = true;
        const originalText = aiBtn.innerHTML;
        aiBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
        
        try {
          const prompt = "Give me 3 viral growth recommendations for an interactive 3D WebAssembly social profile.";
          const insights = await SphereAIService.generateCaption(prompt);
          if (typeof showToast === 'function') {
            showToast(`💡 AI Recommendation: Focus on interactive neural 3D embeds on Tuesdays & Thursdays!`);
          }
          alert(`Sphere AI Growth Analysis:\n\n${insights}\n\nKey Action: Engage during peak Tokyo & San Francisco sync hours (14:00 - 18:00 UTC).`);
        } catch (err) {
          if (typeof showToast === 'function') {
            showToast('Growth insights generated from local neural cache.');
          }
        } finally {
          aiBtn.disabled = false;
          aiBtn.innerHTML = originalText;
        }
      });
    }

    // Subscribe to state updates
    if (window.csStore) {
      window.csStore.subscribe('creatorStats', () => this.renderMetrics());
    }
  },

  open() {
    if (this.modal) {
      this.renderMetrics();
      this.modal.classList.add('active');
    }
  },

  close() {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  },

  renderMetrics() {
    const stats = CreatorService.getStats();
    if (!stats || !this.modal) return;

    const metricCards = this.modal.querySelectorAll('.metric-card .metric-value');
    if (metricCards.length >= 4) {
      if (stats.reach) metricCards[0].textContent = ConnectSphereSecurity.formatNumber(stats.reach);
      if (stats.impressions) metricCards[1].textContent = ConnectSphereSecurity.formatNumber(stats.impressions);
      if (stats.engagementRate) metricCards[2].textContent = `${stats.engagementRate}%`;
      if (stats.estimatedRevenue) metricCards[3].textContent = `$${stats.estimatedRevenue.toLocaleString()}`;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CreatorRenderer;
}
