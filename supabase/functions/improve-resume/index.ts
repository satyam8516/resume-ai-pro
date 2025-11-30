import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sanitizeForJson, sanitizeObjectForJson } from "../_shared/sanitize.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { parsedResume, jobTitle, jobDescription } = await req.json();
    console.log('Improving resume...');
    
    // Sanitize all incoming data to prevent Unicode escape sequence errors
    const sanitizedJobTitle = sanitizeForJson(jobTitle);
    const sanitizedJobDescription = sanitizeForJson(jobDescription);
    const sanitizedParsedResume = sanitizeObjectForJson(parsedResume);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional resume writer specializing in ATS optimization and impactful content.

Improve the resume to better match the target job. Return a JSON object with:
- improvedSummary: Enhanced professional summary (3-4 sentences, compelling, keyword-rich)
- improvedBullets: Array of objects with {originalExperience: string, improvedBullets: string[]}
  - Use action verbs
  - Quantify achievements where possible
  - Incorporate relevant keywords from job description
  - Follow STAR method (Situation, Task, Action, Result)
- suggestedSkills: Array of skills to add based on job requirements
- formattingTips: Array of specific formatting improvements

Make improvements concrete, actionable, and ATS-friendly.`
          },
          {
            role: 'user',
            content: `Target Job: ${sanitizedJobTitle}

Job Description:
${sanitizedJobDescription}

Current Resume:
${JSON.stringify(sanitizedParsedResume, null, 2)}

Provide specific improvements for this resume.`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add more credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI gateway error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const improvements = JSON.parse(data.choices[0].message.content);
    
    console.log('Resume improvements generated');
    
    // Return properly formatted JSON with correct Content-Type
    return new Response(
      JSON.stringify({ improvements }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in improve-resume function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});