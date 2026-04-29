/**
 * CodeSandboxPanel — Sandboxed code execution in artifact panel (#200)
 *
 * Wraps @isa/ui-web CodeSandbox for rendering code artifacts with live preview.
 * Falls back to syntax-highlighted code block if CodeSandbox is unavailable.
 */
import React, { useMemo } from 'react';

let resolvedCodeSandboxComponent: React.FC<any> | null | undefined;

const getCodeSandboxComponent = (): React.FC<any> | null => {
  if (resolvedCodeSandboxComponent !== undefined) {
    return resolvedCodeSandboxComponent;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@isa/ui-web');
    resolvedCodeSandboxComponent = mod.CodeSandbox || null;
  } catch {
    resolvedCodeSandboxComponent = null;
  }

  return resolvedCodeSandboxComponent;
};

interface CodeSandboxPanelProps {
  code: string;
  language?: string;
  filename?: string;
  onClose?: () => void;
  embedded?: boolean;
}

export function detectTemplate(language?: string, filename?: string): string {
  if (filename?.endsWith('.tsx') || filename?.endsWith('.jsx') || language === 'react') return 'react-ts';
  if (filename?.endsWith('.vue') || language === 'vue') return 'vue';
  if (filename?.endsWith('.html') || language === 'html') return 'vanilla';
  return 'react-ts';
}

export const CodeSandboxPanel: React.FC<CodeSandboxPanelProps> = ({
  code, language, filename, onClose, embedded = false,
}) => {
  const CodeSandboxComponent = getCodeSandboxComponent();
  const template = useMemo(() => detectTemplate(language, filename), [language, filename]);
  const files = useMemo(() => {
    const name = filename || (template.startsWith('react') ? '/App.tsx' : '/index.js');
    return { [name]: code };
  }, [code, filename, template]);

  return (
    <div
      data-testid="artifact-code-sandbox"
      className={`flex flex-col h-full bg-white dark:bg-gray-900 ${embedded ? 'rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden' : 'border-l border-gray-200 dark:border-gray-700'}`}
    >
      {!embedded && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {filename || 'Code Preview'}
            </span>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {CodeSandboxComponent ? (
          <CodeSandboxComponent
            files={files}
            template={template}
            theme="auto"
            showConsole={true}
            height="100%"
          />
        ) : (
          <div data-testid="artifact-code-sandbox-fallback" className="h-full overflow-auto bg-gray-50 dark:bg-gray-800">
            <div className="px-4 py-3 border-b border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/10 dark:text-amber-200 text-sm">
              Live preview unavailable. Showing the source code instead.
            </div>
            <pre className="p-4 text-sm font-mono text-gray-800 dark:text-gray-200">
              <code>{code}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
