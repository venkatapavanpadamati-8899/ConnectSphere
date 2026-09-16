/**
 * ConnectSphere Chat & Real-Time Messaging Service
 * Supabase-first real-time messaging, typing broadcast, presence, and conversation synchronization.
 */

const ChatService = {
  isInitialized: false,
  messageChannel: null,

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    await this.fetchConversationsFromSupabase();
    this.subscribeToRealtimeMessages();
  },

  async fetchConversationsFromSupabase() {
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      const user = window.csStore?.get('currentUser');
      if (!client || !window.SupabaseClient.isConfigured() || !user?.supabase_id) return;

      const { data: convMembers, error } = await client
        .from('conversation_members')
        .select(`
          conversation_id, role,
          conversations (
            id, type, title, avatar_url, created_at,
            messages ( id, sender_id, text, is_disappearing, created_at ),
            conversation_members ( user_id, profiles ( id, full_name, username, avatar_url, is_verified ) )
          )
        `)
        .eq('user_id', user.supabase_id);

      if (error) {
        console.warn('[ChatService] Supabase conversation fetch error:', error.message);
        return;
      }
      console.log('[ChatService] Fetched convMembers:', JSON.stringify(convMembers));

      if (convMembers && convMembers.length > 0) {
        const formatted = convMembers.map(cm => {
          const c = cm.conversations || {};
          let msgs = (c.messages || []).map(m => ({
            id: m.id,
            sender: m.sender_id,
            text: m.text || '',
            type: 'text',
            mediaUrl: null,
            timestamp: m.created_at,
            isRead: true,
            disappearing: m.is_disappearing || false
          }));
          msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

          // Find partner
          const members = c.conversation_members || [];
          let partnerMember = members.find(m => m.user_id !== user.supabase_id);
          if (!partnerMember && members.length > 0) partnerMember = members[0]; // fallback to self if self-chat
          
          const partnerProfile = partnerMember?.profiles || {};

          return {
            id: c.id,
            partner: {
              id: partnerProfile.id || 'peer-db',
              name: partnerProfile.full_name || c.title || 'Unknown',
              handle: partnerProfile.username || '@unknown',
              avatar: partnerProfile.avatar_url || c.avatar_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
              status: 'online'
            },
            disappearingMode: c.is_disappearing || false,
            unreadCount: cm.unread_count || 0,
            messages: msgs
          };
        });

        window.csStore.set('conversations', formatted);
        window.csStore.publish('chat:conversations_loaded', formatted);
      }
    } catch (err) {
      console.warn('[ChatService] fetchConversations fallback error:', err);
    }
  },

  subscribeToRealtimeMessages() {
    if (this._isRealtimeSubscribed) return;
    this._isRealtimeSubscribed = true;

    if (typeof window.RealtimeManager !== 'undefined') {
      this.messageChannel = window.RealtimeManager.subscribeToTable({
        channelName: 'chat:messages:realtime',
        table: 'messages',
        event: 'INSERT',
        onInsert: (newRow) => this.handleIncomingRealtimeMessage({ new: newRow })
      });

      this.reactionChannel = window.RealtimeManager.subscribeToTable({
        channelName: 'chat:reactions:realtime',
        table: 'message_reactions',
        event: 'INSERT',
        onInsert: (newRow) => this.handleIncomingReaction({ new: newRow })
      });

      // Typing indicators via broadcast
      this.typingChannel = window.RealtimeManager.subscribeToBroadcast({
        channelName: 'chat_signals',
        event: 'typing',
        onReceive: ({ payload }) => {
          if (payload?.convId && payload?.senderId !== window.csStore?.get('currentUser')?.id) {
            const convs = this.getConversations();
            const conv = convs.find(c => c.id === payload.convId);
            if (conv) {
              conv.isTyping = payload.isTyping;
              window.csStore.publish('chat:typing', { convId: payload.convId, isTyping: payload.isTyping });
            }
          }
        }
      });
    }
  },

  handleIncomingReaction(payload) {
    if (!payload || !payload.new) return;
    const reaction = payload.new;
    const currentUser = window.csStore.get('currentUser');
    if (reaction.user_id === currentUser?.supabase_id) return; // Ignore own echoes

    // Update local state if we have the message loaded
    const convs = this.getConversations();
    for (const conv of convs) {
      if (!conv.messages) continue;
      const msg = conv.messages.find(m => m.id === reaction.message_id);
      if (msg) {
        if (!msg.reactions) msg.reactions = [];
        msg.reactions.push(reaction);
        window.csStore.set('conversations', [...convs]);
        window.csStore.publish('chat:reaction_received', { convId: conv.id, reaction });
        break;
      }
    }
  },

  handleIncomingRealtimeMessage(payload) {
    if (!payload || !payload.new) return;
    const msg = payload.new;
    const currentUser = window.csStore.get('currentUser');
    if (msg.sender_id === currentUser?.supabase_id) return; // Ignore own echoes

    const convs = this.getConversations();
    const conv = convs.find(c => c.id === msg.conversation_id);
    if (!conv) return;

    const formattedMsg = {
      id: msg.id,
      sender: msg.sender_id,
      text: msg.text || '', // Fixed text/content field mapping
      type: 'text', // In schema it doesn't have message_type, but let's default to text
      mediaUrl: null, // Attachments are in a separate table
      timestamp: msg.created_at,
      isRead: false,
      disappearing: msg.is_disappearing || false
    };

    if (!conv.messages) conv.messages = [];
    conv.messages.push(formattedMsg);
    conv.unreadCount = (conv.unreadCount || 0) + 1;
    window.csStore.set('conversations', [...convs]);
    window.csStore.publish('chat:message_received', { convId: conv.id, message: formattedMsg });

    if (typeof showToast === 'function') {
      showToast(`New message from ${conv.partner?.name || 'Peer'} 💬`);
    }
  },

  getConversations() {
    return window.csStore.get('conversations') || [];
  },

  getActiveConversation() {
    const activeId = window.csStore.get('activeConversationId');
    const convs = this.getConversations();
    return convs.find(c => c.id === activeId) || convs[0];
  },

  async startOrGetConversation(partnerSupabaseId) {
    const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
    const user = window.csStore?.get('currentUser');
    if (!client || !window.SupabaseClient.isConfigured() || !user?.supabase_id) return null;

    const convs = this.getConversations();
    let existing = convs.find(c => c.partner?.id === partnerSupabaseId);
    if (existing) {
      this.setActiveConversation(existing.id);
      return existing;
    }

      const { data: newConv, error: convError } = await client
        .from('conversations')
        .insert({ type: 'direct', created_by: user.supabase_id })
        .select()
        .single();

    if (convError || !newConv) {
      console.warn('[ChatService] Error creating conversation:', convError);
      return null;
    }

        // Insert creator first as admin so they have permission to add others
        const { error: adminErr } = await client.from('conversation_members').insert({ 
          conversation_id: newConv.id, 
          user_id: user.supabase_id,
          role: 'admin'
        });
        if (adminErr) console.error('[ChatService] Error inserting admin:', adminErr);
        
        // Then insert partner
        const { error: partnerErr } = await client.from('conversation_members').insert({ 
          conversation_id: newConv.id, 
          user_id: partnerSupabaseId 
        });
        if (partnerErr) console.error('[ChatService] Error inserting partner:', partnerErr);

    await this.fetchConversationsFromSupabase();
    const updatedConvs = this.getConversations();
    existing = updatedConvs.find(c => c.id === newConv.id);
    if (existing) {
      this.setActiveConversation(existing.id);
    }
    return existing;
  },

  setActiveConversation(convId) {
    window.csStore.set('activeConversationId', convId);
    this.markAsRead(convId);
    window.csStore.publish('chat:switched', { convId });
  },

  async sendMessage(text, type = 'text', mediaUrl = null) {
    if ((!text || !text.trim()) && !mediaUrl) return null;

    const conv = this.getActiveConversation();
    if (!conv) return null;

    const currentUser = window.csStore.get('currentUser');
    const newMsg = {
      id: (typeof ConnectSphereSecurity !== 'undefined' ? ConnectSphereSecurity.generateId('msg') : `msg_${Date.now()}`),
      sender: currentUser.id,
      text: text ? text.trim() : '',
      type,
      mediaUrl,
      timestamp: new Date().toISOString(),
      isRead: true,
      disappearing: conv.disappearingMode
    };

    conv.messages.push(newMsg);
    const convs = this.getConversations();
    window.csStore.set('conversations', [...convs]);
    window.csStore.publish('chat:message_sent', { convId: conv.id, message: newMsg });

    // Supabase persistence
    try {
      const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
      if (client && window.SupabaseClient.isConfigured() && currentUser?.supabase_id) {
        await client.from('messages').insert({
          conversation_id: conv.id,
          sender_id: currentUser.supabase_id,
          text: text ? text.trim() : ''
        });
      }
    } catch (err) {
      console.warn('[ChatService] Supabase message insert error:', err);
    }

    return newMsg;
  },

  sendStoryReaction(creatorName, reactionEmoji) {
    const convs = this.getConversations();
    const conv = convs.find(c => c.partner?.name?.toLowerCase() === creatorName.toLowerCase()) || convs[0];
    if (!conv) return;

    const currentUser = window.csStore.get('currentUser');
    const newMsg = {
      id: (typeof ConnectSphereSecurity !== 'undefined' ? ConnectSphereSecurity.generateId('msg') : `msg_${Date.now()}`),
      sender: currentUser.id,
      text: `Reacted ${reactionEmoji} to your transmission`,
      type: 'reaction',
      timestamp: new Date().toISOString(),
      isRead: true
    };

    conv.messages.push(newMsg);
    window.csStore.set('conversations', [...convs]);
    window.csStore.publish('chat:message_sent', { convId: conv.id, message: newMsg });
  },

  sendTypingSignal(convId, isTyping) {
    if (typeof window.RealtimeManager !== 'undefined') {
      window.RealtimeManager.sendBroadcast('chat_signals', 'typing', {
        convId,
        senderId: window.csStore.get('currentUser')?.id,
        isTyping
      });
    }
  },

  simulatePeerResponse(convId) {
    const convs = this.getConversations();
    const conv = convs.find(c => c.id === convId);
    if (!conv) return;

    // Trigger typing indicator
    conv.isTyping = true;
    window.csStore.publish('chat:typing', { convId, isTyping: true });

    setTimeout(() => {
      conv.isTyping = false;
      const responses = [
        "Transmitting audio packets through Tokyo gateway right now! 🌐",
        "Received loud and clear! The cryptographic mesh verified instantly. ⚡",
        "Let's sync up in the Video Theater session shortly! 🎥",
        "Checked the logs — zero packet loss over the European node. Fantastic work! 🚀"
      ];
      const randomReply = responses[Math.floor(Math.random() * responses.length)];

      const peerMsg = {
        id: (typeof ConnectSphereSecurity !== 'undefined' ? ConnectSphereSecurity.generateId('msg') : `msg_${Date.now()}`),
        sender: conv.partner.id,
        text: randomReply,
        type: 'text',
        timestamp: new Date().toISOString(),
        isRead: false
      };

      conv.messages.push(peerMsg);
      conv.unreadCount = (conv.unreadCount || 0) + 1;
      window.csStore.set('conversations', [...convs]);
      window.csStore.publish('chat:message_received', { convId, message: peerMsg });

      if (typeof showToast === 'function') {
        showToast(`New message from ${conv.partner.name} 💬`);
      }
    }, 2200);
  },

  async markAsRead(convId) {
    const convs = this.getConversations();
    const conv = convs.find(c => c.id === convId);
    if (conv) {
      conv.unreadCount = 0;
      conv.messages.forEach(m => m.isRead = true);
      window.csStore.set('conversations', [...convs]);
      window.csStore.publish('chat:read', { convId });

      try {
        const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
        const user = window.csStore.get('currentUser');
        if (client && window.SupabaseClient.isConfigured() && user?.supabase_id) {
          await client
            .from('conversation_members')
            .update({ unread_count: 0 })
            .match({ conversation_id: convId, user_id: user.supabase_id });
        }
      } catch (err) {
        console.warn('[ChatService] markAsRead sync error:', err);
      }
    }
  },

  async toggleDisappearingMode(convId) {
    const convs = this.getConversations();
    const conv = convs.find(c => c.id === convId);
    if (conv) {
      conv.disappearingMode = !conv.disappearingMode;
      window.csStore.set('conversations', [...convs]);
      window.csStore.publish('chat:disappearing_toggled', { convId, disappearingMode: conv.disappearingMode });
      if (typeof showToast === 'function') {
        showToast(conv.disappearingMode ? 'Disappearing messages activated (24h) ⏳' : 'Disappearing messages deactivated');
      }

      try {
        const client = window.SupabaseClient ? window.SupabaseClient.getClient() : null;
        if (client && window.SupabaseClient.isConfigured()) {
          await client
            .from('conversations')
            .update({ is_disappearing: conv.disappearingMode })
            .match({ id: convId });
        }
      } catch (err) {
        console.warn('[ChatService] toggleDisappearingMode sync error:', err);
      }
    }
  }
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatService;
}

if (typeof window !== 'undefined') {
  window.ChatService = ChatService;
}
