/**
 * MentionText - Renders stored mention-formatted text with styled mention badges
 * Parses @[name](id) segments and renders mentions as styled spans
 */

import React from 'react';
import { segmentMentionText } from '../../utils/mentions';

interface MentionTextProps {
  text: string;
}

export const MentionText: React.FC<MentionTextProps> = ({ text }) => {
  const segments = segmentMentionText(text);

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === 'mention') {
          return (
            <span
              key={i}
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary text-xs font-medium mx-0.5"
              title={seg.text}
            >
              @{seg.text}
            </span>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </span>
  );
};

export default MentionText;
