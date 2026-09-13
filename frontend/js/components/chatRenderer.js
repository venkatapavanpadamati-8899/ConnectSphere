/**
 * ConnectSphere Chat Renderer
 * Manages the slide-up chat drawer, real-time message stream, typing indicator, and call initiations.
 */

const ChatRenderer = {
  drawerId: 'floating-chat-drawer',
  messagesContainerId: 'chat-drawer-messages',
  formId: 'floating-chat-form',

  init() {
    this.drawer = document.getElementById(this.drawerId);
    this.messagesContainer = document.getElementById(this.messagesContainerId);
    this.form = document.getElementById(this.formId);
    if (!this.drawer) return;

    window.csStore.subscribe('conversations', () => this.renderMessages());
    window.csStore.subscribe('chat:typing', (d) => this.handleTyping(d));

    this.bindEvents();
    this.renderMessages();
  },

  open() {
    if (!this.drawer) return;
    this.drawer.classList.add('active');
    ChatService.markAsRead(window.csStore.get('activeConversationId'));
    this.scrollToBottom();
  },

  close() {
    if (!this.drawer) return;
    this.drawer.classList.remove('active');
  },

  toggle() {
    if (!this.drawer) return;
    if (this.drawer.classList.contains('active')) {
      this.close();
    } else {
      this.open();
    }
  },

  renderMessages() {
    if (!this.messagesContainer) return;
    const conv = ChatService.getActiveConversation();
    if (!conv) return;

    const currentUserId = window.csStore.get('currentUser.id');

    let html = (conv.messages || []).map(m => {
      const isOutgoing = m.sender === currentUserId;
      return `
        <div class="chat-bubble ${isOutgoing ? 'outgoing' : 'incoming'}">
          ${ConnectSphereSecurity.sanitize(m.text)}
          ${m.disappearing ? '<span style="font-size: 9px; opacity: 0.6; display: block; margin-top: 2px;">⏳ Disappears in 24h</span>' : ''}
        </div>
      `;
    }).join('');

    if (conv.isTyping) {
      html += `
        <div class="chat-bubble incoming typing-bubble" style="opacity: 0.7; font-style: italic; font-size: 11px;">
          <span>${conv.partner.name} is typing...</span>
        </div>
      `;
    }

    this.messagesContainer.innerHTML = html;
    this.scrollToBottom();
  },

  handleTyping(data) {
    this.renderMessages();
  },

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  },

  bindEvents() {
    // Toggle Launcher Button
    const launcherBtn = document.getElementById('btn-toggle-floating-chat');
    if (launcherBtn) {
      launcherBtn.addEventListener('click', () => this.toggle());
    }

    // Close Button
    const closeBtn = document.getElementById('btn-close-floating-chat');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Voice & Video Call Buttons in Drawer Header
    const voiceCallBtn = document.getElementById('btn-drawer-voice-call');
    const videoCallBtn = document.getElementById('btn-drawer-video-call');

    if (voiceCallBtn) {
      voiceCallBtn.addEventListener('click', () => {
        const conv = ChatService.getActiveConversation();
        CallingService.startCall(conv?.partner?.name || 'Elena Rostova', 'voice');
        if (window.CallingRenderer) CallingRenderer.open();
      });
    }

    if (videoCallBtn) {
      videoCallBtn.addEventListener('click', () => {
        const conv = ChatService.getActiveConversation();
        CallingService.startCall(conv?.partner?.name || 'Elena Rostova', 'video');
        if (window.CallingRenderer) CallingRenderer.open();
      });
    }

    // Message Submission Form
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('floating-chat-input');
        if (input && input.value.trim()) {
          ChatService.sendMessage(input.value.trim());
          input.value = '';
        }
      });
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatRenderer;
}
