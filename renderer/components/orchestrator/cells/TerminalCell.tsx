import React from 'react';
import dynamic from 'next/dynamic';
import type { CellConfigTerminal } from '../../../../shared/types';

const XTerminal = dynamic(() => import('../../terminal/XTerminal'), { ssr: false });

interface TerminalCellProps {
  config: CellConfigTerminal;
}

export default function TerminalCell({ config }: TerminalCellProps) {
  if (!config.sessionId) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0A0A0A]">
        <p className="text-xs text-text-tertiary">Connecting...</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0A0A0A]">
      <XTerminal sessionId={config.sessionId} isVisible={true} />
    </div>
  );
}
