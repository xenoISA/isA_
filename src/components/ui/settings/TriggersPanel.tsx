/**
 * TriggersPanel — CRUD UI for proactive triggers (#303).
 *
 * Backed by ProactiveService. Lists triggers, lets users create/edit/delete,
 * and dry-run against a mock event to preview `{ would_fire, reason }`
 * without side effects.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { proactiveService } from '../../../api/ProactiveService';
import type {
  Trigger,
  TriggerInput,
  TriggerType,
  TriggerTestResult,
} from '../../../api/types/proactive';
import { validateTriggerInput, type TriggerFormErrors } from '../../../utils/triggerValidation';

type DraftTrigger = Partial<TriggerInput> & { condition?: Record<string, unknown> };

const TYPE_OPTIONS: { value: TriggerType; label: string; hint: string }[] = [
  { value: 'cron',      label: 'Cron',      hint: 'Runs on a schedule (e.g. "0 9 * * 1-5")' },
  { value: 'threshold', label: 'Threshold', hint: 'Runs when a metric crosses a bound' },
  { value: 'webhook',   label: 'Webhook',   hint: 'Runs when an external webhook hits a path' },
  { value: 'event',     label: 'Event',     hint: 'Runs on an arbitrary backend event' },
];

function emptyDraft(type: TriggerType = 'cron'): DraftTrigger {
  return {
    type,
    name: '',
    action_prompt: '',
    enabled: true,
    condition: type === 'cron'      ? { cron: '0 9 * * *' }
             : type === 'threshold' ? { metric: '', above: 0 }
             : type === 'webhook'   ? { path: '' }
                                    : {},
  };
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export const TriggersPanel: React.FC = () => {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Trigger | null>(null);
  const [creating, setCreating] = useState(false);
  const [dryRuns, setDryRuns] = useState<Record<string, TriggerTestResult | { error: string }>>({});

  const loadTriggers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await proactiveService.listTriggers({ limit: 100 });
      setTriggers(res.triggers);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTriggers(); }, [loadTriggers]);

  const handleCreate = useCallback(async (input: TriggerInput) => {
    const created = await proactiveService.createTrigger(input);
    setTriggers((prev) => [created, ...prev]);
    setCreating(false);
  }, []);

  const handleUpdate = useCallback(async (id: string, input: TriggerInput) => {
    const updated = await proactiveService.updateTrigger(id, {
      name: input.name,
      action_prompt: input.action_prompt,
      condition: input.condition,
      enabled: input.enabled,
    });
    setTriggers((prev) => prev.map((t) => (t.id === id ? updated : t)));
    setEditing(null);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const snapshot = triggers;
    // Optimistic remove
    setTriggers((prev) => prev.filter((t) => t.id !== id));
    try {
      await proactiveService.deleteTrigger(id);
    } catch (err) {
      setTriggers(snapshot); // revert
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  }, [triggers]);

  const handleDryRun = useCallback(async (trigger: Trigger) => {
    try {
      const result = await proactiveService.testTrigger(trigger.id, {
        mock_event: {},
        apply_rate_limit: false,
      });
      setDryRuns((prev) => ({ ...prev, [trigger.id]: result }));
    } catch (err) {
      setDryRuns((prev) => ({
        ...prev,
        [trigger.id]: { error: err instanceof Error ? err.message : String(err) },
      }));
    }
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Triggers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Proactive rules that let Mate start conversations on your behalf.
          </p>
        </div>
        <button
          onClick={() => { setCreating(true); setEditing(null); }}
          disabled={creating || !!editing}
          className="px-3 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + New trigger
        </button>
      </header>

      {loadError && (
        <div className="text-sm px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-800/40">
          Failed to load: {loadError}
        </div>
      )}

      {creating && (
        <TriggerForm
          initial={emptyDraft()}
          submitLabel="Create"
          onSubmit={(draft) => handleCreate(draft as TriggerInput)}
          onCancel={() => setCreating(false)}
        />
      )}

      {loading && triggers.length === 0 && !loadError ? (
        <div className="text-sm text-gray-500">Loading triggers…</div>
      ) : triggers.length === 0 && !creating ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg px-4 py-8 text-center">
          No triggers yet. Create one to have Mate reach out automatically.
        </div>
      ) : (
        <ul className="space-y-2">
          {triggers.map((trigger) => (
            <li key={trigger.id}>
              {editing?.id === trigger.id ? (
                <TriggerForm
                  initial={trigger}
                  submitLabel="Save"
                  onSubmit={(draft) => handleUpdate(trigger.id, draft as TriggerInput)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <TriggerCard
                  trigger={trigger}
                  dryRun={dryRuns[trigger.id]}
                  onEdit={() => { setEditing(trigger); setCreating(false); }}
                  onDelete={() => handleDelete(trigger.id)}
                  onDryRun={() => handleDryRun(trigger)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// TriggerCard — one row in the list
// ---------------------------------------------------------------------------

interface TriggerCardProps {
  trigger: Trigger;
  dryRun: TriggerTestResult | { error: string } | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onDryRun: () => void;
}

const TriggerCard: React.FC<TriggerCardProps> = ({ trigger, dryRun, onEdit, onDelete, onDryRun }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const typeLabel = TYPE_OPTIONS.find((o) => o.value === trigger.type)?.label ?? trigger.type;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-900/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{trigger.name}</span>
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
              {typeLabel}
            </span>
            {!trigger.enabled && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded">
                Paused
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2" title={trigger.action_prompt}>
            {trigger.action_prompt}
          </div>
          <div className="mt-2 flex gap-4 text-[11px] text-gray-500 dark:text-gray-500">
            <span><span className="text-gray-400">Next fire:</span> {formatTimestamp(trigger.next_fire)}</span>
            <span>
              <span className="text-gray-400">Last result:</span>{' '}
              {trigger.last_result ? 'ran' : 'none'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onDryRun}
            className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Preview fire condition without side effects"
          >
            Dry-run
          </button>
          <button
            onClick={onEdit}
            className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Edit
          </button>
          {confirmDelete ? (
            <button
              onClick={() => { setConfirmDelete(false); onDelete(); }}
              className="px-2 py-1 text-xs rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50"
            >
              Confirm
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-600 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {dryRun && <TriggerDryRunResult result={dryRun} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// TriggerForm — create + edit
// ---------------------------------------------------------------------------

interface TriggerFormProps {
  initial: DraftTrigger | Trigger;
  submitLabel: string;
  onSubmit: (draft: TriggerInput) => void | Promise<void>;
  onCancel: () => void;
}

const TriggerForm: React.FC<TriggerFormProps> = ({ initial, submitLabel, onSubmit, onCancel }) => {
  const [draft, setDraft] = useState<DraftTrigger>(() => ({
    type: initial.type,
    name: initial.name,
    action_prompt: initial.action_prompt,
    enabled: initial.enabled ?? true,
    condition: initial.condition ?? {},
  }));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors: TriggerFormErrors = useMemo(() => validateTriggerInput(draft), [draft]);
  const hasErrors = Object.keys(errors).length > 0;

  const setType = (type: TriggerType) => setDraft((prev) => ({ ...prev, type, condition: emptyDraft(type).condition }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit(draft as TriggerInput);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-900/40"
      aria-label={submitLabel === 'Create' ? 'Create trigger' : 'Edit trigger'}
    >
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Type
        <select
          value={draft.type}
          onChange={(e) => setType(e.target.value as TriggerType)}
          className="mt-1 block w-full px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="mt-1 block text-[11px] text-gray-500">{TYPE_OPTIONS.find((o) => o.value === draft.type)?.hint}</span>
      </label>

      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Name
        <input
          type="text"
          value={draft.name ?? ''}
          onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
          className="mt-1 block w-full px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          placeholder="e.g. Morning brief"
        />
        {errors.name && <span className="mt-1 block text-[11px] text-red-600">{errors.name}</span>}
      </label>

      <ConditionFields type={draft.type!} condition={draft.condition ?? {}} onChange={(c) => setDraft((prev) => ({ ...prev, condition: c }))} error={errors.condition} />

      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Action prompt
        <textarea
          value={draft.action_prompt ?? ''}
          onChange={(e) => setDraft((prev) => ({ ...prev, action_prompt: e.target.value }))}
          rows={3}
          className="mt-1 block w-full px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          placeholder="What should Mate do when this fires?"
        />
        {errors.action_prompt && <span className="mt-1 block text-[11px] text-red-600">{errors.action_prompt}</span>}
      </label>

      <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={draft.enabled ?? true}
          onChange={(e) => setDraft((prev) => ({ ...prev, enabled: e.target.checked }))}
        />
        Enabled
      </label>

      {submitError && (
        <div className="text-xs text-red-600" role="alert">{submitError}</div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={hasErrors || submitting}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// ConditionFields — type-specific inputs
// ---------------------------------------------------------------------------

interface ConditionFieldsProps {
  type: TriggerType;
  condition: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  error: string | undefined;
}

const ConditionFields: React.FC<ConditionFieldsProps> = ({ type, condition, onChange, error }) => {
  const inputClass = "mt-1 block w-full px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono";

  return (
    <div className="space-y-2">
      {type === 'cron' && (
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Cron expression
          <input
            type="text"
            value={(condition.cron as string | undefined) ?? ''}
            onChange={(e) => onChange({ ...condition, cron: e.target.value })}
            className={inputClass}
            placeholder="0 9 * * 1-5"
          />
        </label>
      )}
      {type === 'threshold' && (
        <>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Metric
            <input
              type="text"
              value={(condition.metric as string | undefined) ?? ''}
              onChange={(e) => onChange({ ...condition, metric: e.target.value })}
              className={inputClass}
              placeholder="cpu_percent"
            />
          </label>
          <div className="flex gap-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 flex-1">
              Above
              <input
                type="number"
                value={(condition.above as number | undefined) ?? ''}
                onChange={(e) => onChange({ ...condition, above: e.target.value === '' ? undefined : Number(e.target.value) })}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 flex-1">
              Below
              <input
                type="number"
                value={(condition.below as number | undefined) ?? ''}
                onChange={(e) => onChange({ ...condition, below: e.target.value === '' ? undefined : Number(e.target.value) })}
                className={inputClass}
              />
            </label>
          </div>
        </>
      )}
      {type === 'webhook' && (
        <>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Path
            <input
              type="text"
              value={(condition.path as string | undefined) ?? ''}
              onChange={(e) => onChange({ ...condition, path: e.target.value })}
              className={inputClass}
              placeholder="/hooks/my-hook"
            />
          </label>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Secret (optional)
            <input
              type="password"
              value={(condition.secret as string | undefined) ?? ''}
              onChange={(e) => onChange({ ...condition, secret: e.target.value || undefined })}
              className={inputClass}
            />
          </label>
        </>
      )}
      {type === 'event' && (
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Event condition (JSON)
          <textarea
            rows={3}
            value={JSON.stringify(condition, null, 2)}
            onChange={(e) => {
              try { onChange(JSON.parse(e.target.value || '{}')); } catch { /* ignore until valid */ }
            }}
            className={inputClass}
          />
        </label>
      )}
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// TriggerDryRunResult — inline banner
// ---------------------------------------------------------------------------

const TriggerDryRunResult: React.FC<{ result: TriggerTestResult | { error: string } }> = ({ result }) => {
  if ('error' in result) {
    return (
      <div className="text-xs px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-800/40" role="alert">
        Dry-run failed: {result.error}
      </div>
    );
  }
  const palette = result.would_fire
    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200/60 dark:border-green-800/40'
    : 'bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 border-gray-200/60 dark:border-gray-700/50';
  return (
    <div className={`text-xs px-3 py-2 rounded-md border ${palette}`} role="status">
      <div className="font-medium">{result.would_fire ? 'Would fire' : 'Would NOT fire'}</div>
      <div className="mt-0.5">{result.reason}</div>
    </div>
  );
};
