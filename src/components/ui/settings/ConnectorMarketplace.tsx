/**
 * ConnectorMarketplace — Browse available integrations (#206)
 * Shows available MCP tools and connectors (Google, Slack, Notion, etc.)
 */
import React, { useState, useEffect } from 'react';

interface Connector {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  connected: boolean;
}

const FALLBACK_CONNECTORS: Connector[] = [
  { id: 'google-workspace', name: 'Google Workspace', icon: '🔷', description: 'Gmail, Docs, Calendar, Drive', category: 'Productivity', connected: false },
  { id: 'slack', name: 'Slack', icon: '💬', description: 'Channels, messages, notifications', category: 'Communication', connected: false },
  { id: 'notion', name: 'Notion', icon: '📓', description: 'Pages, databases, wikis', category: 'Productivity', connected: false },
  { id: 'github', name: 'GitHub', icon: '🐙', description: 'Repos, issues, PRs, actions', category: 'Development', connected: true },
  { id: 'jira', name: 'Jira', icon: '📋', description: 'Issues, sprints, boards', category: 'Project Management', connected: false },
  { id: 'figma', name: 'Figma', icon: '🎨', description: 'Designs, components, prototypes', category: 'Design', connected: false },
  { id: 'linear', name: 'Linear', icon: '📐', description: 'Issues, projects, cycles', category: 'Project Management', connected: false },
  { id: 'salesforce', name: 'Salesforce', icon: '☁️', description: 'Contacts, deals, reports', category: 'CRM', connected: false },
  { id: 'postgres', name: 'PostgreSQL', icon: '🐘', description: 'Query databases directly', category: 'Data', connected: true },
  { id: 'redis', name: 'Redis', icon: '🔴', description: 'Cache and key-value store', category: 'Data', connected: true },
];

export const ConnectorMarketplace: React.FC = () => {
  const [connectors, setConnectors] = useState<Connector[]>(FALLBACK_CONNECTORS);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

  // Fetch from API, fall back to hardcoded (#206)
  useEffect(() => {
    fetch('/api/v1/marketplace/connectors', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: Connector[]) => { if (Array.isArray(data) && data.length > 0) setConnectors(data); })
      .catch(() => {}); // Keep fallback
  }, []);

  const handleConnect = async (id: string) => {
    setInstalling(id);
    try {
      const res = await fetch('/api/v1/marketplace/connectors/install', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: id }),
      });
      if (res.ok) {
        setConnectors((prev) => prev.map((c) => c.id === id ? { ...c, connected: true } : c));
      }
    } catch {}
    setInstalling(null);
  };

  const categories = [...new Set(connectors.map(c => c.category))];

  const filtered = connectors.filter(c =>
    (!search || c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())) &&
    (!category || c.category === category)
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Integrations</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Connect tools and services to expand Mate's capabilities.</p>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search integrations..."
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCategory(null)}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
            !category ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >All</button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat === category ? null : cat)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              cat === category ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >{cat}</button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map(c => (
          <div key={c.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{c.icon}</span>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</div>
                <div className="text-xs text-gray-400">{c.category}</div>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{c.description}</p>
            <button
              onClick={() => !c.connected && handleConnect(c.id)}
              disabled={c.connected || installing === c.id}
              className={`w-full py-1.5 text-xs font-medium rounded-lg transition-colors ${
              c.connected
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}>
              {c.connected ? 'Connected' : installing === c.id ? 'Installing...' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
