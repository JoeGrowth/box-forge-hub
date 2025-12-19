import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, FileText, Image, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UploadedFile {
  name: string;
  path: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface JourneyFileUploadProps {
  journeyId: string;
  phaseNumber: number;
  userId: string;
  uploadedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

export const JourneyFileUpload = ({
  journeyId,
  phaseNumber,
  userId,
  uploadedFiles,
  onFilesChange,
}: JourneyFileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newFiles: UploadedFile[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Max size is 10MB.`);
          continue;
        }

        // Validate file type
        const allowedTypes = [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];

        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name} has an unsupported file type.`);
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${userId}/${journeyId}/phase-${phaseNumber}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("journey-documents")
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}`);
          console.error("Upload error:", uploadError);
          continue;
        }

        newFiles.push({
          name: file.name,
          path: filePath,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        });
      }

      if (newFiles.length > 0) {
        onFilesChange([...uploadedFiles, ...newFiles]);
        toast.success(`${newFiles.length} file(s) uploaded successfully`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = async (file: UploadedFile) => {
    try {
      const { error } = await supabase.storage
        .from("journey-documents")
        .remove([file.path]);

      if (error) {
        toast.error("Failed to remove file");
        console.error("Remove error:", error);
        return;
      }

      onFilesChange(uploadedFiles.filter((f) => f.path !== file.path));
      toast.success("File removed");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove file");
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return <Image className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileUrl = async (path: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from("journey-documents")
      .createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  };

  const handleViewFile = async (file: UploadedFile) => {
    const url = await getFileUrl(file.path);
    if (url) {
      window.open(url, "_blank");
    } else {
      toast.error("Failed to get file URL");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Upload Evidence
        </Button>
        <span className="text-xs text-muted-foreground">
          PDF, Word, or images (max 10MB each)
        </span>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file) => (
            <div
              key={file.path}
              className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
            >
              <button
                type="button"
                onClick={() => handleViewFile(file)}
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors text-left flex-1 min-w-0"
              >
                {getFileIcon(file.type)}
                <span className="truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  ({formatFileSize(file.size)})
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFile(file)}
                className="ml-2 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
