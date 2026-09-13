/**
 * ConnectSphere Story Service
 * Supabase-first 24-hour temporary media architecture.
 * Manages 24-hour expiration, multi-type creation (photo, video, text), reactions, views, and replies.
 */

const StoryService = {
  isInitialized: false,

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    await this.fetchStoriesFromSupabase();
  },

  async fetchStoriesFromSupabase() {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (!client || !window.SupabaseClient.isConfigured()) return;

      const nowIso = new Date().toISOString();
      const { data: dbStories, error } = await client
        .from('stories')
        .select(`
          id, user_id, expires_at, created_at,
          profiles!stories_user_id_fkey ( id, full_name, username, avatar_url ),
          story_media ( id, media_url, type, text_content, bg_gradient, caption, duration_seconds ),
          story_views ( story_id, slide_id, user_id )
        `)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[StoryService] Supabase story fetch error:', error.message);
        return;
      }

      if (dbStories && dbStories.length > 0) {
        const currentUser = window.csStore?.get('currentUser');
        const grouped = {};

        dbStories.forEach(st => {
          const uId = st.user_id;
          const prof = st.profiles || {};
          const isSelf = currentUser && (currentUser.supabase_id === uId || currentUser.id === uId);

          if (!grouped[uId]) {
            grouped[uId] = {
              id: `story_${uId}`,
              isSelf: !!isSelf,
              creator: prof.full_name || 'Creator',
              avatar: prof.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
              gradient: 'ring-gradient-cyan',
              hasUnseen: false,
              slides: []
            };
          }

          const media = (st.story_media && st.story_media[0]) || null;
          const slide = {
            id: media?.id || st.id,
            storyId: st.id,
            type: media ? media.type : 'image',
            mediaUrl: media ? media.media_url : '',
            text: media?.text_content || '',
            bgGradient: media?.bg_gradient || 'linear-gradient(135deg, #7357FF, #00D2FF)',
            timestamp: st.created_at,
            expiresAt: st.expires_at,
            views: (st.story_views ? st.story_views.length : 0),
            seen: currentUser ? (st.story_views || []).some(v => v.user_id === currentUser.supabase_id) : false
          };

          grouped[uId].slides.push(slide);
          if (!slide.seen && !isSelf) {
            grouped[uId].hasUnseen = true;
          }
        });

        const formatted = Object.values(grouped);
        window.csStore.set('stories', formatted);
        window.csStore.publish('stories:loaded', formatted);
      }
    } catch (err) {
      console.warn('[StoryService] Fetch fallback error:', err);
    }
  },

  getStories() {
    const stories = window.csStore.get('stories') || [];
    const now = Date.now();
    // Filter out expired slides (>24 hours)
    return stories.map(story => {
      const validSlides = (story.slides || []).filter(slide => {
        if (!slide.expiresAt) return true;
        return new Date(slide.expiresAt).getTime() > now;
      });
      return {
        ...story,
        slides: validSlides,
        hasUnseen: validSlides.some(s => !s.seen)
      };
    }).filter(s => s.slides.length > 0 || s.isSelf);
  },

  async createStory({ type = 'photo', mediaUrl = '', text = '', bgGradient = '' }) {
    const stories = window.csStore.get('stories') || [];
    let selfStory = stories.find(s => s.isSelf);
    const user = window.csStore.get('currentUser');
    if (!user) return null;

    const newSlide = {
      id: (typeof ConnectSphereSecurity !== 'undefined' ? ConnectSphereSecurity.generateId('slide') : `slide_${Date.now()}`),
      type,
      mediaUrl: mediaUrl || '',
      text: text || '',
      bgGradient: bgGradient || 'linear-gradient(135deg, #7357FF, #00D2FF)',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      views: 1,
      seen: true
    };

    if (!selfStory) {
      selfStory = {
        id: 'story_self',
        isSelf: true,
        creator: user.name,
        avatar: user.avatar,
        gradient: 'ring-gradient-cyan',
        hasUnseen: false,
        slides: [newSlide]
      };
      stories.unshift(selfStory);
    } else {
      selfStory.slides.push(newSlide);
    }

    window.csStore.set('stories', [...stories]);
    window.csStore.publish('story:created', newSlide);

    // Supabase persistence
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        const { data: dbStory, error } = await client
          .from('stories')
          .insert({
            user_id: user.supabase_id,
            expires_at: newSlide.expiresAt
          })
          .select()
          .single();

        if (!error && dbStory) {
          const { data: dbSlide } = await client.from('story_media').insert({
            story_id: dbStory.id,
            media_url: mediaUrl || null,
            type: type === 'photo' ? 'image' : (type === 'text' ? 'text' : 'video'),
            text_content: text || null,
            bg_gradient: bgGradient || null,
            display_order: 1,
            duration_seconds: 5
          }).select().single();

          if (dbSlide) {
            newSlide.id = dbSlide.id;
            newSlide.storyId = dbStory.id;
          }
        }
      }
    } catch (err) {
      console.warn('[StoryService] Supabase story creation error:', err);
    }

    return newSlide;
  },

  async markSlideViewed(storyId, slideId) {
    const stories = window.csStore.get('stories') || [];
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    const slide = story.slides?.find(s => s.id === slideId);
    if (slide && !slide.seen) {
      slide.seen = true;
      slide.views = (slide.views || 0) + 1;
      story.hasUnseen = story.slides.some(s => !s.seen);
      window.csStore.set('stories', [...stories]);
      window.csStore.publish('story:viewed', { storyId, slideId });

      // Supabase view persistence
      try {
        const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
        const user = window.csStore.get('currentUser');
        if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
          await client.from('story_views').insert({
            story_id: slideId,
            viewer_id: user.supabase_id
          });
        }
      } catch (err) {
        console.warn('[StoryService] markSlideViewed sync error:', err);
      }
    }
  },

  async reactToStory(storyId, slideId, reactionEmoji) {
    const stories = window.csStore.get('stories') || [];
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    window.csStore.publish('story:reacted', { storyId, slideId, emoji: reactionEmoji });
    if (typeof showToast === 'function') {
      showToast(`Reacted ${reactionEmoji} to ${story.creator}’s transmission! ✨`);
    }

    // Chat reaction relay
    if (window.ChatService && story.creator) {
      ChatService.sendStoryReaction(story.creator, reactionEmoji);
    }

    // Supabase reaction persistence
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        await client.from('story_reactions').insert({
          story_id: slideId,
          user_id: user.supabase_id,
          reaction: reactionEmoji
        });
      }
    } catch (err) {
      console.warn('[StoryService] reactToStory sync error:', err);
    }
  }
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StoryService;
}

if (typeof window !== 'undefined') {
  window.StoryService = StoryService;
}
