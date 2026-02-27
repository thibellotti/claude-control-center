import React from 'react';
import { useSettings } from '../../hooks/useSettings';
import { useTheme } from '../../hooks/useTheme';

/**
 * SettingsPage — displays Claude Code global settings.
 * Sections: Allowed Permissions, Environment Variables, Enabled Plugins.
 */

function maskValue(key: string, value: string): string {
  const sensitivePatterns = ['TOKEN', 'SECRET', 'KEY', 'PASSWORD', 'PASS'];
  const upper = key.toUpperCase();
  if (sensitivePatterns.some((p) => upper.includes(p))) {
    return '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
  }
  return value;
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        {title}
      </h2>
      {count !== undefined && (
        <span className="px-1.5 py-0.5 rounded-full bg-surface-3 text-[10px] font-mono text-text-tertiary">
          {count}
        </span>
      )}
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  const options: { value: 'light' | 'dark' | 'system'; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];

  return (
    <section>
      <SectionHeader title="Appearance" />
      <div className="bg-surface-1 border border-border-subtle rounded-card p-4">
        <div className="flex gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`px-4 py-1.5 rounded-button text-xs font-medium transition-colors ${
                theme === opt.value
                  ? 'bg-accent text-white'
                  : 'bg-surface-2 text-text-secondary hover:text-text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const { settings, loading } = useSettings();

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-text-tertiary text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse" />
          Loading settings...
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <p className="text-sm text-text-tertiary">
          No settings found. Claude Code configuration may not exist yet.
        </p>
      </div>
    );
  }

  const permissions = settings.permissions?.allow || [];
  const envVars = settings.env || {};
  const envEntries = Object.entries(envVars);
  const plugins = settings.enabledPlugins || {};
  const pluginEntries = Object.entries(plugins);

  return (
    <div className="p-6 space-y-8 max-w-[800px]">
      {/* Appearance */}
      <AppearanceSection />

      {/* Allowed Permissions */}
      <section>
        <SectionHeader title="Allowed Permissions" count={permissions.length} />
        <div className="bg-surface-1 border border-border-subtle rounded-card p-4 max-h-[300px] overflow-y-auto">
          {permissions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {permissions.map((perm) => (
                <span
                  key={perm}
                  className="px-2.5 py-1 rounded bg-surface-3 text-xs font-mono text-text-secondary"
                >
                  {perm}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">No permissions configured.</p>
          )}
        </div>
      </section>

      {/* Environment Variables */}
      <section>
        <SectionHeader title="Environment Variables" count={envEntries.length} />
        <div className="bg-surface-1 border border-border-subtle rounded-card p-4">
          {envEntries.length > 0 ? (
            <div className="space-y-2">
              {envEntries.map(([key, value]) => (
                <div key={key} className="flex items-baseline gap-2 min-w-0">
                  <span className="text-xs font-mono font-medium text-text-secondary shrink-0">
                    {key}
                  </span>
                  <span className="text-text-tertiary text-xs shrink-0">=</span>
                  <span className="text-xs font-mono text-text-tertiary truncate min-w-0">
                    {maskValue(key, value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">No environment variables set.</p>
          )}
        </div>
      </section>

      {/* Enabled Plugins */}
      <section>
        <SectionHeader title="Enabled Plugins" count={pluginEntries.length} />
        <div className="bg-surface-1 border border-border-subtle rounded-card p-4">
          {pluginEntries.length > 0 ? (
            <div className="space-y-2">
              {pluginEntries.map(([name, enabled]) => (
                <div key={name} className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-xs font-mono text-text-secondary truncate min-w-0">{name}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      enabled
                        ? 'bg-status-active/10 text-status-active'
                        : 'bg-status-idle/10 text-status-idle'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        enabled ? 'bg-status-active' : 'bg-status-idle'
                      }`}
                    />
                    {enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">No plugins configured.</p>
          )}
        </div>
      </section>
    </div>
  );
}
