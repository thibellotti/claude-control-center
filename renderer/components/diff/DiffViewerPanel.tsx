import React, { useState, useMemo } from 'react';
import { useDiffViewer } from '../../hooks/useDiffViewer';
import { RefreshIcon, SpinnerIcon } from '../icons';
import type { FileDiffEntry } from '../../../shared/types';

interface DiffViewerPanelProps {
  projectPath: string;
  mode: 'live' | 'review';
  fromRef?: string;
  toRef?: string;
}

const statusColors: Record<FileDiffEntry['status'], string> = {
  added: 'text-green-400',
  modified: 'text-yellow-400',
  deleted: 'text-red-400',
  renamed: 'text-blue-400',
};

const statusSymbols: Record<FileDiffEntry['status'], string> = {
  added: '+',
  modified: '~',
  deleted: '-',
  renamed: 'R',
};

function extractFileDiff(fullDiff: string, filePath: string): string {
  if (!fullDiff) return '';
  const chunks = fullDiff.split(/^diff --git /m);
  for (const chunk of chunks) {
    if (chunk.includes(`b/${filePath}`)) {
      return 'diff --git ' + chunk;
    }
  }
  return '';
}

function DiffContent({ diffText }: { diffText: string }) {
  const lines = diffText.split('\n');

  return (
    <pre className="text-xs font-mono leading-5 overflow-auto h-full p-3">
      {lines.map((line, i) => {
        let cls = 'text-text-secondary';
        let bgCls = '';

        if (line.startsWith('+') && !line.startsWith('+++')) {
          cls = 'text-green-400';
          bgCls = 'bg-green-900/20';
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          cls = 'text-red-400';
          bgCls = 'bg-red-900/20';
        } else if (line.startsWith('@@')) {
          cls = 'text-blue-400';
        } else if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
          cls = 'text-text-tertiary';
        }

        return (
          <div key={i} className={`${bgCls} px-1`}>
            <span className="inline-block w-10 text-right mr-3 text-text-tertiary select-none">
              {i + 1}
            </span>
            <span className={cls}>{line}</span>
          </div>
        );
      })}
    </pre>
  );
}

export default function DiffViewerPanel({ projectPath, mode, fromRef, toRef }: DiffViewerPanelProps) {
  const { diff, loading, refresh } = useDiffViewer(projectPath, mode, fromRef, toRef);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const selectedDiff = useMemo(() => {
    if (!selectedFile || !diff?.fullDiff) return '';
    return extractFileDiff(diff.fullDiff, selectedFile);
  }, [selectedFile, diff?.fullDiff]);

  if (loading && !diff) {
    return (
      <div className="flex items-center justify-center h-full">
        <SpinnerIcon size={16} className="text-text-tertiary" />
      </div>
    );
  }

  const files = diff?.files ?? [];
  const isEmpty = files.length === 0;

  return (
    <div className="flex h-full">
      {/* File list sidebar */}
      <div className="w-[200px] shrink-0 border-r border-border-subtle bg-surface-0 flex flex-col">
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border-subtle">
          <span className="text-micro font-medium text-text-secondary uppercase tracking-wider">
            Files ({files.length})
          </span>
          <div className="flex items-center gap-1">
            {mode === 'live' && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" title="Live polling" />
            )}
            <button
              onClick={refresh}
              className="p-0.5 rounded text-text-tertiary hover:text-text-secondary transition-colors"
              title="Refresh"
            >
              <RefreshIcon size={10} />
            </button>
          </div>
        </div>

        {isEmpty ? (
          <div className="flex items-center justify-center flex-1 px-3">
            <p className="text-xs text-text-tertiary text-center">No changes detected</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {files.map((file) => (
              <button
                key={file.filePath}
                onClick={() => setSelectedFile(file.filePath)}
                className={`flex items-center gap-1.5 w-full px-2 py-1.5 text-left text-xs transition-colors ${
                  selectedFile === file.filePath
                    ? 'bg-surface-2 text-text-primary'
                    : 'text-text-secondary hover:bg-surface-1 hover:text-text-primary'
                }`}
              >
                <span className={`font-mono font-bold shrink-0 ${statusColors[file.status]}`}>
                  {statusSymbols[file.status]}
                </span>
                <span className="truncate flex-1 font-mono">
                  {file.filePath.split('/').pop()}
                </span>
                {(file.additions > 0 || file.deletions > 0) && (
                  <span className="text-micro text-text-tertiary shrink-0">
                    {file.additions > 0 && <span className="text-green-400">+{file.additions}</span>}
                    {file.additions > 0 && file.deletions > 0 && ' '}
                    {file.deletions > 0 && <span className="text-red-400">-{file.deletions}</span>}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Summary stats */}
        {!isEmpty && diff && (
          <div className="px-2 py-1.5 border-t border-border-subtle text-micro text-text-tertiary">
            {diff.totalAdditions > 0 && (
              <span className="text-green-400">+{diff.totalAdditions}</span>
            )}
            {diff.totalAdditions > 0 && diff.totalDeletions > 0 && ' '}
            {diff.totalDeletions > 0 && (
              <span className="text-red-400">-{diff.totalDeletions}</span>
            )}
          </div>
        )}
      </div>

      {/* Diff content */}
      <div className="flex-1 min-w-0 bg-surface-0 overflow-auto">
        {selectedFile && selectedDiff ? (
          <DiffContent diffText={selectedDiff} />
        ) : selectedFile && mode === 'live' ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-text-tertiary">
              Switch to review mode to see full diff content
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-text-tertiary">
              {isEmpty ? 'Working tree is clean' : 'Select a file to view diff'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
