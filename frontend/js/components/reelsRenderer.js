/**
 * ConnectSphere Reels Renderer
 * Manages vertical short-form video modal, video playback, actions, and follow state.
 */

const ReelsRenderer = {
  modalId: 'reels-modal',

  globalMuted: true,

  init() {
    this.modal = document.getElementById(this.modalId);
    if (!this.modal) return;

    this.currentIndex = 0;
    this.bindEvents();
    
    // Asynchronously render trending hashtags for the sidebar
    this.renderTrendingHashtags().catch(e => console.error(e));
  },

  open() {
    if (!this.modal) return;
    this.modal.classList.add('active');
    this.renderCurrentReel();
  },

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
    const video = this.modal.querySelector('video');
    if (video) video.pause();
  },

  renderCurrentReel() {
    const reels = ReelService.getReels();
    const reel = reels[this.currentIndex];
    if (!reel) return;

    const video = this.modal.querySelector('#reel-active-video, .reels-video-element');
    const poster = this.modal.querySelector('.reels-poster');
    const creatorName = this.modal.querySelector('.reel-creator-name');
    const caption = this.modal.querySelector('.reel-caption');
    const music = this.modal.querySelector('.reel-audio-title, #reels-music-tag');
    const likeBtn = this.modal.querySelector('#btn-reel-like');
    const likesCount = this.modal.querySelector('#reel-likes-count');
    const commentsCount = this.modal.querySelector('#reel-comments-count');
    const followBtn = this.modal.querySelector('#btn-reel-follow');

    if (creatorName) creatorName.textContent = reel.creator;
    if (caption) {
      const escapedCaption = reel.caption.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const htmlCaption = escapedCaption.replace(/#([\w]+)/g, '<span class="hashtag">#$1</span>');
      caption.innerHTML = htmlCaption;
    }
    if (music) music.textContent = reel.music || 'Original Audio';
    if (likesCount) likesCount.textContent = ConnectSphereSecurity.formatNumber(reel.likes);
    if (commentsCount) commentsCount.textContent = ConnectSphereSecurity.formatNumber(reel.commentsCount);

    if (likeBtn) {
      likeBtn.classList.toggle('active', reel.isLiked);
      const icon = likeBtn.querySelector('i');
      if (icon) {
        icon.className = reel.isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        icon.style.color = reel.isLiked ? '#FF4757' : '#FFFFFF';
      }
    }

    if (followBtn) {
      followBtn.textContent = reel.isFollowing ? 'Following' : 'Follow';
      followBtn.classList.toggle('following', reel.isFollowing);
    }

    if (video) {
      video.src = reel.videoUrl;
      video.poster = reel.poster;
      video.muted = this.globalMuted;
      this.updateVolumeIcon();
      
      video.play().catch(() => {});
      
      video.ontimeupdate = () => {
        const progress = this.modal.querySelector('#reels-progress-indicator');
        if (progress && video.duration) {
          progress.style.width = `${(video.currentTime / video.duration) * 100}%`;
        }
      };
    }
  },

  updateVolumeIcon() {
    const volIcon = this.modal.querySelector('#reel-volume-icon');
    if (volIcon) {
      volIcon.className = this.globalMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
    }
  },

  nextReel() {
    const reels = ReelService.getReels();
    if (this.currentIndex < reels.length - 1) {
      this.currentIndex++;
      this.renderCurrentReel();
    }
  },

  prevReel() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderCurrentReel();
    }
  },

  bindEvents() {
    if (!this.modal) return;

    // Close button
    const closeBtn = this.modal.querySelector('#btn-close-reels-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    // Navigation buttons
    const nextBtn = this.modal.querySelector('#btn-reel-next');
    const prevBtn = this.modal.querySelector('#btn-reel-prev');
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextReel());
    if (prevBtn) prevBtn.addEventListener('click', () => this.prevReel());

    // Like toggle
    const likeBtn = this.modal.querySelector('#btn-reel-like');
    if (likeBtn) {
      likeBtn.addEventListener('click', () => {
        const reels = ReelService.getReels();
        const reel = reels[this.currentIndex];
        if (reel) {
          ReelService.toggleLike(reel.id);
          this.renderCurrentReel();
        }
      });
    }

    // Follow toggle
    const followBtn = this.modal.querySelector('#btn-reel-follow');
    if (followBtn) {
      followBtn.addEventListener('click', () => {
        const reels = ReelService.getReels();
        const reel = reels[this.currentIndex];
        if (reel) {
          ReelService.toggleFollow(reel.handle);
          this.renderCurrentReel();
        }
      });
    }

    // Share button
    const shareBtn = this.modal.querySelector('#btn-reel-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const reels = ReelService.getReels();
        const reel = reels[this.currentIndex];
        if (reel) ReelService.shareReel(reel.id);
      });
    }

    // Remix button
    const remixBtn = this.modal.querySelector('#btn-reel-remix');
    if (remixBtn) {
      remixBtn.addEventListener('click', () => {
        const reels = ReelService.getReels();
        const reel = reels[this.currentIndex];
        if (reel) ReelService.remixReel(reel.id);
      });
    }

    // Volume toggle
    const audioToggleBtn = this.modal.querySelector('#btn-reel-audio-toggle');
    if (audioToggleBtn) {
      audioToggleBtn.addEventListener('click', () => {
        this.globalMuted = !this.globalMuted;
        this.updateVolumeIcon();
        const video = this.modal.querySelector('#reel-active-video, .reels-video-element');
        if (video) video.muted = this.globalMuted;
      });
    }

    // Swipe and Scroll Navigation
    const videoContainer = this.modal.querySelector('.reels-video-container, .reels-modal-stage');
    if (videoContainer) {
      let isScrolling = false;
      videoContainer.addEventListener('wheel', (e) => {
        if (isScrolling) return;
        if (Math.abs(e.deltaY) > 20) {
          isScrolling = true;
          setTimeout(() => isScrolling = false, 800);
          if (e.deltaY > 0) this.nextReel();
          else this.prevReel();
        }
      });
      
      let touchStartY = 0;
      videoContainer.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
      });
      videoContainer.addEventListener('touchend', (e) => {
        const diff = touchStartY - e.changedTouches[0].clientY;
        if (diff > 50) this.nextReel();
        else if (diff < -50) this.prevReel();
      });

      // Tap to pause/play
      videoContainer.addEventListener('click', (e) => {
        if (e.target.closest('.reels-right-actions, .reels-bottom-info, .reels-top-bar, .reels-nav-arrow')) return;
        const video = this.modal.querySelector('#reel-active-video, .reels-video-element');
        if (video) {
          if (video.paused) video.play();
          else video.pause();
        }
      });
    }

    // Keyboard arrow navigation
    window.addEventListener('keydown', (e) => {
      if (!this.modal.classList.contains('active')) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.nextReel();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.prevReel();
      } else if (e.key === 'Escape') {
        this.close();
      }
    });
  },

  async renderTrendingHashtags() {
    const listContainer = document.getElementById('trending-masterpiece-list');
    if (!listContainer) return;

    if (window.ReelService && typeof window.ReelService.getTrendingHashtags === 'function') {
      const trending = await window.ReelService.getTrendingHashtags(5);
      
      if (!trending || trending.length === 0) {
        listContainer.innerHTML = '<div style="padding: 15px; text-align: center; color: rgba(255,255,255,0.5);">No trending topics yet.</div>';
        return;
      }

      listContainer.innerHTML = '';
      trending.forEach((tag, index) => {
        const row = document.createElement('div');
        row.className = 'trending-row';
        row.style.cursor = 'pointer';
        
        // When clicking a trending tag, filter the reels
        row.addEventListener('click', async () => {
          if (window.ReelService) {
            await window.ReelService.fetchReelsFromSupabase(tag.hashtag);
            this.currentIndex = 0;
            this.renderCurrentReel();
          }
        });

        const rankSpan = document.createElement('span');
        rankSpan.className = 'trending-rank';
        rankSpan.textContent = String(index + 1).padStart(2, '0');
        
        // Random thumbnail to keep the rich UI appearance
        const thumb = document.createElement('img');
        thumb.className = 'trend-thumb';
        thumb.src = `https://images.unsplash.com/photo-${1500000000000 + index * 100000}?w=100&auto=format&fit=crop&q=80`;
        thumb.alt = `#${tag.hashtag}`;
        
        const info = document.createElement('div');
        info.className = 'trend-info';
        
        const tagDiv = document.createElement('div');
        tagDiv.className = 'trend-tag';
        tagDiv.textContent = `#${tag.hashtag}`;
        
        const countDiv = document.createElement('div');
        countDiv.className = 'trend-count';
        const score = Math.round(Number(tag.trend_score || tag.trending_score || 0));
        countDiv.innerHTML = `Trending &bull; Score ${score}`;
        
        info.appendChild(tagDiv);
        info.appendChild(countDiv);
        
        row.appendChild(rankSpan);
        row.appendChild(thumb);
        row.appendChild(info);
        
        listContainer.appendChild(row);
      });
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReelsRenderer;
}
