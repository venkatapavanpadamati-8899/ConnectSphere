/**
 * ConnectSphere Universal Search Service
 * Supabase-first search across profiles, posts, reels, videos, communities, and topics.
 * Manages search history and trending telemetry.
 */

const SearchService = {
  getRecentSearches() {
    return window.csStore.get('searchHistory') || [];
  },

  getTrendingTopics() {
    return window.csStore.get('trendingTopics') || [];
  },

  async addRecentSearch(query) {
    if (!query || !query.trim()) return;
    const clean = query.trim();
    let history = this.getRecentSearches();
    history = [clean, ...history.filter(h => h.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
    window.csStore.set('searchHistory', history);
    window.csStore.publish('search:history_updated', history);

    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore?.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        await client.from('search_history').insert({
          user_id: user.supabase_id,
          query: clean
        });
      }
    } catch (err) {
      console.warn('[SearchService] addRecentSearch sync error:', err);
    }
  },

  async clearRecentSearches() {
    window.csStore.set('searchHistory', []);
    window.csStore.publish('search:history_cleared', {});

    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore?.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        await client.from('search_history').delete().eq('user_id', user.supabase_id);
      }
    } catch (err) {
      console.warn('[SearchService] clearRecentSearches sync error:', err);
    }
  },

  async search(query, category = 'all') {
    if (!query || !query.trim()) {
      return { people: [], posts: [], reels: [], communities: [], topics: [] };
    }

    const q = query.toLowerCase().trim();
    const posts = window.csStore.get('posts') || [];
    const reels = window.csStore.get('reels') || [];
    const communities = window.csStore.get('communities') || [];
    const trending = window.csStore.get('trendingTopics') || [];

    // Matching People
    let people = [
      { name: 'Sofia Chen', handle: '@sofiachen', role: 'AI Systems Researcher', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80' },
      { name: 'Elena Rostova', handle: '@elena_r', role: 'Spatial Audio Director', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80' },
      { name: 'Marcus Vance', handle: '@marcusvance', role: 'Binaural Engineer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80' },
      { name: 'David Kim', handle: '@davidkim', role: 'Core Protocol Lead', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80' },
      { name: 'Kenji Tanaka', handle: '@kenji_t', role: 'Spatial Audio Architect', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&auto=format&fit=crop&q=80' }
    ].filter(p => p.name.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q) || p.role.toLowerCase().includes(q));

    // Supabase Live People Search
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (client && window.SupabaseClient.isConfigured()) {
        const { data: dbPeople } = await client
          .from('profiles')
          .select('id, full_name, username, avatar_url, bio, badge')
          .or(`full_name.ilike.%${q}%,username.ilike.%${q}%,bio.ilike.%${q}%`)
          .limit(10);

        if (dbPeople && dbPeople.length > 0) {
          const formattedPeople = dbPeople.map(p => ({
            name: p.full_name,
            handle: p.username?.startsWith('@') ? p.username : '@' + p.username,
            role: p.bio || p.badge || 'Creator',
            avatar: p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
          }));
          people = [...formattedPeople, ...people.filter(pl => !formattedPeople.some(fp => fp.handle === pl.handle))];
        }
      }
    } catch (err) {
      console.warn('[SearchService] DB people search fallback:', err);
    }

    let matchedPosts = [];
    let matchedReels = [];

    // Supabase Live Posts & Reels Search
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (client && window.SupabaseClient.isConfigured()) {
        // Search Posts
        const { data: dbPosts } = await client
          .from('posts')
          .select(`
            id, caption, category, tags, created_at,
            profiles ( id, full_name, username, avatar_url, is_verified ),
            post_media ( media_url, media_type, aspect_ratio )
          `)
          .ilike('caption', `%${q}%`)
          .order('created_at', { ascending: false })
          .limit(10);

        if (dbPosts) {
          matchedPosts = dbPosts.map(p => {
            const prof = p.profiles || {};
            const media = (p.post_media && p.post_media.length > 0) ? p.post_media[0] : null;
            return {
              id: p.id,
              author: prof.full_name || 'User',
              handle: prof.username ? (prof.username.startsWith('@') ? prof.username : '@' + prof.username) : '@user',
              avatar: prof.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
              time: new Date(p.created_at).toLocaleDateString(),
              caption: p.caption,
              tags: p.tags || [],
              image: media ? media.media_url : null
            };
          });
        }

        // Search Reels
        const { data: dbReels } = await client
          .from('reels')
          .select(`
            id, caption, sound_title, created_at,
            profiles ( id, full_name, username, avatar_url, is_verified ),
            reel_media ( video_url, poster_url )
          `)
          .ilike('caption', `%${q}%`)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (dbReels) {
          matchedReels = dbReels.map(r => {
            const prof = r.profiles || {};
            const media = (r.reel_media && r.reel_media.length > 0) ? r.reel_media[0] : {};
            return {
              id: r.id,
              creator: prof.full_name || 'Creator',
              caption: r.caption,
              videoSrc: media.video_url || ''
            };
          });
        }
      }
    } catch (err) {
      console.warn('[SearchService] DB posts/reels search fallback:', err);
    }

    // Matching Communities
    const matchedCommunities = communities.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));

    // Matching Topics
    const matchedTopics = trending.filter(t => t.tag.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));

    return {
      people,
      posts: matchedPosts,
      reels: matchedReels,
      communities: matchedCommunities,
      topics: matchedTopics
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchService;
}

if (typeof window !== 'undefined') {
  window.SearchService = SearchService;
}
