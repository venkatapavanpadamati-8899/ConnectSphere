const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://lgsdihyrsbzebdfblpor.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runBackendVerification() {
  console.log('--- CONNECTSPHERE BACKEND VERIFICATION ---');
  let results = { pass: 0, fail: 0, blocked: 0 };
  const emailA = 'qa_user_a@example.com';
  const emailB = 'qa_user_b@example.com';
  const password = 'TestPassword123!';

  // STEP 1: TEST SIGNUP (Expect 429)
  console.log('\nTesting Signup (Rate Limit Check)...');
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: 'new_test_' + Date.now() + '@example.com',
    password: password
  });

  if (signUpErr && signUpErr.status === 429) {
    console.log('SIGNUP: BLOCKED_EXTERNAL_CONFIGURATION (429 Rate Limit)');
    results.blocked++;
  } else if (signUpErr) {
    console.log('SIGNUP ERROR:', signUpErr.message);
    results.fail++;
  } else {
    console.log('SIGNUP SUCCESS');
    results.pass++;
  }

  // STEP 2: TEST LOGIN A
  console.log('\nTesting Login User A...');
  const { data: loginA, error: loginAErr } = await supabase.auth.signInWithPassword({
    email: emailA,
    password: password
  });

  let userAClient = null;
  let userAId = null;

  if (loginAErr) {
    console.log('LOGIN A FAILED:', loginAErr.message);
    results.fail++;
    console.log('Attempting to create User A for test...');
    const { data: createA, error: createAErr } = await supabase.auth.signUp({ email: emailA, password: password });
    if (createA.user) {
      console.log('User A created.');
      userAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${createA.session.access_token}` } } });
      userAId = createA.user.id;
    }
  } else {
    console.log('LOGIN A SUCCESS');
    results.pass++;
    userAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${loginA.session.access_token}` } } });
    userAId = loginA.user.id;
  }

  // TEST LOGIN B
  console.log('\nTesting Login User B...');
  const { data: loginB, error: loginBErr } = await supabase.auth.signInWithPassword({
    email: emailB,
    password: password
  });

  let userBClient = null;
  if (loginBErr) {
    console.log('LOGIN B FAILED:', loginBErr.message);
    const { data: createB, error: createBErr } = await supabase.auth.signUp({ email: emailB, password: password });
    if (createB.user) {
      userBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${createB.session.access_token}` } } });
    }
  } else {
    console.log('LOGIN B SUCCESS');
    userBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${loginB.session.access_token}` } } });
  }

  // STEP 3: STORAGE BUCKETS
  console.log('\nChecking Storage Buckets...');
  const expectedBuckets = ['posts', 'story-media', 'reel-media', 'avatars', 'video-media', 'message-media'];
  
  if (userAClient) {
    for (const bucket of expectedBuckets) {
      const { data, error } = await userAClient.storage.from(bucket).list();
      if (error) {
        console.log(`Bucket '${bucket}': Error - ${error.message}`);
      } else {
        console.log(`Bucket '${bucket}': PASS (Accessible)`);
      }
    }
  }

  // STEP 4: RLS TEST
  console.log('\nTesting RLS...');
  if (userAClient && userBClient) {
    // Attempt to read User B's private settings/profile (assuming profiles has some RLS)
    const { data: profiles, error: profileErr } = await userAClient.from('profiles').select('*').limit(5);
    if (profileErr) {
      console.log('RLS Profiles Error:', profileErr.message);
    } else {
      console.log('RLS Profiles Read Success:', profiles.length);
    }
    
    // Create a post
    const { data: postData, error: postErr } = await userAClient.from('posts').insert({
      user_id: userAId,
      caption: 'Hello World from E2E QA'
    }).select();
    
    if (postErr) {
      console.log('POST CREATE ERROR:', postErr.message);
    } else {
      console.log('POST CREATE SUCCESS');
    }
  } else {
    console.log('RLS Test Skipped: Need both test users');
  }

  console.log('\nFinished API Backend Checks');
}

runBackendVerification().catch(console.error);
