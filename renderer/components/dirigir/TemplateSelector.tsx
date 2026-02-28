import React, { useEffect, useState } from 'react';

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
}

interface TemplateSelectorProps {
  onSelect: (template: { id: string; name: string; description: string }) => void;
}

function LandingPageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="6" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="16" x2="14" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" strokeWidth="1.5" />
      <rect x="12" y="7" width="6" height="4" rx="0.5" stroke="currentColor" strokeWidth="1" />
      <rect x="12" y="14" width="6" height="4" rx="0.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function BlankIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  'landing-page': LandingPageIcon,
  dashboard: DashboardIcon,
  blank: BlankIcon,
};

const TemplateSelector = React.memo(function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    window.api.getTemplates().then((data: TemplateInfo[]) => {
      setTemplates(data);
    });
  }, []);

  const handleSelect = (template: TemplateInfo) => {
    setSelectedId(template.id);
    onSelect(template);
  };

  if (templates.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {templates.map((template) => {
        const isSelected = selectedId === template.id;
        const Icon = ICON_MAP[template.id] ?? BlankIcon;

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => handleSelect(template)}
            className={`flex items-start gap-3 rounded-card border p-4 text-left transition-colors cursor-pointer ${
              isSelected
                ? 'border-accent bg-accent-muted'
                : 'bg-surface-1 border-border-subtle hover:border-accent hover:bg-surface-2'
            }`}
          >
            <Icon className="mt-0.5 shrink-0 text-text-secondary" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-text-primary">{template.name}</div>
              <div className="text-xs text-text-secondary mt-1">{template.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
});

export default TemplateSelector;
