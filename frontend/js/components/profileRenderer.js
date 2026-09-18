/**
 * ConnectSphere Profile Renderer
 * Binds public.profiles data to the profile.html UI.
 */
class ProfileRenderer {
  constructor() {
    this.client = window.SupabaseClient ? window.SupabaseClient.getClient() : (window.csSupabase || null);
    this.targetUserId = null;
    this.isOwnProfile = false;
  }

  async init() {
    if (!this.client) {
      console.warn('[ProfileRenderer] Supabase client not available.');
      return;
    }
    
    const params = new URLSearchParams(window.location.search);
    const userIdParam = params.get('id');
    const currentUser = window.csStore?.get('currentUser');

    if (userIdParam) {
      this.targetUserId = userIdParam;
      this.isOwnProfile = currentUser && currentUser.id === this.targetUserId;
    } else if (currentUser && currentUser.id) {
      this.targetUserId = currentUser.id;
      this.isOwnProfile = true;
    } else {
      window.location.href = 'login.html';
      return;
    }

    await this.loadProfileData();
    this.bindEvents();
  }

  async loadProfileData() {
    try {
      // Fetch Profile
      const { data: profile, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', this.targetUserId)
        .single();
        
      console.log('[ProfileRenderer] Fetched profile:', profile, 'Error:', error);
      let profileObj = profile;
      if (error || !profile) {
        console.warn('[ProfileRenderer] Profile not found or error. Trying fallback...');
        const currentUser = window.csStore?.get('currentUser');
        if (this.targetUserId === currentUser?.id) {
          profileObj = {
            id: currentUser.id,
            full_name: currentUser.name,
            username: currentUser.username,
            avatar_url: currentUser.avatar,
            bio: currentUser.bio || 'New ConnectSphere User',
            location: currentUser.location || 'Unknown',
            is_verified: currentUser.isVerified || false
          };
        } else {
          return;
        }
      }
      
      const p = profileObj; // alias for the code below

      // Populate basic info
      const nameEl = document.getElementById('profile-name');
      const usernameEl = document.getElementById('profile-username');
      const bioEl = document.getElementById('profile-bio');
      const locationEl = document.getElementById('profile-location');
      const avatarEl = document.getElementById('profile-avatar');
      const coverEl = document.getElementById('profile-cover');

      if (nameEl) nameEl.innerHTML = `${p.full_name} ${p.is_verified ? '<i class="fa-solid fa-circle-check badge-verified"></i>' : ''}`;
      if (usernameEl) usernameEl.textContent = `@${p.username}`;
      if (bioEl) bioEl.textContent = p.bio || 'No bio provided.';
      if (locationEl) locationEl.innerHTML = `<i class="fa-solid fa-location-dot" style="color: var(--primary);"></i> ${p.location || 'Unknown'}`;
      if (avatarEl) avatarEl.src = p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';

      // Setup actions block
      const actionsContainer = document.getElementById('profile-actions-container');
      if (actionsContainer) {
        actionsContainer.innerHTML = '';
        if (this.isOwnProfile) {
          actionsContainer.innerHTML = `<button class="btn-edit-profile" id="btn-edit-my-profile"><i class="fa-solid fa-user-pen"></i> Edit Profile</button>`;
          const editBtn = document.getElementById('btn-edit-my-profile');
          if (editBtn && typeof window.initProfileModal === 'function') {
            editBtn.addEventListener('click', () => {
              if (window.openProfileEditModal) {
                 window.openProfileEditModal();
              } else {
              }
            });
          }
        } else {
          // Check follow & block status
          let isFollowing = false;
          let isBlocked = false;
          if (window.ProfileService) {
             isFollowing = await window.ProfileService.isFollowing(this.targetUserId);
             const blockedList = await window.ProfileService.getBlockedUsers();
             isBlocked = blockedList.includes(this.targetUserId);
          } else {
             const currentUser = window.csStore?.get('currentUser');
             if (currentUser) {
               const { data: followRel } = await this.client.from('followers')
                 .select('*').eq('follower_id', currentUser.id).eq('following_id', this.targetUserId).single();
               isFollowing = !!followRel;
               
               const { data: blockRel } = await this.client.from('blocks')
                 .select('*').eq('blocker_id', currentUser.id).eq('blocked_id', this.targetUserId).single();
               isBlocked = !!blockRel;
             }
          }
          
          actionsContainer.innerHTML = `
            <button class="${isFollowing ? 'btn-following' : 'btn-follow'}" id="btn-toggle-follow">
              ${isFollowing ? 'Following' : '<i class="fa-solid fa-user-plus"></i> Follow'}
            </button>
            <button class="btn-message" id="btn-message-user" style="background: var(--surface); color: var(--text-primary); padding: 8px 16px; border-radius: 20px; font-weight: 600; border: 1px solid var(--border); cursor: pointer; transition: 0.2s;">
              <i class="fa-regular fa-envelope"></i> Message
            </button>
            <button class="${isBlocked ? 'btn-unblock' : 'btn-block'}" id="btn-toggle-block" style="background: ${isBlocked ? 'var(--surface)' : 'rgba(255,59,48,0.1)'}; color: var(--danger, #ff3b30); padding: 8px 16px; border-radius: 20px; font-weight: 600; border: 1px solid var(--danger, #ff3b30); cursor: pointer; transition: 0.2s;">
              ${isBlocked ? 'Unblock' : '<i class="fa-solid fa-ban"></i> Block'}
            </button>
          `;
          
          const followBtn = document.getElementById('btn-toggle-follow');
          if (followBtn) {
            followBtn.addEventListener('click', async () => {
              if (!window.ProfileService) return;
              followBtn.disabled = true;
              let success = false;
              if (followBtn.classList.contains('btn-following')) {
                success = await window.ProfileService.unfollowUser(this.targetUserId);
                if (success) {
                   followBtn.classList.remove('btn-following');
                   followBtn.classList.add('btn-follow');
                   followBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Follow';
                }
              } else {
                success = await window.ProfileService.followUser(this.targetUserId);
                if (success) {
                   followBtn.classList.remove('btn-follow');
                   followBtn.classList.add('btn-following');
                   followBtn.innerHTML = 'Following';
                }
              }
              followBtn.disabled = false;
              this.loadStats(); // refresh stats
            });
          }

          const messageBtn = document.getElementById('btn-message-user');
          if (messageBtn) {
             messageBtn.addEventListener('click', async () => {
                if (window.ChatService && this.targetUserId) {
                   messageBtn.disabled = true;
                   messageBtn.innerHTML = 'Starting...';
                   const convo = await window.ChatService.startOrGetConversation(this.targetUserId);
                   if (convo && convo.id) {
                      window.location.href = `messages?convo=${convo.id}`;
                   } else {
                      messageBtn.innerHTML = 'Error';
                      setTimeout(() => { messageBtn.disabled = false; messageBtn.innerHTML = '<i class="fa-regular fa-envelope"></i> Message'; }, 2000);
                   }
                } else {
                   window.location.href = `messages.html`;
                }
             });
          }

          const blockBtn = document.getElementById('btn-toggle-block');
          if (blockBtn) {
            blockBtn.addEventListener('click', async () => {
              if (!window.ProfileService) return;
              blockBtn.disabled = true;
              let success = false;
              if (blockBtn.classList.contains('btn-unblock')) {
                success = await window.ProfileService.unblockUser(this.targetUserId);
                if (success) {
                  blockBtn.classList.remove('btn-unblock');
                  blockBtn.classList.add('btn-block');
                  blockBtn.innerHTML = '<i class="fa-solid fa-ban"></i> Block';
                  blockBtn.style.background = 'rgba(255,59,48,0.1)';
                }
              } else {
                success = await window.ProfileService.blockUser(this.targetUserId);
                if (success) {
                  blockBtn.classList.remove('btn-block');
                  blockBtn.classList.add('btn-unblock');
                  blockBtn.innerHTML = 'Unblock';
                  blockBtn.style.background = 'var(--surface)';
                  // Automatically unfollow if blocked
                  const fBtn = document.getElementById('btn-toggle-follow');
                  if (fBtn && fBtn.classList.contains('btn-following')) {
                     await window.ProfileService.unfollowUser(this.targetUserId);
                     fBtn.classList.remove('btn-following');
                     fBtn.classList.add('btn-follow');
                     fBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Follow';
                  }
                }
              }
              blockBtn.disabled = false;
              this.loadStats();
            });
          }
        }
      }

      this.loadStats();
      await this.loadUserPosts();

    } catch (err) {
      console.error('[ProfileRenderer] loadProfileData error:', err);
    }
  }
  
  async loadStats() {
    try {
       // Post count
       const { count: postCount } = await this.client.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', this.targetUserId);
       // Followers count
       const { count: followersCount } = await this.client.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', this.targetUserId);
       // Following count
       const { count: followingCount } = await this.client.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', this.targetUserId);
       
       const postCountEl = document.getElementById('stat-post-count');
       const followersCountEl = document.getElementById('stat-followers-count');
       const followingCountEl = document.getElementById('stat-following-count');
       
       if (postCountEl) postCountEl.textContent = postCount || 0;
       if (followersCountEl) followersCountEl.textContent = followersCount || 0;
       if (followingCountEl) followingCountEl.textContent = followingCount || 0;
       
    } catch(err) {
      console.error('[ProfileRenderer] loadStats error:', err);
    }
  }

  async loadUserPosts() {
    const container = document.getElementById('profile-posts-container');
    if (!container || !this.client) return;

    try {
      const { data: posts, error } = await this.client
        .from('posts')
        .select(`
          id, user_id, caption, media_type, category, location, tags,
          likes_count, comments_count, reposts_count, bookmarks_count, views_count, created_at,
          profiles!posts_user_id_fkey ( id, full_name, username, avatar_url, is_verified ),
          post_media ( id, media_url, media_type, aspect_ratio ),
          post_polls ( id, question, total_votes, post_poll_options ( id, option_text, votes_count ) ),
          post_comments ( id, text, created_at, profiles!post_comments_user_id_fkey ( full_name, username, avatar_url, is_verified ) ),
          post_likes ( user_id )
        `)
        .eq('user_id', this.targetUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('[ProfileRenderer] loadUserPosts error:', error);
        container.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-xl); border: 1px solid var(--border-color);">
            <p>Unable to load posts at this time.</p>
          </div>
        `;
        return;
      }

      if (!posts || posts.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 48px 24px; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px solid var(--border-color);">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--bg-surface-elevated); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--text-muted); font-size: 22px;">
              <i class="fa-solid fa-pen-to-square"></i>
            </div>
            <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">No posts yet</h4>
            <p style="font-size: 0.88rem; color: var(--text-muted); max-width: 320px; margin: 0 auto;">
              ${this.isOwnProfile ? 'Share your thoughts, photos, or polls with your followers!' : 'This user hasn\'t shared any posts yet.'}
            </p>
          </div>
        `;
        return;
      }

      const currentUser = window.csStore?.get('currentUser');

      container.innerHTML = posts.map(p => {
        const author = p.profiles || {};
        const media = (p.post_media && p.post_media[0]) || null;
        const isLiked = (p.post_likes || []).some(l => l.user_id === currentUser?.id || l.user_id === currentUser?.supabase_id);
        const timeAgo = (typeof ConnectSphereSecurity !== 'undefined' && ConnectSphereSecurity.formatTimeAgo)
          ? ConnectSphereSecurity.formatTimeAgo(p.created_at)
          : 'Recently';
        const formattedCaption = (typeof ConnectSphereSecurity !== 'undefined' && ConnectSphereSecurity.formatCaption)
          ? ConnectSphereSecurity.formatCaption(p.caption)
          : (p.caption || '');

        let mediaHTML = '';
        if (p.media_type === 'image' && media?.media_url) {
          mediaHTML = `
            <div style="border-radius: var(--radius-lg); overflow: hidden; margin: 12px 0;">
              <img src="${media.media_url}" style="width: 100%; max-height: 420px; object-fit: cover; display: block;" alt="Media">
            </div>
          `;
        }

        return `
          <article class="post-card" id="post-card-${p.id}" data-post-id="${p.id}" style="margin-bottom: 20px;">
            <div class="post-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div class="post-user-details" style="display: flex; align-items: center; gap: 12px;">
                <img src="${author.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="avatar" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color);" alt="${author.full_name || 'User'}">
                <div>
                  <div class="post-user-name" style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">
                    ${author.full_name || 'ConnectSphere User'}
                    ${author.is_verified ? '<i class="fa-solid fa-circle-check badge-verified" style="color: var(--primary); font-size: 13px; margin-left: 4px;"></i>' : ''}
                  </div>
                  <div class="post-time" style="font-size: 0.78rem; color: var(--text-muted);">${timeAgo}</div>
                </div>
              </div>
            </div>

            <div class="post-caption" style="font-size: 0.92rem; color: var(--text-main); line-height: 1.5; margin-bottom: 12px;">
              ${formattedCaption}
            </div>

            ${mediaHTML}

            <div class="post-actions" style="display: flex; gap: 16px; border-top: 1px solid var(--border-color); padding-top: 12px;">
              <button type="button" class="action-btn btn-like ${isLiked ? 'liked' : ''}" data-post-id="${p.id}">
                <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart" style="${isLiked ? 'color: var(--danger, #ef4444);' : ''}"></i>
                <span class="like-count">${p.likes_count || 0}</span>
              </button>
              <button type="button" class="action-btn btn-comment-toggle" data-post-id="${p.id}">
                <i class="fa-regular fa-comment"></i>
                <span class="comment-count">${p.comments_count || 0}</span>
              </button>
              <button type="button" class="action-btn btn-share" data-post-id="${p.id}">
                <i class="fa-regular fa-paper-plane"></i>
              </button>
              <button type="button" class="action-btn btn-bookmark-post" data-post-id="${p.id}" style="margin-left: auto;">
                <i class="fa-regular fa-bookmark"></i>
              </button>
            </div>
          </article>
        `;
      }).join('');

    } catch (err) {
      console.error('[ProfileRenderer] loadUserPosts error:', err);
    }
  }

  bindEvents() {
    const container = document.getElementById('profile-posts-container');
    if (container) {
      container.addEventListener('click', async (e) => {
        const likeBtn = e.target.closest('.btn-like');
        if (likeBtn && window.PostService) {
          const postId = likeBtn.getAttribute('data-post-id');
          if (postId) {
            const isLiked = likeBtn.classList.contains('liked');
            const icon = likeBtn.querySelector('i');
            const countSpan = likeBtn.querySelector('.like-count');
            let count = parseInt(countSpan?.textContent || '0', 10);

            if (isLiked) {
              likeBtn.classList.remove('liked');
              if (icon) { icon.className = 'fa-regular fa-heart'; icon.style.color = ''; }
              if (countSpan) countSpan.textContent = Math.max(0, count - 1);
            } else {
              likeBtn.classList.add('liked');
              if (icon) { icon.className = 'fa-solid fa-heart'; icon.style.color = 'var(--danger, #ef4444)'; }
              if (countSpan) countSpan.textContent = count + 1;
            }
            await window.PostService.toggleLike(postId);
          }
        }
      });
    }
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.ProfileRenderer = new ProfileRenderer();
}
