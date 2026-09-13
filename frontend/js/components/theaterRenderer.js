/**
 * ConnectSphere Video Theater Renderer
 * Manages YouTube-style video theater modal, subscriber counts, and live stream chat.
 */

const TheaterRenderer = {
  modalId: 'video-theater-modal',

  init() {
    this.modal = document.getElementById(this.modalId);
    if (!this.modal) return;

    window.csStore.subscribe('video:subscribed', (d) => this.updateSubscribeBtn(d));
    window.csStore.subscribe('video:liked', (d) => this.updateLikeBtn(d));
    window.csStore.subscribe('video:commented', (c) => this.appendComment(c));
    this.bindEvents();
  },

  open(title = null, creator = null) {
    if (!this.modal) return;
    const stream = VideoTheaterService.getCurrentStream();
    if (title) stream.title = title;
    if (creator) stream.creator = creator;

    const titleEl = this.modal.querySelector('#theater-title');
    const channelEl = this.modal.querySelector('#theater-channel-name');
    const video = this.modal.querySelector('#theater-active-video');
    const subBtn = this.modal.querySelector('#btn-theater-subscribe');
    const likeBtn = this.modal.querySelector('#btn-theater-like');
    const likesCount = this.modal.querySelector('#theater-likes-count');

    if (titleEl) titleEl.textContent = stream.title;
    if (channelEl) channelEl.innerHTML = `${stream.creator} <i class="fa-solid fa-circle-check badge-verified"></i>`;
    if (likesCount) likesCount.textContent = ConnectSphereSecurity.formatNumber(stream.likes);

    if (subBtn) {
      subBtn.textContent = stream.isSubscribed ? 'Subscribed' : 'Subscribe';
      subBtn.classList.toggle('subscribed', stream.isSubscribed);
    }

    if (likeBtn) {
      likeBtn.classList.toggle('active', stream.isLiked);
    }

    this.modal.classList.add('active');
    if (video) video.play().catch(() => {});
  },

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
    const video = this.modal.querySelector('#theater-active-video');
    if (video) video.pause();
  },

  updateSubscribeBtn(data) {
    const subBtn = this.modal?.querySelector('#btn-theater-subscribe');
    if (subBtn) {
      subBtn.textContent = data.isSubscribed ? 'Subscribed' : 'Subscribe';
      subBtn.classList.toggle('subscribed', data.isSubscribed);
    }
  },

  updateLikeBtn(data) {
    const likeBtn = this.modal?.querySelector('#btn-theater-like');
    const countEl = this.modal?.querySelector('#theater-likes-count');
    if (likeBtn) likeBtn.classList.toggle('active', data.isLiked);
    if (countEl) countEl.textContent = ConnectSphereSecurity.formatNumber(data.likes);
  },

  appendComment(comment) {
    const list = this.modal?.querySelector('#theater-chat-messages');
    if (list) {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'live-chat-message';
      msgDiv.innerHTML = `<span class="user">${ConnectSphereSecurity.sanitize(comment.user)}:</span> <span>${ConnectSphereSecurity.sanitize(comment.text)}</span>`;
      list.appendChild(msgDiv);
      list.scrollTop = list.scrollHeight;
    }
  },

  bindEvents() {
    if (!this.modal) return;

    // Close button
    const closeBtn = this.modal.querySelector('#btn-close-theater-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    // Subscribe toggle
    const subBtn = this.modal.querySelector('#btn-theater-subscribe');
    if (subBtn) subBtn.addEventListener('click', () => VideoTheaterService.toggleSubscribe());

    // Like toggle
    const likeBtn = this.modal.querySelector('#btn-theater-like');
    if (likeBtn) likeBtn.addEventListener('click', () => VideoTheaterService.toggleLike());

    // Share and Save toggles
    const shareBtn = this.modal.querySelector('#btn-theater-share');
    if (shareBtn) shareBtn.addEventListener('click', () => { if (typeof showToast === 'function') showToast('Stream shared! 🚀'); });

    const saveBtn = this.modal.querySelector('#btn-theater-save');
    if (saveBtn) saveBtn.addEventListener('click', () => { if (typeof showToast === 'function') showToast('Saved to library 📥'); });

    // Comment submission
    const commentInput = this.modal.querySelector('#input-theater-comment');
    const postCommentBtn = this.modal.querySelector('#btn-theater-post-comment');

    const submitComment = () => {
      if (commentInput && commentInput.value.trim()) {
        VideoTheaterService.addComment(commentInput.value.trim());
        commentInput.value = '';
      }
    };

    if (postCommentBtn) postCommentBtn.addEventListener('click', submitComment);
    if (commentInput) {
      commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitComment();
      });
    }

    // Open from live streams list in sidebar
    document.querySelectorAll('.btn-open-theater-modal, .live-stream-item').forEach(item => {
      item.addEventListener('click', () => {
        const title = item.getAttribute('data-title') || 'Tokyo Spatial Meetup';
        const creator = item.getAttribute('data-creator') || 'Elena Rostova';
        this.open(title, creator);
      });
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TheaterRenderer;
}
