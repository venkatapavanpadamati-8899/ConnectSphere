const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lgsdihyrsbzebdfblpor.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTables() {
  const tables = [
    'profiles', 'posts', 'post_likes', 'post_comments', 'post_bookmarks', 'post_reposts',
    'followers', 'blocks', 'messages', 'notifications', 'stories', 'reels', 'communities'
  ];

  console.log('--- TABLE VERIFICATION ---');
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code === '42P01') {
      console.log(`[NOT_IMPLEMENTED] ${table} (relation does not exist)`);
    } else if (error) {
      console.log(`[ERROR / RLS BLOCKED] ${table}: ${error.message}`);
    } else {
      console.log(`[PASS / EXISTS] ${table}`);
    }
  }
}

checkTables();
