const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lgsdihyrsbzebdfblpor.supabase.co';
const supabaseKey = 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = ['stories', 'story_media', 'story_views', 'story_reactions', 'reels', 'notifications', 'settings', 'communities'];
  console.log("Checking tables...");
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table '${table}' Error: ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`✅ Table '${table}' exists and is accessible.`);
    }
  }
}

checkTables();
