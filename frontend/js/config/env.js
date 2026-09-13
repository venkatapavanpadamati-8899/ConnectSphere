/**
 * ConnectSphere Client Environment Configuration
 * Safe browser configuration layer for Supabase URL and Publishable/Anon Key.
 * Connected to Production Supabase Project: lgsdihyrsbzebdfblpor
 */

(function () {
  const globalConfig = window.CONNECTSPHERE_CONFIG || window.__ENV__ || {};

  // Check localStorage overrides if present (helpful for zero-code live testing)
  let storedUrl = '';
  let storedKey = '';
  try {
    storedUrl = localStorage.getItem('cs_supabase_url') || '';
    storedKey = localStorage.getItem('cs_supabase_anon_key') || '';
  } catch (_) {}

  const env = {
    SUPABASE_URL: globalConfig.SUPABASE_URL || storedUrl || 'https://lgsdihyrsbzebdfblpor.supabase.co',
    SUPABASE_ANON_KEY: globalConfig.SUPABASE_ANON_KEY || storedKey || 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL',
    APP_NAME: 'ConnectSphere',
    APP_VERSION: '4.1.0-live',
    ENVIRONMENT: 'production',

    /**
     * Verifies if real Supabase project credentials are linked.
     */
    isConfigured() {
      return (
        this.SUPABASE_URL &&
        this.SUPABASE_URL.startsWith('https://') &&
        !this.SUPABASE_URL.includes('mock-connectsphere') &&
        this.SUPABASE_ANON_KEY &&
        !this.SUPABASE_ANON_KEY.includes('placeholder')
      );
    }
  };

  window.CONNECTSPHERE_ENV = env;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = env;
  }
})();
