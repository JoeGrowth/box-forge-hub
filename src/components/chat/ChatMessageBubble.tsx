import { FileText, Download, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

interface ChatMessageBubbleProps {
  content: string;
  isOwnMessage: boolean;
  createdAt: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
}

export const ChatMessageBubble = ({
  content,
  isOwnMessage,
  createdAt,
  fileUrl,
  fileName,
  fileType,
}: ChatMessageBubbleProps) => {
  const hasFile = fileUrl && fileName;

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isOwnMessage
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {/* File attachment */}
        {hasFile && fileType === "image" && (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block mb-2">
            <img
              src={fileUrl}
              alt={fileName || "Image"}
              className="rounded-xl max-w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              loading="lazy"
            />
          </a>
        )}

        {hasFile && fileType === "file" && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 p-2 rounded-lg mb-2 transition-colors ${
              isOwnMessage
                ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                : "bg-background/50 hover:bg-background/80"
            }`}
          >
            <FileText className="w-8 h-8 flex-shrink-0 opacity-70" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{fileName}</p>
              <p className={`text-xs ${isOwnMessage ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                Tap to open
              </p>
            </div>
            <Download className="w-4 h-4 flex-shrink-0 opacity-60" />
          </a>
        )}

        {/* Text content */}
        {content && (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        )}

        {/* Timestamp */}
        <p
          className={`text-xs mt-1 ${
            isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {format(new Date(createdAt), "HH:mm")}
        </p>
      </div>
    </div>
  );
};
