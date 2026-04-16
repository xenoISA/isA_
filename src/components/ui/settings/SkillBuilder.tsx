/**
 * SkillBuilder — Create and manage user-defined skills (#205)
 * Skills are repeatable workflows triggered by phrase or command.
 */
import React, { useState, useCallback } from 'react';

interface UserSkill {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: string[];
  createdAt: string;
}

const STORAGE_KEY = 'isa_user_skills';

function loadSkills(): UserSkill[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveSkills(skills: UserSkill[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(skills)); } catch {}
}

export const SkillBuilder: React.FC = () => {
  const [skills, setSkills] = useState<UserSkill[]>(loadSkills);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('');
  const [steps, setSteps] = useState('');

  const handleCreate = useCallback(() => {
    if (!name.trim() || !trigger.trim()) return;
    const skill: UserSkill = {
      id: Date.now().toString(36),
      name: name.trim(),
      description: description.trim(),
      trigger: trigger.trim(),
      steps: steps.split('\n').filter(s => s.trim()),
      createdAt: new Date().toISOString(),
    };
    const updated = [skill, ...skills];
    setSkills(updated);
    saveSkills(updated);
    setCreating(false);
    setName(''); setDescription(''); setTrigger(''); setSteps('');
  }, [name, description, trigger, steps, skills]);

  const handleDelete = useCallback((id: string) => {
    const updated = skills.filter(s => s.id !== id);
    setSkills(updated);
    saveSkills(updated);
  }, [skills]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Skills</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create repeatable workflows triggered by a phrase.</p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">
            New Skill
          </button>
        )}
      </div>

      {creating && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Skill name" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <input value={trigger} onChange={e => setTrigger(e.target.value)} placeholder="Trigger phrase (e.g., 'weekly report')" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <textarea value={steps} onChange={e => setSteps(e.target.value)} placeholder="Steps (one per line)..." rows={3} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setCreating(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
            <button onClick={handleCreate} disabled={!name.trim() || !trigger.trim()} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors">Create</button>
          </div>
        </div>
      )}

      {/* Skills list */}
      {skills.length === 0 && !creating ? (
        <div className="py-8 text-center text-sm text-gray-400">No skills yet. Create one to get started.</div>
      ) : (
        <div className="space-y-2">
          {skills.map(skill => (
            <div key={skill.id} className="group flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{skill.name}</div>
                {skill.description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{skill.description}</div>}
                <div className="text-xs text-blue-500 mt-1">Trigger: "{skill.trigger}"</div>
                {skill.steps.length > 0 && (
                  <div className="text-xs text-gray-400 mt-1">{skill.steps.length} step{skill.steps.length !== 1 ? 's' : ''}</div>
                )}
              </div>
              <button onClick={() => handleDelete(skill.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
