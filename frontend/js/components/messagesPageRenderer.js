const MessagesPageRenderer = {
  init() {
    this.convListContainer = document.getElementById('conversations-list-container');
    this.messagesContainer = document.getElementById('chat-messages-container');
    this.infoSidebar = document.getElementById('chat-info-sidebar');
    this.inputField = document.getElementById('chat-input-field');
    this.sendBtn = document.getElementById('btn-send-message');
    
    if (!this.convListContainer) return;

    window.csStore.subscribe('conversations', () => this.render());
    window.csStore.subscribe('chat:switched', () => this.render());
    
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    if (this.sendBtn && this.inputField) {
      const sendMsg = () => {
        const text = this.inputField.value.trim();
        if (text) {
          ChatService.sendMessage(text);
          this.inputField.value = '';
        }
      };

      this.sendBtn.addEventListener('click', sendMsg);
      this.inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendMsg();
        }
      });
    }

    // Delegate clicks for conversation switching
    if (this.convListContainer) {
      this.convListContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.conversation-item');
        if (item) {
          const convId = item.dataset.id;
          if (convId) ChatService.setActiveConversation(convId);
        }
      });
    }
  },

  render() {
    this.renderConversations();
    this.renderActiveChat();
    this.renderSidebarInfo();
  },

  renderConversations() {
    if (!this.convListContainer) return;
    const convs = window.csStore.get('conversations') || [];
    const activeId = window.csStore.get('activeConversationId');

    if (convs.length === 0) {
      this.convListContainer.innerHTML = '<div style="padding: 20px; color: var(--text-muted); text-align: center;">No messages yet</div>';
      return;
    }

    this.convListContainer.innerHTML = convs.map(c => {
      const isActive = c.id === activeId || (!activeId && c === convs[0]);
      const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1].text : 'Start a conversation';
      return `
        <div class="conversation-item ${isActive ? 'active' : ''}" data-id="${c.id}">
          <div class="avatar-wrapper">
            <img src="${ConnectSphereSecurity.escapeHTML(c.partner.avatar)}" class="avatar" alt="${ConnectSphereSecurity.escapeHTML(c.partner.name)}">
            ${c.partner.status === 'online' ? '<span class="status-online-dot"></span>' : ''}
          </div>
          <div>
            <div style="font-weight: 700; font-size: 14.5px;">${ConnectSphereSecurity.escapeHTML(c.partner.name)}</div>
            <div style="font-size: 12.5px; color: ${c.unreadCount > 0 ? 'var(--text-primary); font-weight: bold;' : 'var(--text-dim);'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">
              ${ConnectSphereSecurity.escapeHTML(lastMsg)}
            </div>
          </div>
          ${c.unreadCount > 0 ? `<div style="background: var(--primary); color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; margin-left: auto;">${c.unreadCount}</div>` : ''}
        </div>
      `;
    }).join('');
  },

  renderActiveChat() {
    if (!this.messagesContainer) return;
    const activeId = window.csStore.get('activeConversationId');
    const convs = window.csStore.get('conversations') || [];
    let conv = convs.find(c => c.id === activeId);
    if (!conv && convs.length > 0) conv = convs[0];

    if (!conv) {
      this.messagesContainer.innerHTML = '<div style="padding: 20px; color: var(--text-muted); text-align: center; margin-top: auto; margin-bottom: auto;">Select a conversation to start messaging</div>';
      return;
    }

    const currentUserId = window.csStore.get('currentUser.id');
    const currentUserSupabaseId = window.csStore.get('currentUser.supabase_id');

    let html = (conv.messages || []).map(m => {
      const isOutgoing = m.sender === currentUserId || m.sender === currentUserSupabaseId;
      return `
        <div class="msg-bubble ${isOutgoing ? 'sent' : 'received'}">
          ${ConnectSphereSecurity.sanitize(m.text)}
          ${m.disappearing ? '<span style="font-size: 9px; opacity: 0.6; display: block; margin-top: 2px;">⏱ Disappears in 24h</span>' : ''}
        </div>
      `;
    }).join('');

    this.messagesContainer.innerHTML = html;
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  },

  renderSidebarInfo() {
    if (!this.infoSidebar) return;
    const activeId = window.csStore.get('activeConversationId');
    const convs = window.csStore.get('conversations') || [];
    let conv = convs.find(c => c.id === activeId);
    if (!conv && convs.length > 0) conv = convs[0];

    if (!conv) {
      this.infoSidebar.innerHTML = '';
      return;
    }

    this.infoSidebar.innerHTML = `
      <img src="${ConnectSphereSecurity.escapeHTML(conv.partner.avatar)}" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid var(--primary);" class="floating-element" alt="${ConnectSphereSecurity.escapeHTML(conv.partner.name)}">
      <h4 style="margin-top: 10px; font-size: 16px;">${ConnectSphereSecurity.escapeHTML(conv.partner.name)}</h4>
      <div style="font-size: 13px; color: var(--text-dim); margin-bottom: 5px;">${ConnectSphereSecurity.escapeHTML(conv.partner.handle)}</div>
      <span style="font-size: 12px; color: ${conv.partner.status === 'online' ? 'var(--success)' : 'var(--text-muted)'};">
        <i class="fa-solid fa-circle" style="font-size: 8px;"></i> ${conv.partner.status === 'online' ? 'Active Now' : 'Offline'}
      </span>
    `;
  }
};

window.MessagesPageRenderer = MessagesPageRenderer;
