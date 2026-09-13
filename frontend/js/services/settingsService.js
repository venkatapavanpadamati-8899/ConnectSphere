/**
 * ConnectSphere Settings Service
 * Handles fetching and updating user settings from Supabase.
 */

const SettingsService = {
  isInitialized: false,

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    await this.fetchSettings();
  },

  async fetchSettings() {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : (window.csSupabase || null);
      const user = window.csStore?.get('currentUser');
      if (!client || !user?.id) return null;

      // 1. Fetch Profile (for is_private)
      const { data: profile } = await client.from('profiles').select('is_private').eq('id', user.id).single();

      // 2. Fetch User Settings
      let { data: settings } = await client.from('user_settings').select('*').eq('user_id', user.id).single();
      
      // Upsert default if not exists
      if (!settings) {
        const { data: newSettings, error } = await client
          .from('user_settings')
          .insert({ user_id: user.id })
          .select()
          .single();
        if (!error) settings = newSettings;
      }

      if (profile && settings) {
        const merged = { ...settings, is_private: profile.is_private };
        window.csStore.set('settings', merged);
        return merged;
      }
    } catch (err) {
      console.warn('[SettingsService] fetch error:', err);
    }
    return null;
  },

  async updateSetting(key, value) {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : (window.csSupabase || null);
      const user = window.csStore?.get('currentUser');
      if (!client || !user?.id) return false;

      let success = false;
      if (key === 'is_private') {
        const { error } = await client.from('profiles').update({ is_private: value }).eq('id', user.id);
        success = !error;
      } else {
        const { error } = await client.from('user_settings').update({ [key]: value }).eq('user_id', user.id);
        success = !error;
      }

      if (success) {
        const currentSettings = window.csStore.get('settings') || {};
        window.csStore.set('settings', { ...currentSettings, [key]: value });
        if (typeof showToast === 'function') {
          showToast('Settings saved successfully. ✔️');
        }
        return true;
      }
    } catch (err) {
      console.warn('[SettingsService] update error:', err);
    }
    
    if (typeof showToast === 'function') {
      showToast('Error saving settings. ❌', 'error');
    }
    return false;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsService;
}

if (typeof window !== 'undefined') {
  window.SettingsService = SettingsService;
}
