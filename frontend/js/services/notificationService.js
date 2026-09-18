/**
 * ConnectSphere Notification Service
 * Supabase-first notification dispatch, real-time unread badges, and read status updates.
 */

const NotificationService = {
  isInitialized: false,

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    await this.fetchNotificationsFromSupabase();
    this.subscribeToRealtimeNotifications();
  },

  async fetchNotificationsFromSupabase() {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore?.get('currentUser');
      const userId = user?.supabase_id || user?.id;
      if (!client || !window.SupabaseClient.isConfigured() || !userId) return;

      let dbNotifs = null;
      // Try with actor profile join
      const { data, error } = await client
        .from('notifications')
        .select('id, actor_id, type, title, message, is_read, resource_id, resource_type, created_at, profiles!actor_id(id, full_name, username, avatar_url)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        // Fallback without join in case constraint name varies
        const { data: fallbackData, error: fallbackError } = await client
          .from('notifications')
          .select('id, actor_id, type, title, message, is_read, resource_id, resource_type, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30);
        if (fallbackError) {
          console.warn('[NotificationService] Supabase notif fetch error:', fallbackError.message);
          return;
        }
        dbNotifs = fallbackData;
      } else {
        dbNotifs = data;
      }

      if (dbNotifs) {
        const formatted = dbNotifs.map(n => {
          const actor = n.profiles || null;
          let timeStr = 'Recently';
          try {
            if (typeof ConnectSphereSecurity !== 'undefined' && ConnectSphereSecurity.formatTimeAgo) {
              timeStr = ConnectSphereSecurity.formatTimeAgo(n.created_at);
            } else {
              timeStr = new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
          } catch (_) {}

          return {
            id: n.id,
            actorId: n.actor_id || actor?.id,
            actorName: actor?.full_name || n.title || 'Someone',
            actorUsername: actor?.username || '',
            actorAvatar: actor?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
            type: n.type || 'system',
            title: n.title,
            body: n.message,
            time: timeStr,
            isRead: !!n.is_read,
            resourceId: n.resource_id,
            resourceType: n.resource_type
          };
        });

        window.csStore.set('notifications', formatted);
        window.csStore.publish('notifications:loaded', formatted);
      }
    } catch (err) {
      console.warn('[NotificationService] fetch error:', err);
    }
  },

  subscribeToRealtimeNotifications() {
    if (typeof window.RealtimeManager !== 'undefined') {
      window.RealtimeManager.subscribeToTable({
        channelName: 'notifications:realtime',
        table: 'notifications',
        event: 'INSERT',
        onInsert: (newRow) => {
          const n = newRow;
          const user = window.csStore?.get('currentUser');
          const userId = user?.supabase_id || user?.id;
          if (n.user_id !== userId) return;

          const notif = {
            id: n.id,
            type: n.type || 'system',
            title: n.title,
            body: n.message,
            time: 'Just now',
            isRead: false
          };

          const notifs = this.getNotifications();
          window.csStore.set('notifications', [notif, ...notifs]);
          window.csStore.publish('notification:received', notif);

          if (typeof showToast === 'function') {
            showToast(`🔔 ${notif.title}: ${notif.body}`);
          }
        }
      });
    }
  },

  getNotifications() {
    return window.csStore.get('notifications') || [];
  },

  getUnreadCount() {
    const notifs = this.getNotifications();
    return notifs.filter(n => !n.isRead).length;
  },

  async addNotification({ type = 'system', title = '', body = '' }) {
    const notifs = this.getNotifications();
    const newNotif = {
      id: (typeof ConnectSphereSecurity !== 'undefined' ? ConnectSphereSecurity.generateId('notif') : `notif_${Date.now()}`),
      type,
      title,
      body,
      time: 'Just now',
      isRead: false
    };

    window.csStore.set('notifications', [newNotif, ...notifs]);
    window.csStore.publish('notification:received', newNotif);

    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore?.get('currentUser');
      const userId = user?.supabase_id || user?.id;
      if (client && window.SupabaseClient.isConfigured() && userId) {
        await client.from('notifications').insert({
          user_id: userId,
          type,
          title,
          message: body
        });
      }
    } catch (err) {
      console.warn('[NotificationService] addNotification sync error:', err);
    }

    return newNotif;
  },

  async markAllAsRead() {
    const notifs = this.getNotifications();
    notifs.forEach(n => n.isRead = true);
    window.csStore.set('notifications', [...notifs]);
    window.csStore.publish('notification:all_read', {});

    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore?.get('currentUser');
      const userId = user?.supabase_id || user?.id;
      if (client && window.SupabaseClient.isConfigured() && userId) {
        await client
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId);
      }
    } catch (err) {
      console.warn('[NotificationService] markAllAsRead sync error:', err);
    }
  },

  async markAsRead(notifId) {
    const notifs = this.getNotifications();
    const notif = notifs.find(n => n.id === notifId);
    if (notif) {
      notif.isRead = true;
      window.csStore.set('notifications', [...notifs]);
      window.csStore.publish('notification:read', { notifId });

      try {
        const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
        if (client && window.SupabaseClient.isConfigured()) {
          await client
            .from('notifications')
            .update({ is_read: true })
            .match({ id: notifId });
        }
      } catch (err) {
        console.warn('[NotificationService] markAsRead sync error:', err);
      }
    }
  }
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationService;
}

if (typeof window !== 'undefined') {
  window.NotificationService = NotificationService;
}
