/**
 * EditableMessage — Inline edit textarea for user messages (#187)
 *
 * Design ref: textarea same width as message, Save & Submit + Cancel buttons below.
 */
import React, { useState, useRef, useEffect } from 'react';

interface EditableMessageProps {
  initialContent: string;
  onSubmit: (newContent: string) => void;
  onCancel: () => void;
}

export const EditableMessage: React.FC<EditableMessageProps> = ({ initialContent, onSubmit, onCancel }) => {
  const [content, setContent] = useState(initialContent);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(content.length, content.length);
      // Auto-resize
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  return (
    <div className="w-full">
      <textarea
        ref={ref}
        value={content}
        onChange={handleInput}
        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
        rows={1}
      />
      <div className="flex gap-2 mt-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => content.trim() && onSubmit(content.trim())}
          disabled={!content.trim() || content.trim() === initialContent}
          className="px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Save &amp; Submit
        </button>
      </div>
    </div>
  );
};
