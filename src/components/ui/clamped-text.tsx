import { useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_LIMIT = 270;

type ClampedTextProps = {
  text: string;
  className?: string;
  limit?: number;
};

/**
 * Renders long paragraphs truncated to `limit` characters (spaces and
 * punctuation included). Clicking the text expands it in place; clicking
 * again collapses it back.
 */
export function ClampedText({ text, className, limit = DEFAULT_LIMIT }: ClampedTextProps) {
  const [expanded, setExpanded] = useState(false);

  if (text.length <= limit) {
    return <p className={className}>{text}</p>;
  }

  return (
    <p
      className={cn(className, "cursor-pointer")}
      onClick={() => setExpanded((v) => !v)}
      title={expanded ? "Click to show less" : "Click to read more"}
    >
      {expanded ? text : `${text.slice(0, limit).trimEnd()}…`}{" "}
      <span className="font-medium text-primary">{expanded ? "Show less" : "Read more"}</span>
    </p>
  );
}
