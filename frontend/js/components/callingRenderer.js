/**
 * ConnectSphere Calling Renderer
 * Manages peer call modal UI, call duration timer, media toggle feedback, and termination.
 */

const CallingRenderer = {
  modalId: 'calling-modal',

  init() {
    this.modal = document.getElementById(this.modalId);
    if (!this.modal) return;

    window.csStore.subscribe('call:started', () => this.open());
    window.csStore.subscribe('call:tick', (d) => this.updateTimer(d.seconds));
    window.csStore.subscribe('call:ended', () => this.close());
    this.bindEvents();
  },

  startCall(partnerName, type) {
    CallingService.startCall(partnerName, type);
    this.open();
  },

  endCall() {
    CallingService.endCall();
    this.close();
  },

  open() {
    if (!this.modal) return;
    const callState = CallingService.getCallState();
    const partnerEl = this.modal.querySelector('#call-partner-name');
    const typeBadge = this.modal.querySelector('#call-type-badge');

    if (partnerEl) partnerEl.textContent = callState.partnerName || 'Elena Rostova';
    if (typeBadge) typeBadge.textContent = callState.callType === 'video' ? 'Secure Video Transmission' : 'Encrypted Voice Call';

    this.modal.classList.add('active');
    this.updateTimer(0);
  },

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
  },

  updateTimer(seconds) {
    const timerEl = this.modal?.querySelector('#call-timer');
    if (!timerEl) return;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerEl.textContent = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  },

  bindEvents() {
    if (!this.modal) return;

    // End call button
    const endBtn = this.modal.querySelector('#btn-call-end');
    if (endBtn) {
      endBtn.addEventListener('click', () => CallingService.endCall());
    }

    // Mic toggle
    const micBtn = this.modal.querySelector('#btn-call-toggle-mic');
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        const isMuted = CallingService.toggleMic();
        micBtn.classList.toggle('active', isMuted);
        const icon = micBtn.querySelector('i');
        if (icon) icon.className = isMuted ? 'fa-solid fa-microphone-slash' : 'fa-solid fa-microphone';
      });
    }

    // Camera toggle
    const camBtn = this.modal.querySelector('#btn-call-toggle-cam');
    if (camBtn) {
      camBtn.addEventListener('click', () => {
        const isCamOff = CallingService.toggleCam();
        camBtn.classList.toggle('active', isCamOff);
        const icon = camBtn.querySelector('i');
        if (icon) icon.className = isCamOff ? 'fa-solid fa-video-slash' : 'fa-solid fa-video';
      });
    }

    // Screenshare toggle
    const screenBtn = this.modal.querySelector('#btn-call-screenshare');
    if (screenBtn) {
      screenBtn.addEventListener('click', () => {
        const isSharing = CallingService.toggleScreenShare();
        screenBtn.classList.toggle('active', isSharing);
      });
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CallingRenderer;
}
