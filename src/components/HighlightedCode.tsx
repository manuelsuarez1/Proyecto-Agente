import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface HighlightedCodeProps {
  language: string;
  code: string;
}

export default function HighlightedCode({ language, code }: HighlightedCodeProps) {
  return (
    <SyntaxHighlighter style={oneDark} language={language}>
      {code}
    </SyntaxHighlighter>
  );
}
