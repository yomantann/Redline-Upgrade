import { useEffect, useState } from 'react';
import './expandable-text.css';

export function ExpandableText({
  text,
  className = '',
  expandAfterCharacters = 150,
}: {
  text: string;
  className?: string;
  expandAfterCharacters?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [text]);
  const canExpand = text.trim().length > expandAfterCharacters;
  return (
    <div className={`expandable-text ${expanded ? 'expanded' : ''} ${className}`}>
      <p>{text}</p>
      {canExpand && (
        <button type="button" className="expandable-text-toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
