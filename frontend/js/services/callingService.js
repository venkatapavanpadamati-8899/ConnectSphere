/**
 * ConnectSphere Voice & Video Calling Service
 * WebRTC peer calling with Supabase Realtime broadcast signaling channel.
 * Controls peer call states, call timer, media toggles, and WebRTC integration architecture.
 */

const CallingService = {
  isInitialized: false,

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.initSignaling();
  },

  initSignaling() {
    if (typeof window.RealtimeManager !== 'undefined') {
      window.RealtimeManager.subscribeToBroadcast({
        channelName: 'call_signals',
        event: 'signaling',
        onReceive: ({ payload }) => {
          if (!payload) return;
          const currentUser = window.csStore?.get('currentUser');
          if (payload.targetUserId && payload.targetUserId === currentUser?.supabase_id) {
            this.handleIncomingSignal(payload);
          }
        }
      });
    }
  },

  handleIncomingSignal(signal) {
    if (signal.type === 'offer') {
      if (typeof showToast === 'function') {
        showToast(`Incoming ${signal.callType} call from ${signal.callerName || 'Peer'}... 📞`);
      }
      window.csStore.publish('call:incoming', signal);
    } else if (signal.type === 'hangup') {
      this.endCall(false);
    }
  },

  getCallState() {
    return window.csStore.get('calling') || {};
  },

  async startCall(partnerName = 'Elena Rostova', type = 'voice', targetUserId = null) {
    const calling = this.getCallState();
    calling.isActive = true;
    calling.partnerName = partnerName;
    calling.callType = type;
    calling.durationSeconds = 0;
    calling.isMuted = false;
    calling.isCamOff = (type === 'voice');
    calling.isScreenSharing = false;
    calling.callId = (typeof ConnectSphereSecurity !== 'undefined' ? ConnectSphereSecurity.generateId('call') : `call_${Date.now()}`);

    window.csStore.set('calling', { ...calling });
    window.csStore.publish('call:started', calling);

    if (typeof showToast === 'function') {
      showToast(`Initiating peer connection with ${partnerName}... 📞✨`);
    }

    this.startTimer();

    // Broadcast signaling offer via Supabase Realtime
    if (typeof window.RealtimeManager !== 'undefined') {
      const user = window.csStore?.get('currentUser');
      window.RealtimeManager.sendBroadcast('call_signals', 'signaling', {
        type: 'offer',
        callId: calling.callId,
        callType: type,
        callerId: user?.supabase_id || user?.id,
        callerName: user?.name,
        targetUserId
      });
    }

    // Supabase DB call record
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore?.get('currentUser');
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        await client.from('calls').insert({
          id: calling.callId,
          caller_id: user.supabase_id,
          call_type: type,
          status: 'initiated'
        });
      }
    } catch (err) {
      console.warn('[CallingService] Supabase call record error:', err);
    }

    return calling;
  },

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      const calling = this.getCallState();
      if (!calling.isActive) {
        this.stopTimer();
        return;
      }
      calling.durationSeconds += 1;
      window.csStore.set('calling', { ...calling });
      window.csStore.publish('call:tick', { seconds: calling.durationSeconds });
    }, 1000);
  },

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  toggleMic() {
    const calling = this.getCallState();
    calling.isMuted = !calling.isMuted;
    window.csStore.set('calling', { ...calling });
    window.csStore.publish('call:mic_toggled', { isMuted: calling.isMuted });
    if (typeof showToast === 'function') {
      showToast(calling.isMuted ? 'Microphone muted 🔇' : 'Microphone unmuted 🎙️');
    }
    return calling.isMuted;
  },

  toggleCam() {
    const calling = this.getCallState();
    calling.isCamOff = !calling.isCamOff;
    window.csStore.set('calling', { ...calling });
    window.csStore.publish('call:cam_toggled', { isCamOff: calling.isCamOff });
    if (typeof showToast === 'function') {
      showToast(calling.isCamOff ? 'Video camera disabled 📷' : 'Video camera enabled 🎥');
    }
    return calling.isCamOff;
  },

  toggleScreenShare() {
    const calling = this.getCallState();
    calling.isScreenSharing = !calling.isScreenSharing;
    window.csStore.set('calling', { ...calling });
    window.csStore.publish('call:screen_toggled', { isScreenSharing: calling.isScreenSharing });
    if (typeof showToast === 'function') {
      showToast(calling.isScreenSharing ? 'Screen stream active 💻' : 'Screen stream ended');
    }
    return calling.isScreenSharing;
  },

  async endCall(broadcast = true) {
    this.stopTimer();
    const calling = this.getCallState();
    const duration = calling.durationSeconds || 0;
    const partner = calling.partnerName;
    const callId = calling.callId;

    // Log call to history
    calling.history = calling.history || [];
    calling.history.unshift({
      id: callId || (typeof ConnectSphereSecurity !== 'undefined' ? ConnectSphereSecurity.generateId('call') : `call_${Date.now()}`),
      partner,
      type: calling.callType,
      duration,
      timestamp: new Date().toISOString()
    });

    calling.isActive = false;
    calling.durationSeconds = 0;
    window.csStore.set('calling', { ...calling });
    window.csStore.publish('call:ended', { duration, partner });

    if (typeof showToast === 'function') {
      showToast(`Call ended (${Math.floor(duration / 60)}m ${duration % 60}s)`);
    }

    if (broadcast && typeof window.RealtimeManager !== 'undefined') {
      window.RealtimeManager.sendBroadcast('call_signals', 'signaling', {
        type: 'hangup',
        callId
      });
    }

    // Supabase DB update
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (client && window.SupabaseClient.isConfigured() && callId) {
        await client
          .from('calls')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            duration_seconds: duration
          })
          .match({ id: callId });
      }
    } catch (err) {
      console.warn('[CallingService] endCall sync error:', err);
    }
  }
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CallingService;
}

if (typeof window !== 'undefined') {
  window.CallingService = CallingService;
}
