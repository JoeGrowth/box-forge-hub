import { FileText, Download, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";

interface ChatMessageBubbleProps {
  content: string;
  isOwnMessage: boolean;
  createdAt: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  isRead?: boolean;
  grouped?: boolean;
}

export const ChatMessageBubble = ({
  content,
  isOwnMessage,
  createdAt,
  fileUrl,
  fileName,
  fileType,
  isRead,
  grouped,
}: ChatMessageBubbleProps) => {
  const hasFile = fileUrl && fileName;

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} ${grouped ? "mt-1" : "mt-4"}`}>
      <div
        className={`max-w-[75%] px-4 py-2 rounded-2xl ${
          isOwnMessage
            ? `bg-primary text-primary-foreground ${grouped ? "rounded-tr-md" : ""}`
            : `bg-muted text-foreground ${grouped ? "rounded-tl-md" : ""}`
        }`}
      >
        {/* File attachment */}
        {hasFile && fileType === "image" && (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block mb-2">
            <img
              src={fileUrl}
              alt={fileName || "Shared image"}
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
        {content && <p className="text-sm whitespace-pre-wrap break-words">{content}</p>}

        {/* Meta */}
        <div
          className={`flex items-center gap-1 mt-1 ${isOwnMessage ? "justify-end" : "justify-start"} ${
            isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          <span className="text-[10px] leading-none">{format(new Date(createdAt), "HH:mm")}</span>
          {isOwnMessage &&
            (isRead ? (
              <CheckCheck className="w-3 h-3" aria-label="Read" />
            ) : (
              <Check className="w-3 h-3" aria-label="Sent" />
            ))}
        </div>
      </div>
    </div>
  );
};
