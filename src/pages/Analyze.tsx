import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { sanitizeForJson } from "@/lib/sanitizeForJson";

const Analyze = () => {
  const { resumeId } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState<any>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchResume();
  }, [resumeId]);

  const fetchResume = async () => {
    try {
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("id", resumeId)
        .single();

      if (error) throw error;
      setResume(data);
    } catch (error) {
      console.error("Error fetching resume:", error);
      toast.error("Failed to load resume");
    }
  };

  const handleAnalyze = async () => {
    if (!jobTitle.trim() || !jobDescription.trim()) {
      toast.error("Please enter both job title and description");
      return;
    }
    
    // Sanitize inputs to prevent Unicode escape sequence errors
    const sanitizedJobTitle = sanitizeForJson(jobTitle.trim());
    const sanitizedJobDescription = sanitizeForJson(jobDescription.trim());

    setAnalyzing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Analyze job fit
      const { data: fitData, error: fitError } = await supabase.functions.invoke(
        "analyze-job-fit",
        {
          body: {
            parsedResume: resume.parsed_data,
            jobTitle: sanitizedJobTitle,
            jobDescription: sanitizedJobDescription,
          },
        }
      );

      if (fitError) {
        if (fitError.message?.includes('Rate limit')) {
          throw new Error('AI rate limit exceeded. Please try again in a moment.');
        } else if (fitError.message?.includes('credits')) {
          throw new Error('AI credits depleted. Please contact support.');
        }
        throw fitError;
      }

      // Get improvements
      const { data: improveData, error: improveError } = await supabase.functions.invoke(
        "improve-resume",
        {
          body: {
            parsedResume: resume.parsed_data,
            jobTitle: sanitizedJobTitle,
            jobDescription: sanitizedJobDescription,
          },
        }
      );

      if (improveError) {
        if (improveError.message?.includes('Rate limit')) {
          throw new Error('AI rate limit exceeded. Please try again in a moment.');
        } else if (improveError.message?.includes('credits')) {
          throw new Error('AI credits depleted. Please contact support.');
        }
        throw improveError;
      }

      // Save analysis (use sanitized versions for storage)
      const { data: analysisData, error: analysisError } = await supabase
        .from("analyses")
        .insert({
          user_id: user.id,
          resume_id: resumeId,
          job_title: sanitizedJobTitle,
          job_description: sanitizedJobDescription,
          match_score: fitData.analysis.matchScore,
          matched_skills: fitData.analysis.matchedSkills,
          missing_skills: fitData.analysis.missingSkills,
          recommendations: fitData.analysis.recommendations,
          improved_summary: improveData.improvements.improvedSummary,
          improved_bullets: improveData.improvements.improvedBullets,
          ats_score: fitData.analysis.atsScore,
        })
        .select()
        .single();

      if (analysisError) throw analysisError;

      toast.success("Analysis complete!");
      navigate(`/results/${analysisData.id}`);
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Analyze Resume</h1>
          <p className="text-muted-foreground mt-2">
            Enter job details to get AI-powered match analysis
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="job-title">Job Title</Label>
              <Input
                id="job-title"
                placeholder="e.g., Senior Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-description">Job Description</Label>
              <Textarea
                id="job-description"
                placeholder="Paste the full job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={12}
              />
            </div>

            <Button onClick={handleAnalyze} disabled={analyzing} size="lg" className="w-full">
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Analyze with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Analyze;