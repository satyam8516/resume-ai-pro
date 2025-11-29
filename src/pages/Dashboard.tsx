import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Target, TrendingUp, Plus, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface Resume {
  id: string;
  file_name: string;
  created_at: string;
  parsed_data: any;
}

interface Analysis {
  id: string;
  job_title: string;
  match_score: number;
  created_at: string;
  resume_id: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalResumes: 0,
    totalAnalyses: 0,
    avgMatchScore: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch resumes
      const { data: resumesData, error: resumesError } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (resumesError) throw resumesError;

      // Fetch analyses
      const { data: analysesData, error: analysesError } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (analysesError) throw analysesError;

      setResumes(resumesData || []);
      setAnalyses(analysesData || []);

      // Calculate stats
      const avgScore = analysesData && analysesData.length > 0
        ? analysesData.reduce((sum, a) => sum + (a.match_score || 0), 0) / analysesData.length
        : 0;

      setStats({
        totalResumes: resumesData?.length || 0,
        totalAnalyses: analysesData?.length || 0,
        avgMatchScore: Math.round(avgScore),
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const deleteResume = async (id: string) => {
    try {
      const { error } = await supabase.from("resumes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Resume deleted successfully");
      fetchDashboardData();
    } catch (error) {
      console.error("Error deleting resume:", error);
      toast.error("Failed to delete resume");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Welcome back! Here's an overview of your resume analysis journey.
            </p>
          </div>
          <Button onClick={() => navigate("/upload")} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Upload Resume
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Resumes
              </CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalResumes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Analyses
              </CardTitle>
              <Target className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalAnalyses}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Match Score
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats.avgMatchScore > 0 ? `${stats.avgMatchScore}%` : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Resumes */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Resumes</CardTitle>
            <CardDescription>
              Your most recently uploaded resumes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : resumes.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No resumes uploaded yet</p>
                <Button onClick={() => navigate("/upload")}>
                  Upload Your First Resume
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{resume.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Uploaded {formatDistanceToNow(new Date(resume.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/analyze/${resume.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Analyze
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteResume(resume.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Analyses */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Analyses</CardTitle>
            <CardDescription>
              Your latest job fit analyses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyses.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No analyses yet. Upload a resume to get started!
              </p>
            ) : (
              <div className="space-y-4">
                {analyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/results/${analysis.id}`)}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{analysis.job_title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        analysis.match_score >= 80
                          ? "default"
                          : analysis.match_score >= 60
                          ? "secondary"
                          : "outline"
                      }
                      className={
                        analysis.match_score >= 80
                          ? "bg-success text-success-foreground"
                          : ""
                      }
                    >
                      {analysis.match_score}% Match
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;