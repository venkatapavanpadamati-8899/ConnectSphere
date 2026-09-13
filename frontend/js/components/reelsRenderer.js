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
    if (caption) caption.textContent = reel.caption;
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
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReelsRenderer;
}
