// Like Button Toggle with Toast
function initLikeButtons() {
  document.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('.btn-like');
    if (!likeBtn) return;

    const icon = likeBtn.querySelector('i');
    const countSpan = likeBtn.querySelector('.like-count');
    let currentCount = parseInt(countSpan.textContent.replace(/,/g, '')) || 0;

    const postCard = likeBtn.closest('.post-card');
    const postId = postCard ? postCard.getAttribute('data-post-id') : null;

    if (likeBtn.classList.contains('liked')) {
      likeBtn.classList.remove('liked');
      icon.className = 'fa-regular fa-heart';
      countSpan.textContent = Math.max(0, currentCount - 1).toLocaleString();
    } else {
      likeBtn.classList.add('liked');
      icon.className = 'fa-solid fa-heart';
      countSpan.textContent = (currentCount + 1).toLocaleString();
      if (typeof showToast === 'function') showToast('Liked post ❤️');
    }
    
    if (postId && window.PostService) {
      window.PostService.toggleLike(postId).catch(() => {});
    }
  });
}

// Repost Button Toggle with Live Count Increment & Toast
function initRepostButtons() {
  document.addEventListener('click', (e) => {
    const repostBtn = e.target.closest('.btn-repost-post');
    if (!repostBtn) return;

    const countSpan = repostBtn.querySelector('.repost-count');
    let currentCount = parseInt(repostBtn.getAttribute('data-reposts') || (countSpan ? countSpan.textContent : '0')) || 0;

    const postCard = repostBtn.closest('.post-card');
    const postId = postCard ? postCard.getAttribute('data-post-id') : null;

    if (repostBtn.classList.contains('reposted')) {
      repostBtn.classList.remove('reposted');
      const newCount = Math.max(0, currentCount - 1);
      repostBtn.setAttribute('data-reposts', newCount);
      if (countSpan) countSpan.textContent = newCount;
      if (typeof showToast === 'function') showToast('Removed repost from your profile ↩️');
    } else {
      repostBtn.classList.add('reposted');
      const newCount = currentCount + 1;
      repostBtn.setAttribute('data-reposts', newCount);
      if (countSpan) countSpan.textContent = newCount;
      if (typeof showToast === 'function') showToast('Reposted to your Sphere network! 🔁✨');
    }

    if (postId && window.PostService) {
      window.PostService.toggleRepost(postId).catch(() => {});
    }
  });
}

// Comments Toggle and Post Feature
function initComments() {
  document.addEventListener('click', (e) => {
    const commentBtn = e.target.closest('.btn-comment-toggle');
    if (!commentBtn) return;

    const postCard = commentBtn.closest('.post-card');
    const commentSection = postCard ? postCard.querySelector('.comment-section') : null;
    if (commentSection) {
      commentSection.classList.toggle('active');
    }
  });

  document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('comment-input')) {
      const input = e.target;
      const text = input.value.trim();
      if (!text) return;

      const commentSection = input.closest('.comment-section');
      const postCard = input.closest('.post-card');
      const postId = postCard ? postCard.getAttribute('data-post-id') : null;
      const commentList = commentSection ? commentSection.querySelector('.comment-list') : null;
      
      if (commentList) {
        const user = window.csStore ? window.csStore.get('currentUser') : { name: 'Alex Johnson', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', isVerified: true };
        const newComment = document.createElement('div');
        newComment.className = 'comment-item';
        newComment.innerHTML = `
          <img src="${user.avatar}" class="avatar" alt="User">
          <div class="comment-content">
            <div class="comment-author">${escapeHTML(user.name)} ${user.isVerified ? '<i class="fa-solid fa-circle-check badge-verified"></i>' : ''}</div>
            <div>${escapeHTML(text)}</div>
          </div>
        `;
        commentList.appendChild(newComment);
        input.value = '';
        if (typeof showToast === 'function') showToast('Comment added 💬');
      }
      
      if (postId && window.PostService) {
         window.PostService.addComment(postId, text).catch(() => {});
      }
    }
  });
}

