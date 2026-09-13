/**
 * ConnectSphere Reels Service
 * Supabase-first vertical short-form video state and social interactions.
 * Manages vertical video playback, autoplay cycling, likes, saves, and follows.
 */

const ReelService = {
  isInitialized: false,

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    await this.fetchReelsFromSupabase();
  },

  async fetchReelsFromSupabase() {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (!client || !window.SupabaseClient.isConfigured()) return;

      const { data: dbReels, error } = await client
        .from('reels')
        .select(`
          id, user_id, caption, sound_title,
          likes_count, comments_count, saves_count, views_count, created_at,
          profiles ( id, full_name, username, avatar_url, is_verified ),
          reel_media ( id, video_url, poster_url, duration_seconds )
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.warn('[ReelService] Supabase reel fetch error:', error.message);
        return;
      }

      if (dbReels && dbReels.length > 0) {
        const formatted = dbReels.map(r => {
          const prof = r.profiles || {};
          const media = (r.reel_media && r.reel_media[0]) || {};
          return {
            id: r.id,
            creator: prof.full_name || 'Creator',
            handle: prof.username ? (prof.username.startsWith('@') ? prof.username : '@' + prof.username) : '@creator',
            avatar: prof.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
            caption: r.caption || '',
            videoSrc: media.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            audioTrack: r.sound_title || 'Original Spatial Sound • ConnectSphere',
            likes: r.likes_count || 0,
            commentsCount: r.comments_count || 0,
            isLiked: false,
            isSaved: false,
            isFollowing: false
          };
        });

        window.csStore.set('reels', formatted);
        window.csStore.publish('reels:loaded', formatted);
      }
    } catch (err) {
      console.warn('[ReelService] Fetch fallback error:', err);
    }
  },

  getReels() {
    return window.csStore.get('reels') || [];
  },

  async toggleLike(reelId) {
    const reels = window.csStore.get('reels') || [];
    const reel = reels.find(r => r.id === reelId);
    if (!reel) return null;

    reel.isLiked = !reel.isLiked;
    reel.likes += reel.isLiked ? 1 : -1;
    if (reel.likes < 0) reel.likes = 0;

    window.csStore.set('reels', [...reels]);
    window.csStore.publish('reel:liked', { reelId, isLiked: reel.isLiked, likes: reel.likes });

    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        if (reel.isLiked) {
          await client.from('reel_likes').insert({ reel_id: reelId, user_id: user.supabase_id });
        } else {
          await client.from('reel_likes').delete().match({ reel_id: reelId, user_id: user.supabase_id });
        }
      }
    } catch (err) {
      console.warn('[ReelService] toggleLike sync error:', err);
    }

    return reel;
  },

  async toggleSave(reelId) {
    const reels = window.csStore.get('reels') || [];
    const reel = reels.find(r => r.id === reelId);
    if (!reel) return null;

    reel.isSaved = !reel.isSaved;
    window.csStore.set('reels', [...reels]);
    window.csStore.publish('reel:saved', { reelId, isSaved: reel.isSaved });

    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        if (reel.isSaved) {
          await client.from('reel_saves').insert({ reel_id: reelId, user_id: user.supabase_id });
        } else {
          await client.from('reel_saves').delete().match({ reel_id: reelId, user_id: user.supabase_id });
        }
      }
    } catch (err) {
      console.warn('[ReelService] toggleSave sync error:', err);
    }

    return reel;
  },

  async toggleFollow(creatorHandle) {
    const reels = window.csStore.get('reels') || [];
    let isFollowingNow = false;
    reels.forEach(r => {
      if (r.handle === creatorHandle) {
        r.isFollowing = !r.isFollowing;
        isFollowingNow = r.isFollowing;
      }
    });

    window.csStore.set('reels', [...reels]);
    window.csStore.publish('creator:followed', { creatorHandle, isFollowing: isFollowingNow });

    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        // Look up target profile by handle/username
        const cleanHandle = creatorHandle.replace(/^@/, '');
        const { data: targetProf } = await client.from('profiles').select('id').eq('username', cleanHandle).single();
        if (targetProf) {
          if (isFollowingNow) {
            await client.from('followers').insert({ follower_id: user.supabase_id, following_id: targetProf.id });
          } else {
            await client.from('followers').delete().match({ follower_id: user.supabase_id, following_id: targetProf.id });
          }
        }
      }
    } catch (err) {
      console.warn('[ReelService] toggleFollow sync error:', err);
    }

    return isFollowingNow;
  },

  remixReel(reelId) {
    const reels = window.csStore.get('reels') || [];
    const reel = reels.find(r => r.id === reelId);
    if (!reel) return null;

    if (typeof showToast === 'function') {
      showToast(`Initiating Spatial Node Remix for ${reel.creator}’s audio! 🎚️🎛️`);
    }
    return reel;
  }
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReelService;
}

if (typeof window !== 'undefined') {
  window.ReelService = ReelService;
}
