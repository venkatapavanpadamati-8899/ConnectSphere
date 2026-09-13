/**
 * ConnectSphere Realtime Subscription Manager
 * Safely coordinates Supabase Realtime channels (postgres_changes, broadcast, presence).
 * Prevents memory leaks, duplicate channels, and stale listeners.
 */

const RealtimeManager = {
  channels: new Map(),

  /**
   * Subscribes to a Realtime channel or returns existing active channel.
   * @param {string} channelName - Unique channel name (e.g., 'room:conversations:123')
   * @param {Object} config - Channel configuration parameters
   * @returns {Object} Active Supabase Realtime Channel
   */
  getOrCreateChannel(channelName, config = {}) {
    if (!window.csSupabase || typeof window.csSupabase.channel !== 'function') {
      return null;
    }

    if (this.channels.has(channelName)) {
      return this.channels.get(channelName);
    }

    const channel = window.csSupabase.channel(channelName, config);
    this.channels.set(channelName, channel);
    return channel;
  },

  /**
   * Subscribes to database row changes with duplicate protection.
   */
  subscribeToTable({ channelName, table, filter, event = '*', onInsert, onUpdate, onDelete, onChange }) {
    const channel = this.getOrCreateChannel(channelName);
    if (!channel) return null;

    const opts = { event, schema: 'public', table };
    if (filter) opts.filter = filter;

    channel.on('postgres_changes', opts, (payload) => {
      if (onChange) onChange(payload);
      if (payload.eventType === 'INSERT' && onInsert) onInsert(payload.new);
      if (payload.eventType === 'UPDATE' && onUpdate) onUpdate(payload.new, payload.old);
      if (payload.eventType === 'DELETE' && onDelete) onDelete(payload.old);
    });

    channel.subscribe((status, err) => {
      if (err) console.warn(`[RealtimeManager] Error on ${channelName}:`, err);
    });

    return channel;
  },

  /**
   * Subscribes to broadcast events (e.g. WebRTC calling signaling, typing indicators).
   */
  subscribeToBroadcast({ channelName, event, onReceive }) {
    const channel = this.getOrCreateChannel(channelName);
    if (!channel) return null;

    channel.on('broadcast', { event }, (payload) => {
      if (onReceive) onReceive(payload.payload);
    });

    channel.subscribe();
    return channel;
  },

  /**
   * Sends a broadcast message over an existing channel.
   */
  async sendBroadcast(channelName, event, payload) {
    const channel = this.getOrCreateChannel(channelName);
    if (!channel) return false;

    return await channel.send({
      type: 'broadcast',
      event,
      payload
    });
  },

  /**
   * Tracks user presence on a channel.
   */
  trackPresence(channelName, userState, onSync, onJoin, onLeave) {
    const channel = this.getOrCreateChannel(channelName, {
      config: { presence: { key: userState.id || 'anonymous' } }
    });
    if (!channel) return null;

    if (onSync) channel.on('presence', { event: 'sync' }, () => onSync(channel.presenceState()));
    if (onJoin) channel.on('presence', { event: 'join' }, ({ key, newPresences }) => onJoin(key, newPresences));
    if (onLeave) channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => onLeave(key, leftPresences));

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(userState);
      }
    });

    return channel;
  },

  /**
   * Safely unsubscribes and cleans up a specific channel.
   */
  async unsubscribe(channelName) {
    if (this.channels.has(channelName)) {
      const channel = this.channels.get(channelName);
      try {
        await channel.unsubscribe();
      } catch (_) {}
      this.channels.delete(channelName);
    }
  },

  /**
   * Cleans up all active subscriptions. Called on page unload or component teardown.
   */
  async cleanupAll() {
    for (const [name, channel] of this.channels.entries()) {
      try {
        await channel.unsubscribe();
      } catch (_) {}
    }
    this.channels.clear();
  }
};

// Global automatic cleanup on page navigation
if (typeof window !== 'undefined') {
  window.RealtimeManager = RealtimeManager;
  window.addEventListener('beforeunload', () => RealtimeManager.cleanupAll());
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RealtimeManager;
}
