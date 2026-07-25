"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HierarchySelector } from "@/components/hierarchy-selector";
import { Upload, FileText, Loader2, X } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hierarchy, setHierarchy] = useState({
    universityId: "",
    departmentId: "",
    semesterId: "",
    subjectId: "",
    unitId: "",
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type !== "application/pdf") {
        setError("Only PDF files are allowed");
        return;
      }
      if (selected.size > 50 * 1024 * 1024) {
        setError("File size must be less than 50MB");
        return;
      }
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(".pdf", "").replace(/[-_]/g, " "));
      }
      setError("");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(".pdf", "").replace(/[-_]/g, " "));
      }
      setError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title || !hierarchy.unitId) {
      setError("Please fill in all required fields");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // 1. Upload file to Supabase Storage
      const { uploadFile } = await import("@/actions/upload");
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const uploadResult = await uploadFile(file, filePath);
      if (uploadResult.error) {
        setError(uploadResult.error);
        setUploading(false);
        return;
      }

      // 2. Create note record
      const { createNote } = await import("@/actions/notes");
      const noteResult = await createNote({
        title,
        description: description || undefined,
        subject_id: hierarchy.subjectId,
        unit_id: hierarchy.unitId,
        file_url: uploadResult.data!.publicUrl,
        file_size: file.size,
      });

      if (noteResult.error) {
        setError(noteResult.error);
        setUploading(false);
        return;
      }

      setSuccess(true);

      const { addCredits } = await import("@/actions/credits");
      await addCredits(10, "upload", "Uploaded a new note");

      setTimeout(() => {
        router.push("/explore");
      }, 1500);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Notes</h1>
        <p className="text-muted-foreground">
          Share your notes with the community and earn credits
        </p>
      </div>

      {success && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/50 p-4 text-green-600 dark:text-green-400">
          Note uploaded successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">File</CardTitle>
          </CardHeader>
          <CardContent>
            {file ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/50 rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-1">
                  Drag and drop your PDF here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground/70">
                  PDF files up to 50MB
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Database Normalization Notes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Subject Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subject *</CardTitle>
          </CardHeader>
          <CardContent>
            <HierarchySelector onSelect={setHierarchy} />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={uploading || !file || !hierarchy.unitId}>
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Note
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
