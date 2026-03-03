import React from 'react';
import type { CellConfigDiff } from '../../../../shared/types';
import DiffViewerPanel from '../../diff/DiffViewerPanel';

interface DiffCellProps {
  config: CellConfigDiff;
}

export default function DiffCell({ config }: DiffCellProps) {
  return (
    <DiffViewerPanel
      projectPath={config.projectPath}
      mode={config.mode}
      fromRef={config.fromRef}
      toRef={config.toRef}
    />
  );
}
