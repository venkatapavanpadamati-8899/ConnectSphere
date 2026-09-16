const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lgsdihyrsbzebdfblpor.supabase.co';
const supabaseKey = 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  const { data, error } = await supabase.from('posts').select('*').limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  }
}

runTest();
