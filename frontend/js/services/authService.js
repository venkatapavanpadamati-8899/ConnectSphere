/**
 * ConnectSphere Supabase Authentication Service
 * Production Auth layer handling SignUp, SignIn, SignOut, Sessions, Recovery & OAuth.
 */

const AuthService = {
  /**
   * Initializes Auth state listeners and session sync.
   */
  async init() {
    // Support both window.csSupabase (direct) and window.SupabaseClient.getClient() pattern
    const client = window.csSupabase || (window.SupabaseClient ? window.SupabaseClient.getClient() : null);
    if (!client || !client.auth) return null;
    // Ensure window.csSupabase is set for all auth methods
    if (!window.csSupabase && client) window.csSupabase = client;

    // Listen for auth state changes
    client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await this.syncUserProfile(session.user);
      } else {
        if (window.csStore) {
          window.csStore.set('currentUser', null);
        }
      }
    });

    const session = await this.getSession();
    if (session?.user) {
      await this.syncUserProfile(session.user);
    }
    return session;
  },

  async getSession() {
    try {
      const { data, error } = await window.csSupabase.auth.getSession();
      if (error) throw error;
      return data?.session || null;
    } catch (_) {
      return null;
    }
  },

  async getCurrentUser() {
    try {
      const { data, error } = await window.csSupabase.auth.getUser();
      if (error) throw error;
      return data?.user || null;
    } catch (_) {
      return null;
    }
  },

  /**
   * Sign up with email, password, and metadata.
   */
  async signUp({ email, password, username, fullName, role = 'Verified Creator' }) {
    if (!email || !password) throw new Error('Email and password are required.');

    const { data, error } = await window.csSupabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
          full_name: fullName || 'ConnectSphere Creator',
          role
        }
      }
    });

    if (error) throw error;
    if (data?.user) {
      await this.syncUserProfile(data.user);
    }
    return data;
  },

  /**
   * Sign in with Email and Password.
   */
  async signIn({ email, password }) {
    if (!email || !password) throw new Error('Email and password are required.');

    const { data, error } = await window.csSupabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (data?.user) {
      await this.syncUserProfile(data.user);
    }
    return data;
  },

  /**
   * Sign Out.
   */
  async signOut() {
    try {
      await window.csSupabase.auth.signOut();
    } catch (_) {}

    if (window.csStore) {
      window.csStore.set('currentUser', null);
    }
    localStorage.removeItem('connectsphere-supabase-auth');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('currentUser');
  },

  /**
   * Send Password Recovery Email.
   */
  async resetPasswordForEmail(email) {
    if (!email) throw new Error('Email address is required.');
    const basePath = window.location.pathname.includes('/frontend/') ? '/frontend' : '';
    const redirectUrl = `${window.location.origin}${basePath}/pages/login.html#type=recovery`;

    const { data, error } = await window.csSupabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });

    if (error) throw error;
    return data;
  },

  /**
   * Update password (after recovery flow or in settings).
   */
  async updatePassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const { data, error } = await window.csSupabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return data;
  },

  /**
   * Phone authentication / OTP initiation.
   */
  async signInWithPhone(phone) {
    const { data, error } = await window.csSupabase.auth.signInWithOtp({
      phone
    });
    if (error) throw error;
    return data;
  },

  /**
   * Verify Phone / Email OTP token.
   */
  async verifyOtp({ phone, email, token, type = 'sms' }) {
    const params = { token, type };
    if (phone) params.phone = phone;
    if (email) params.email = email;

    const { data, error } = await window.csSupabase.auth.verifyOtp(params);
    if (error) throw error;
    return data;
  },

  /**
   * Google OAuth Sign In.
   */
  async signInWithGoogle() {
    const basePath = window.location.pathname.includes('/frontend/') ? '/frontend' : '';
    return await window.csSupabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${basePath}/pages/dashboard.html`
      }
    });
  },

  /**
   * Apple OAuth Sign In.
   */
  async signInWithApple() {
    const basePath = window.location.pathname.includes('/frontend/') ? '/frontend' : '';
    return await window.csSupabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}${basePath}/pages/dashboard.html`
      }
    });
  },

  /**
   * Synchronizes user profile from Supabase PostgreSQL into client state.
   */
  async syncUserProfile(authUser) {
    if (!authUser) return;

    try {
      const { data: profile, error } = await window.csSupabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const userPayload = profile || {
        id: authUser.id,
        supabase_id: authUser.id,
        name: authUser.user_metadata?.full_name || 'Alex Johnson',
        username: authUser.user_metadata?.username || 'alexjohnson',
        avatar: authUser.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        role: authUser.user_metadata?.role || 'Verified Creator',
        isVerified: true
      };
      
      // Ensure supabase_id is present even if profile is fetched
      if (profile && !userPayload.supabase_id) {
        userPayload.supabase_id = authUser.id;
      }

      if (window.csStore) {
        window.csStore.set('currentUser', userPayload);
      }
    } catch (_) {
      // Fallback to auth metadata
      if (window.csStore) {
        window.csStore.set('currentUser', {
          id: authUser.id,
          supabase_id: authUser.id,
          name: authUser.user_metadata?.full_name || 'Alex Johnson',
          username: authUser.user_metadata?.username || 'alexjohnson',
          avatar: authUser.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          role: 'Verified Creator',
          isVerified: true
        });
      }
    }
  },

  /**
   * Route Guard: Protects authenticated pages and redirects unauthenticated users.
   */
  async requireAuth(redirectTo = 'login.html') {
    // If Supabase project is not configured yet, allow demo browsing with banner
    if (window.CONNECTSPHERE_ENV && !window.CONNECTSPHERE_ENV.isConfigured()) {
      return true;
    }

    const session = await this.getSession();
    if (!session) {
      console.warn('[AuthService] No active Supabase session. Redirecting to login.');
      const isCleanRoute = !window.location.pathname.includes('.html') && window.location.pathname !== '/';
      window.location.href = isCleanRoute ? `/${redirectTo.replace('.html', '')}` : redirectTo;
      return false;
    }
    return true;
  }
};

if (typeof window !== 'undefined') {
  window.AuthService = AuthService;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthService;
}
