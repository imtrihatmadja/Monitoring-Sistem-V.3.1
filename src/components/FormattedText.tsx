import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
  italic?: boolean;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = "", italic = false }) => {
  if (!text) return null;

  // Split by newlines
  const lines = text.split('\n');

  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const pushCurrentList = (key: number) => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`list-${key}`} className="list-disc pl-5 my-1.5 space-y-1 text-slate-700">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`list-${key}`} className="list-decimal pl-5 my-1.5 space-y-1 text-slate-700">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      pushCurrentList(i);
      // Empty line acts as a paragraph break, add a tiny gap if there was content before
      if (elements.length > 0) {
        elements.push(<div key={`gap-${i}`} className="h-1.5" />);
      }
      return;
    }

    // Match bullet point (- list, * list, • list, + list)
    const bulletMatch = trimmed.match(/^[-*•+]\s+(.*)/);
    // Match numbered point (1. list, 2) list)
    const numberMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);

    if (bulletMatch) {
      const content = bulletMatch[1];
      if (currentList && currentList.type === 'ul') {
        currentList.items.push(content);
      } else {
        pushCurrentList(i);
        currentList = { type: 'ul', items: [content] };
      }
    } else if (numberMatch) {
      const content = numberMatch[2];
      if (currentList && currentList.type === 'ol') {
        currentList.items.push(content);
      } else {
        pushCurrentList(i);
        currentList = { type: 'ol', items: [content] };
      }
    } else {
      pushCurrentList(i);
      elements.push(
        <p key={`p-${i}`} className={`leading-relaxed text-slate-700 ${italic ? 'italic' : ''}`}>
          {trimmed}
        </p>
      );
    }
  });

  // Push remaining list if any
  pushCurrentList(lines.length);

  return (
    <div className={`space-y-1 text-xs text-slate-700 ${className}`}>
      {elements}
    </div>
  );
};
