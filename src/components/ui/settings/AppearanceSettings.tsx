/**
 * AppearanceSettings — Theme, font, and send behavior settings (#196)
 *
 * Design ref: Claude-style settings with card selectors for theme,
 * dropdown for font, toggle for send behavior.
 */
import React from 'react';
import { useThemeContext } from '../../../providers/ThemeProvider';
import { useAppearanceSettings } from '../../../hooks/useAppearanceSettings';
import type { ThemePreference } from '../../../hooks/useThemePreference';
import type { ChatFont, SendBehavior } from '../../../hooks/useAppearanceSettings';

const themeOptions: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];

const fontOptions: { value: ChatFont; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'system', label: 'System Font' },
  { value: 'dyslexic', label: 'Dyslexic Friendly' },
];

export const AppearanceSettings: React.FC = () => {
  const { preference, setTheme } = useThemeContext();
  const { font, setFont, sendBehavior, setSendBehavior } = useAppearanceSettings();

  return (
    <div className="space-y-8">
      {/* Theme */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Theme</h3>
        <div className="flex gap-3">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 ${
                preference === opt.value
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{opt.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Font */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Chat Font</h3>
        <select
          value={font}
          onChange={(e) => setFont(e.target.value as ChatFont)}
          className="w-full max-w-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {fontOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </section>

      {/* Send Behavior */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Send Message</h3>
        <div className="flex gap-3">
          {[
            { value: 'enter' as SendBehavior, label: 'Enter sends', desc: 'Shift+Enter for new line' },
            { value: 'cmd-enter' as SendBehavior, label: '⌘+Enter sends', desc: 'Enter for new line' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSendBehavior(opt.value)}
              className={`flex-1 p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                sendBehavior === opt.value
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{opt.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
