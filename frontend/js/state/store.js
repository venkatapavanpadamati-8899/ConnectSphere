/**
 * ConnectSphere Central Reactive State Store
 * Manages client-first persistence, reactive event publishing, and domain state.
 */

class ConnectSphereStateStore {
  constructor() {
    this.storageKey = 'connectsphere_platform_state_v3';
    this.subscribers = new Map();
    this.state = this.loadInitialState();
  }

  getDefaultData() {
    return {
      currentUser: null,

      activeTab: 'forYou', // forYou, following, latest, communities, spatial, global
      activeFilterTag: null,

      posts: [],
      stories: [],
      reels: [],
      conversations: [],
      activeConversationId: null,

      calling: {
        isActive: false,
        partnerName: 'Unknown',
        partnerAvatar: '',
        callType: 'voice',
        durationSeconds: 0,
        isMuted: false,
        isCamOff: false,
        isScreenSharing: false,
        history: []
      },

      snaps: [],

      videoTheater: {
        currentStream: null
      },

      creatorStats: {
        followers: 0,
        followersGrowth: '+0 this month',
        reach: '0',
        impressions: '0',
        engagementRate: '0%',
        likesTotal: '0',
        commentsTotal: '0',
        sharesTotal: '0',
        estimatedRevenue: '$0.00',
        tokenEarnings: '0 SPHERE'
      },

      notifications: [],
      communities: [],
      searchHistory: [],
      trendingTopics: []
    };
  }

  loadInitialState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with default data to guarantee non-broken structure if schema updates
        return { ...this.getDefaultData(), ...parsed };
      }
    } catch (e) {
      console.warn('Could not load cached state, using default schema:', e);
    }
    return this.getDefaultData();
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Storage quota exceeded or private mode, state stored in memory only:', e);
    }
  }

  get(path) {
    if (!path) return this.state;
    const keys = path.split('.');
    let current = this.state;
    for (const key of keys) {
      if (current == null) return undefined;
      current = current[key];
    }
    return current;
  }

  set(path, value) {
    const keys = path.split('.');
    let current = this.state;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) current[key] = {};
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    this.save();
    this.publish(path, value);
    this.publish('*', { path, value, state: this.state });
  }

  subscribe(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event).add(callback);
    return () => this.subscribers.get(event)?.delete(callback);
  }

  publish(event, data) {
    if (this.subscribers.has(event)) {
      this.subscribers.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (err) {
        }
      });
    }
  }

  reset() {
    this.state = this.getDefaultData();
    this.save();
    this.publish('*', { reset: true, state: this.state });
  }
}

// Global Singleton Instance
window.csStore = new ConnectSphereStateStore();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConnectSphereStateStore;
}
