const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lgsdihyrsbzebdfblpor.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL';
const EMAIL_A = 'qaA_1789569805612@test.com';
const PASSWORD = 'Password123!';

async function testMsg() {
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authA } = await anon.auth.signInWithPassword({ email: EMAIL_A, password: PASSWORD });
  const userAId = authA.user.id;
  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${authA.session.access_token}` } }
  });

  const { data: newConv, error: cErr } = await clientA.from('conversations').insert({
    type: 'direct',
    created_by: userAId
  }).select().single();

  console.log('newConv:', newConv, 'cErr:', cErr);
  if (newConv) {
    const { error: m1 } = await clientA.from('conversation_members').insert({
      conversation_id: newConv.id,
      user_id: userAId,
      role: 'admin'
    });
    console.log('insert member A error:', m1);

    const { data: msg, error: msgErr } = await clientA.from('messages').insert({
      conversation_id: newConv.id,
      sender_id: userAId,
      text: 'Test message from QA'
    }).select().single();
    console.log('insert msg:', msg, 'error:', msgErr);
  }
}

testMsg().catch(console.error);
