(function() {
  'use strict';

  // State
  let selectedElement = null;
  let overlayContainer = null;
  let hoverBox = null;
  let selectionBox = null;
  let tooltip = null;
  let handles = [];
  let insertionLine = null;
  let isDragging = false;
  let dragHandle = null;
  let lastMoveTime = 0;

  // --- Helpers ---

  function isOverlayElement(el) {
    return overlayContainer && overlayContainer.contains(el);
  }

  function buildSelector(el) {
    const parts = [];
    let current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      let tag = current.tagName.toLowerCase();
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(current) + 1;
        tag += ':nth-child(' + index + ')';
      }
      parts.unshift(tag);
      current = parent;
    }
    parts.unshift('body');
    return parts.join(' > ');
  }

  function getComputedStyles(el) {
    const cs = window.getComputedStyle(el);
    return {
      width: cs.width, height: cs.height,
      padding: cs.padding, margin: cs.margin,
      color: cs.color, backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      borderRadius: cs.borderRadius, display: cs.display,
      flexDirection: cs.flexDirection, alignItems: cs.alignItems,
      justifyContent: cs.justifyContent, gap: cs.gap
    };
  }

  function getRect(el) {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }

  function truncate(str, len) {
    if (!str) return '';
    const trimmed = str.trim();
    return trimmed.length > len ? trimmed.slice(0, len) + '...' : trimmed;
  }

  function firstClasses(className, count) {
    if (!className) return '';
    return className.split(/\s+/).slice(0, count).join(' ');
  }

  // --- React Fiber Detection ---

  function detectReactFiber(el) {
    const result = { reactFiber: false };
    const key = Object.keys(el).find(function(k) {
      return k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$');
    });
    if (!key) return result;

    result.reactFiber = true;
    let fiber = el[key];

    // Walk return chain to find component
    let current = fiber;
    while (current) {
      if (typeof current.type === 'function') {
        result.reactComponent = current.type.displayName || current.type.name || 'Anonymous';
        if (current.memoizedProps) {
          try {
            const props = {};
            Object.keys(current.memoizedProps).forEach(function(k) {
              if (k === 'children') return;
              const val = current.memoizedProps[k];
              if (typeof val !== 'function' && typeof val !== 'object') {
                props[k] = val;
              }
            });
            result.reactProps = props;
          } catch (_) { /* ignore */ }
        }
        if (current._debugSource) {
          result.sourceFile = current._debugSource.fileName || null;
          result.sourceLine = current._debugSource.lineNumber || null;
        }
        break;
      }
      current = current.return;
    }
    return result;
  }

  // --- Hierarchy Builder ---

  function buildHierarchy(el) {
    var parents = [];
    var current = el.parentElement;
    while (current && current !== document.body.parentElement) {
      parents.unshift({
        tagName: current.tagName.toLowerCase(),
        className: current.className || '',
        selector: buildSelector(current)
      });
      current = current.parentElement;
    }

    function childTree(node, depth) {
      if (depth <= 0 || !node.children) return [];
      return Array.from(node.children).map(function(c) {
        return {
          tagName: c.tagName.toLowerCase(),
          className: c.className || '',
          selector: buildSelector(c),
          children: childTree(c, depth - 1)
        };
      });
    }

    return { parents: parents, children: childTree(el, 2) };
  }

  // --- Data Collector ---

  function collectData(el) {
    var fiber = detectReactFiber(el);
    return Object.assign({
      tagName: el.tagName.toLowerCase(),
      className: el.className || '',
      textContent: truncate(el.textContent, 100),
      computedStyles: getComputedStyles(el),
      boundingRect: getRect(el),
      selector: buildSelector(el),
      hierarchy: buildHierarchy(el)
    }, fiber);
  }

  // --- Overlay Drawing ---

  function createDiv(styles) {
    var div = document.createElement('div');
    Object.assign(div.style, styles);
    return div;
  }

  function positionBox(box, rect, border, color) {
    Object.assign(box.style, {
      position: 'absolute',
      left: (rect.x + window.scrollX) + 'px',
      top: (rect.y + window.scrollY) + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
      border: border + 'px solid ' + color,
      boxSizing: 'border-box',
      pointerEvents: 'none',
      borderRadius: '2px'
    });
  }

  function drawHover(el) {
    if (!hoverBox) {
      hoverBox = createDiv({ pointerEvents: 'none', transition: 'all 0.05s ease' });
      overlayContainer.appendChild(hoverBox);
    }
    if (!tooltip) {
      tooltip = createDiv({
        position: 'absolute',
        background: '#1E293B',
        color: '#E2E8F0',
        fontSize: '11px',
        fontFamily: 'monospace',
        padding: '3px 8px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: '100000'
      });
      overlayContainer.appendChild(tooltip);
    }

    var rect = el.getBoundingClientRect();
    positionBox(hoverBox, rect, 2, '#3B82F6');

    var tag = el.tagName.toLowerCase();
    var cls = firstClasses(el.className, 3);
    tooltip.textContent = '<' + tag + (cls ? ' class="' + cls + '"' : '') + '>';

    var tx = rect.x + window.scrollX;
    var ty = rect.y + window.scrollY - 24;
    if (ty < window.scrollY) ty = rect.y + window.scrollY + rect.height + 4;
    Object.assign(tooltip.style, { left: tx + 'px', top: ty + 'px' });
  }

  function clearHover() {
    if (hoverBox) hoverBox.style.border = 'none';
    if (tooltip) tooltip.textContent = '';
  }

  function drawSelection(el) {
    clearSelection();
    var rect = el.getBoundingClientRect();

    selectionBox = createDiv({ pointerEvents: 'none' });
    positionBox(selectionBox, rect, 2, '#3B82F6');
    selectionBox.style.background = 'rgba(59,130,246,0.05)';
    overlayContainer.appendChild(selectionBox);

    // Corner handles
    var corners = [
      { x: 0, y: 0 }, { x: 1, y: 0 },
      { x: 0, y: 1 }, { x: 1, y: 1 }
    ];
    handles = corners.map(function(c) {
      var h = createDiv({
        position: 'absolute',
        width: '8px', height: '8px',
        background: '#3B82F6',
        border: '1px solid #fff',
        borderRadius: '1px',
        cursor: 'pointer',
        pointerEvents: 'auto',
        boxSizing: 'border-box'
      });
      var hx = rect.x + window.scrollX + (c.x * rect.width) - 4;
      var hy = rect.y + window.scrollY + (c.y * rect.height) - 4;
      Object.assign(h.style, { left: hx + 'px', top: hy + 'px' });
      h.dataset.corner = c.x + '-' + c.y;
      overlayContainer.appendChild(h);
      return h;
    });
  }

  function clearSelection() {
    if (selectionBox && selectionBox.parentNode) {
      selectionBox.parentNode.removeChild(selectionBox);
    }
    selectionBox = null;
    handles.forEach(function(h) {
      if (h.parentNode) h.parentNode.removeChild(h);
    });
    handles = [];
    clearInsertionLine();
  }

  function clearInsertionLine() {
    if (insertionLine && insertionLine.parentNode) {
      insertionLine.parentNode.removeChild(insertionLine);
    }
    insertionLine = null;
  }

  // --- Drag & Reorder ---

  function findDropTarget(x, y) {
    if (!selectedElement || !selectedElement.parentElement) return null;
    var siblings = Array.from(selectedElement.parentElement.children);
    var best = null;
    var bestDist = Infinity;
    var position = 'after';

    for (var i = 0; i < siblings.length; i++) {
      var sib = siblings[i];
      if (sib === selectedElement || isOverlayElement(sib)) continue;
      var r = sib.getBoundingClientRect();
      var midY = r.y + r.height / 2;
      var dist = Math.abs(y - midY);
      if (dist < bestDist) {
        bestDist = dist;
        best = sib;
        position = y < midY ? 'before' : 'after';
      }
    }
    return best ? { element: best, position: position } : null;
  }

  function drawInsertionLine(target, position) {
    if (!insertionLine) {
      insertionLine = createDiv({
        position: 'absolute',
        height: '2px',
        background: '#3B82F6',
        pointerEvents: 'none',
        borderRadius: '1px'
      });
      overlayContainer.appendChild(insertionLine);
    }
    var r = target.getBoundingClientRect();
    var ly = position === 'before' ? r.y : r.y + r.height;
    Object.assign(insertionLine.style, {
      left: (r.x + window.scrollX) + 'px',
      top: (ly + window.scrollY) + 'px',
      width: r.width + 'px'
    });
  }

  // --- Event Handlers ---

  function onMouseMove(e) {
    var now = Date.now();
    if (now - lastMoveTime < 16) return;
    lastMoveTime = now;

    if (isDragging) {
      var drop = findDropTarget(e.clientX, e.clientY);
      if (drop) {
        drawInsertionLine(drop.element, drop.position);
      } else {
        clearInsertionLine();
      }
      return;
    }

    var target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || isOverlayElement(target) || target === document.body || target === document.documentElement) {
      clearHover();
      return;
    }

    drawHover(target);

    window.parent.postMessage({
      type: 'forma:hover',
      payload: {
        selector: buildSelector(target),
        tagName: target.tagName.toLowerCase(),
        className: target.className || '',
        boundingRect: getRect(target)
      }
    }, '*');
  }

  function onClick(e) {
    if (isDragging) return;
    var target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || isOverlayElement(target)) return;

    e.preventDefault();
    e.stopPropagation();

    selectedElement = target;
    drawSelection(target);

    var payload = collectData(target);
    window.parent.postMessage({ type: 'forma:select', payload: payload }, '*');
  }

  function onHandleMouseDown(e) {
    if (!e.target.dataset || !e.target.dataset.corner) return;
    if (!selectedElement) return;

    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    dragHandle = e.target;
    dragHandle.style.background = '#2563EB';
  }

  function onMouseUp(e) {
    if (!isDragging || !selectedElement) return;
    isDragging = false;
    if (dragHandle) {
      dragHandle.style.background = '#3B82F6';
      dragHandle = null;
    }

    var drop = findDropTarget(e.clientX, e.clientY);
    clearInsertionLine();

    if (drop) {
      window.parent.postMessage({
        type: 'forma:reorder',
        payload: {
          selector: buildSelector(selectedElement),
          targetSelector: buildSelector(drop.element),
          position: drop.position
        }
      }, '*');
    }
  }

  function onMessage(event) {
    if (!event.data || !event.data.type) return;
    var data = event.data;

    if (data.type === 'forma:highlight' && data.payload && data.payload.selector) {
      try {
        var el = document.querySelector(data.payload.selector);
        if (el) drawHover(el);
      } catch (_) { /* invalid selector */ }
    }

    if (data.type === 'forma:deselect') {
      selectedElement = null;
      clearSelection();
      clearHover();
    }

    if (data.type === 'forma:scroll-to' && data.payload && data.payload.selector) {
      try {
        var target = document.querySelector(data.payload.selector);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          selectedElement = target;
          drawSelection(target);
          var payload = collectData(target);
          window.parent.postMessage({ type: 'forma:select', payload: payload }, '*');
        }
      } catch (_) { /* invalid selector */ }
    }
  }

  // --- Init & Cleanup ---

  function init() {
    // Remove previous instance if any
    var existing = document.getElementById('forma-visual-overlay');
    if (existing) existing.parentNode.removeChild(existing);

    overlayContainer = document.createElement('div');
    overlayContainer.id = 'forma-visual-overlay';
    Object.assign(overlayContainer.style, {
      position: 'absolute',
      top: '0', left: '0',
      width: '100%', height: '100%',
      pointerEvents: 'none',
      zIndex: '99999'
    });
    document.body.appendChild(overlayContainer);

    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('mousedown', onHandleMouseDown, true);
    document.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('message', onMessage);
  }

  window.__formaOverlayCleanup = function() {
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('mousedown', onHandleMouseDown, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    window.removeEventListener('message', onMessage);

    if (overlayContainer && overlayContainer.parentNode) {
      overlayContainer.parentNode.removeChild(overlayContainer);
    }

    selectedElement = null;
    overlayContainer = null;
    hoverBox = null;
    selectionBox = null;
    tooltip = null;
    handles = [];
    insertionLine = null;
    isDragging = false;
    dragHandle = null;
  };

  init();
})();
