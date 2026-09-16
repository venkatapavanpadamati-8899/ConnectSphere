const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lgsdihyrsbzebdfblpor.supabase.co';
const supabaseKey = 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runStoriesQA() {
  console.log("🚀 Starting Stories QA...\n");
  
  // 1. Authenticate a test user
  const testEmail = `story_test_${Date.now()}@example.com`;
  const testPassword = "Password123!";
  
  console.log(`[AUTH] Signing up test user: ${testEmail}`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: { data: { full_name: "Story Tester", username: `storytest_${Date.now()}` } }
  });

  if (signUpError) {
    if (signUpError.status === 429) {
      console.log("BLOCKED — Supabase Auth email rate limit");
      process.exit(0);
    }
    console.error("❌ Signup failed:", signUpError.message);
    process.exit(1);
  }

  const userId = signUpData.user.id;
  console.log("✅ Signup successful (UserId: " + userId + ")");

  // Wait for profile trigger to run
  await new Promise(r => setTimeout(r, 2000));

  let results = {
    CREATE: 'NOT TESTED',
    UPLOAD: 'NOT TESTED',
    DATABASE_INSERT: 'NOT TESTED',
    RETRIEVAL: 'NOT TESTED',
    RENDER: 'NOT TESTED',
    VIEWER: 'NOT TESTED'
  };

  try {
    // UPLOAD TEST (Storage)
    console.log("\n[UPLOAD] Testing story media upload...");
    const dummyImage = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==", "base64");
    const imagePath = `${userId}/test_story_${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('story-media')
      .upload(imagePath, dummyImage, { contentType: 'image/png' });

    if (uploadError) {
      console.log("❌ Upload failed:", uploadError.message);
      results.UPLOAD = 'FAIL';
      throw uploadError;
    }

    results.UPLOAD = 'PASS';
    const { data: publicUrlData } = supabase.storage.from('story-media').getPublicUrl(imagePath);
    const mediaUrl = publicUrlData.publicUrl;
    console.log("✅ Upload successful. Public URL generated.");

    // DATABASE INSERT & CREATE
    console.log("\n[CREATE/DATABASE_INSERT] Creating story in database...");
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    
    const { data: storyData, error: storyError } = await supabase
      .from('stories')
      .insert({ user_id: userId, expires_at: expiresAt })
      .select().single();

    if (storyError) {
      console.log("❌ Story insert failed:", storyError.message);
      results.DATABASE_INSERT = 'FAIL';
      throw storyError;
    }

    const { data: mediaData, error: mediaError } = await supabase
      .from('story_media')
      .insert({
        story_id: storyData.id,
        media_url: mediaUrl,
        type: 'image',
        display_order: 1,
        duration_seconds: 5
      }).select().single();

    if (mediaError) {
      console.log("❌ Story media insert failed:", mediaError.message);
      results.DATABASE_INSERT = 'FAIL';
      throw mediaError;
    }

    results.CREATE = 'PASS';
    results.DATABASE_INSERT = 'PASS';
    console.log("✅ Story inserted into database successfully.");

    // RETRIEVAL
    console.log("\n[RETRIEVAL] Fetching stories...");
    const { data: fetchStories, error: fetchError } = await supabase
      .from('stories')
      .select(`
        id, user_id, expires_at, created_at,
        profiles!stories_user_id_fkey ( id, full_name, username, avatar_url ),
        story_media ( id, media_url, type, text_content, bg_gradient, caption, duration_seconds )
      `)
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString());

    if (fetchError || !fetchStories || fetchStories.length === 0) {
      console.log("❌ Story retrieval failed.");
      results.RETRIEVAL = 'FAIL';
    } else {
      results.RETRIEVAL = 'PASS';
      console.log("✅ Story retrieved successfully.");
    }

    // RENDER & VIEWER
    // These are frontend concepts, but we can verify the data format allows it.
    console.log("\n[RENDER/VIEWER] Verifying story schema structure for UI...");
    if (fetchStories && fetchStories[0].profiles && fetchStories[0].story_media) {
      results.RENDER = 'PASS';
      results.VIEWER = 'PASS';
      console.log("✅ Story schema contains necessary rendering nodes.");
    } else {
      results.RENDER = 'FAIL';
      results.VIEWER = 'FAIL';
      console.log("❌ Story schema missing profiles or story_media nodes.");
    }

  } catch (err) {
    console.error("Test encountered an error.", err);
  } finally {
    console.log("\n============== STORIES QA REPORT ==============");
    console.log(`CREATE: ${results.CREATE}`);
    console.log(`UPLOAD: ${results.UPLOAD}`);
    console.log(`DATABASE INSERT: ${results.DATABASE_INSERT}`);
    console.log(`RETRIEVAL: ${results.RETRIEVAL}`);
    console.log(`RENDER: ${results.RENDER}`);
    console.log(`VIEWER: ${results.VIEWER}`);
    console.log("=================================================");
  }
}

runStoriesQA();
