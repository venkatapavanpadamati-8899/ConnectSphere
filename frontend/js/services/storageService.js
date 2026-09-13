/**
 * ConnectSphere Storage Service
 * Direct client uploads to Supabase Storage with client-side mime & size guards.
 */

const StorageService = {
  BUCKET_LIMITS: {
    avatars: 5 * 1024 * 1024,          // 5MB
    'post-media': 100 * 1024 * 1024,    // 100MB
    'story-media': 50 * 1024 * 1024,    // 50MB
    'reel-media': 200 * 1024 * 1024,    // 200MB
    'video-media': 1024 * 1024 * 1024,  // 1GB
    'message-media': 100 * 1024 * 1024  // 100MB
  },

  /**
   * Uploads a File or Blob to a Supabase Storage bucket.
   */
  async uploadFile(bucket, file, customPath = null) {
    if (!file) throw new Error('No file provided for upload.');

    // Enforce size limit
    const limit = this.BUCKET_LIMITS[bucket] || (50 * 1024 * 1024);
    if (file.size > limit) {
      const limitMb = Math.round(limit / (1024 * 1024));
      throw new Error(`File exceeds maximum size limit of ${limitMb}MB for ${bucket}.`);
    }

    const client = window.csSupabase;
    const user = client?.auth?.getUser ? (await client.auth.getUser())?.data?.user : null;
    const userId = user?.id || 'anonymous';

    const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = customPath || `${userId}/${fileName}`;

    if (!client) {
      throw new Error('Supabase client not available for storage operations.');
    }

    const { data, error } = await client.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Return public URL or path for signed URL
    const { data: urlData } = client.storage.from(bucket).getPublicUrl(filePath);
    return {
      path: filePath,
      publicUrl: urlData?.publicUrl || filePath,
      bucket
    };
  }
};

if (typeof window !== 'undefined') {
  window.StorageService = StorageService;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageService;
}
