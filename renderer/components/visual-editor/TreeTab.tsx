import React, { useState, useCallback } from 'react';
import type { SelectedElement, VisualAction } from '../../../shared/types';
import { ChevronRightIcon, ChevronDownIcon } from '../icons';

interface HierarchyNode {
  tagName: string;
  className: string;
  selector: string;
  children?: HierarchyNode[];
}

interface TreeTabProps {
  element: SelectedElement;
  onExecuteAction: (action: VisualAction) => void;
  onScrollTo: (selector: string) => void;
}

export default function TreeTab({ element, onExecuteAction, onScrollTo }: TreeTabProps) {
  const hierarchy = (element as unknown as { hierarchy?: { parents: HierarchyNode[]; children: HierarchyNode[] } }).hierarchy;

  if (!hierarchy) {
    return (
      <div className="p-4 text-text-tertiary text-xs">
        No hierarchy data available
      </div>
    );
  }

  return (
    <div className="py-2">
      {/* Parent chain */}
      {hierarchy.parents.map((parent, i) => (
        <TreeNode
          key={parent.selector}
          node={parent}
          depth={i}
          isSelected={false}
          selectedSelector={element.selector}
          onSelect={onScrollTo}
          onReorder={(_sourceSelector, target, pos) => {
            onExecuteAction({
              id: crypto.randomUUID(),
              type: 'reorder',
              element,
              targetSelector: target,
              position: pos,
            } as VisualAction);
          }}
        />
      ))}

      {/* Selected element */}
      <TreeNode
        node={{
          tagName: element.tagName,
          className: element.className,
          selector: element.selector,
          children: hierarchy.children,
        }}
        depth={hierarchy.parents.length}
        isSelected={true}
        selectedSelector={element.selector}
        reactComponent={element.reactComponent}
        onSelect={onScrollTo}
        onReorder={(_sourceSelector, target, pos) => {
          onExecuteAction({
            id: crypto.randomUUID(),
            type: 'reorder',
            element,
            targetSelector: target,
            position: pos,
          } as VisualAction);
        }}
      />
    </div>
  );
}

// ---- Tree Node ----

interface TreeNodeProps {
  node: HierarchyNode;
  depth: number;
  isSelected: boolean;
  selectedSelector: string;
  reactComponent?: string;
  onSelect: (selector: string) => void;
  onReorder: (selector: string, targetSelector: string, position: 'before' | 'after') => void;
}

function TreeNode({ node, depth, isSelected, selectedSelector, reactComponent, onSelect, onReorder }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(isSelected || depth < 3);
  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = depth * 16 + 8;

  const [dragOver, setDragOver] = useState<'before' | 'after' | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.selector);
    e.dataTransfer.effectAllowed = 'move';
  }, [node.selector]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDragOver(e.clientY < midY ? 'before' : 'after');
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const sourceSelector = e.dataTransfer.getData('text/plain');
    if (sourceSelector && sourceSelector !== node.selector && dragOver) {
      onReorder(sourceSelector, node.selector, dragOver);
    }
    setDragOver(null);
  }, [node.selector, dragOver, onReorder]);

  const displayName = reactComponent
    ? `<${reactComponent}>`
    : `<${node.tagName}>`;

  return (
    <>
      <div
        className={`flex items-center gap-1 py-0.5 cursor-pointer transition-colors text-xs select-none ${
          isSelected || node.selector === selectedSelector
            ? 'bg-accent/10 text-accent'
            : 'text-text-secondary hover:bg-surface-2'
        } ${dragOver === 'before' ? 'border-t border-accent' : ''} ${dragOver === 'after' ? 'border-b border-accent' : ''}`}
        style={{ paddingLeft }}
        onClick={() => onSelect(node.selector)}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Expand/collapse toggle */}
        <span
          className="w-3 h-3 flex items-center justify-center shrink-0"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {hasChildren ? (
            expanded ? <ChevronDownIcon size={10} /> : <ChevronRightIcon size={10} />
          ) : null}
        </span>

        {/* Node name */}
        <span className="font-mono truncate">{displayName}</span>
      </div>

      {/* Children */}
      {expanded && hasChildren && node.children!.map((child, i) => (
        <TreeNode
          key={child.selector || `${node.selector}-child-${i}`}
          node={child}
          depth={depth + 1}
          isSelected={false}
          selectedSelector={selectedSelector}
          onSelect={onSelect}
          onReorder={onReorder}
        />
      ))}
    </>
  );
}
