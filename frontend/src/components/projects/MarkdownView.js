import React from 'react';

const MarkdownView = ({ text, className = "" }) => {
  if (!text) return null;

  const renderText = (txt) => {
    if (!txt) return null;
    
    // Split by bold (**text**) and italic (*text*) markers
    // Using a more robust regex to handle overlapping or nested (basic)
    let parts = [txt];

    // Bold
    parts = parts.flatMap(p => typeof p === 'string' ? p.split(/(\*\*.*?\*\*)/g) : p);
    parts = parts.map((p, idx) => {
      if (typeof p === 'string' && p.startsWith('**') && p.endsWith('**')) {
        return <strong key={`bold-${idx}`}>{p.slice(2, -2)}</strong>;
      }
      return p;
    });

    // Italic
    parts = parts.flatMap(p => typeof p === 'string' ? p.split(/(\*.*?\*)/g) : p);
    parts = parts.map((p, idx) => {
      if (typeof p === 'string' && p.startsWith('*') && p.endsWith('*')) {
        return <em key={`italic-${idx}`}>{p.slice(1, -1)}</em>;
      }
      return p;
    });

    return parts;
  };

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');

    if (isBullet) {
      currentList.push(
        <li key={`li-${index}`} className="ml-1">
          {renderText(trimmed.slice(2))}
        </li>
      );
    } else {
      // If we were in a list, push it before processing the current line
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${index}`} className="list-disc pl-5 my-2 space-y-1">
            {currentList}
          </ul>
        );
        currentList = [];
      }

      if (trimmed === '') {
        elements.push(<div key={`br-${index}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${index}`} className="leading-relaxed">
            {renderText(line)}
          </p>
        );
      }
    }
  });

  // Final list cleanup
  if (currentList.length > 0) {
    elements.push(
      <ul key="ul-final" className="list-disc pl-5 my-2 space-y-1">
        {currentList}
      </ul>
    );
  }

  return <div className={`markdown-view ${className}`}>{elements}</div>;
};

export default MarkdownView;
