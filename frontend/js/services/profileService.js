/**
 * ConnectSphere Profile Service
 * Handles user profile fetching, updating, and follower management.
 */

const ProfileService = {
  /**
   * Fetch a user profile by ID or username.
   */
  async getProfile(identifier) {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : (window.csSupabase || null);
      if (!client) return null;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      
      let query = client.from('profiles').select('*');
      if (isUuid) {
        query = query.eq('id', identifier);
      } else {
        query = query.eq('username', identifier.replace('@', ''));
      }

      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[ProfileService] getProfile error:', err);
      return null;
    }
  },

  /**
   * Update the current user's profile.
   */
  async updateProfile(updates) {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : (window.csSupabase || null);
      const user = window.csStore?.get('currentUser');
      if (!client || !user?.id) return null;

      const { data, error } = await client
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local store
      if (window.csStore) {
        window.csStore.set('currentUser', { ...user, ...data });
      }

      return data;
    } catch (err) {
      console.warn('[ProfileService] updateProfile error:', err);
      return null;
    }
  },

  /**
   * Follow a user
   */
  async followUser(targetUserId) {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : (window.csSupabase || null);
      const user = window.csStore?.get('currentUser');
      if (!client || !user?.id) return false;

      const { error } = await client
        .from('followers')
        .insert({ follower_id: user.id, following_id: targetUserId });

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[ProfileService] followUser error:', err);
      return false;
    }
  },

  /**
   * Unfollow a user
   */
  async unfollowUser(targetUserId) {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : (window.csSupabase || null);
      const user = window.csStore?.get('currentUser');
      if (!client || !user?.id) return false;

      const { error } = await client
        .from('followers')
        .delete()
        .match({ follower_id: user.id, following_id: targetUserId });

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[ProfileService] unfollowUser error:', err);
      return false;
    }
  },

  /**
   * Check if current user is following a target user
   */
  async isFollowing(targetUserId) {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : (window.csSupabase || null);
      const user = window.csStore?.get('currentUser');
      if (!client || !user?.id) return false;

      const { data, error } = await client
        .from('followers')
        .select('id')
        .match({ follower_id: user.id, following_id: targetUserId })
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (err) {
      console.warn('[ProfileService] isFollowing error:', err);
      return false;
    }
  },

  /**
   * Get list of following IDs
   */
  async getFollowingIds() {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : (window.csSupabase || null);
      const user = window.csStore?.get('currentUser');
      if (!client || !user?.id) return [];

      const { data, error } = await client
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);

      if (error) throw error;
      return data.map(d => d.following_id);
    } catch (err) {
      console.warn('[ProfileService] getFollowingIds error:', err);
      return [];
    }
  },

  /**
   * Get stats (followers, following)
   */
  async getProfileStats(userId) {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : (window.csSupabase || null);
      if (!client) return { followers: 0, following: 0 };

      // Since we don't have direct count queries in standard js client easily without returning rows,
      // we can fetch the profile which should be updated by triggers.
      // Wait, let's fetch the profile to get the cached counts.
      const { data, error } = await client
        .from('profiles')
        .select('followers_count, following_count')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return {
        followers: data.followers_count || 0,
        following: data.following_count || 0
      };
    } catch (err) {
      console.warn('[ProfileService] getProfileStats error:', err);
      return { followers: 0, following: 0 };
    }
  },

  async blockUser(targetUserId) {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore?.get('currentUser');
      if (!client || !user?.id) return false;

      const { error } = await client
        .from('blocks')
        .insert({ blocker_id: user.id, blocked_id: targetUserId });

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[ProfileService] blockUser error:', err);
      return false;
    }
  },

  async unblockUser(targetUserId) {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore?.get('currentUser');
      if (!client || !user?.id) return false;

      const { error } = await client
        .from('blocks')
        .delete()
        .match({ blocker_id: user.id, blocked_id: targetUserId });

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[ProfileService] unblockUser error:', err);
      return false;
    }
  },

  async getBlockedUsers() {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore?.get('currentUser');
      if (!client || !user?.id) return [];

      const { data, error } = await client
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      if (error) throw error;
      return data.map(b => b.blocked_id);
    } catch (err) {
      console.warn('[ProfileService] getBlockedUsers error:', err);
      return [];
    }
  },

  async getBlockedByUsers() {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore?.get('currentUser');
      if (!client || !user?.id) return [];

      const { data, error } = await client
        .from('blocks')
        .select('blocker_id')
        .eq('blocked_id', user.id);

      if (error) throw error;
      return data.map(b => b.blocker_id);
    } catch (err) {
      console.warn('[ProfileService] getBlockedByUsers error:', err);
      return [];
    }
  }
};

if (typeof window !== 'undefined') {
  window.ProfileService = ProfileService;
}
