/**
 * ConnectSphere Story Renderer
 * Controls the horizontal story row, modal viewer, progress bars, and interactions.
 */

const StoryRenderer = {
  containerId: 'dashboard-stories-container',
  modalId: 'story-modal',

  init() {
    this.container = document.getElementById(this.containerId);
    this.modal = document.getElementById(this.modalId);
    if (!this.container) return;

    window.csStore.subscribe('stories', () => this.renderStoryRow());
    this.renderStoryRow();
    this.bindRowEvents();
    this.initModalControls();
  },

  renderStoryRow() {
    if (!this.container) return;
    const stories = StoryService.getStories();
    const hasSelf = stories.some(s => s.isSelf);

    let html = '';
    if (!hasSelf) {
      const user = window.csStore?.get('currentUser') || { avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' };
      html += `
        <div class="story-card my-story" id="add-story-trigger" data-testid="story-trigger" data-story-id="story_self" title="Your Story">
          <div class="story-ring-wrapper seen">
            <img src="${user.avatar}" class="avatar" alt="Your Story">
            <span class="add-story-badge" id="btn-add-story-badge"><i class="fa-solid fa-plus"></i></span>
          </div>
          <span class="story-name">Your Story</span>
        </div>
      `;
    }

    stories.forEach(story => {
      const ringClass = story.hasUnseen ? (story.gradient || 'ring-gradient-cyan') : 'seen';
      if (story.isSelf) {
        html += `
          <div class="story-card my-story" id="add-story-trigger" data-testid="story-trigger" data-story-id="${story.id}" title="Your Story">
            <div class="story-ring-wrapper ${ringClass}">
              <img src="${story.avatar}" class="avatar" alt="Your Story">
              <span class="add-story-badge" id="btn-add-story-badge"><i class="fa-solid fa-plus"></i></span>
            </div>
            <span class="story-name">Your Story</span>
          </div>
        `;
      } else {
        html += `
          <div class="story-card" data-story-id="${story.id}" data-creator="${story.creator}" title="${story.creator}">
            <div class="story-ring-wrapper ${ringClass}">
              <img src="${story.avatar}" class="avatar" alt="${story.creator}">
            </div>
            <span class="story-name">${story.creator.split(' ')[0]} ${story.creator.split(' ')[1] ? story.creator.split(' ')[1][0] + '.' : ''}</span>
          </div>
        `;
      }
    });

    html += `
      <button type="button" class="btn-stories-scroll-right" aria-label="Next stories">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;

    this.container.innerHTML = html;
  },

  bindRowEvents() {
    this.container.addEventListener('click', (e) => {
      // Add story trigger
      const addTrigger = e.target.closest('#add-story-trigger') || e.target.closest('#btn-add-story-badge');
      if (addTrigger) {
        e.stopPropagation();
        this.promptAddStory();
        return;
      }

      // Story Card click -> open viewer
      const card = e.target.closest('.story-card');
      if (card) {
        const storyId = card.getAttribute('data-story-id');
        this.openViewer(storyId);
        return;
      }

      // Scroll chevron click
      const scrollBtn = e.target.closest('.btn-stories-scroll-right');
      if (scrollBtn) {
        this.container.scrollBy({ left: 240, behavior: 'smooth' });
      }
    });
  },

  promptAddStory() {
    const text = prompt('Share a quick text transmission to your Story:');
    if (text && text.trim()) {
      StoryService.createStory({
        type: 'text',
        text: text.trim(),
        bgGradient: 'linear-gradient(135deg, #00D2FF 0%, #7357FF 100%)'
      });
      if (typeof showToast === 'function') showToast('Added transmission to your 24h Story! 📸✨');
    }
  },

  openViewer(storyId) {
    if (!this.modal) return;
    const stories = StoryService.getStories();
    this.activeStoryIndex = stories.findIndex(s => s.id === storyId);
    if (this.activeStoryIndex === -1) this.activeStoryIndex = 0;
    this.activeSlideIndex = 0;

    this.modal.classList.add('active');
    this.renderCurrentSlide();
  },

  renderCurrentSlide() {
    const stories = StoryService.getStories();
    const story = stories[this.activeStoryIndex];
    if (!story || !story.slides.length) {
      this.closeViewer();
      return;
    }

    const slide = story.slides[this.activeSlideIndex];
    if (!slide) {
      // Move to next story if available
      if (this.activeStoryIndex < stories.length - 1) {
        this.activeStoryIndex++;
        this.activeSlideIndex = 0;
        this.renderCurrentSlide();
      } else {
        this.closeViewer();
      }
      return;
    }

    // Mark viewed
    StoryService.markSlideViewed(story.id, slide.id);

    // Update modal DOM elements
    const avatar = this.modal.querySelector('.story-user-avatar, #story-creator-avatar, #story-viewer-avatar');
    const name = this.modal.querySelector('.story-user-name, #story-creator-name, #story-viewer-name');
    const time = this.modal.querySelector('.story-time, #story-time-ago, #story-viewer-time');
    const mediaContainer = this.modal.querySelector('.story-media-container, #story-display-stage');
    const mediaImg = this.modal.querySelector('#story-viewer-media');
    const captionEl = this.modal.querySelector('#story-viewer-caption');
    const progressBarFill = this.modal.querySelector('#story-progress-bar');
    const progressContainer = this.modal.querySelector('.story-progress-bar-container, #story-bars, .story-progress-container');

    if (avatar) avatar.src = story.avatar;
    if (name) name.textContent = story.creator;
    if (time) time.textContent = ConnectSphereSecurity.formatTimeAgo(slide.timestamp);

    // Render multi-segment progress bar
    if (progressContainer) {
      progressContainer.innerHTML = story.slides.map((s, idx) => `
        <div class="story-progress-seg" style="flex: 1; height: 3px; background: rgba(255,255,255,0.25); border-radius: 2px; overflow: hidden; margin: 0 2px;">
          <div class="story-progress-fill" style="height: 100%; width: ${idx < this.activeSlideIndex ? '100%' : '0%'}; background: #00D2FF; transition: width 0.1s linear;"></div>
        </div>
      `).join('');
    }

    // Render media stage or update image/caption
    if (mediaImg) {
      if (slide.type === 'text') {
        mediaImg.style.display = 'none';
        if (captionEl) {
          captionEl.textContent = slide.text;
          captionEl.style.background = slide.bgGradient || '#0B0E17';
        }
      } else {
        mediaImg.style.display = 'block';
        mediaImg.src = slide.mediaUrl;
        if (captionEl) captionEl.textContent = slide.caption || '';
      }
    } else if (mediaContainer) {
      if (slide.type === 'text') {
        mediaContainer.innerHTML = `
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 32px; background: ${slide.bgGradient || '#0B0E17'}; text-align: center; color: #FFFFFF; font-size: 1.2rem; font-weight: 700; font-family: var(--font-display, sans-serif);">
            ${ConnectSphereSecurity.sanitize(slide.text)}
          </div>
        `;
      } else {
        mediaContainer.innerHTML = `
          <img src="${slide.mediaUrl}" style="width: 100%; height: 100%; object-fit: cover; display: block;" alt="Story media">
          ${slide.caption ? `<div style="position: absolute; bottom: 80px; left: 16px; right: 16px; background: rgba(5,7,19,0.7); backdrop-filter: blur(8px); padding: 10px 14px; border-radius: 12px; font-size: 0.84rem; color: #FFFFFF;">${ConnectSphereSecurity.sanitize(slide.caption)}</div>` : ''}
        `;
      }
    }

    this.elapsed = 0;
    this.startSlideTimer();
  },

  startSlideTimer() {
    this.stopSlideTimer();
    if (this.elapsed === undefined) this.elapsed = 0;
    const duration = 5000;
    const intervalTime = 100;

    const currentBar = this.modal?.querySelectorAll('.story-progress-fill')[this.activeSlideIndex];
    const singleBar = this.modal?.querySelector('#story-progress-bar');

    this.slideTimer = setInterval(() => {
      this.elapsed += intervalTime;
      const pct = Math.min(100, (this.elapsed / duration) * 100);
      if (currentBar) currentBar.style.width = `${pct}%`;
      if (singleBar) singleBar.style.width = `${pct}%`;

      if (this.elapsed >= duration) {
        this.nextSlide();
      }
    }, intervalTime);
  },

  stopSlideTimer() {
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
      this.slideTimer = null;
    }
  },

  nextSlide() {
    this.stopSlideTimer();
    const stories = StoryService.getStories();
    const story = stories[this.activeStoryIndex];
    if (story && this.activeSlideIndex < story.slides.length - 1) {
      this.activeSlideIndex++;
      this.renderCurrentSlide();
    } else if (this.activeStoryIndex < stories.length - 1) {
      this.activeStoryIndex++;
      this.activeSlideIndex = 0;
      this.renderCurrentSlide();
    } else {
      this.closeViewer();
    }
  },

  prevSlide() {
    this.stopSlideTimer();
    if (this.activeSlideIndex > 0) {
      this.activeSlideIndex--;
      this.renderCurrentSlide();
    } else if (this.activeStoryIndex > 0) {
      this.activeStoryIndex--;
      const stories = StoryService.getStories();
      this.activeSlideIndex = stories[this.activeStoryIndex].slides.length - 1;
      this.renderCurrentSlide();
    }
  },

  closeViewer() {
    this.stopSlideTimer();
    if (this.modal) this.modal.classList.remove('active');
  },

  initModalControls() {
    if (!this.modal) return;

    // Close buttons
    this.modal.querySelectorAll('.modal-close, #btn-close-story, #btn-close-story-modal').forEach(btn => {
      btn.addEventListener('click', () => this.closeViewer());
    });

    // Tap left/right to navigate, hold to pause
    const stage = this.modal.querySelector('.story-media-container, #story-display-stage, .story-viewer-stage');
    if (stage) {
      // Navigation on tap
      stage.addEventListener('click', (e) => {
        if (e.target.closest('#btn-close-story-modal, .story-bottom-reply, .story-reaction-btn, .story-reply-input')) return;
        const rect = stage.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width * 0.35) {
          this.prevSlide();
        } else {
          this.nextSlide();
        }
      });

      // Pause/Resume on hold
      const pauseStory = () => this.stopSlideTimer();
      const resumeStory = () => {
        if (this.modal.classList.contains('active')) {
           // We might need to resume instead of restarting, but for simplicity, let's just start slide timer again
           // To be perfectly accurate we would track remaining time, but let's just restart timer.
           this.startSlideTimer();
        }
      };

      stage.addEventListener('mousedown', (e) => {
        if (!e.target.closest('.story-bottom-reply, .story-reaction-btn, .story-reply-input')) pauseStory();
      });
      stage.addEventListener('mouseup', resumeStory);
      stage.addEventListener('mouseleave', resumeStory);
      
      stage.addEventListener('touchstart', (e) => {
        if (!e.target.closest('.story-bottom-reply, .story-reaction-btn, .story-reply-input')) pauseStory();
      });
      stage.addEventListener('touchend', resumeStory);
    }

    // Reaction emojis
    this.modal.querySelectorAll('.story-reaction-emoji, .story-reaction-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const emoji = btn.getAttribute('data-emoji') || btn.textContent.trim();
        const stories = StoryService.getStories();
        const story = stories[this.activeStoryIndex];
        const slide = story?.slides[this.activeSlideIndex];
        if (story && slide) {
          StoryService.reactToStory(story.id, slide.id, emoji);
        }
      });
    });

    // Story reply input
    const replyInput = this.modal.querySelector('#story-reply-input');
    if (replyInput) {
      replyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && replyInput.value.trim()) {
          e.stopPropagation();
          const stories = StoryService.getStories();
          const story = stories[this.activeStoryIndex];
          if (story) {
            StoryService.sendStoryReply(story.id, replyInput.value.trim());
            replyInput.value = '';
          }
        }
      });
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StoryRenderer;
}
