import React from 'react';

interface MarkdownViewProps {
  content: string;
}

// Simple markdown renderer using string replacement only -- no external libraries
function renderMarkdown(md: string): string {
  // Escape HTML entities first
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (triple backtick)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, _lang, code) =>
      `<pre class="bg-surface-3 border border-border-subtle rounded-card p-3 overflow-x-auto my-3"><code class="text-[12px] font-mono text-text-secondary">${code.trim()}</code></pre>`
  );

  // Inline code (single backtick)
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-surface-3 px-1.5 py-0.5 rounded text-[12px] font-mono text-text-secondary">$1</code>'
  );

  // Headers
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="text-sm font-semibold text-text-primary mt-4 mb-2">$1</h3>'
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="text-base font-semibold text-text-primary mt-5 mb-2">$1</h2>'
  );
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="text-lg font-bold text-text-primary mt-6 mb-3">$1</h1>'
  );

  // Bold
  html = html.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong class="font-semibold text-text-primary">$1</strong>'
  );

  // Checkboxes
  html = html.replace(
    /^- \[x\] (.+)$/gm,
    '<div class="flex items-start gap-2 my-0.5"><span class="text-status-active mt-0.5">&#9745;</span><span class="text-text-secondary line-through">$1</span></div>'
  );
  html = html.replace(
    /^- \[ \] (.+)$/gm,
    '<div class="flex items-start gap-2 my-0.5"><span class="text-text-tertiary mt-0.5">&#9744;</span><span class="text-text-secondary">$1</span></div>'
  );

  // Unordered lists
  html = html.replace(
    /^- (.+)$/gm,
    '<div class="flex items-start gap-2 my-0.5 pl-1"><span class="text-text-tertiary">&#8226;</span><span class="text-text-secondary">$1</span></div>'
  );

  // Paragraphs: wrap remaining lines that aren't already wrapped in HTML tags
  const lines = html.split('\n');
  const processed = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return line;
    return `<p class="text-sm text-text-secondary my-1">${trimmed}</p>`;
  });

  return processed.join('\n');
}

export default function MarkdownView({ content }: MarkdownViewProps) {
  const html = renderMarkdown(content);

  return (
    <div
      className="markdown-view text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
