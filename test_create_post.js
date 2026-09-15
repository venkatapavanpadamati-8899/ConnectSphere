const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lgsdihyrsbzebdfblpor.supabase.co';
const supabaseKey = 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('Testing Create Post...');
  
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(1);
  if (pErr || !profiles || profiles.length === 0) {
    console.error('No profiles found or error:', pErr);
    return;
  }
  
  const authorId = profiles[0].id;
  console.log('Using author ID:', authorId);

  const postData = {
    id: crypto.randomUUID(),
    author_id: authorId,
    content: 'E2E Test Post from CLI',
    media_url: null,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('posts').insert([postData]).select();
  if (error) {
    console.error('❌ Insert Error:', error);
  } else {
    console.log('✅ Insert Success:', data);
  }
}

runTest();
