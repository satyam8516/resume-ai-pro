import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Target, Sparkles, TrendingUp, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ResumeAI
            </span>
          </div>
          <div className="flex gap-3">
            {user ? (
              <Button asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-block px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4 inline mr-2" />
            Powered by Advanced AI Technology
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Transform Your Resume with{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
              AI Intelligence
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Analyze, optimize, and perfect your resume with cutting-edge AI. Get instant feedback, 
            match scoring, and professional recommendations tailored to your dream job.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button size="lg" asChild className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg h-14 px-8 group">
              <Link to={user ? "/dashboard" : "/auth"}>
                Start Analyzing
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg h-14 px-8">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 hover:shadow-lg transition-all border-2 hover:border-primary/20 group">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Parsing</h3>
            <p className="text-muted-foreground">
              AI-powered extraction of skills, experience, and qualifications from any resume format.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all border-2 hover:border-primary/20 group">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Job Matching</h3>
            <p className="text-muted-foreground">
              Intelligent analysis of how well your resume matches specific job requirements.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all border-2 hover:border-primary/20 group">
            <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-2">ATS Optimization</h3>
            <p className="text-muted-foreground">
              Ensure your resume passes Applicant Tracking Systems with our specialized scoring.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all border-2 hover:border-primary/20 group">
            <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-warning" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Improvements</h3>
            <p className="text-muted-foreground">
              Get AI-generated suggestions to enhance your professional summary and experience bullets.
            </p>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Why Choose ResumeAI?</h2>
          <div className="space-y-6">
            {[
              "Instant AI-powered resume analysis in seconds",
              "Detailed job fit scoring with actionable insights",
              "Professional improvement suggestions from industry experts",
              "ATS compatibility checker for higher application success",
              "Track multiple versions and compare results",
              "Secure cloud storage for all your resumes",
            ].map((benefit, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                <p className="text-lg">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="p-12 text-center bg-gradient-to-br from-primary/5 to-accent/5 border-2">
          <h2 className="text-4xl font-bold mb-4">Ready to Land Your Dream Job?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who've improved their resumes with AI-powered insights.
          </p>
          <Button size="lg" asChild className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg h-14 px-8">
            <Link to={user ? "/dashboard" : "/auth"}>
              Start Free Analysis
            </Link>
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 ResumeAI. Powered by advanced AI technology.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;