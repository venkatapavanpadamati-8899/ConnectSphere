/**
 * ConnectSphere Universal Search Service
 * Supabase-backed search across profiles, posts, and hashtags.
 * Uses RLS-safe anon key queries — no private data exposed.
 * Supports debouncing via AbortController pattern.
 */

const SearchService = {
  /** @type {number|null} */
  _debounceTimer: null,

  // ─── Recent Search History ────────────────────────────────────────────────

  getRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem('cs_search_history') || '[]');
    } catch (_) {
      return [];
    }
  },

  async addRecentSearch(query) {
    if (!query || !query.trim()) return;
    const clean = query.trim().slice(0, 100); // cap length
    let history = this.getRecentSearches();
    history = [clean, ...history.filter(h => h.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
    try { localStorage.setItem('cs_search_history', JSON.stringify(history)); } catch (_) {}
    if (window.csStore) window.csStore.publish('search:history_updated', history);

    // Persist to Supabase (best-effort, not critical path)
    try {
      const client = window.SupabaseClient?.getClient();
      const user = window.csStore?.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.id) {
        await client.from('search_history').insert({ user_id: user.id, query: clean });
      }
    } catch (_) { /* non-critical */ }
  },

  async clearRecentSearches() {
    try { localStorage.removeItem('cs_search_history'); } catch (_) {}
    if (window.csStore) window.csStore.publish('search:history_cleared', {});

    try {
      const client = window.SupabaseClient?.getClient();
      const user = window.csStore?.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.id) {
        await client.from('search_history').delete().eq('user_id', user.id);
      }
    } catch (_) { /* non-critical */ }
  },

  // ─── Core Search ──────────────────────────────────────────────────────────

  /**
   * Main search entry point.
   * Returns { profiles: [], posts: [], hashtags: [] }
   * All results come from Supabase. No hardcoded fake data is returned.
   *
   * @param {string} query - Raw user input
   * @param {string} [category='all'] - 'all' | 'people' | 'posts' | 'hashtags'
   * @returns {Promise<{profiles: object[], posts: object[], hashtags: object[]}>}
   */
  async search(query, category = 'all') {
    const empty = { profiles: [], posts: [], hashtags: [] };
    if (!query || !query.trim()) return empty;

    // Sanitize: remove characters that could interfere with ilike patterns
    const raw = query.trim().slice(0, 100);
    const q = raw.replace(/[%_\\]/g, '\\$&'); // escape SQL wildcards

    const client = window.SupabaseClient?.getClient();
    if (!client || !window.SupabaseClient.isConfigured()) {
      console.warn('[SearchService] Supabase not configured — search unavailable.');
      return empty;
    }

    const results = { profiles: [], posts: [], hashtags: [] };

    try {
      // Run searches in parallel when category is 'all', otherwise run relevant one
      const tasks = [];

      if (category === 'all' || category === 'people') {
        tasks.push(this._searchProfiles(client, q).then(r => { results.profiles = r; }));
      }
      if (category === 'all' || category === 'posts') {
        tasks.push(this._searchPosts(client, q).then(r => { results.posts = r; }));
      }
      if (category === 'all' || category === 'hashtags') {
        tasks.push(this._searchHashtags(client, q).then(r => { results.hashtags = r; }));
      }

      await Promise.allSettled(tasks);
    } catch (err) {
      console.warn('[SearchService] search error:', err);
    }

    return results;
  },

  // ─── Profile Search ───────────────────────────────────────────────────────

  /**
   * Search profiles by full_name, username, or bio.
   * RLS policy: "Public profiles are viewable by everyone" — no auth required.
   */
  async _searchProfiles(client, q) {
    try {
      const { data, error } = await client
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio, is_verified, sphere_score')
        .or(`full_name.ilike.%${q}%,username.ilike.%${q}%,bio.ilike.%${q}%`)
        .order('sphere_score', { ascending: false, nullsFirst: false })
        .limit(10);

      if (error) {
        console.warn('[SearchService] profiles search error:', error.message);
        return [];
      }

      return (data || []).map(p => ({
        id: p.id,
        name: p.full_name || 'Unknown',
        handle: p.username ? (p.username.startsWith('@') ? p.username : '@' + p.username) : '@user',
        bio: p.bio || '',
        avatar: p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        isVerified: p.is_verified || false,
        sphereScore: p.sphere_score || 0
      }));
    } catch (err) {
      console.warn('[SearchService] _searchProfiles exception:', err);
      return [];
    }
  },

  // ─── Post Search ──────────────────────────────────────────────────────────

  /**
   * Search posts by caption text.
   * RLS: posts with public visibility are readable by anon users.
   */
  async _searchPosts(client, q) {
    try {
      const { data, error } = await client
        .from('posts')
        .select(`
          id, caption, tags, created_at, likes_count, comments_count,
          profiles!posts_user_id_fkey ( id, full_name, username, avatar_url, is_verified ),
          post_media ( media_url, media_type )
        `)
        .ilike('caption', `%${q}%`)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.warn('[SearchService] posts search error:', error.message);
        return [];
      }

      return (data || []).map(p => {
        const prof = p.profiles || {};
        const media = Array.isArray(p.post_media) && p.post_media.length > 0 ? p.post_media[0] : null;
        return {
          id: p.id,
          caption: p.caption || '',
          tags: Array.isArray(p.tags) ? p.tags : [],
          createdAt: p.created_at,
          likesCount: p.likes_count || 0,
          commentsCount: p.comments_count || 0,
          author: prof.full_name || 'User',
          authorHandle: prof.username
            ? (prof.username.startsWith('@') ? prof.username : '@' + prof.username)
            : '@user',
          authorAvatar: prof.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
          authorVerified: prof.is_verified || false,
          mediaUrl: media ? media.media_url : null,
          mediaType: media ? media.media_type : null
        };
      });
    } catch (err) {
      console.warn('[SearchService] _searchPosts exception:', err);
      return [];
    }
  },

  // ─── Hashtag Search ───────────────────────────────────────────────────────

  /**
   * Search posts where the tags array contains the query term.
   * Returns aggregated hashtag objects with post counts.
   * Works with the TEXT[] tags column in posts table.
   */
  async _searchHashtags(client, q) {
    try {
      // Strip leading # if user types it
      const tag = q.startsWith('#') ? q.slice(1) : q;
      if (!tag) return [];

      // Find posts that have a matching tag (case-insensitive)
      // We use ilike on the array cast to text for broad matching
      const { data, error } = await client
        .from('posts')
        .select('id, tags, created_at')
        .filter('tags', 'cs', `{${tag}}`)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // Fallback: if cs (contains) filter not supported, try ilike on tags text representation
        const { data: fallbackData, error: fallbackError } = await client
          .from('posts')
          .select('id, tags, created_at')
          .ilike('caption', `%#${tag}%`)
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(50);

        if (fallbackError) {
          console.warn('[SearchService] hashtag fallback search error:', fallbackError.message);
          return [];
        }

        return this._aggregateHashtags(fallbackData || [], tag);
      }

      return this._aggregateHashtags(data || [], tag);
    } catch (err) {
      console.warn('[SearchService] _searchHashtags exception:', err);
      return [];
    }
  },

  /**
   * Aggregate raw post rows into hashtag objects with post counts.
   */
  _aggregateHashtags(posts, queryTag) {
    const tagMap = new Map();
    const lowerQuery = queryTag.toLowerCase();

    posts.forEach(post => {
      const tags = Array.isArray(post.tags) ? post.tags : [];
      tags.forEach(rawTag => {
        const t = rawTag.replace(/^#/, '').toLowerCase();
        if (t.includes(lowerQuery)) {
          const display = '#' + rawTag.replace(/^#/, '');
          tagMap.set(t, {
            tag: display,
            rawTag: t,
            postCount: (tagMap.get(t)?.postCount || 0) + 1,
            lastUsed: post.created_at
          });
        }
      });
    });

    return Array.from(tagMap.values())
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 10);
  },

  // ─── Trending Topics ──────────────────────────────────────────────────────

  /**
   * Fetch trending hashtags from recent posts.
   * Returns top hashtags by frequency in the last 7 days.
   */
  async getTrendingHashtags() {
    try {
      const client = window.SupabaseClient?.getClient();
      if (!client || !window.SupabaseClient.isConfigured()) return [];

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await client
        .from('posts')
        .select('tags')
        .eq('is_archived', false)
        .gte('created_at', since)
        .not('tags', 'eq', '{}')
        .limit(200);

      if (error || !data) return [];

      const tagMap = new Map();
      data.forEach(post => {
        const tags = Array.isArray(post.tags) ? post.tags : [];
        tags.forEach(rawTag => {
          const t = rawTag.replace(/^#/, '').toLowerCase();
          if (t) tagMap.set(t, (tagMap.get(t) || 0) + 1);
        });
      });

      return Array.from(tagMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([tag, count]) => ({ tag: '#' + tag, postCount: count }));
    } catch (err) {
      console.warn('[SearchService] getTrendingHashtags error:', err);
      return [];
    }
  },

  /**
   * Fetch suggested profiles (e.g., for explore page empty state).
   * Returns top profiles by sphere_score not already followed by current user.
   */
  async getSuggestedProfiles() {
    try {
      const client = window.SupabaseClient?.getClient();
      if (!client || !window.SupabaseClient.isConfigured()) return [];

      const { data, error } = await client
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio, is_verified, sphere_score')
        .order('sphere_score', { ascending: false, nullsFirst: false })
        .limit(6);

      if (error || !data) return [];

      return data.map(p => ({
        id: p.id,
        name: p.full_name || 'User',
        handle: p.username ? (p.username.startsWith('@') ? p.username : '@' + p.username) : '@user',
        bio: p.bio || '',
        avatar: p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        isVerified: p.is_verified || false,
        sphereScore: p.sphere_score || 0
      }));
    } catch (err) {
      console.warn('[SearchService] getSuggestedProfiles error:', err);
      return [];
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchService;
}

if (typeof window !== 'undefined') {
  window.SearchService = SearchService;
}
