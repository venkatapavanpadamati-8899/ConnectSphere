/**
 * ConnectSphere Communities Service
 * Supabase-first community channels, membership join/leave state, and topic routing.
 */

const CommunityService = {
  isInitialized: false,

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    await this.fetchCommunitiesFromSupabase();
  },

  async fetchCommunitiesFromSupabase() {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (!client || !window.SupabaseClient.isConfigured()) return;

      const { data: dbComms, error } = await client
        .from('communities')
        .select('id, name, slug, description, members_count, is_private, banner_url')
        .order('members_count', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('[CommunityService] fetch error:', error.message);
        return;
      }

      if (dbComms && dbComms.length > 0) {
        const formatted = dbComms.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          membersCount: c.members_count || 1,
          isJoined: false,
          banner: c.banner_url,
          icon: c.banner_url || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100'
        }));

        const currentComms = window.csStore.get('communities') || [];
        const merged = [...formatted, ...currentComms.filter(cc => !formatted.some(f => f.name === cc.name))];
        window.csStore.set('communities', merged);
        window.csStore.publish('communities:loaded', merged);
      }
    } catch (err) {
      console.warn('[CommunityService] fetch fallback error:', err);
    }
  },

  getCommunities() {
    return window.csStore.get('communities') || [];
  },

  async toggleJoin(communityId) {
    const communities = this.getCommunities();
    const comm = communities.find(c => c.id === communityId);
    if (!comm) return false;

    comm.isJoined = !comm.isJoined;
    comm.membersCount = (comm.membersCount || 0) + (comm.isJoined ? 1 : -1);
    window.csStore.set('communities', [...communities]);
    window.csStore.publish('community:toggled', { communityId, isJoined: comm.isJoined });

    if (typeof showToast === 'function') {
      showToast(comm.isJoined ? `Joined ${comm.name}! 🚀` : `Left ${comm.name}`);
    }

    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore?.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id && communityId) {
        if (comm.isJoined) {
          await client.from('community_members').insert({
            community_id: communityId,
            user_id: user.supabase_id,
            role: 'member'
          });
        } else {
          await client.from('community_members').delete().match({
            community_id: communityId,
            user_id: user.supabase_id
          });
        }
      }
    } catch (err) {
      console.warn('[CommunityService] toggleJoin sync error:', err);
    }

    return comm.isJoined;
  }
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommunityService;
}

if (typeof window !== 'undefined') {
  window.CommunityService = CommunityService;
}