// Create Post Modal Dialog Handler & Live Backend API Submission
function initCreatePostModal() {
  const modal = document.getElementById('create-post-modal');
  const openBtns = document.querySelectorAll('.btn-open-create-modal, #btn-open-create-modal, #btn-mobile-create-post');
  const closeBtn = document.getElementById('btn-close-modal');
  const submitBtn = document.getElementById('btn-submit-modal-post');
  const textarea = document.getElementById('modal-post-text');
  const photoBtn = document.getElementById('btn-modal-media-photo');
  const videoBtn = document.getElementById('btn-modal-media-video');
  const photoInput = document.getElementById('modal-photo-input');
  const previewBox = document.getElementById('modal-media-preview');
  const previewImg = document.getElementById('modal-preview-img');
  const previewVideo = document.getElementById('modal-preview-video');
  const removeMediaBtn = document.getElementById('btn-remove-modal-media');
  const spatialBtn = document.getElementById('btn-modal-media-spatial');
  let attachedModalMedia = '';
  let isSpatialTagged = false;

  openBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (modal) {
        modal.classList.add('active');
        if (textarea) setTimeout(() => textarea.focus(), 200);
      }
    });
  });

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }

  // Photo/Video Attachment in Modal
  if ((photoBtn || videoBtn) && photoInput) {
    if (photoBtn) photoBtn.addEventListener('click', () => photoInput.click());
    if (videoBtn) videoBtn.addEventListener('click', () => photoInput.click());

    photoInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          attachedModalMedia = evt.target.result;
          const isVideo = file.type.startsWith('video/');
          if (previewBox) {
            if (isVideo && previewVideo) {
              previewVideo.src = attachedModalMedia;
              previewVideo.style.display = 'block';
              if (previewImg) previewImg.style.display = 'none';
            } else if (previewImg) {
              previewImg.src = attachedModalMedia;
              previewImg.style.display = 'block';
              if (previewVideo) previewVideo.style.display = 'none';
            }
            previewBox.classList.add('active');
          }
          if (typeof showToast === 'function') showToast('Media attached! 📷');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (removeMediaBtn) {
    removeMediaBtn.addEventListener('click', () => {
      attachedModalMedia = '';
      if (previewBox) previewBox.classList.remove('active');
      if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }
      if (previewVideo) { previewVideo.src = ''; previewVideo.style.display = 'none'; }
      if (photoInput) photoInput.value = '';
    });
  }

  // Spatial Tag Button
  if (spatialBtn && textarea) {
    spatialBtn.addEventListener('click', () => {
      isSpatialTagged = !isSpatialTagged;
      if (isSpatialTagged) {
        spatialBtn.style.borderColor = '#00E6C3';
        spatialBtn.style.color = '#00E6C3';
        if (!textarea.value.includes('#SpatialAudio')) {
          textarea.value = (textarea.value.trim() + ' #SpatialAudio #QuantumMesh').trim();
        }
        if (typeof showToast === 'function') showToast('Tagged as Spatial 3D Audio 🎧');
      } else {
        spatialBtn.style.borderColor = '';
        spatialBtn.style.color = '';
      }
    });
  }

  if (submitBtn && textarea && modal) {
    submitBtn.addEventListener('click', async () => {
      const content = textarea.value.trim();
      if (!content && !attachedModalMedia) {
        textarea.focus();
        if (typeof showToast === 'function') showToast('Please enter your discovery before publishing! ✍️');
        return;
      }

      // Attempt live Supabase API call
      if (typeof window.PostService !== 'undefined') {
        window.PostService.createPost({ text: content, caption: content, mediaData: attachedModalMedia }).catch(() => {});
      }

      // Prepend to DOM feed
      const feedList = document.getElementById('feed-list');
      if (feedList) {
        const postCard = document.createElement('article');
        postCard.className = 'post-card';
        postCard.setAttribute('data-post-id', 'post-' + Date.now());
        if (isSpatialTagged || content.toLowerCase().includes('spatial')) {
          postCard.setAttribute('data-category', 'spatial');
        } else {
          postCard.setAttribute('data-category', 'for-you');
        }
        postCard.setAttribute('data-creator', 'Alex Johnson');
        postCard.style.animation = 'fadeInStep 0.4s ease both';

        const mediaHtml = attachedModalMedia ? `
          <div class="post-media-container interactive-media">
            ${attachedModalMedia.startsWith('data:video') ? `<video src="${attachedModalMedia}" controls style="width: 100%; max-height: 500px; border-radius: 12px;"></video>` : `<img src="${attachedModalMedia}" alt="User Media">`}
            <div class="heart-burst-overlay"><i class="fa-solid fa-heart"></i></div>
            ${isSpatialTagged ? '<div class="media-tag-badge"><i class="fa-solid fa-volume-high"></i> Spatial 3D Audio</div>' : ''}
          </div>
        ` : '';

        postCard.innerHTML = `
          <div class="post-header">
            <div class="post-user-details">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" class="avatar" alt="Alex Johnson">
              <div>
                <div class="post-user-name">
                  <span>Alex Johnson</span>
                  <i class="fa-solid fa-circle-check badge-verified"></i>
                  <span class="post-creator-tag">Verified Creator</span>
                </div>
                <div class="post-time">Just now &bull; Neural Mesh Active</div>
              </div>
            </div>
            <button class="action-btn-icon" title="Post Options"><i class="fa-solid fa-ellipsis"></i></button>
          </div>
          <div class="post-caption">${highlightHashtags(escapeHTML(content))}</div>
          ${mediaHtml}
          <div class="post-actions">
            <button class="action-btn btn-like" data-likes="1">
              <i class="fa-solid fa-heart" style="color: #FF4757;"></i>
              <span class="like-count">1</span>
            </button>
            <button class="action-btn btn-comment-toggle">
              <i class="fa-regular fa-comment"></i>
              <span class="comment-count">0</span>
            </button>
            <button class="action-btn btn-share-post" title="Share Post">
              <i class="fa-regular fa-paper-plane"></i>
              <span>0</span>
            </button>
            <button class="action-btn btn-bookmark-post" title="Bookmark">
              <i class="fa-regular fa-bookmark"></i>
            </button>
          </div>
          <div class="comment-section">
            <div class="comment-list"></div>
            <div class="comment-input-row">
              <input type="text" class="comment-input" placeholder="Write a thoughtful comment...">
              <button class="btn-send-comment"><i class="fa-solid fa-arrow-up"></i></button>
            </div>
          </div>
        `;
        feedList.prepend(postCard);
      }

      // Reset modal fields
      textarea.value = '';
      attachedModalMedia = '';
      isSpatialTagged = false;
      if (spatialBtn) {
        spatialBtn.style.borderColor = '';
        spatialBtn.style.color = '';
      }
      if (previewBox) previewBox.classList.remove('active');
      if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }
      if (previewVideo) { previewVideo.src = ''; previewVideo.style.display = 'none'; }
      if (photoInput) photoInput.value = '';
      modal.classList.remove('active');
      if (typeof showToast === 'function') showToast('Publication broadcast to ConnectSphere! 🚀✨');
    });
  }
}


// AI Caption Assistant Generator Simulation
function initAICaptionGenerator() {
  const aiBtn = document.getElementById('btn-generate-ai-caption');
  const textarea = document.getElementById('modal-post-text');

  if (aiBtn && textarea) {
    aiBtn.addEventListener('click', () => {
      const suggestions = [
        "✨ Chasing sunsets and catching dreams! What is your vision today? #ConnectSphere #vibes",
        "🚀 Building the future of social networking with HTML5, CSS3, & ES6 JavaScript! #webdev #coding",
        "📸 Great moments become legendary memories. Happy weekend everyone! ✨ #lifestyle"
      ];
      textarea.value = suggestions[Math.floor(Math.random() * suggestions.length)];
      if (typeof showToast === 'function') showToast('AI Caption Generated! 🤖✨');
    });
  }
}