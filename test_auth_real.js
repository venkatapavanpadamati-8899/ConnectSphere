const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Extract keys from env.js
const envContent = fs.readFileSync(path.join(__dirname, 'frontend/js/config/env.js'), 'utf8');
const urlMatch = envContent.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = envContent.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
  console.error("Could not find keys in env.js");
  process.exit(1);
}

const supabaseUrl = urlMatch[1];
const supabaseKey = keyMatch[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
  const email = 'testuser_' + Date.now() + '@example.com';
  console.log('Attempting signup with', email);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'Password123!',
    options: {
      data: {
        username: 'testuser',
        phone: '1234567890',
        dob: '1990-01-01'
      }
    }
  });

  if (error) {
    console.error('SIGNUP ERROR:', error);
  } else {
    console.log('SIGNUP SUCCESS:', data);
  }
}

testSignup();
