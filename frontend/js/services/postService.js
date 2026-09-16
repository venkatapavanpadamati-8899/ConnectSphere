/**
 * ConnectSphere Post Service
 * Supabase-first persistence layer with synchronized in-memory reactive store.
 * Manages post creation, likes, comments, poll votes, reposts, bookmarks, and feed filtering.
 */

const PostService = {
  isInitialized: false,

  async init() {
    console.log('[PostService] init called. isInitialized:', this.isInitialized);
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Wait for auth session to be available (Supabase restores from localStorage asynchronously)
    const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
    console.log('[PostService] init client:', !!client, 'isConfigured:', window.SupabaseClient ? window.SupabaseClient.isConfigured() : false);
    if (client && window.SupabaseClient.isConfigured()) {
      // Wait up to 3 seconds for session
      for (let i = 0; i < 6; i++) {
        const { data: { session } } = await client.auth.getSession().catch(() => ({ data: { session: null } }));
        if (session) break;
        await new Promise(r => setTimeout(r, 500));
      }
    }

    await this.fetchPostsFromSupabase();
    if (window.ProfileService) {
       const followingIds = await window.ProfileService.getFollowingIds();
       window.csStore?.set('followingIds', followingIds);
    }
  },

  async fetchPostsFromSupabase() {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (!client || !window.SupabaseClient.isConfigured()) return;
      let blockedIds = [];
      if (window.ProfileService) {
        const blocked = await window.ProfileService.getBlockedUsers();
        const blockedBy = await window.ProfileService.getBlockedByUsers();
        blockedIds = [...new Set([...blocked, ...blockedBy])];
      }

      let query = client
        .from('posts')
        .select(`
          id, user_id, caption, media_type, category, location, tags,
          likes_count, comments_count, reposts_count, bookmarks_count, views_count, created_at,
          profiles!posts_user_id_fkey ( id, full_name, username, avatar_url, is_verified ),
          post_media ( id, media_url, media_type, aspect_ratio ),
          post_polls ( id, question, total_votes, post_poll_options ( id, option_text, votes_count ) ),
          post_comments ( id, text, created_at, profiles!post_comments_user_id_fkey ( full_name, username, avatar_url, is_verified ) ),
          post_likes ( user_id )
        `);
        
      if (blockedIds.length > 0) {
        query = query.not('user_id', 'in', `(${blockedIds.join(',')})`);
      }

      const { data: dbPosts, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('[PostService] Supabase fetch error:', error.message);
        return;
      }

      if (dbPosts && dbPosts.length > 0) {
        const currentUser = window.csStore?.get('currentUser');
        const formattedPosts = dbPosts.map(p => {
          const author = p.profiles || {};
          const media = (p.post_media && p.post_media[0]) || null;
          const poll = (p.post_polls && p.post_polls[0]) || null;

          const postObj = {
            id: p.id,
            author: {
              id: p.user_id,
              name: author.full_name || 'ConnectSphere Creator',
              handle: author.username ? (author.username.startsWith('@') ? author.username : '@' + author.username) : '@creator',
              avatar: author.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
              isVerified: author.is_verified || false,
              badge: author.is_verified ? 'Verified' : 'Creator'
            },
            createdAt: p.created_at,
            category: p.category || 'forYou',
            location: p.location || '',
            caption: p.caption || '',
            tags: p.tags || [],
            mediaType: p.media_type || 'text',
            likes: p.likes_count || 0,
            isLiked: (p.post_likes || []).some(l => l.user_id === currentUser?.id || l.user_id === currentUser?.supabase_id),
            reposts: p.reposts_count || 0,
            isReposted: false,
            bookmarks: p.bookmarks_count || 0,
            isBookmarked: false,
            views: p.views_count || 1,
            commentsCount: p.comments_count || 0,
            comments: (p.post_comments || []).map(c => ({
              id: c.id,
              author: c.profiles?.full_name || 'Creator',
              handle: c.profiles?.username || '',
              avatar: c.profiles?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
              text: c.text,
              createdAt: c.created_at
            })).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          };

          if (postObj.mediaType === 'image' && media) {
            postObj.mediaImage = media.media_url;
          } else if (postObj.mediaType === 'video' && media) {
            postObj.videoData = {
              src: media.media_url,
              poster: author.avatar_url,
              duration: '0:30'
            };
          } else if ((postObj.mediaType === 'voice' || postObj.mediaType === 'audio') && media) {
            postObj.audioData = {
              src: media.media_url
            };
          } else if (postObj.mediaType === 'poll' && poll) {
            const total = poll.total_votes || 0;
            postObj.pollData = {
              id: poll.id,
              question: poll.question,
              totalVotes: total,
              hasVoted: false,
              userChoice: null,
              options: (poll.post_poll_options || []).map((o, idx) => ({
                id: o.id || `opt_${idx + 1}`,
                text: o.option_text,
                votes: o.votes_count || 0,
                percent: total > 0 ? Math.round(((o.votes_count || 0) / total) * 100) : 0
              }))
            };
          }

          return postObj;
        });

        window.csStore.set('posts', formattedPosts);
        window.csStore.publish('posts:loaded', formattedPosts);
        
        // Calculate trending topics from tags
        const tagCounts = {};
        formattedPosts.forEach(p => {
            (p.tags || []).forEach(t => {
                const lower = t.toLowerCase();
                tagCounts[lower] = (tagCounts[lower] || 0) + 1;
            });
        });
        const trending = Object.keys(tagCounts).map(tag => ({
            id: tag,
            tag: '#' + tag,
            category: 'Trending',
            count: tagCounts[tag]
        })).sort((a, b) => b.count - a.count).slice(0, 10);
        window.csStore.set('trendingTopics', trending);
        window.csStore.publish('trending:updated', trending);
      }
    } catch (err) {
      console.warn('[PostService] Fetch error fallback to local cache:', err);
    }
  },

  getPosts(category = 'forYou', filterTag = null) {
    let posts = window.csStore.get('posts') || [];
    const currentUser = window.csStore.get('currentUser');
    const followingIds = window.csStore.get('followingIds') || [];

    if (category === 'following') {
      posts = posts.filter(p => p.author.id === currentUser?.id || followingIds.includes(p.author.id));
    } else if (category && category !== 'forYou' && category !== 'latest' && category !== 'global') {
      posts = posts.filter(p => p.category === category || (category === 'communities' && p.category === 'communities'));
    }
    if (filterTag) {
      const cleanTag = filterTag.replace(/^#/, '').toLowerCase();
      posts = posts.filter(p => (p.tags || []).some(t => t.toLowerCase() === cleanTag));
    }
    return posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async createPost({ text, caption, mediaType = 'text', mediaData = null, pollData = null, location = null, tags = [] }) {
    const user = window.csStore.get('currentUser');
    if (!user || !user.supabase_id) {
      return null;
    }
    const content = text || caption || '';
    const assignedTags = tags.length ? tags : (content.match(/#\w+/g) || []).map(t => t.slice(1));
    const activeTab = window.csStore.get('activeTab') || 'forYou';

    const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
    if (!client || !window.SupabaseClient.isConfigured()) {
      return null;
    }

    let insertedPost = null;
    try {
      const { data, error } = await client
        .from('posts')
        .insert({
          user_id: user.supabase_id,
          caption: content,
          media_type: mediaType,
          category: activeTab,
          location: location || null,
          tags: assignedTags
        })
        .select()
        .single();

      if (error) throw error;
      insertedPost = data;

      // Handle media insertion
      if ((mediaType === 'image' || mediaType === 'video') && mediaData) {
        let mediaUrl = '';
        if (typeof mediaData === 'string' && mediaData.startsWith('data:')) {
          // Convert dataURL to Blob
          const arr = mediaData.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while(n--){
              u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], {type:mime});
          const fileExt = mime.split('/')[1] || (mediaType === 'video' ? 'mp4' : 'jpg');
          const fileName = `${user.supabase_id}_${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadErr } = await client.storage.from('posts').upload(fileName, blob, { contentType: mime });
          if (!uploadErr && uploadData) {
             const { data: publicUrlData } = client.storage.from('posts').getPublicUrl(uploadData.path);
             mediaUrl = publicUrlData.publicUrl;
          }
        } else {
          mediaUrl = typeof mediaData === 'string' ? mediaData : (mediaData.url || mediaData.src);
        }

        if (mediaUrl) {
          await client.from('post_media').insert({
            post_id: insertedPost.id,
            media_type: mediaType,
            media_url: mediaUrl
          });
        }
      }
      // Handle poll insertion
      if (mediaType === 'poll' && pollData) {
        const { data: dbPoll, error: pollErr } = await client
          .from('post_polls')
          .insert({
            post_id: insertedPost.id,
            question: pollData.question || 'Consensus Poll:'
          })
          .select()
          .single();

        if (dbPoll && pollData.options && !pollErr) {
          const optRows = pollData.options.map(opt => ({
            poll_id: dbPoll.id,
            option_text: opt
          }));
          await client.from('post_poll_options').insert(optRows);
        }
      }
    } catch (err) {
      return null; // Don't update state on failure
    }

    // Now construct the local state object using the real Supabase UUID
    const newPost = {
      id: insertedPost.id,
      author: {
        id: user.id,
        name: user.name,
        handle: user.username,
        avatar: user.avatar,
        isVerified: user.isVerified,
        badge: user.role
      },
      createdAt: insertedPost.created_at || new Date().toISOString(),
      category: activeTab,
      location: location || '',
      caption: content,
      tags: assignedTags,
      mediaType,
      likes: 0,
      isLiked: false,
      reposts: 0,
      isReposted: false,
      bookmarks: 0,
      isBookmarked: false,
      views: 1,
      commentsCount: 0,
      comments: []
    };

    if (mediaType === 'image' && mediaData) {
      newPost.mediaImage = typeof mediaData === 'string' ? mediaData : (mediaData.url || mediaData.src);
    } else if (mediaType === 'video' && mediaData) {
      newPost.videoData = {
        src: mediaData.src || mediaData.url || mediaData,
        poster: mediaData.poster || user.avatar,
        duration: mediaData.duration || '0:30'
      };
    } else if ((mediaType === 'voice' || mediaType === 'audio') && mediaData) {
      newPost.audioData = {
        src: mediaData.src || mediaData.url || mediaData
      };
    } else if (mediaType === 'poll' && pollData) {
      newPost.pollData = {
        id: `poll_${insertedPost.id}`, // Just for UI until refetch
        question: pollData.question || 'Consensus Poll:',
        totalVotes: 0,
        hasVoted: false,
        userChoice: null,
        options: (pollData.options || []).map((opt, i) => ({
          id: `opt_${i + 1}`,
          text: opt,
          votes: 0,
          percent: 0
        }))
      };
    }

    // Update local store now that we have the real ID
    const posts = window.csStore.get('posts') || [];
    window.csStore.set('posts', [newPost, ...posts]);
    window.csStore.publish('post:created', newPost);

    return newPost;
  },

  async toggleLike(postId) {
    const posts = window.csStore.get('posts') || [];
    const post = posts.find(p => p.id === postId);
    if (!post) return null;

    post.isLiked = !post.isLiked;
    post.likes += post.isLiked ? 1 : -1;
    if (post.likes < 0) post.likes = 0;

    window.csStore.set('posts', [...posts]);
    window.csStore.publish('post:liked', { postId, isLiked: post.isLiked, likes: post.likes });

    // Supabase persistence
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        if (post.isLiked) {
          await client.from('post_likes').insert({ post_id: postId, user_id: user.supabase_id });
        } else {
          await client.from('post_likes').delete().match({ post_id: postId, user_id: user.supabase_id });
        }
      }
    } catch (err) {
      console.warn('[PostService] toggleLike sync error:', err);
    }

    return post;
  },

  async toggleBookmark(postId) {
    const posts = window.csStore.get('posts') || [];
    const post = posts.find(p => p.id === postId);
    if (!post) return null;

    post.isBookmarked = !post.isBookmarked;
    post.bookmarks += post.isBookmarked ? 1 : -1;
    if (post.bookmarks < 0) post.bookmarks = 0;

    window.csStore.set('posts', [...posts]);
    window.csStore.publish('post:bookmarked', { postId, isBookmarked: post.isBookmarked, bookmarks: post.bookmarks });

    // Supabase persistence
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        if (post.isBookmarked) {
          await client.from('post_bookmarks').insert({ post_id: postId, user_id: user.supabase_id });
        } else {
          await client.from('post_bookmarks').delete().match({ post_id: postId, user_id: user.supabase_id });
        }
      }
    } catch (err) {
      console.warn('[PostService] toggleBookmark sync error:', err);
    }

    return post;
  },

  async toggleRepost(postId) {
    const posts = window.csStore.get('posts') || [];
    const post = posts.find(p => p.id === postId);
    if (!post) return null;

    post.isReposted = !post.isReposted;
    post.reposts += post.isReposted ? 1 : -1;
    if (post.reposts < 0) post.reposts = 0;

    window.csStore.set('posts', [...posts]);
    window.csStore.publish('post:reposted', { postId, isReposted: post.isReposted, reposts: post.reposts });

    // Supabase persistence
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        if (post.isReposted) {
          await client.from('post_reposts').insert({ post_id: postId, user_id: user.supabase_id });
        } else {
          await client.from('post_reposts').delete().match({ post_id: postId, user_id: user.supabase_id });
        }
      }
    } catch (err) {
      console.warn('[PostService] toggleRepost sync error:', err);
    }

    return post;
  },

  async votePoll(postId, optionId) {
    const posts = window.csStore.get('posts') || [];
    const post = posts.find(p => p.id === postId);
    if (!post || !post.pollData || post.pollData.hasVoted) return null;

    const opt = post.pollData.options.find(o => o.id === optionId);
    if (!opt) return null;

    opt.votes += 1;
    post.pollData.totalVotes += 1;
    post.pollData.hasVoted = true;
    post.pollData.userChoice = optionId;

    post.pollData.options.forEach(o => {
      o.percent = Math.round((o.votes / post.pollData.totalVotes) * 100);
    });

    window.csStore.set('posts', [...posts]);
    window.csStore.publish('post:polled', { postId, pollData: post.pollData });

    // Supabase persistence
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        await client.from('post_poll_votes').insert({
          poll_id: post.pollData.id,
          option_id: optionId,
          user_id: user.supabase_id
        });
      }
    } catch (err) {
      console.warn('[PostService] votePoll sync error:', err);
    }

    return post.pollData;
  },

  async addComment(postId, text) {
    if (!text || !text.trim()) return null;
    const posts = window.csStore.get('posts') || [];
    const post = posts.find(p => p.id === postId);
    if (!post) return null;

    const user = window.csStore.get('currentUser');
    const newComment = {
      id: (typeof ConnectSphereSecurity !== 'undefined' ? ConnectSphereSecurity.generateId('comment') : `cmt_${Date.now()}`),
      author: user.name,
      handle: user.username,
      avatar: user.avatar,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
      replies: []
    };

    if (!post.comments) post.comments = [];
    post.comments.push(newComment);
    post.commentsCount = (post.commentsCount || 0) + 1;

    window.csStore.set('posts', [...posts]);
    window.csStore.publish('post:commented', { postId, comment: newComment });

    // Supabase persistence
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        await client.from('post_comments').insert({
          post_id: postId,
          user_id: user.supabase_id,
          text: text.trim()
        });
      }
    } catch (err) {
      console.warn('[PostService] addComment sync error:', err);
    }

    return newComment;
  },

  async deletePost(postId) {
    const posts = window.csStore.get('posts') || [];
    const filtered = posts.filter(p => p.id !== postId);
    window.csStore.set('posts', filtered);
    window.csStore.publish('post:deleted', { postId });

    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (client && window.SupabaseClient.isConfigured()) {
        await client.from('posts').delete().match({ id: postId });
      }
    } catch (err) {
      console.warn('[PostService] deletePost sync error:', err);
    }

    return true;
  },

  async editPost(postId, newText) {
    const posts = window.csStore.get('posts') || [];
    const post = posts.find(p => p.id === postId);
    if (!post) return null;

    post.caption = newText;
    post.isEdited = true;
    window.csStore.set('posts', [...posts]);
    window.csStore.publish('post:updated', post);

    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (client && window.SupabaseClient.isConfigured()) {
        await client.from('posts').update({ caption: newText, updated_at: new Date().toISOString() }).match({ id: postId });
      }
    } catch (err) {
      console.warn('[PostService] editPost sync error:', err);
    }

    return post;
  }
};


if (typeof module !== 'undefined' && module.exports) {
  module.exports = PostService;
}

if (typeof window !== 'undefined') {
  window.PostService = PostService;
}
