import React from 'react';
import type { CellConfigPreview } from '../../../../shared/types';
import PreviewPanel from '../../preview/PreviewPanel';

interface PreviewCellProps {
  config: CellConfigPreview;
}

export default function PreviewCell({ config }: PreviewCellProps) {
  if (config.projectPath) {
    return <PreviewPanel projectPath={config.projectPath} />;
  }

  return (
    <div className="h-full">
      <iframe
        src={config.url}
        className="w-full h-full border-0"
        title={config.label}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
