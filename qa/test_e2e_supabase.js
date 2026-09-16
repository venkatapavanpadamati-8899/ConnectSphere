const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lgsdihyrsbzebdfblpor.supabase.co';
const supabaseKey = 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runE2E() {
  console.log('--- Supabase E2E Master Test ---');
  
  // 1. Auth check
  console.log('\n[1] Testing Auth connectivity (Guest mode)');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error('❌ Auth Error:', sessionError.message);
  } else {
    console.log('✅ Auth API Reachable.');
  }

  // 2. Query 'posts'
  console.log('\n[2] Testing Posts table access');
  const { data: posts, error: postsError } = await supabase.from('posts').select('*').limit(1);
  if (postsError) {
    console.error('❌ Posts Table Error:', postsError.message);
  } else {
    console.log(`✅ Posts Table Reachable. Retrieved ${posts.length} records.`);
  }

  // 3. Query 'reels'
  console.log('\n[3] Testing Reels table access');
  const { data: reels, error: reelsError } = await supabase.from('reels').select('*').limit(1);
  if (reelsError) {
    console.error('❌ Reels Table Error:', reelsError.message);
  } else {
    console.log(`✅ Reels Table Reachable. Retrieved ${reels.length} records.`);
  }

  // 4. Query 'messages'
  console.log('\n[4] Testing Messages table access');
  const { data: msgs, error: msgsError } = await supabase.from('messages').select('*').limit(1);
  if (msgsError) {
    console.error('❌ Messages Table Error:', msgsError.message);
  } else {
    console.log(`✅ Messages Table Reachable. Retrieved ${msgs.length} records.`);
  }

  // 5. Query 'profiles'
  console.log('\n[5] Testing Profiles table access');
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').limit(1);
  if (profilesError) {
    console.error('❌ Profiles Table Error:', profilesError.message);
  } else {
    console.log(`✅ Profiles Table Reachable. Retrieved ${profiles.length} records.`);
  }
}

runE2E();
