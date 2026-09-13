/**
 * ConnectSphere Video Theater Service
 * Supabase-first long-form video streaming, channel subscriptions, and live discussion.
 * Schema: videos -> channel_id -> channels (channel_name, channel_handle, subscribers_count)
 * Schema: video_media -> video_id (resolution, manifest_url) — no video_url column
 */

const VideoTheaterService = {
  isInitialized: false,

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    await this.fetchVideosFromSupabase();
  },

  async fetchVideosFromSupabase() {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (!client || !window.SupabaseClient.isConfigured()) return;

      // videos.channel_id -> channels table (not profiles)
      // video_media has: id, video_id, resolution, manifest_url — no video_url/thumbnail_url
      const { data: dbVideos, error } = await client
        .from('videos')
        .select(`
          id, title, description, video_url, thumbnail_url, duration_seconds, views_count, likes_count, created_at,
          channels ( id, channel_name, channel_handle, banner_url, subscribers_count ),
          video_media ( resolution, manifest_url )
        `)
        .order('views_count', { ascending: false })
        .limit(10);

      if (error) {
        console.warn('[VideoTheaterService] Supabase video fetch error:', error.message);
        return;
      }

      if (dbVideos && dbVideos.length > 0) {
        const topVideo = dbVideos[0];
        const ch = topVideo.channels || {};
        const media = (topVideo.video_media && topVideo.video_media.length > 0) ? topVideo.video_media[0] : {};

        const currentStream = {
          id: topVideo.id,
          title: topVideo.title,
          creator: ch.channel_name || 'ConnectSphere Channel',
          channelHandle: ch.channel_handle || '@connectsphere',
          avatar: ch.banner_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
          subscribers: ch.subscribers_count || 0,
          isSubscribed: false,
          views: topVideo.views_count || 0,
          likes: topVideo.likes_count || 0,
          isLiked: false,
          videoUrl: media.manifest_url || topVideo.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          resolution: media.resolution || '1080p',
          thumbnail: topVideo.thumbnail_url,
          comments: []
        };

        const playlist = dbVideos.map(v => {
          const vCh = v.channels || {};
          const vMedia = (v.video_media && v.video_media.length > 0) ? v.video_media[0] : {};
          return {
            id: v.id,
            title: v.title,
            views: v.views_count,
            time: 'Recently',
            thumbnail: v.thumbnail_url || null,
            channel: {
              name: vCh.channel_name || 'ConnectSphere',
              avatar: vCh.banner_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
            },
            videoUrl: vMedia.manifest_url || v.video_url,
            resolution: vMedia.resolution || '1080p'
          };
        });

        window.csStore.set('videoTheater.currentStream', currentStream);
        window.csStore.set('videoTheater.playlist', playlist);
        window.csStore.publish('video:stream_updated', currentStream);
      }
    } catch (err) {
      console.warn('[VideoTheaterService] fetchVideos fallback error:', err);
    }
  },

  getCurrentStream() {
    return window.csStore.get('videoTheater.currentStream');
  },

  async toggleSubscribe() {
    const stream = this.getCurrentStream();
    if (!stream) return false;

    stream.isSubscribed = !stream.isSubscribed;
    stream.subscribers += stream.isSubscribed ? 1 : -1;
    window.csStore.set('videoTheater.currentStream', { ...stream });
    window.csStore.publish('video:subscribed', { isSubscribed: stream.isSubscribed, count: stream.subscribers });

    if (typeof showToast === 'function') {
      showToast(stream.isSubscribed ? `Subscribed to ${stream.creator}'s channel! 🔔` : `Unsubscribed from ${stream.creator}`);
    }

    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id && stream.id) {
        if (stream.isSubscribed) {
          await client.from('channel_subscribers').insert({ channel_id: stream.id, user_id: user.supabase_id });
        } else {
          await client.from('channel_subscribers').delete().match({ channel_id: stream.id, user_id: user.supabase_id });
        }
      }
    } catch (err) {
      console.warn('[VideoTheaterService] toggleSubscribe sync error:', err);
    }

    return stream.isSubscribed;
  },

  async toggleLike() {
    const stream = this.getCurrentStream();
    if (!stream) return false;

    stream.isLiked = !stream.isLiked;
    stream.likes += stream.isLiked ? 1 : -1;
    window.csStore.set('videoTheater.currentStream', { ...stream });
    window.csStore.publish('video:liked', { isLiked: stream.isLiked, likes: stream.likes });

    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id && stream.id) {
        if (stream.isLiked) {
          await client.from('video_likes').insert({ video_id: stream.id, user_id: user.supabase_id });
        } else {
          await client.from('video_likes').delete().match({ video_id: stream.id, user_id: user.supabase_id });
        }
      }
    } catch (err) {
      console.warn('[VideoTheaterService] toggleLike sync error:', err);
    }

    return stream.isLiked;
  },

  async addComment(text) {
    if (!text || !text.trim()) return null;
    const stream = this.getCurrentStream();
    if (!stream) return null;

    const user = window.csStore.get('currentUser');
    const newComment = {
      user: user.name || user.full_name,
      text: text.trim()
    };

    stream.comments = stream.comments || [];
    stream.comments.push(newComment);
    window.csStore.set('videoTheater.currentStream', { ...stream });
    window.csStore.publish('video:commented', newComment);

    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id && stream.id) {
        await client.from('video_comments').insert({
          video_id: stream.id,
          user_id: user.supabase_id,
          comment_text: text.trim()
        });
      }
    } catch (err) {
      console.warn('[VideoTheaterService] addComment sync error:', err);
    }

    return newComment;
  }
};
if (typeof window !== 'undefined') {
  window.VideoTheaterService = VideoTheaterService;
  window.VideoService = VideoTheaterService;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoTheaterService;
}
