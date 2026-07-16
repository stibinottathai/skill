"use client";

import { useEffect, useState } from "react";
import { marked } from "marked";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    // Compile markdown synchronously
    try {
      const parsedHtml = marked.parse(content || "") as string;
      setHtml(parsedHtml);
    } catch (e) {
      console.error("Markdown parsing failed: ", e);
      setHtml(content || "");
    }
  }, [content]);

  return (
    <div className={className}>
      <div
        className="markdown-body text-zinc-800 dark:text-zinc-300 text-sm leading-relaxed space-y-3"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Styled Markdown classes to support headings, lists, code, links */}
      <style jsx global>{`
        .markdown-body h1 {
          font-size: 1.35rem;
          font-weight: 800;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: hsl(var(--foreground));
        }
        .markdown-body h2 {
          font-size: 1.15rem;
          font-weight: 700;
          margin-top: 1.1rem;
          margin-bottom: 0.4rem;
          color: hsl(var(--foreground));
        }
        .markdown-body h3 {
          font-size: 1rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.35rem;
          color: hsl(var(--foreground));
        }
        .markdown-body p {
          margin-bottom: 0.75rem;
        }
        .markdown-body ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .markdown-body ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .markdown-body li {
          margin-bottom: 0.25rem;
        }
        .markdown-body code {
          font-family: monospace;
          background-color: rgba(99, 102, 241, 0.08);
          color: #ef4444;
          padding: 0.15rem 0.3rem;
          border-radius: 0.25rem;
          font-size: 0.85em;
          border: 1px solid rgba(99, 102, 241, 0.15);
        }
        .dark .markdown-body code {
          background-color: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .markdown-body pre {
          background-color: #f4f4f5;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
          border: 1px solid #e4e4e7;
        }
        .dark .markdown-body pre {
          background-color: #18181b;
          border: 1px solid #27272a;
        }
        .markdown-body pre code {
          background-color: transparent;
          color: inherit;
          padding: 0;
          border: none;
          font-size: 0.9em;
        }
        .markdown-body a {
          color: #4f46e5;
          text-decoration: underline;
          font-weight: 550;
        }
        .dark .markdown-body a {
          color: #818cf8;
        }
        .markdown-body input[type="checkbox"] {
          margin-right: 0.4rem;
          border-radius: 0.25rem;
          border: 1px solid #d4d4d8;
          accent-color: #4f46e5;
          vertical-align: middle;
        }
      `}</style>
    </div>
  );
}
