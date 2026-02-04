import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link, X, Loader2, Image as ImageIcon, Camera } from "lucide-react";
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
  const [popoverOpen, setPopoverOpen] = useState(false);

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
      setPopoverOpen(false);

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
    setPopoverOpen(false);
    toast({
      title: "Logo URL Set",
      description: "Your logo URL has been saved.",
    });
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogoUrl("");
    onLogoChange("");
    setUrlInput("");
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">{label}</Label>

      {/* Logo Preview & Name Display */}
      <div className="flex items-start gap-4">
        {/* Clickable Logo Preview with Popover */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "relative w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0 transition-all cursor-pointer group",
                logoUrl 
                  ? "border-b4-teal bg-muted/30 hover:border-b4-teal/70" 
                  : "border-muted-foreground/30 bg-muted/50 hover:border-b4-teal hover:bg-muted/70"
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
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors z-10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="w-6 h-6 text-muted-foreground/50 group-hover:text-b4-teal transition-colors" />
                  <span className="text-[10px] text-muted-foreground/70 group-hover:text-b4-teal transition-colors">
                    Add Logo
                  </span>
                </div>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-72 p-4 bg-popover border border-border shadow-lg z-50" 
            align="start"
            sideOffset={8}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Add Logo</h4>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      handleRemoveLogo(e);
                      setPopoverOpen(false);
                    }}
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                )}
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "url")} className="w-full">
                <TabsList className="w-full grid grid-cols-2 h-8">
                  <TabsTrigger value="upload" className="text-xs gap-1">
                    <Upload className="w-3 h-3" /> Upload
                  </TabsTrigger>
                  <TabsTrigger value="url" className="text-xs gap-1">
                    <Link className="w-3 h-3" /> URL
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
                          Choose File
                        </>
                      )}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">
                      PNG, JPG, or SVG • Max 5MB
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="url" className="mt-3">
                  <div className="space-y-2">
                    <Input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="text-sm h-8"
                    />
                    <Button
                      type="button"
                      variant="teal"
                      size="sm"
                      onClick={handleUrlSubmit}
                      disabled={!urlInput.trim()}
                      className="w-full"
                    >
                      Set Logo URL
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </PopoverContent>
        </Popover>

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
    </div>
  );
};
