import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sanitizeForJson } from "../_shared/sanitize.ts";

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
    const { resumeText } = await req.json();
    console.log('Parsing resume text, length:', resumeText?.length || 0);
    
    // SECURITY: Sanitize incoming resume text to prevent Unicode escape sequence errors
    // This handles malformed \u sequences, backslashes, and control characters
    const sanitizedResumeText = sanitizeForJson(resumeText);
    console.log('Sanitization complete, processing with AI...');

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
            content: `You are a professional resume parser. Extract structured information from resumes.
            
Return a JSON object with these fields:
- name: Full name
- email: Email address
- phone: Phone number
- summary: Professional summary
- skills: Array of skills (normalize to canonical forms, e.g., "JS" → "JavaScript")
- experience: Array of work experiences, each with {company, title, duration, bullets}
- education: Array of education entries with {institution, degree, field, year}
- projects: Array of projects with {name, description, technologies}

Be precise and extract all available information.`
          },
          {
            role: 'user',
            content: `Parse this resume:\n\n${sanitizedResumeText}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      // RATE LIMITING: Provide clear user feedback for quota issues
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'AI rate limit exceeded. Please wait a moment before trying again.',
            retryAfter: 60 // suggest 60 second wait
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'AI credits depleted. Please add credits to your Lovable workspace to continue.',
            action: 'topup'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }

      throw new Error(`AI gateway error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const parsedData = JSON.parse(data.choices[0].message.content);
    
    console.log('Resume parsed successfully');
    
    // Return properly formatted JSON with correct Content-Type
    return new Response(
      JSON.stringify({ parsedData }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in parse-resume function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});