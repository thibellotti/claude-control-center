import type { VisualAction } from '../../shared/types';

export function buildVisualEditPrompt(action: VisualAction): string {
  const lines: string[] = [];

  // Context header
  lines.push('You are editing a React + Tailwind project in Forma\'s Visual Editor.');
  lines.push('Apply the requested change precisely. Only edit the specified file.');
  lines.push('Use Tailwind utility classes. Follow the 8pt grid (4, 8, 12, 16, 24, 32, 48, 64).');
  lines.push('Preserve all existing functionality.');
  lines.push('');

  // Target element info
  lines.push('## Target Element');
  if (action.element.reactComponent) {
    lines.push(`- Component: <${action.element.reactComponent}>`);
  }
  lines.push(`- HTML tag: <${action.element.tagName}>`);
  if (action.element.sourceFile) {
    lines.push(`- File: ${action.element.sourceFile}${action.element.sourceLine ? `:${action.element.sourceLine}` : ''}`);
  }
  lines.push(`- Selector: ${action.element.selector}`);
  if (action.element.className) {
    lines.push(`- Current classes: ${action.element.className}`);
  }
  lines.push('');

  // Action-specific instructions
  switch (action.type) {
    case 'prop-change':
      lines.push('## Change');
      lines.push(`Change the \`${action.propName}\` prop from \`${action.oldValue}\` to \`${action.newValue}\`.`);
      break;

    case 'style-change':
      lines.push('## Change');
      lines.push(`Update className from \`${action.oldClass}\` to \`${action.newClass}\`.`);
      lines.push('Only modify the Tailwind classes that changed. Keep all other classes intact.');
      break;

    case 'reorder':
      lines.push('## Change');
      lines.push(`Move this element ${action.position} the element at selector \`${action.targetSelector}\`.`);
      lines.push('Reorder the JSX elements in the source file to match.');
      break;

    case 'prompt':
      lines.push('## Change');
      lines.push(action.userPrompt || '');
      if (action.attachments && action.attachments.length > 0) {
        lines.push('');
        lines.push('Attachments: ' + action.attachments.join(', '));
      }
      break;
  }

  // Constraints
  lines.push('');
  lines.push('## Constraints');
  lines.push('- Only edit the file containing this component');
  lines.push('- Do not change component logic or event handlers');
  lines.push('- Use existing Tailwind classes, avoid arbitrary values when possible');
  lines.push('- Keep the edit minimal and focused');

  return lines.join('\n');
}
