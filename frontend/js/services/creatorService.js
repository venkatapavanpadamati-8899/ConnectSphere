/**
 * ConnectSphere Creator Studio Service
 * Supabase-first creator analytics, reach, engagement metrics, and token earnings.
 */

const CreatorService = {
  isInitialized: false,

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    await this.fetchCreatorStatsFromSupabase();
  },

  async fetchCreatorStatsFromSupabase() {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore?.get('currentUser');
      if (!client || !window.SupabaseClient.isConfigured() || !user?.supabase_id) return;

      const { data: creatorProfile } = await client
        .from('creator_profiles')
        .select('id, tier, total_revenue_usd, verified_at')
        .eq('user_id', user.supabase_id)
        .single();

      if (creatorProfile) {
        const { data: analytics } = await client
          .from('creator_analytics')
          .select('impressions, reach, engagement_rate, shares, profile_visits')
          .eq('creator_id', creatorProfile.id)
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (analytics) {
          const stats = {
            monthlyReach: `${(analytics.reach / 1000).toFixed(1)}K`,
            engagementRate: `${analytics.engagement_rate}%`,
            impressions: `${(analytics.impressions / 1000).toFixed(1)}K`,
            tokenEarnings: `$${(creatorProfile.total_revenue_usd).toFixed(2)}`
          };
          window.csStore.set('creatorStats', stats);
          window.csStore.publish('creator:stats_loaded', stats);
        }
      }
    } catch (err) {
      console.warn('[CreatorService] fetch fallback error:', err);
    }
  },

  getStats() {
    return window.csStore.get('creatorStats') || {};
  },

  exportAnalyticsReport() {
    const stats = this.getStats();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stats, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `connectsphere_analytics_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    if (typeof showToast === 'function') {
      showToast('Creator Studio cryptographic metrics exported! 📊✨');
    }
  }
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CreatorService;
}

if (typeof window !== 'undefined') {
  window.CreatorService = CreatorService;
}
