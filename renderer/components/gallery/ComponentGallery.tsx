import React from 'react';
import { useComponentGallery } from '../../hooks/useComponentGallery';
import ComponentCard from './ComponentCard';

interface ComponentGalleryProps {
  projectPath: string;
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M11.5 7A4.5 4.5 0 11 10 3.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M12 2v2.5H9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ComponentsEmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="18" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4" y="18" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="18" y="18" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function ComponentGallery({ projectPath }: ComponentGalleryProps) {
  const {
    components,
    allComponents,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectedDirectory,
    setSelectedDirectory,
    directories,
    stats,
    rescan,
  } = useComponentGallery(projectPath);

  // Loading state
  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block w-5 h-5 border-2 border-border-default border-t-accent rounded-full animate-spin" />
        <p className="text-sm text-text-tertiary mt-3">Scanning components...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={rescan}
          className="mt-3 text-xs text-accent hover:text-accent-hover transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty state
  if (allComponents.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="text-text-tertiary mb-3 flex justify-center">
          <ComponentsEmptyIcon />
        </div>
        <p className="text-sm text-text-secondary">No React components found</p>
        <p className="text-xs text-text-tertiary mt-1">
          This project does not have any exported React components in .tsx or .jsx files.
        </p>
        <button
          onClick={rescan}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-surface-2 border border-border-subtle text-xs text-text-secondary hover:text-text-primary hover:border-border-default transition-colors mx-auto"
        >
          <RefreshIcon />
          Rescan
        </button>
      </div>
    );
  }

  // Group components by directory for display when no filter is active
  const groupedComponents: Record<string, typeof components> = {};
  if (!selectedDirectory && !searchQuery.trim()) {
    for (const comp of components) {
      if (!groupedComponents[comp.directory]) {
        groupedComponents[comp.directory] = [];
      }
      groupedComponents[comp.directory].push(comp);
    }
  }

  const showGrouped = !selectedDirectory && !searchQuery.trim();

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-primary">Components</h3>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-surface-3 text-text-tertiary">
            {stats.total}
          </span>
        </div>
        <button
          onClick={rescan}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-surface-2 border border-border-subtle text-xs text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
        >
          <RefreshIcon />
          Rescan
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-4 text-[11px] text-text-tertiary">
        <span>{stats.total} total</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          {stats.withTests} with tests
        </span>
        <span>{stats.withoutTests} without tests</span>
      </div>

      {/* Search input */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search components..."
          className="w-full bg-surface-1 border border-border-subtle rounded-lg pl-9 pr-3 py-2 text-xs text-text-primary placeholder-text-tertiary outline-none focus:border-border-default transition-colors"
        />
      </div>

      {/* Directory filter pills */}
      {directories.length > 1 && (
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedDirectory(null)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
              selectedDirectory === null
                ? 'bg-accent text-white'
                : 'bg-surface-2 text-text-tertiary hover:text-text-secondary'
            }`}
          >
            All
          </button>
          {directories.map((dir) => (
            <button
              key={dir}
              onClick={() =>
                setSelectedDirectory(selectedDirectory === dir ? null : dir)
              }
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
                selectedDirectory === dir
                  ? 'bg-accent text-white'
                  : 'bg-surface-2 text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {dir}
            </button>
          ))}
        </div>
      )}

      {/* Component grid */}
      {components.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-text-tertiary">
            No components match your search.
          </p>
        </div>
      ) : showGrouped ? (
        // Grouped by directory
        <div className="space-y-6">
          {Object.entries(groupedComponents)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dir, comps]) => (
              <div key={dir}>
                <h4 className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
                  {dir}
                </h4>
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                  {comps.map((comp) => (
                    <ComponentCard key={`${comp.filePath}-${comp.name}`} component={comp} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        // Flat grid (filtered or searched)
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {components.map((comp) => (
            <ComponentCard key={`${comp.filePath}-${comp.name}`} component={comp} />
          ))}
        </div>
      )}
    </div>
  );
}
