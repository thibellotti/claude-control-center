import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { ClientWorkspace, BrandAssets } from '../../../shared/client-types';
import { useClients } from '../../hooks/useClients';
import { useProjectContext } from '../../hooks/useProjectContext';
import Tabs from '../shared/Tabs';
import {
  ChevronLeftIcon,
  TrashIcon,
  SaveIcon,
} from '../icons';
import ClientAnalytics from '../analytics/ClientAnalytics';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLIENT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'projects', label: 'Projects' },
  { id: 'analytics', label: 'Analytics' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClientDetailProps {
  workspace: ClientWorkspace;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// ClientDetail
// ---------------------------------------------------------------------------

export default function ClientDetail({ workspace, onBack }: ClientDetailProps) {
  const { saveClient, deleteClient } = useClients();
  const { projects, onSelectProject, getSessionForProject } = useProjectContext();

  const [activeTab, setActiveTab] = useState('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable local state
  const [name, setName] = useState(workspace.name);
  const [editingName, setEditingName] = useState(false);
  const [notes, setNotes] = useState(workspace.notes || '');
  const [logo, setLogo] = useState(workspace.brandAssets?.logo || '');
  const [colors, setColors] = useState<string[]>(workspace.brandAssets?.colors || []);
  const [typography, setTypography] = useState(workspace.brandAssets?.typography || '');
  const [guidelines, setGuidelines] = useState(workspace.brandAssets?.guidelines || '');
  const [budgetAmount, setBudgetAmount] = useState(workspace.budget?.totalAllocated?.toString() || '');
  const [budgetCurrency, setBudgetCurrency] = useState(workspace.budget?.currency || '$');

  // Reset local state when workspace changes
  useEffect(() => {
    setName(workspace.name);
    setNotes(workspace.notes || '');
    setLogo(workspace.brandAssets?.logo || '');
    setColors(workspace.brandAssets?.colors || []);
    setTypography(workspace.brandAssets?.typography || '');
    setGuidelines(workspace.brandAssets?.guidelines || '');
    setBudgetAmount(workspace.budget?.totalAllocated?.toString() || '');
    setBudgetCurrency(workspace.budget?.currency || '$');
  }, [workspace]);

  // Projects belonging to this client
  const clientProjects = useMemo(
    () => projects.filter((p) => p.client === workspace.name),
    [projects, workspace.name],
  );

  // Active sessions count for this client
  const clientActiveSessions = useMemo(
    () => clientProjects.filter((p) => !!getSessionForProject(p.path)).length,
    [clientProjects, getSessionForProject],
  );

  // Memoize the project list passed to ClientAnalytics to avoid new array refs each render
  const analyticsProjects = useMemo(
    () => clientProjects.map((p) => ({ path: p.path, name: p.name, client: p.client })),
    [clientProjects],
  );

  // Tab counts
  const tabsWithCounts = useMemo(
    () =>
      CLIENT_TABS.map((t) =>
        t.id === 'projects' ? { ...t, count: clientProjects.length } : t,
      ),
    [clientProjects],
  );

  // Save handler
  const handleSave = useCallback(async () => {
    setSaving(true);
    const brandAssets: BrandAssets = {
      logo: logo || undefined,
      colors: colors.length > 0 ? colors : undefined,
      typography: typography || undefined,
      guidelines: guidelines || undefined,
    };

    const parsed = parseFloat(budgetAmount);
    const updated: ClientWorkspace = {
      ...workspace,
      name,
      brandAssets,
      notes: notes || undefined,
      budget:
        !isNaN(parsed) && parsed > 0
          ? { totalAllocated: parsed, currency: budgetCurrency }
          : undefined,
      updatedAt: Date.now(),
    };

    await saveClient(updated);
    setSaving(false);
  }, [workspace, name, logo, colors, typography, guidelines, notes, budgetAmount, budgetCurrency, saveClient]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    await deleteClient(workspace.id);
    onBack();
  }, [workspace.id, deleteClient, onBack]);

  // Color list helpers
  const addColor = useCallback(() => setColors((prev) => [...prev, '#000000']), []);
  const removeColor = useCallback(
    (index: number) => setColors((prev) => prev.filter((_, i) => i !== index)),
    [],
  );
  const updateColor = useCallback(
    (index: number, value: string) =>
      setColors((prev) => prev.map((c, i) => (i === index ? value : c))),
    [],
  );

  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <header>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-text-tertiary hover:text-text-secondary text-xs mb-4 transition-colors"
          >
            <ChevronLeftIcon size={12} />
            Dashboard
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {editingName ? (
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingName(false);
                    if (e.key === 'Escape') {
                      setName(workspace.name);
                      setEditingName(false);
                    }
                  }}
                  className="text-xl font-bold text-text-primary bg-transparent border-b border-accent outline-none w-full"
                />
              ) : (
                <h1
                  className="text-xl font-bold text-text-primary cursor-pointer hover:text-accent transition-colors"
                  onClick={() => setEditingName(true)}
                  title="Click to edit"
                >
                  {name}
                </h1>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                <span>{clientProjects.length} project{clientProjects.length !== 1 ? 's' : ''}</span>
                {clientActiveSessions > 0 && (
                  <span className="text-status-active">{clientActiveSessions} live session{clientActiveSessions !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-accent text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <SaveIcon size={12} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <Tabs tabs={tabsWithCounts} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Brand Assets */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-text-primary">Brand Assets</h2>
              <div className="bg-surface-1 border border-border-subtle rounded-card p-4 space-y-4">
                {/* Logo */}
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Logo path</label>
                  <input
                    type="text"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder="/path/to/logo.svg"
                    className="w-full bg-surface-0 border border-border-subtle rounded-button px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors"
                  />
                </div>

                {/* Colors */}
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Colors</label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => updateColor(i, e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border border-border-subtle"
                        />
                        <input
                          type="text"
                          value={color}
                          onChange={(e) => updateColor(i, e.target.value)}
                          className="w-20 bg-surface-0 border border-border-subtle rounded-button px-2 py-1 text-xs text-text-primary font-mono outline-none focus:border-accent transition-colors"
                        />
                        <button
                          onClick={() => removeColor(i)}
                          className="text-text-tertiary hover:text-status-error transition-colors"
                          title="Remove color"
                        >
                          <TrashIcon size={10} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addColor}
                      className="text-xs text-accent hover:opacity-80 transition-opacity"
                    >
                      + Add color
                    </button>
                  </div>
                </div>

                {/* Typography */}
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Typography</label>
                  <input
                    type="text"
                    value={typography}
                    onChange={(e) => setTypography(e.target.value)}
                    placeholder="e.g. Inter, Space Grotesk"
                    className="w-full bg-surface-0 border border-border-subtle rounded-button px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors"
                  />
                </div>

                {/* Guidelines */}
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Brand guidelines</label>
                  <textarea
                    value={guidelines}
                    onChange={(e) => setGuidelines(e.target.value)}
                    placeholder="Design rules, tone of voice, restrictions..."
                    rows={3}
                    className="w-full bg-surface-0 border border-border-subtle rounded-button px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors resize-y"
                  />
                </div>
              </div>
            </section>

            {/* Notes */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-text-primary">Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes about this client..."
                rows={4}
                className="w-full bg-surface-1 border border-border-subtle rounded-card px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors resize-y"
              />
            </section>

            {/* Budget */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-text-primary">Budget</h2>
              <div className="bg-surface-1 border border-border-subtle rounded-card p-4 flex items-center gap-3">
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Currency</label>
                  <input
                    type="text"
                    value={budgetCurrency}
                    onChange={(e) => setBudgetCurrency(e.target.value)}
                    className="w-16 bg-surface-0 border border-border-subtle rounded-button px-2 py-1.5 text-sm text-text-primary text-center outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-text-tertiary mb-1">Allocated amount</label>
                  <input
                    type="text"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-surface-0 border border-border-subtle rounded-button px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
            </section>

            {/* Danger zone */}
            <section className="space-y-4 pt-4 border-t border-border-subtle">
              <h2 className="text-sm font-semibold text-status-error">Danger Zone</h2>
              {confirmDelete ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary">Delete &quot;{workspace.name}&quot;? This cannot be undone.</span>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 rounded-button bg-status-error text-white text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-button bg-surface-2 text-text-secondary text-xs font-medium hover:bg-surface-3 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-surface-1 border border-border-subtle text-status-error text-xs font-medium hover:bg-surface-2 transition-colors"
                >
                  <TrashIcon size={12} />
                  Delete Client
                </button>
              )}
            </section>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-3">
            {clientProjects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-tertiary text-sm">No projects assigned to this client.</p>
                <p className="text-text-tertiary text-xs mt-1">
                  Set the client field in a project&apos;s CLAUDE.md to assign it here.
                </p>
              </div>
            ) : (
              clientProjects.map((project) => {
                const session = getSessionForProject(project.path);
                return (
                  <button
                    key={project.path}
                    onClick={() => onSelectProject(project)}
                    className="w-full flex items-center gap-3 bg-surface-1 border border-border-subtle rounded-card px-4 py-3 text-left hover:border-border-default transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {project.name}
                        </span>
                        {session && (
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-status-active" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-text-tertiary truncate block">
                        {project.path.replace(/^\/Users\/[^/]+/, '~')}
                      </span>
                    </div>
                    {project.git && (
                      <span className="text-xs text-text-tertiary shrink-0">
                        {project.git.branch}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <ClientAnalytics
            clientName={workspace.name}
            projects={analyticsProjects}
          />
        )}
      </div>
    </div>
  );
}
