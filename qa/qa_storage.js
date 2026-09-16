const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://lgsdihyrsbzebdfblpor.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runStorageTest() {
    console.log("Starting Storage Functional Validation...");
    
    const testEmail = `storage_test_${Date.now()}@example.com`;
    console.log("Creating user:", testEmail);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'password123'
    });
    
    if (authError || !authData.session) {
        console.error("Auth failed:", authError);
        return;
    }
    
    const userId = authData.user.id;
    console.log("Authenticated as:", userId);
    
    const testBuckets = ['avatars', 'posts', 'reels'];
    let allPassed = true;

    for (const bucket of testBuckets) {
        console.log(`\nTesting bucket: ${bucket}...`);
        
        // Create dummy file content
        const fileContent = Buffer.from('dummy data for storage test');
        const fileName = `${userId}/qa_test_${Date.now()}.txt`;
        
        // 1. Upload
        const { data: uploadData, error: uploadError } = await supabase.storage.from(bucket).upload(fileName, fileContent, {
            contentType: 'text/plain',
            upsert: true
        });
        
        if (uploadError) {
            console.error(`❌ Upload to ${bucket} failed:`, uploadError);
            allPassed = false;
            continue;
        }
        console.log(`✅ Upload successful: ${uploadData.path}`);
        
        // 2. Get Public URL
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uploadData.path);
        if (!urlData || !urlData.publicUrl) {
            console.error(`❌ getPublicUrl for ${bucket} failed.`);
            allPassed = false;
            continue;
        }
        console.log(`✅ Public URL generated: ${urlData.publicUrl}`);
        
        // 3. Cleanup
        const { error: deleteError } = await supabase.storage.from(bucket).remove([uploadData.path]);
        if (deleteError) {
            console.error(`❌ Deletion from ${bucket} failed:`, deleteError);
            allPassed = false;
        } else {
            console.log(`✅ Deletion successful: ${uploadData.path}`);
        }
    }
    
    console.log("\n==============================");
    if (allPassed) {
        console.log("RESULT: ALL STORAGE TESTS PASSED ✅");
    } else {
        console.log("RESULT: SOME STORAGE TESTS FAILED ❌");
    }
}

runStorageTest().catch(console.error);
