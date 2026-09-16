const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabaseUrl = 'https://lgsdihyrsbzebdfblpor.supabase.co';
const supabaseKey = 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
    try {
        console.log("Checking profiles table in Supabase...");
        
        // Let's get the 5 most recent profiles to see if our test accounts were created
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (error) {
            console.error("Error fetching profiles:", error);
        } else {
            console.log("Most recent 5 profiles:");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Exception:", e.message);
    }
}

checkProfiles();
