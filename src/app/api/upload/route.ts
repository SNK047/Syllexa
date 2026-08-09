import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const MAX_SIZE = 50 * 1024 * 1024;

const BUCKET_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

let bucketChecked = false;

async function ensureBucket() {
  if (bucketChecked) return true;

  const admin = createAdminClient();
  if (!admin) {
    console.warn("No admin client available — skipping bucket auto-setup");
    bucketChecked = true;
    return true;
  }

  try {
    const { data: bucket, error: getErr } = await admin.storage.getBucket("notes");

    if (getErr || !bucket) {
      const { error: createErr } = await admin.storage.createBucket("notes", {
        public: true,
        fileSizeLimit: MAX_SIZE,
        allowedMimeTypes: BUCKET_MIME_TYPES,
      });
      if (createErr) {
        console.error("Bucket create error:", createErr.message);
      } else {
        console.log("Created notes bucket with all MIME types");
      }
    } else {
      const current: string[] = (bucket as any).allowed_mime_types || [];
      const missing = BUCKET_MIME_TYPES.filter((t) => !current.includes(t));
      if (missing.length > 0) {
        const { error: updErr } = await admin.storage.updateBucket("notes", {
          allowedMimeTypes: [...new Set([...current, ...BUCKET_MIME_TYPES])],
          fileSizeLimit: MAX_SIZE,
          public: true,
        });
        if (updErr) {
          console.error("Bucket update error:", updErr.message);
        } else {
          console.log("Updated notes bucket — added MIME types:", missing.join(", "));
        }
      }
    }
  } catch (err: any) {
    console.error("Bucket auto-setup failed:", err?.message || err);
  }

  bucketChecked = true;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    await ensureBucket();

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Allowed: PDF, PNG, JPG, WEBP, DOC, DOCX, TXT, PPT, PPTX" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File size must be less than 50MB" }, { status: 400 });
    }

    const path = (formData.get("path") as string) || "";
    if (!path) {
      return NextResponse.json({ error: "No upload path provided" }, { status: 400 });
    }

    const { data, error } = await supabase.storage.from("notes").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error("Storage upload error:", error.message);
      return NextResponse.json(
        { error: `Storage error: ${error.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("notes").getPublicUrl(path);

    return NextResponse.json({ data: { path: data.path, publicUrl } });
  } catch (err: any) {
    console.error("Upload API error:", err);
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}
