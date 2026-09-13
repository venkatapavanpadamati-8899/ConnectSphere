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
        
      if (error || !profile) {
        return;
      }

      // Populate basic info
      const nameEl = document.getElementById('profile-name');
      const usernameEl = document.getElementById('profile-username');
      const bioEl = document.getElementById('profile-bio');
      const locationEl = document.getElementById('profile-location');
      const avatarEl = document.getElementById('profile-avatar');
      const coverEl = document.getElementById('profile-cover');

      if (nameEl) nameEl.innerHTML = `${profile.full_name} ${profile.is_verified ? '<i class="fa-solid fa-circle-check badge-verified"></i>' : ''}`;
      if (usernameEl) usernameEl.textContent = `@${profile.username}`;
      if (bioEl) bioEl.textContent = profile.bio || 'No bio provided.';
      if (locationEl) locationEl.innerHTML = `<i class="fa-solid fa-location-dot" style="color: var(--primary);"></i> ${profile.location || 'Unknown'}`;
      if (avatarEl) avatarEl.src = profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';

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
                   const convoId = await window.ChatService.startOrGetConversation(this.targetUserId);
                   if (convoId) {
                      window.location.href = `messages.html?convo=${convoId}`;
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

    } catch (err) {
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
    }
  }

  bindEvents() {
    // Add additional binding logic for profile posts tab etc.
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.ProfileRenderer = new ProfileRenderer();
}
