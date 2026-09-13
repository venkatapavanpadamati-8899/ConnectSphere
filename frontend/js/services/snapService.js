/**
 * ConnectSphere Snap-Style Disappearing Media Service
 * Supabase-first view-once temporary media countdowns, self-destruction, and screenshot warning notices.
 */

const SnapService = {
  getSnaps() {
    return window.csStore.get('snaps') || [];
  },

  openSnap(snapId = null, mediaUrl = null) {
    const snaps = this.getSnaps();
    let snap = null;
    if (snapId && typeof snapId === 'string' && snapId.startsWith('snap-')) {
      snap = snaps.find(s => s.id === snapId);
    } else if (snapId && typeof snapId === 'string') {
      snap = {
        id: 'snap-temp',
        sender: snapId,
        mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000',
        secondsTotal: 10
      };
    } else {
      snap = snaps[0];
    }
    if (!snap) return null;

    snap.countdown = snap.secondsTotal || 10;
    const modal = document.getElementById('snap-media-modal');
    if (modal) {
      modal.classList.add('active');
      const senderEl = modal.querySelector('#snap-sender-name');
      const imgEl = modal.querySelector('#snap-image-view');
      const timerEl = modal.querySelector('#snap-seconds-left');
      if (senderEl) senderEl.textContent = snap.sender || snap.creator || 'Sofia Chen';
      if (imgEl) imgEl.src = snap.mediaUrl;
      if (timerEl) timerEl.textContent = snap.countdown + 's';
    }

    window.csStore.publish('snap:opened', snap);
    this.startCountdown(snap);
    return snap;
  },

  closeSnap() {
    this.stopCountdown();
    const modal = document.getElementById('snap-media-modal');
    if (modal) modal.classList.remove('active');
    window.csStore.publish('snap:closed');
  },

  startCountdown(snap) {
    this.stopCountdown();
    this.interval = setInterval(() => {
      snap.countdown -= 1;
      window.csStore.publish('snap:tick', { seconds: snap.countdown });

      if (snap.countdown <= 0) {
        this.destroySnap(snap.id);
      }
    }, 1000);
  },

  stopCountdown() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },

  async destroySnap(snapId) {
    this.closeSnap();
    const snaps = this.getSnaps();
    const filtered = snaps.filter(s => s.id !== snapId);
    window.csStore.set('snaps', filtered);
    window.csStore.publish('snap:destroyed', { snapId });

    if (typeof showToast === 'function') {
      showToast('View-once transmission has self-destructed 💥🔥');
    }

    // Supabase self-destruct update
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (client && window.SupabaseClient.isConfigured() && snapId && snapId !== 'snap-temp') {
        await client
          .from('disappearing_messages')
          .delete()
          .match({ id: snapId });
      }
    } catch (err) {
      console.warn('[SnapService] destroySnap sync error:', err);
    }
  },

  reportScreenshot(snapId) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Screenshot alert broadcasted to sender!');
    }
    window.csStore.publish('snap:screenshot_detected', { snapId });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SnapService;
}

if (typeof window !== 'undefined') {
  window.SnapService = SnapService;
}
