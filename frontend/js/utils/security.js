/**
 * ConnectSphere Security & Formatting Utilities
 * Provides XSS sanitization, input validation, safe date formatting, and token handling.
 */

const ConnectSphereSecurity = {
  /**
   * Basic HTML sanitization to prevent XSS injection
   */
  sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * Sanitizes rich text while preserving simple allowed tags (e.g. hashtags, em)
   */
  formatCaption(text) {
    if (!text) return '';
    const safeText = this.sanitize(text);
    // Auto-link hashtags
    const withHashtags = safeText.replace(/#(\w+)/g, '<span class="post-hashtag" data-tag="$1">#$1</span>');
    // Auto-link mentions
    const withMentions = withHashtags.replace(/@(\w+)/g, '<span class="post-mention" data-user="$1">@$1</span>');
    return withMentions;
  },

  /**
   * Formats relative timestamps (e.g. "2m ago", "1h ago", "Just now")
   */
  formatTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    const now = Date.now();
    const diff = Math.max(0, now - new Date(timestamp).getTime());
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  /**
   * Format numbers into compact units (e.g. 1.2K, 3.4M)
   */
  formatNumber(num) {
    if (typeof num !== 'number') num = parseInt(num, 10) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(num);
  },

  /**
   * Generate safe unique IDs
   */
  generateId(prefix = 'cs') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConnectSphereSecurity;
}
