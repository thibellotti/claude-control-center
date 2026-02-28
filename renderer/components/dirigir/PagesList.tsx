import React, { useState, useEffect, useCallback, memo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DetectedPage {
  path: string;
  label: string;
  filePath: string;
}

interface PagesListProps {
  projectPath: string;
  onNavigate?: (routePath: string) => void;
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 mx-2">
      <div className="w-4 h-4 rounded bg-surface-3 animate-pulse" />
      <div className="h-3 w-20 rounded bg-surface-3 animate-pulse" />
      <div className="h-2.5 w-12 rounded bg-surface-3 animate-pulse ml-auto" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page row
// ---------------------------------------------------------------------------

const PageRow = memo(function PageRow({
  page,
  isActive,
  onClick,
}: {
  page: DetectedPage;
  isActive: boolean;
  onClick: () => void;
}) {
  const initial = page.label.charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-button mx-2 cursor-pointer transition-colors w-[calc(100%-16px)] text-left ${
        isActive
          ? 'bg-surface-2 border-l-2 border-accent'
          : 'hover:bg-surface-2'
      }`}
    >
      {/* Route icon */}
      <div className="w-4 h-4 rounded bg-accent-muted flex items-center justify-center shrink-0">
        <span className="text-micro text-accent font-mono leading-none">
          {initial}
        </span>
      </div>

      {/* Label */}
      <span className="text-xs text-text-primary truncate">{page.label}</span>

      {/* Route path */}
      <span className="text-micro text-text-tertiary ml-auto shrink-0">
        {page.path}
      </span>
    </button>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PagesList = memo(function PagesList({
  projectPath,
  onNavigate,
}: PagesListProps) {
  const [pages, setPages] = useState<DetectedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePath, setActivePath] = useState<string | null>(null);

  // Fetch pages on mount / when projectPath changes
  useEffect(() => {
    let cancelled = false;

    async function fetchPages() {
      setLoading(true);
      try {
        const result = await (window as any).api.getProjectPages(projectPath);
        if (!cancelled) {
          setPages(result ?? []);
        }
      } catch {
        if (!cancelled) {
          setPages([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPages();
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  const handleClick = useCallback(
    (routePath: string) => {
      setActivePath(routePath);
      onNavigate?.(routePath);
    },
    [onNavigate],
  );

  // ------ Render ------

  return (
    <div className="flex flex-col">
      {/* Header */}
      <span className="text-xs font-medium text-text-secondary px-3 py-2">
        Pages
      </span>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col gap-1">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {/* Empty state */}
      {!loading && pages.length === 0 && (
        <span className="text-micro text-text-tertiary px-3">
          No pages detected
        </span>
      )}

      {/* Page list */}
      {!loading && pages.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {pages.map((page) => (
            <PageRow
              key={page.path}
              page={page}
              isActive={activePath === page.path}
              onClick={() => handleClick(page.path)}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default PagesList;
