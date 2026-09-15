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
  
  const pollBtn = document.getElementById('btn-modal-media-poll');
  const pollCreator = document.getElementById('modal-poll-creator');
  const btnPollAdd = document.getElementById('btn-modal-poll-add');
  const btnPollRemove = document.getElementById('btn-modal-poll-remove');
  const pollExtraOptions = document.getElementById('modal-poll-extra-options');
  
  const voiceBtn = document.getElementById('btn-modal-media-voice');
  const voiceCreator = document.getElementById('modal-voice-creator');
  const voiceRecordBtn = document.getElementById('btn-modal-voice-record');
  const voiceStopBtn = document.getElementById('btn-modal-voice-stop');
  const voicePreview = document.getElementById('modal-voice-preview');
  const voiceIndicator = document.getElementById('voice-recording-indicator');
  const voiceTimer = document.getElementById('voice-timer');
  const btnVoiceRemove = document.getElementById('btn-modal-voice-remove');
  
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

  // Poll Logic
  if (pollBtn && pollCreator) {
    pollBtn.addEventListener('click', () => {
      pollCreator.style.display = 'block';
      if (voiceCreator) voiceCreator.style.display = 'none';
      if (previewBox) previewBox.classList.remove('active');
    });
    btnPollRemove.addEventListener('click', () => {
      pollCreator.style.display = 'none';
      if (pollExtraOptions) pollExtraOptions.innerHTML = '';
      document.querySelectorAll('.modal-poll-input').forEach(i => i.value = '');
    });
    let extraPolls = 0;
    btnPollAdd.addEventListener('click', () => {
      if (extraPolls >= 4) {
        if (typeof showToast === 'function') showToast('Maximum options reached.');
        return;
      }
      extraPolls++;
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'modal-poll-input';
      inp.placeholder = 'Option ' + (extraPolls + 2);
      inp.style.cssText = 'width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:10px; color:#fff; margin-bottom:10px;';
      pollExtraOptions.appendChild(inp);
    });
  }

  // Voice Note Logic (Recording)
  let mediaRecorder = null;
  let audioChunks = [];
  let recordInterval = null;
  let recordSeconds = 0;

  if (voiceBtn && voiceCreator) {
    voiceBtn.addEventListener('click', () => {
      voiceCreator.style.display = 'block';
      if (pollCreator) pollCreator.style.display = 'none';
      if (previewBox) previewBox.classList.remove('active');
    });

    btnVoiceRemove.addEventListener('click', () => {
      voiceCreator.style.display = 'none';
      attachedModalMedia = '';
      if (voicePreview) {
        voicePreview.src = '';
        voicePreview.style.display = 'none';
      }
      if (voiceRecordBtn) voiceRecordBtn.style.display = 'inline-block';
    });

    voiceRecordBtn.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onload = (evt) => {
            attachedModalMedia = evt.target.result;
            voicePreview.src = attachedModalMedia;
            voicePreview.style.display = 'block';
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        voiceRecordBtn.style.display = 'none';
        voiceStopBtn.style.display = 'inline-block';
        voiceIndicator.style.display = 'block';
        
        recordSeconds = 0;
        voiceTimer.innerText = '0:00';
        recordInterval = setInterval(() => {
          recordSeconds++;
          const m = Math.floor(recordSeconds / 60);
          const s = (recordSeconds % 60).toString().padStart(2, '0');
          voiceTimer.innerText = `${m}:${s}`;
        }, 1000);
      } catch (err) {
        if (typeof showToast === 'function') showToast('Microphone access denied or unavailable.');
        console.warn('Mic error', err);
      }
    });

    voiceStopBtn.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      clearInterval(recordInterval);
      voiceIndicator.style.display = 'none';
      voiceStopBtn.style.display = 'none';
    });
  }

  if (submitBtn && textarea && modal) {
    submitBtn.addEventListener('click', async () => {
      const content = textarea.value.trim();
      let isPollActive = pollCreator && pollCreator.style.display === 'block';
      let isVoiceActive = voiceCreator && voiceCreator.style.display === 'block';
      
      let pollData = null;
      if (isPollActive) {
        const inputs = Array.from(document.querySelectorAll('.modal-poll-input')).map(i => i.value.trim()).filter(v => v);
        if (inputs.length < 2) {
          if (typeof showToast === 'function') showToast('A poll must have at least 2 options.');
          return;
        }
        pollData = { question: content || 'Consensus Poll:', options: inputs };
      }

      if (!content && !attachedModalMedia && !isPollActive) {
        textarea.focus();
        if (typeof showToast === 'function') showToast('Please enter your discovery before publishing! ✍️');
        return;
      }

      let mediaType = 'text';
      if (isPollActive) mediaType = 'poll';
      else if (isVoiceActive && attachedModalMedia) mediaType = 'voice';
      else if (attachedModalMedia) {
        if (attachedModalMedia.startsWith('data:video')) mediaType = 'video';
        else mediaType = 'image';
      }

      // Live Supabase API call
      if (typeof window.PostService !== 'undefined') {
        window.PostService.createPost({ 
          text: content, 
          caption: content, 
          mediaType: mediaType, 
          mediaData: attachedModalMedia, 
          pollData: pollData 
        }).catch(() => {});
      }

      // Reset modal fields
      modal.classList.remove('active');
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
      
      if (pollCreator) pollCreator.style.display = 'none';
      if (pollExtraOptions) pollExtraOptions.innerHTML = '';
      document.querySelectorAll('.modal-poll-input').forEach(i => i.value = '');
      
      if (voiceCreator) voiceCreator.style.display = 'none';
      if (voicePreview) { voicePreview.src = ''; voicePreview.style.display = 'none'; }
      if (voiceRecordBtn) voiceRecordBtn.style.display = 'inline-block';
      
      if (typeof showToast === 'function') showToast('Publication broadcast to the mesh! 📡');
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