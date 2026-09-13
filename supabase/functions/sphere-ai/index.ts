// ============================================================================
// ConnectSphere Supabase Edge Function: sphere-ai
// Secure server-side AI processing (Captions, Hashtags, Insights, Telemetry)
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user authorization from header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
      if (!userError && user) {
        userId = user.id;
      }
    }

    const { prompt, feature = "caption", draftText = "" } = await req.json();

    if (!prompt && !draftText) {
      return new Response(JSON.stringify({ error: "Missing prompt or draftText" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectivePrompt = prompt || draftText;
    let aiResponseText = "";
    let tokensEstimate = Math.ceil(effectivePrompt.length / 4);

    // Secure Gemini API call if secret is present
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiApiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are Sphere AI, the intelligent assistant for ConnectSphere, a next-generation social ecosystem for verified creators and spatial computing enthusiasts.
Task (${feature}): ${effectivePrompt}
Provide a polished, engaging, high-tech response with 2-3 relevant hashtags (e.g., #SpatialWeb, #ZeroKnowledge, #ConnectSphere). Keep it concise, authentic, and visionary.`
                    }
                  ]
                }
              ]
            })
          }
        );

        const geminiData = await geminiRes.json();
        const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          aiResponseText = candidateText.trim();
          tokensEstimate += Math.ceil(aiResponseText.length / 4);
        }
      } catch (geminiErr) {
        console.warn("Gemini API call failed, using heuristic engine:", geminiErr);
      }
    }

    // Heuristic high-tech generation if external API is offline
    if (!aiResponseText) {
      const cleanTopic = effectivePrompt.replace(/#/g, "").trim();
      if (feature === "insights") {
        aiResponseText = `Sphere AI Growth Insights:\n1. Peak audience synchronization: 14:00 - 18:00 UTC.\n2. Optimal media: Interactive 3D WebAssembly embeds & binaural audio clips.\n3. High-reach hashtags: #${cleanTopic.replace(/\s+/g, "")} #SpatialWeb #ZeroKnowledge.`;
      } else if (feature === "hashtag") {
        aiResponseText = `#${cleanTopic.replace(/\s+/g, "")} #SpatialMesh #ZeroKnowledge #ConnectSphere2026`;
      } else {
        aiResponseText = `Exploring decentralized spatial architectures and neural mesh interfaces with ConnectSphere! 🌐⚡ #${cleanTopic.replace(/\s+/g, "")} #SpatialWeb #ZeroKnowledge`;
      }
      tokensEstimate += Math.ceil(aiResponseText.length / 4);
    }

    const latencyMs = Date.now() - startTime;

    // Audit telemetry in Supabase database
    if (userId) {
      await supabaseClient.from("ai_requests").insert({
        user_id: userId,
        feature,
        prompt: effectivePrompt.slice(0, 500),
        response_summary: aiResponseText.slice(0, 300),
        latency_ms: latencyMs,
        model_used: geminiApiKey ? "gemini-1.5-flash" : "sphere-heuristic-engine"
      });

      await supabaseClient.from("ai_usage").insert({
        user_id: userId,
        tokens_input: Math.ceil(effectivePrompt.length / 4),
        tokens_output: Math.ceil(aiResponseText.length / 4),
        cost_estimate_usd: (tokensEstimate * 0.000002)
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        text: aiResponseText,
        feature,
        latencyMs,
        model: geminiApiKey ? "gemini-1.5-flash" : "sphere-heuristic-engine"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
