import React, { useEffect, useMemo, useRef } from 'react';
import type { CellConfigFeed } from '../../../../shared/types';
import { useLiveFeed } from '../../../hooks/useTerminal';

interface FeedCellProps {
  config: CellConfigFeed;
}

export default function FeedCell({ config }: FeedCellProps) {
  const liveFeed = useLiveFeed();

  useEffect(() => {
    liveFeed.start();
    return () => liveFeed.stop();
  }, []);

  const filtered = useMemo(
    () => liveFeed.entries.filter((e) => e.projectPath === config.projectPath),
    [liveFeed.entries, config.projectPath]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered.length]);

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-text-tertiary">Waiting for activity...</p>
          </div>
        ) : (
          filtered.map((entry, i) => (
            <div
              key={`${entry.timestamp}-${i}`}
              className="flex items-start gap-1.5 px-2.5 py-1 border-b border-border-subtle/20"
            >
              <span className="text-micro font-mono text-text-tertiary shrink-0 mt-px w-[50px]">
                {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <p className="text-micro text-text-secondary leading-snug break-words min-w-0">
                {entry.summary}
              </p>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between px-2.5 py-1 border-t border-border-subtle bg-surface-0 shrink-0">
        <span className="text-micro text-text-tertiary">{filtered.length} events</span>
        {filtered.length > 0 && (
          <span className="text-micro text-status-active font-medium">Live</span>
        )}
      </div>
    </div>
  );
}
