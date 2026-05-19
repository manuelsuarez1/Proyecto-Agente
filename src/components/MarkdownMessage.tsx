import { lazy, Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

const HighlightedCode = lazy(() => import('./HighlightedCode'));

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const codeText = String(children).replace(/\n$/, '');

    if (match) {
      return (
        <Suspense fallback={<pre className="code-fallback"><code>{codeText}</code></pre>}>
          <HighlightedCode language={match[1]} code={codeText} />
        </Suspense>
      );
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}
