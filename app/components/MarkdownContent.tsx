import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h3 className="mb-3 mt-4 text-base font-semibold text-zinc-900 first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h4 className="mb-2 mt-4 text-sm font-semibold text-zinc-900 first:mt-0">
      {children}
    </h4>
  ),
  h3: ({ children }) => (
    <h5 className="mb-2 mt-3 text-sm font-semibold text-zinc-900 first:mt-0">
      {children}
    </h5>
  ),
  p: ({ children }) => (
    <p className="mb-3 break-words leading-relaxed last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="break-words leading-relaxed">{children}</li>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-blue-600 underline underline-offset-2 hover:text-blue-700"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-4 border-zinc-300 pl-4 italic text-zinc-700 last:mb-0">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = Boolean(className);

    if (isBlock) {
      return <code className={className}>{children}</code>;
    }

    return (
      <code className="rounded bg-zinc-200/80 px-1.5 py-0.5 font-mono text-[0.85em] text-zinc-800">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-md bg-zinc-200/70 p-3 text-sm last:mb-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-4 border-zinc-300" />,
};

type MarkdownContentProps = {
  content: string;
};

export default function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="break-words text-sm text-zinc-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
