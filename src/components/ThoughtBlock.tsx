import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';
import './ThoughtBlock.css';

interface ThoughtBlockProps {
  thought: string;
  response: string;
}

export const ThoughtBlock: React.FC<ThoughtBlockProps> = ({ thought, response }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!thought.trim()) {
    return <MarkdownMessage content={response} />;
  }

  return (
    <div className="thought-block-container">
      <div className="thought-header-wrapper">
        <button
          type="button"
          className={`thought-toggle-btn ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(prev => !prev)}
        >
          <span className="thought-title">
            <Brain size={16} className="brain-icon" />
            Razonamiento interno
          </span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isOpen && (
        <div className="thought-content-area">
          <div className="thought-text-wrapper">
            {thought}
          </div>
        </div>
      )}

      {response.trim() && (
        <div className="thought-final-response">
          <MarkdownMessage content={response} />
        </div>
      )}
    </div>
  );
};
