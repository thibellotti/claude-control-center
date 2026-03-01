import React, { useState, useCallback, useMemo } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { useTheme } from '../../hooks/useTheme';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const SENSITIVE_PATTERNS = ['TOKEN', 'SECRET', 'KEY', 'PASSWORD', 'PASS'];

function maskValue(key: string, value: string): string {
  const upper = key.toUpperCase();
  if (SENSITIVE_PATTERNS.some((p) => upper.includes(p))) {
    return '••••••••';
  }
  return value;
}

function isSensitive(key: string): boolean {
  const upper = key.toUpperCase();
  return SENSITIVE_PATTERNS.some((p) => upper.includes(p));
}

/** Section IDs for anchor navigation */
const SECTIONS = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'environment', label: 'Environment' },
  { id: 'plugins', label: 'Plugins' },
  { id: 'info', label: 'Info' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

/* ─── Permission Grouping ─────────────────────────────────────────────────── */

interface PermissionGroup {
  key: string;
  label: string;
  permissions: string[];
}

function groupPermissions(permissions: string[]): PermissionGroup[] {
  const shell: string[] = [];
  const fileAccess: string[] = [];
  const other: string[] = [];

  for (const perm of permissions) {
    if (perm.startsWith('Bash(') || perm.startsWith('bash(')) {
      shell.push(perm);
    } else if (/^(Read|Write|Edit)/i.test(perm)) {
      fileAccess.push(perm);
    } else {
      other.push(perm);
    }
  }

  const groups: PermissionGroup[] = [];
  if (shell.length > 0) groups.push({ key: 'shell', label: 'Shell Commands', permissions: shell });
  if (fileAccess.length > 0) groups.push({ key: 'file', label: 'File Access', permissions: fileAccess });
  if (other.length > 0) groups.push({ key: 'other', label: 'Other Permissions', permissions: other });
  return groups;
}

/* ─── Section Icons (div-based shapes, no SVG imports) ────────────────────── */

function IconAppearance() {
  return (
    <div className="w-4 h-4 relative shrink-0">
      <div className="absolute inset-0 rounded-full border-2 border-text-tertiary" />
      <div className="absolute top-0 left-0 w-1/2 h-full rounded-l-full bg-text-tertiary" />
    </div>
  );
}

function IconPermissions() {
  return (
    <div className="w-4 h-4 relative shrink-0 flex flex-col justify-center gap-[3px]">
      <div className="h-[2px] w-full bg-text-tertiary rounded-full" />
      <div className="h-[2px] w-3 bg-text-tertiary rounded-full" />
      <div className="h-[2px] w-full bg-text-tertiary rounded-full" />
    </div>
  );
}

function IconEnvironment() {
  return (
    <div className="w-4 h-4 relative shrink-0">
      <div className="absolute inset-[2px] rounded border-2 border-text-tertiary" />
      <div className="absolute top-[5px] left-[5px] w-[6px] h-[2px] bg-text-tertiary rounded-full" />
      <div className="absolute top-[9px] left-[5px] w-[4px] h-[2px] bg-text-tertiary rounded-full" />
    </div>
  );
}

function IconPlugins() {
  return (
    <div className="w-4 h-4 relative shrink-0">
      <div className="absolute inset-0 rounded-sm border-2 border-text-tertiary" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[6px] h-[6px] rounded-full bg-text-tertiary" />
    </div>
  );
}

function IconInfo() {
  return (
    <div className="w-4 h-4 relative shrink-0">
      <div className="absolute inset-0 rounded-full border-2 border-text-tertiary" />
      <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-[2px] h-[2px] rounded-full bg-text-tertiary" />
      <div className="absolute top-[7px] left-1/2 -translate-x-1/2 w-[2px] h-[5px] bg-text-tertiary rounded-full" />
    </div>
  );
}

const SECTION_ICONS: Record<SectionId, React.ReactNode> = {
  appearance: <IconAppearance />,
  permissions: <IconPermissions />,
  environment: <IconEnvironment />,
  plugins: <IconPlugins />,
  info: <IconInfo />,
};

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function SectionHeader({
  id,
  title,
  count,
}: {
  id: SectionId;
  title: string;
  count?: number;
}) {
  return (
    <div id={id} className="flex items-center gap-2.5 mb-4 scroll-mt-24">
      {SECTION_ICONS[id]}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        {title}
      </h2>
      {count !== undefined && (
        <span className="px-1.5 py-0.5 rounded-full bg-surface-3 text-micro font-mono text-text-tertiary">
          {count}
        </span>
      )}
    </div>
  );
}

/** Sticky section navigation bar */
function SectionNav({ activeSection }: { activeSection: SectionId }) {
  const handleClick = useCallback((id: SectionId) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <nav className="sticky top-0 z-10 bg-surface-0/80 backdrop-blur-sm border-b border-border-subtle -mx-6 px-6 py-2.5 mb-8">
      <div className="flex items-center gap-1">
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => handleClick(section.id)}
              className={`px-3 py-1.5 rounded-button text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-surface-2 text-text-primary'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-1'
              }`}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ─── Theme Preview Card ──────────────────────────────────────────────────── */

interface ThemeOption {
  value: 'light' | 'dark' | 'system';
  label: string;
  /** Colors for the mini preview: [bg, sidebar, text, accent] */
  preview: {
    bg: string;
    sidebar: string;
    line1: string;
    line2: string;
    accent: string;
  };
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    preview: {
      bg: '#f8f8f8',
      sidebar: '#e8e8e8',
      line1: '#c0c0c0',
      line2: '#d4d4d4',
      accent: '#6366f1',
    },
  },
  {
    value: 'dark',
    label: 'Dark',
    preview: {
      bg: '#1a1a1a',
      sidebar: '#252525',
      line1: '#444444',
      line2: '#383838',
      accent: '#818cf8',
    },
  },
  {
    value: 'system',
    label: 'System',
    preview: {
      bg: 'linear-gradient(135deg, #f8f8f8 50%, #1a1a1a 50%)',
      sidebar: 'linear-gradient(135deg, #e8e8e8 50%, #252525 50%)',
      line1: '#888888',
      line2: '#777777',
      accent: '#818cf8',
    },
  },
];

function ThemeCard({
  option,
  isSelected,
  onSelect,
}: {
  option: ThemeOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { preview } = option;
  const isSplit = option.value === 'system';

  return (
    <button
      onClick={onSelect}
      className={`group flex-1 rounded-card border-2 transition-all p-3 text-left ${
        isSelected
          ? 'border-accent bg-surface-1 shadow-sm'
          : 'border-border-subtle bg-surface-1 hover:border-border-default hover:bg-surface-2'
      }`}
    >
      {/* Mini preview window */}
      <div
        className="w-full aspect-[16/10] rounded overflow-hidden mb-3 relative"
        style={{
          background: isSplit ? undefined : preview.bg,
        }}
      >
        {isSplit ? (
          <>
            <div className="absolute inset-0" style={{ background: '#f8f8f8' }} />
            <div
              className="absolute inset-0"
              style={{
                clipPath: 'polygon(40% 0, 100% 0, 100% 100%, 20% 100%)',
                background: '#1a1a1a',
              }}
            />
            {/* Left sidebar (light) */}
            <div
              className="absolute top-[8%] left-[4%] w-[20%] h-[84%] rounded-sm"
              style={{ background: '#e8e8e8' }}
            />
            {/* Right sidebar (dark) */}
            <div
              className="absolute top-[8%] right-[4%] w-[20%] h-[84%] rounded-sm"
              style={{ background: '#252525' }}
            />
            {/* Content lines */}
            <div
              className="absolute top-[20%] left-[30%] w-[25%] h-[6%] rounded-sm"
              style={{ background: '#c0c0c0' }}
            />
            <div
              className="absolute top-[34%] left-[30%] w-[18%] h-[6%] rounded-sm"
              style={{ background: '#d4d4d4' }}
            />
            <div
              className="absolute top-[20%] right-[30%] w-[20%] h-[6%] rounded-sm"
              style={{ background: '#444444' }}
            />
            <div
              className="absolute top-[34%] right-[30%] w-[15%] h-[6%] rounded-sm"
              style={{ background: '#383838' }}
            />
          </>
        ) : (
          <>
            {/* Sidebar */}
            <div
              className="absolute top-[8%] left-[4%] w-[22%] h-[84%] rounded-sm"
              style={{ background: preview.sidebar }}
            />
            {/* Content lines */}
            <div
              className="absolute top-[18%] left-[32%] w-[40%] h-[7%] rounded-sm"
              style={{ background: preview.line1 }}
            />
            <div
              className="absolute top-[32%] left-[32%] w-[28%] h-[7%] rounded-sm"
              style={{ background: preview.line2 }}
            />
            <div
              className="absolute top-[46%] left-[32%] w-[34%] h-[7%] rounded-sm"
              style={{ background: preview.line1 }}
            />
            {/* Accent element */}
            <div
              className="absolute bottom-[14%] left-[32%] w-[18%] h-[10%] rounded-sm"
              style={{ background: preview.accent }}
            />
          </>
        )}
      </div>

      {/* Label */}
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full border-2 transition-colors ${
            isSelected
              ? 'border-accent bg-accent'
              : 'border-border-default bg-transparent'
          }`}
        >
          {isSelected && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white" />
            </div>
          )}
        </div>
        <span
          className={`text-xs font-medium ${
            isSelected ? 'text-text-primary' : 'text-text-secondary'
          }`}
        >
          {option.label}
        </span>
      </div>
    </button>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <section>
      <SectionHeader id="appearance" title="Appearance" />
      <div className="grid grid-cols-3 gap-3">
        {THEME_OPTIONS.map((opt) => (
          <ThemeCard
            key={opt.value}
            option={opt}
            isSelected={theme === opt.value}
            onSelect={() => setTheme(opt.value)}
          />
        ))}
      </div>
    </section>
  );
}

/* ─── Permissions Section ─────────────────────────────────────────────────── */

function PermissionsSection({ permissions }: { permissions: string[] }) {
  const groups = useMemo(() => groupPermissions(permissions), [permissions]);

  return (
    <section>
      <SectionHeader
        id="permissions"
        title="Allowed Permissions"
        count={permissions.length}
      />
      <div className="bg-surface-1 border border-border-subtle rounded-card p-4 max-h-[400px] overflow-y-auto">
        {permissions.length > 0 ? (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.key}>
                {/* Group sub-header */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-micro font-semibold uppercase tracking-wider text-text-tertiary">
                    {group.label}
                  </span>
                  <span className="text-micro font-mono text-text-tertiary opacity-60">
                    ({group.permissions.length})
                  </span>
                  <div className="flex-1 h-px bg-border-subtle" />
                </div>
                {/* Permission pills */}
                <div className="flex flex-wrap gap-1.5">
                  {group.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2.5 py-1 rounded bg-surface-3 text-xs font-mono text-text-secondary leading-tight"
                      title={perm}
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-tertiary">No permissions configured.</p>
        )}
      </div>
    </section>
  );
}

/* ─── Environment Variables Section ───────────────────────────────────────── */

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded text-micro text-text-tertiary hover:text-text-primary hover:bg-surface-3 shrink-0"
      title="Copy value"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function EnvironmentSection({
  envEntries,
}: {
  envEntries: [string, string][];
}) {
  return (
    <section>
      <SectionHeader
        id="environment"
        title="Environment Variables"
        count={envEntries.length}
      />
      <div className="bg-surface-1 border border-border-subtle rounded-card overflow-hidden">
        {envEntries.length > 0 ? (
          <div>
            {/* Table header */}
            <div className="flex items-center gap-4 px-4 py-2 border-b border-border-subtle bg-surface-2/50">
              <span className="text-micro font-semibold uppercase tracking-wider text-text-tertiary w-[200px] shrink-0">
                Variable
              </span>
              <span className="text-micro font-semibold uppercase tracking-wider text-text-tertiary flex-1">
                Value
              </span>
            </div>
            {/* Rows */}
            {envEntries.map(([key, value], index) => {
              const masked = maskValue(key, value);
              const sensitive = isSensitive(key);
              return (
                <div
                  key={key}
                  className={`group flex items-center gap-4 px-4 py-2.5 min-w-0 ${
                    index % 2 === 0 ? 'bg-surface-1' : 'bg-surface-0/50'
                  }`}
                >
                  <span className="text-xs font-mono font-semibold text-text-secondary w-[200px] shrink-0 truncate">
                    {key}
                  </span>
                  <span className="text-xs font-mono text-text-tertiary truncate flex-1 min-w-0">
                    {masked}
                  </span>
                  {!sensitive && <CopyButton value={value} />}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4">
            <p className="text-xs text-text-tertiary">
              No environment variables set.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Plugins Section ─────────────────────────────────────────────────────── */

function PluginsSection({
  pluginEntries,
}: {
  pluginEntries: [string, boolean][];
}) {
  return (
    <section>
      <SectionHeader
        id="plugins"
        title="Enabled Plugins"
        count={pluginEntries.length}
      />
      <div className="space-y-2">
        {pluginEntries.length > 0 ? (
          pluginEntries.map(([name, enabled]) => (
            <div
              key={name}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-card border transition-colors min-w-0 ${
                enabled
                  ? 'bg-surface-1 border-border-subtle'
                  : 'bg-surface-0 border-border-subtle opacity-70'
              }`}
            >
              {/* Plugin name */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    enabled ? 'bg-surface-3' : 'bg-surface-2'
                  }`}
                >
                  <span className="text-xs font-bold text-text-tertiary uppercase">
                    {name.charAt(0)}
                  </span>
                </div>
                <span className="text-sm font-mono text-text-secondary truncate min-w-0">
                  {name}
                </span>
              </div>
              {/* Status */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 ${
                  enabled
                    ? 'bg-status-active/10'
                    : 'bg-status-idle/10'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    enabled ? 'bg-status-active' : 'bg-status-idle'
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    enabled ? 'text-status-active' : 'text-status-idle'
                  }`}
                >
                  {enabled ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-surface-1 border border-border-subtle rounded-card p-4">
            <p className="text-xs text-text-tertiary">No plugins configured.</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Info Section ────────────────────────────────────────────────────────── */

function InfoSection() {
  const paths = [
    {
      label: 'Settings',
      path: '~/.claude/settings.json',
      description: 'Global permissions, environment variables, and plugins',
    },
    {
      label: 'Global Instructions',
      path: '~/.claude/CLAUDE.md',
      description: 'Custom instructions applied to all projects',
    },
  ];

  return (
    <section>
      <SectionHeader id="info" title="Configuration Paths" />
      <div className="bg-surface-1 border border-border-subtle rounded-card divide-y divide-border-subtle">
        {paths.map((item) => (
          <div key={item.path} className="flex items-start gap-3 px-4 py-3">
            <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary mt-1.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-text-secondary">
                  {item.label}
                </span>
                <span className="text-xs font-mono text-accent truncate">
                  {item.path}
                </span>
              </div>
              <p className="text-micro text-text-tertiary mt-0.5">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */

/**
 * SettingsPage — displays Claude Code global settings with grouped sections,
 * theme previews, and anchor-based section navigation.
 */
export default function SettingsPage() {
  const { settings, loading } = useSettings();
  const [activeSection, setActiveSection] = useState<SectionId>('appearance');

  // Track which section is in view via IntersectionObserver
  React.useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const section of SECTIONS) {
      const el = document.getElementById(section.id);
      if (!el) continue;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveSection(section.id);
            }
          }
        },
        { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    }

    return () => {
      for (const obs of observers) obs.disconnect();
    };
  }, [loading]);

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
    <div className="max-w-[800px] h-full overflow-y-auto">
      <div className="p-6 pb-0">
        {/* Page Header */}
        <div className="mb-2">
          <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
          <p className="text-xs text-text-tertiary mt-1">
            Claude Code global configuration
          </p>
        </div>
      </div>

      {/* Sticky Section Navigation */}
      <div className="px-6">
        <SectionNav activeSection={activeSection} />
      </div>

      {/* Sections */}
      <div className="px-6 pb-12 space-y-10">
        <AppearanceSection />
        <PermissionsSection permissions={permissions} />
        <EnvironmentSection envEntries={envEntries as [string, string][]} />
        <PluginsSection
          pluginEntries={pluginEntries as [string, boolean][]}
        />
        <InfoSection />
      </div>
    </div>
  );
}
