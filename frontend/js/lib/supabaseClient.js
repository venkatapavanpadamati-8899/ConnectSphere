/**
 * ConnectSphere Supabase Client Integration Layer
 * Single point of access for Supabase Database, Auth, Realtime, and Storage.
 */

(function () {
  const env = window.CONNECTSPHERE_ENV || {
    // These should ideally be overridden by env.js in production
    SUPABASE_URL: window.ENV?.SUPABASE_URL || 'https://xxxx.supabase.co',
    SUPABASE_ANON_KEY: window.ENV?.SUPABASE_ANON_KEY || 'eyJxxxx',
    isConfigured: () => false
  };

  let client = null;

  if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
    try {
      client = window.supabase.createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          storageKey: 'connectsphere-supabase-auth'
        },
        realtime: {
          params: {
            eventsPerSecond: 20
          }
        },
        global: {
          headers: {
            'x-application-name': 'ConnectSphere'
          }
        }
      });
    } catch (err) {
      console.warn('⚠️ Supabase client initialization warning:', err.message);
    }
  } else {
    console.warn('⚠️ @supabase/supabase-js library not loaded yet. Include the official SDK in <script> tag.');
  }

  // Fallback wrapper to provide helpful developer telemetry if client is offline/unlinked
  const supabaseWrapper = client || {
    auth: {
      async getSession() { return { data: { session: null }, error: null }; },
      async getUser() { return { data: { user: null }, error: null }; },
      async signInWithPassword() { throw new Error('Supabase project not connected. Configure SUPABASE_URL and SUPABASE_ANON_KEY.'); },
      async signUp() { throw new Error('Supabase project not connected. Configure SUPABASE_URL and SUPABASE_ANON_KEY.'); },
      async signOut() { return { error: null }; },
      onAuthStateChange(cb) { return { data: { subscription: { unsubscribe() {} } } }; }
    },
    from() {
      return {
        select() { return this; },
        insert() { return this; },
        update() { return this; },
        delete() { return this; },
        eq() { return this; },
        order() { return this; },
        range() { return this; },
        single() { return Promise.resolve({ data: null, error: new Error('Supabase not connected') }); },
        then(resolve) { resolve({ data: [], error: null }); }
      };
    },
    channel() {
      return {
        on() { return this; },
        subscribe() { return this; },
        unsubscribe() { return Promise.resolve(); }
      };
    },
    storage: {
      from() {
        return {
          upload() { return Promise.resolve({ data: null, error: new Error('Supabase storage not connected') }); },
          getPublicUrl(path) { return { data: { publicUrl: path } }; }
        };
      }
    }
  };

  window.csSupabase = client || supabaseWrapper;
  window.isSupabaseConnected = () => !!client && env.isConfigured();
  window.SupabaseClient = {
    getClient: () => window.csSupabase,
    isConfigured: () => env.isConfigured()
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.csSupabase;
  }
})();
