# Claude Control Center — Design Document

**Date:** 2026-02-27
**Author:** THXType Studio
**Status:** Implemented

## Problem

Managing multiple Claude Code projects across ~/Projects/ and ~/Desktop/ lacks visibility, navigation, and coordination. No unified view of project status, tasks, teams, plans, or git state.

## Solution

Electron + Next.js desktop app that auto-discovers Claude Code projects and provides a clean minimal dashboard with full project intelligence.

## Architecture

- **Platform:** Electron + Next.js via nextron
- **Main process:** Filesystem scanning, git operations, file watching, IPC handlers
- **Renderer:** Next.js with TailwindCSS, custom IPC hooks
- **Data source:** ~/.claude/ configs + project directories (git, package.json, PLAN.md, CLAUDE.md)

## Features

- Dashboard with project cards showing git status, stack tags, task counts
- Project detail view with Overview, Tasks, Teams, Sessions tabs
- Cmd+K command palette for fuzzy search across projects, tasks, plans
- Quick launch: open projects in Terminal, VS Code, or Finder
- Settings viewer for Claude Code configuration
- Real-time file watching for live dashboard updates
- macOS-native window chrome with hiddenInset title bar

## Design Tokens

- Font: Inter (UI), JetBrains Mono (code/data)
- Colors: neutral-950 bg, neutral-50 text, brand accent
- Spacing: 8pt grid
- Border radius: 8px cards, 4px buttons
- Borders: neutral-800, subtle
