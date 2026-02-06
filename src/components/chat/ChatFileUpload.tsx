import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChatFileUploadProps {
  userId: string;
  onFileUploaded: (fileUrl: string, fileName: string, fileType: string) => void;
  disabled?: boolean;
}

export const ChatFileUpload = ({ userId, onFileUploaded, disabled }: ChatFileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;
      const fileType = file.type.startsWith("image/") ? "image" : "file";

      setPreview({ url: fileUrl, name: file.name, type: fileType });
      onFileUploaded(fileUrl, file.name, fileType);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearPreview = () => {
    setPreview(null);
    onFileUploaded("", "", "");
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        disabled={disabled || uploading}
      />

      {preview && (
        <div className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl p-3 shadow-lg max-w-xs">
          <div className="flex items-center gap-2">
            {preview.type === "image" ? (
              <img
                src={preview.url}
                alt={preview.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground truncate font-medium">{preview.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{preview.type}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={clearPreview}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 text-muted-foreground hover:text-foreground"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Paperclip className="w-5 h-5" />
        )}
      </Button>
    </div>
  );
};
