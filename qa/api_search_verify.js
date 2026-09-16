const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lgsdihyrsbzebdfblpor.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runSearchBackendTest() {
  console.log('--- CONNECTSPHERE BACKEND SEARCH TEST ---');
  let results = { pass: 0, fail: 0 };
  
  try {
    const query = 'Hello';
    
    // People search
    console.log(`\nSearching 'profiles' for "${query}"...`);
    const { data: people, error: peopleErr } = await supabase
      .from('profiles')
      .select('id, full_name, username, bio')
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(5);
      
    if (peopleErr) {
      console.log('PEOPLE SEARCH FAIL:', peopleErr.message);
      results.fail++;
    } else {
      console.log(`PEOPLE SEARCH PASS: Found ${people.length} profiles.`);
      results.pass++;
    }
    
    // Posts search
    console.log(`\nSearching 'posts' for "${query}"...`);
    const { data: posts, error: postsErr } = await supabase
      .from('posts')
      .select('id, caption')
      .ilike('caption', `%${query}%`)
      .limit(5);
      
    if (postsErr) {
      console.log('POSTS SEARCH FAIL:', postsErr.message);
      results.fail++;
    } else {
      console.log(`POSTS SEARCH PASS: Found ${posts.length} posts.`);
      results.pass++;
    }
    
  } catch (err) {
    console.error('SEARCH TEST CRASHED:', err.message);
  } finally {
    console.log('\n--- SEARCH TEST COMPLETE ---');
    console.log(`Pass: ${results.pass}, Fail: ${results.fail}`);
  }
}

runSearchBackendTest().catch(console.error);
