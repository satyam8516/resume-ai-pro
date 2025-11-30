import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { sanitizeForJson } from "@/lib/sanitizeForJson";

const Upload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Please upload a PDF or DOCX file");
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    // PRODUCTION: Binary-safe file handling with proper UTF-8 decoding
    if (file.type === "application/pdf") {
      // PDF extraction using pdf.js - read as binary ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      
      // Lazy load pdf.js to reduce initial bundle size
      const pdfjsLib = await import('pdfjs-dist');
      
      // Configure worker from CDN
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const pdfData = await pdfjsLib.getDocument({ data: typedArray }).promise;
      let text = "";
      
      console.log(`Extracting text from ${pdfData.numPages} PDF pages...`);
      for (let i = 1; i <= pdfData.numPages; i++) {
        const page = await pdfData.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .join(" ");
        text += pageText + "\n";
      }
      
      return text;
    } else {
      // DOCX/TXT: Read as UTF-8 text
      // FileReader.readAsText() automatically decodes as UTF-8
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8'); // Explicit UTF-8 encoding
      });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      setProgress(20);

      // Upload file to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setProgress(40);

      // SECURITY: Extract text as binary/UTF-8, then sanitize immediately
      // This handles malformed \u sequences, backslashes, and control characters from PDF/DOCX
      console.log('Extracting text from file...');
      const extractedText = await extractTextFromFile(file);
      console.log(`Extracted ${extractedText.length} characters, sanitizing...`);
      
      // Sanitize to prevent Unicode escape sequence errors
      const sanitizedText = sanitizeForJson(extractedText);
      console.log('Text sanitized, invoking AI parser...');

      setProgress(60);
      setParsing(true);

      // Parse resume with AI
      const { data: parseData, error: parseError } = await supabase.functions.invoke(
        "parse-resume",
        { body: { resumeText: sanitizedText } }
      );

      if (parseError) {
        // RATE LIMITING: Provide clear, actionable error messages
        console.error('Parse error:', parseError);
        if (parseError.message?.includes('Rate limit') || parseError.message?.includes('429')) {
          throw new Error('AI rate limit exceeded. Please wait 60 seconds and try again.');
        } else if (parseError.message?.includes('credits') || parseError.message?.includes('402')) {
          throw new Error('AI credits depleted. Please add credits in Settings → Workspace → Usage.');
        }
        throw parseError;
      }

      setProgress(80);

      // Save to database
      const { data: resumeData, error: dbError } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          extracted_text: extractedText,
          parsed_data: parseData.parsedData,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setProgress(100);
      toast.success("Resume uploaded and parsed successfully!");
      
      // Navigate to analyze page
      setTimeout(() => {
        navigate(`/analyze/${resumeData.id}`);
      }, 500);
    } catch (error: any) {
      console.error("Upload error:", error);
      // SECURITY: Never log sensitive data - only log error type and sanitized message
      const sanitizedErrorMsg = error.message?.substring(0, 200) || "Unknown error";
      console.error("Sanitized error:", sanitizedErrorMsg);
      
      // User-friendly error messages with actionable guidance
      if (error.message?.includes("Rate limit") || error.message?.includes("429")) {
        toast.error("AI rate limit exceeded. Please wait 60 seconds and try again.", {
          duration: 5000,
        });
      } else if (error.message?.includes("credits") || error.message?.includes("402")) {
        toast.error("AI credits depleted. Add credits in Settings → Workspace → Usage.", {
          duration: 5000,
        });
      } else if (error.message?.includes("Unicode") || error.message?.includes("escape")) {
        toast.error("File contains unsupported characters. Please try a different file format.", {
          duration: 5000,
        });
      } else {
        toast.error(error.message || "Failed to upload resume. Please try again.");
      }
    } finally {
      setUploading(false);
      setParsing(false);
      setProgress(0);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">Upload Resume</h1>
          <p className="text-muted-foreground mt-2">
            Upload your resume to get started with AI-powered analysis
          </p>
        </div>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Select Your Resume</CardTitle>
            <CardDescription>
              Supported formats: PDF, DOCX (Maximum size: 10MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!file ? (
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <UploadIcon className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-lg font-medium mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF or DOCX up to 10MB
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  {!uploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {(uploading || parsing) && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {parsing ? "Parsing resume with AI..." : "Uploading..."}
                      </span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {parsing ? "Parsing..." : "Uploading..."}
                    </>
                  ) : (
                    "Upload and Parse Resume"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">What happens next?</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>
                  Your resume is securely uploaded to cloud storage
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>
                  AI extracts structured data (skills, experience, education)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>
                  You'll be taken to the analysis page to compare against jobs
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Upload;