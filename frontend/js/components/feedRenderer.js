/**
 * ConnectSphere Feed Renderer
 * Dynamically renders rich feed posts, polls, carousels, videos, comments, and action counts.
 */

const FeedRenderer = {
  containerId: 'feed-list',

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) return;

    // Listen for state changes
    window.csStore.subscribe('posts', () => this.render());
    window.csStore.subscribe('activeTab', () => this.render());
    window.csStore.subscribe('activeFilterTag', () => this.render());

    this.bindEvents();
    this.render();
  },

  render() {
    if (!this.container) return;
    const activeTab = window.csStore.get('activeTab') || 'forYou';
    const filterTag = window.csStore.get('activeFilterTag');
    const posts = PostService.getPosts(activeTab, filterTag);

    if (!posts.length) {
      this.container.innerHTML = `
        <div style="text-align: center; padding: 48px 20px; color: rgba(255,255,255,0.5); background: rgba(18,24,38,0.4); border-radius: 18px; border: 1px dashed rgba(255,255,255,0.1);">
          <i class="fa-solid fa-satellite-dish" style="font-size: 32px; color: #00D2FF; margin-bottom: 12px; display: block;"></i>
          <h4 style="color: #FFFFFF; font-size: 1rem; margin-bottom: 6px;">No Transmissions Found</h4>
          <p style="font-size: 0.8rem;">No posts currently match the active filter. Share your thoughts to kickstart this mesh!</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = posts.map(post => this.renderPostHTML(post)).join('');
  },

  renderPostHTML(post) {
    const isLiked = post.isLiked;
    const isBookmarked = post.isBookmarked;
    const isReposted = post.isReposted;
    const formattedTime = ConnectSphereSecurity.formatTimeAgo(post.createdAt);
    const formattedCaption = ConnectSphereSecurity.formatCaption(post.caption);

    let mediaHTML = '';

    // 1. Monument Banner Image
    if (post.mediaType === 'banner' && post.bannerData) {
      mediaHTML = `
        <div class="post-banner-masterpiece">
          <div class="banner-image-stage">
            <img src="${post.bannerData.image}" class="banner-bg-img" alt="Banner">
            <div class="banner-gradient-overlay"></div>
            <div class="banner-content-overlay">
              <div class="banner-headline">
                ${(post.bannerData.headline || []).map(h => `<span>${ConnectSphereSecurity.sanitize(h)}</span>`).join('')}
              </div>
              <div class="banner-brand-chip">
                <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
                  <ellipse cx="50" cy="50" rx="38" ry="14" stroke="#7357FF" stroke-width="4" transform="rotate(32 50 50)"/>
                  <ellipse cx="50" cy="50" rx="38" ry="14" stroke="#16D9FF" stroke-width="4" transform="rotate(-32 50 50)"/>
                  <circle cx="50" cy="50" r="11" fill="#00E6C3"/>
                </svg>
                <span>ConnectSphere</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } 
    // 2. Video Player
    else if (post.mediaType === 'video' && post.videoData) {
      mediaHTML = `
        <div class="post-video-player-container masterpiece-video-stage" data-post-id="${post.id}">
          <video class="post-video-element" playsinline loop muted poster="${post.videoData.poster}" style="display:none;">
            <source src="${post.videoData.src}" type="video/mp4">
          </video>
          <img src="${post.videoData.poster}" class="video-poster-img" alt="Video preview">
          <div class="video-center-glow-play">
            <button type="button" class="video-play-overlay-btn btn-masterpiece-play" aria-label="Play video">
              <i class="fa-solid fa-play"></i>
            </button>
          </div>
          <span class="video-duration-pill">${post.videoData.duration || '0:30'}</span>
        </div>
      `;
    }
    // 3. Consensus Poll
    else if (post.mediaType === 'poll' && post.pollData) {
      const poll = post.pollData;
      mediaHTML = `
        <div class="post-poll-card" data-post-id="${post.id}">
          <div class="poll-question-header">
            <i class="fa-solid fa-square-poll-vertical" style="color: #00D2FF;"></i>
            <span>${ConnectSphereSecurity.sanitize(poll.question)}</span>
          </div>
          <div class="poll-options-list">
            ${poll.options.map(opt => `
              <button type="button" class="poll-option-btn ${poll.userChoice === opt.id ? 'selected' : ''}" data-poll-id="${poll.id}" data-opt-id="${opt.id}" ${poll.hasVoted ? 'disabled' : ''}>
                <div class="poll-progress-fill" style="width: ${poll.hasVoted ? opt.percent : 0}%;"></div>
                <span class="poll-opt-label">${ConnectSphereSecurity.sanitize(opt.text)}</span>
                ${poll.hasVoted ? `<span class="poll-opt-pct">${opt.percent}%</span>` : ''}
              </button>
            `).join('')}
          </div>
          <div class="poll-meta-footer">
            <span>${ConnectSphereSecurity.formatNumber(poll.totalVotes)} cryptographic votes</span>
            <span>&bull;</span>
            <span>${poll.hasVoted ? 'Voted' : 'Voting Open'}</span>
          </div>
        </div>
      `;
    }
    // 4. Multi-Image Carousel
    else if (post.mediaType === 'carousel' && post.carouselData) {
      const slides = post.carouselData.slides || [];
      mediaHTML = `
        <div class="post-carousel-container" data-post-id="${post.id}" data-current-slide="0" data-total-slides="${slides.length}">
          <div class="carousel-slides-track">
            ${slides.map((s, idx) => `
              <div class="carousel-slide-item ${idx === 0 ? 'active' : ''}">
                <img src="${s.image}" alt="${ConnectSphereSecurity.sanitize(s.title || '')}">
                <div class="media-tag-badge">${ConnectSphereSecurity.sanitize(s.title || '')}</div>
              </div>
            `).join('')}
          </div>
          ${slides.length > 1 ? `
            <button type="button" class="carousel-nav-btn prev" aria-label="Previous slide"><i class="fa-solid fa-chevron-left"></i></button>
            <button type="button" class="carousel-nav-btn next" aria-label="Next slide"><i class="fa-solid fa-chevron-right"></i></button>
            <span class="carousel-counter-badge">1 / ${slides.length}</span>
          ` : ''}
        </div>
      `;
    }
    // 5. Voice Note / Audio
    else if ((post.mediaType === 'audio' || post.mediaType === 'voice') && post.audioData) {
      mediaHTML = `
        <div class="post-audio-container" style="background: rgba(115, 87, 255, 0.1); border-radius: 12px; padding: 16px; margin: 12px 0; border: 1px solid rgba(115, 87, 255, 0.2);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <i class="fa-solid fa-microphone-lines" style="color: #7357FF; font-size: 20px;"></i>
            <span style="color: #FFFFFF; font-weight: 600; font-size: 0.9rem;">Voice Note</span>
          </div>
          <audio controls style="width: 100%; border-radius: 20px;" src="${post.audioData.src}"></audio>
        </div>
      `;
    }
    // 6. Single uploaded photo
    else if (post.mediaImage) {
      mediaHTML = `
        <div class="post-single-image" style="border-radius: 16px; overflow: hidden; margin: 12px 0;">
          <img src="${post.mediaImage}" style="width: 100%; max-height: 380px; object-fit: cover; display: block;" alt="Media attachment">
        </div>
      `;
    }

    // Render comments list
    const commentsListHTML = (post.comments || []).map(c => `
      <div class="comment-item" style="display: flex; gap: 10px; margin-top: 10px; font-size: 0.8rem;">
        <img src="${c.avatar}" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" alt="${c.author}">
        <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 6px 12px; flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <span style="font-weight: 700; color: #FFFFFF;">${ConnectSphereSecurity.sanitize(c.author)}</span>
            <span style="font-size: 0.68rem; color: rgba(255,255,255,0.4);">${ConnectSphereSecurity.formatTimeAgo(c.createdAt)}</span>
          </div>
          <div style="color: rgba(255,255,255,0.85);">${ConnectSphereSecurity.sanitize(c.text)}</div>
        </div>
      </div>
    `).join('');

    return `
      <article class="post-card post-card-masterpiece" id="post-card-${post.id}" data-post-id="${post.id}">
        <!-- Post Header -->
        <div class="post-header">
          <div class="user-meta" style="display: flex; align-items: center; gap: 12px;">
            <img src="${post.author.avatar}" class="avatar" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" alt="${post.author.name}">
            <div class="user-details">
              <div class="user-name-row" style="display: flex; align-items: center; gap: 6px;">
                <span class="user-name" style="font-weight: 700; color: #FFFFFF; font-size: 0.94rem;">${ConnectSphereSecurity.sanitize(post.author.name)}</span>
                ${post.author.isVerified ? '<i class="fa-solid fa-circle-check badge-verified" style="color: #00D2FF; font-size: 13px;"></i>' : ''}
                ${post.author.badge ? `<span class="user-badge" style="font-size: 0.68rem; background: rgba(0, 210, 255, 0.1); border: 1px solid rgba(0, 210, 255, 0.2); color: #00D2FF; padding: 1px 7px; border-radius: 20px;">${ConnectSphereSecurity.sanitize(post.author.badge)}</span>` : ''}
              </div>
              <div class="post-meta-row" style="font-size: 0.74rem; color: rgba(255, 255, 255, 0.5);">
                <span>${formattedTime}</span>
                ${post.location ? `<span>&bull; ${ConnectSphereSecurity.sanitize(post.location)}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="post-options-wrap" style="position: relative;">
            <button type="button" class="action-btn-icon btn-post-menu-toggle" data-post-id="${post.id}" title="Post Options"><i class="fa-solid fa-ellipsis"></i></button>
          </div>
        </div>

        <!-- Post Caption -->
        <div class="post-caption" style="font-size: 0.88rem; line-height: 1.48; color: #FFFFFF;">
          ${formattedCaption}
        </div>

        <!-- Post Media Section -->
        ${mediaHTML}

        <!-- Post Actions Toolbar -->
        <div class="post-actions masterpiece-post-actions">
          <button type="button" class="action-btn btn-like ${isLiked ? 'liked' : ''}" data-post-id="${post.id}" title="Like">
            <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart" style="${isLiked ? 'color: #FF4757;' : ''}"></i>
            <span class="like-count">${ConnectSphereSecurity.formatNumber(post.likes)}</span>
          </button>
          <button type="button" class="action-btn btn-comment-toggle" data-post-id="${post.id}" title="Comments">
            <i class="fa-regular fa-comment"></i>
            <span class="comment-count">${ConnectSphereSecurity.formatNumber(post.commentsCount || 0)}</span>
          </button>
          <button type="button" class="action-btn btn-repost ${isReposted ? 'reposted' : ''}" data-post-id="${post.id}" title="Repost">
            <i class="fa-solid fa-repeat" style="${isReposted ? 'color: #10B981;' : ''}"></i>
            <span class="repost-count">${ConnectSphereSecurity.formatNumber(post.reposts)}</span>
          </button>
          <button type="button" class="action-btn btn-share" data-post-id="${post.id}" title="Share">
            <i class="fa-regular fa-paper-plane"></i>
          </button>
          <button type="button" class="action-btn btn-bookmark btn-bookmark-post ${isBookmarked ? 'bookmarked' : ''}" data-post-id="${post.id}" title="Bookmark" style="margin-left: auto;">
            <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark" style="${isBookmarked ? 'color: #00D2FF;' : ''}"></i>
          </button>
        </div>

        <!-- Expandable Comments Drawer -->
        <div class="post-comments-expanded" id="comments-drawer-${post.id}" style="display: none; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px; margin-top: 4px;">
          <div class="comments-list" id="comments-list-${post.id}">
            ${commentsListHTML}
          </div>
          <form class="comment-input-row" data-post-id="${post.id}" style="display: flex; gap: 8px; margin-top: 12px;">
            <input type="text" class="input-comment-text" placeholder="Write a verified comment..." style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; padding: 6px 14px; font-size: 0.8rem; color: #FFFFFF;" autocomplete="off">
            <button type="submit" style="background: linear-gradient(135deg, #00D2FF, #7357FF); border: none; border-radius: 18px; padding: 6px 14px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer;">Reply</button>
          </form>
        </div>
      </article>
    `;
  },

  bindEvents() {
    if (!this.container) return;

    this.container.addEventListener('click', (e) => {
      // 1. Like button
      const likeBtn = e.target.closest('.btn-like');
      if (likeBtn) {
        const postId = likeBtn.getAttribute('data-post-id');
        PostService.toggleLike(postId);
        return;
      }

      // 2. Bookmark button
      const bmBtn = e.target.closest('.btn-bookmark');
      if (bmBtn) {
        const postId = bmBtn.getAttribute('data-post-id');
        PostService.toggleBookmark(postId);
        return;
      }

      // 3. Repost button
      const repostBtn = e.target.closest('.btn-repost');
      if (repostBtn) {
        const postId = repostBtn.getAttribute('data-post-id');
        PostService.toggleRepost(postId);
        return;
      }

      // 4. Share button
      const shareBtn = e.target.closest('.btn-share');
      if (shareBtn) {
        if (typeof showToast === 'function') showToast('Encrypted post link copied to clipboard! 🔗✨');
        return;
      }

      // 5. Comment Toggle
      const commentBtn = e.target.closest('.btn-comment-toggle');
      if (commentBtn) {
        const postId = commentBtn.getAttribute('data-post-id');
        const drawer = document.getElementById(`comments-drawer-${postId}`);
        if (drawer) {
          const isHidden = drawer.style.display === 'none';
          drawer.style.display = isHidden ? 'block' : 'none';
          if (isHidden) {
            const input = drawer.querySelector('.input-comment-text');
            if (input) input.focus();
          }
        }
        return;
      }

      // 6. Poll Voting
      const pollOptBtn = e.target.closest('.poll-option-btn');
      if (pollOptBtn && !pollOptBtn.disabled) {
        const pollCard = pollOptBtn.closest('.post-poll-card');
        const postId = pollCard?.getAttribute('data-post-id');
        const optId = pollOptBtn.getAttribute('data-opt-id');
        if (postId && optId) {
          PostService.votePoll(postId, optId);
        }
        return;
      }

      // 7. Carousel Navigation
      const navBtn = e.target.closest('.carousel-nav-btn');
      if (navBtn) {
        const carousel = navBtn.closest('.post-carousel-container');
        if (!carousel) return;
        const track = carousel.querySelector('.carousel-slides-track');
        const slides = carousel.querySelectorAll('.carousel-slide-item');
        const badge = carousel.querySelector('.carousel-counter-badge');
        let current = parseInt(carousel.getAttribute('data-current-slide') || '0', 10);
        const total = slides.length;

        if (navBtn.classList.contains('next')) {
          current = (current + 1) % total;
        } else {
          current = (current - 1 + total) % total;
        }

        carousel.setAttribute('data-current-slide', current);
        if (track) track.style.transform = `translateX(-${current * 100}%)`;
        if (badge) badge.textContent = `${current + 1} / ${total}`;
        return;
      }

      // 8. Video Player Play Button
      const videoPlayBtn = e.target.closest('.btn-masterpiece-play');
      if (videoPlayBtn) {
        const stage = videoPlayBtn.closest('.post-video-player-container');
        if (!stage) return;
        const video = stage.querySelector('.post-video-element');
        const poster = stage.querySelector('.video-poster-img');
        if (video) {
          if (video.paused) {
            video.style.display = 'block';
            if (poster) poster.style.display = 'none';
            video.play().catch(() => {});
            videoPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
          } else {
            video.pause();
            videoPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
          }
        }
        return;
      }
    });

    // Handle Comment Submission
    this.container.addEventListener('submit', (e) => {
      const form = e.target.closest('.comment-input-row');
      if (form) {
        e.preventDefault();
        const postId = form.getAttribute('data-post-id');
        const input = form.querySelector('.input-comment-text');
        if (input && input.value.trim()) {
          PostService.addComment(postId, input.value.trim());
          input.value = '';
        }
      }
    });

    // Infinite Scroll
    const handleScroll = (e) => {
      const target = e.target === document ? document.documentElement : e.target;
      const scrollHeight = target.scrollHeight;
      const scrollTop = target.scrollTop || window.scrollY;
      const clientHeight = target.clientHeight || window.innerHeight;

      if (scrollHeight - scrollTop - clientHeight < 400) {
        if (window.PostService && !window.PostService.isFetching && window.PostService.hasMore) {
          window.PostService.fetchPostsFromSupabase(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const feedCenter = document.querySelector('.cs-feed-center');
    if (feedCenter) {
      feedCenter.addEventListener('scroll', handleScroll, { passive: true });
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeedRenderer;
}
