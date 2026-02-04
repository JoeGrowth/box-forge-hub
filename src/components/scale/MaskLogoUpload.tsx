import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link, X, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MaskLogoUploadProps {
  userId: string;
  phaseId: number;
  currentLogoUrl?: string;
  entityName?: string;
  onLogoChange: (url: string) => void;
  onNameChange: (name: string) => void;
  label?: string;
}

export const MaskLogoUpload = ({
  userId,
  phaseId,
  currentLogoUrl,
  entityName = "",
  onLogoChange,
  onNameChange,
  label = "Logo & Name",
}: MaskLogoUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl || "");
  const [urlInput, setUrlInput] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
      const fileName = `phase-${phaseId}-logo.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to mask-logos bucket
      const { error: uploadError } = await supabase.storage
        .from("mask-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("mask-logos")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      setLogoUrl(publicUrl);
      onLogoChange(publicUrl);

      toast({
        title: "Logo Uploaded",
        description: "Your logo has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid image URL",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL starting with http:// or https://",
        variant: "destructive",
      });
      return;
    }

    setLogoUrl(urlInput);
    onLogoChange(urlInput);
    setUrlInput("");
    toast({
      title: "Logo URL Set",
      description: "Your logo URL has been saved.",
    });
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    onLogoChange("");
    setUrlInput("");
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">{label}</Label>

      {/* Logo Preview & Name Display */}
      <div className="flex items-start gap-4">
        {/* Logo Preview */}
        <div
          className={cn(
            "relative w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0 transition-colors",
            logoUrl ? "border-b4-teal bg-muted/30" : "border-muted-foreground/30 bg-muted/50"
          )}
        >
          {logoUrl ? (
            <>
              <img
                src={logoUrl}
                alt="Entity Logo"
                className="w-full h-full object-contain p-1"
                onError={() => {
                  setLogoUrl("");
                  onLogoChange("");
                }}
              />
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
          )}
        </div>

        {/* Entity Name Input */}
        <div className="flex-1 space-y-2">
          <Input
            value={entityName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter entity name..."
            className="font-medium"
          />
          <p className="text-xs text-muted-foreground">
            The name of your Mask entity
          </p>
        </div>
      </div>

      {/* Upload Options - Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "url")} className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-9">
          <TabsTrigger value="upload" className="text-xs gap-1">
            <Upload className="w-3 h-3" /> Upload PNG
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs gap-1">
            <Link className="w-3 h-3" /> Enter URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-3">
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              onChange={handleFileUpload}
              className="hidden"
              id={`logo-upload-${phaseId}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Image File
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              PNG, JPG, or SVG • Max 5MB
            </p>
          </div>
        </TabsContent>

        <TabsContent value="url" className="mt-3">
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="flex-1 text-sm"
            />
            <Button
              type="button"
              variant="teal"
              size="sm"
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim()}
            >
              Set
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Enter a direct link to your logo image
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
};
