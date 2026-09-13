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
      if (!client || !window.SupabaseClient.isConfigured() || !user?.supabase_id) return;

      const { data: dbNotifs, error } = await client
        .from('notifications')
        .select('id, type, title, message, is_read, created_at')
        .eq('user_id', user.supabase_id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.warn('[NotificationService] Supabase notif fetch error:', error.message);
        return;
      }

      if (dbNotifs && dbNotifs.length > 0) {
        const formatted = dbNotifs.map(n => ({
          id: n.id,
          type: n.type || 'system',
          title: n.title,
          body: n.message,
          time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: n.is_read
        }));

        window.csStore.set('notifications', formatted);
        window.csStore.publish('notifications:loaded', formatted);
      }
    } catch (err) {
      console.warn('[NotificationService] fetch fallback error:', err);
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
          if (n.user_id !== user?.supabase_id) return;

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
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        await client.from('notifications').insert({
          user_id: user.supabase_id,
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
      if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
        await client
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.supabase_id);
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
