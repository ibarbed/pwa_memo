# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PWA Memo is an offline-first Progressive Web App for memory training using the mental palace technique (Casillero Mental). The app is entirely in Spanish.

## Technical Constraints

- **Vanilla only**: HTML/CSS/JavaScript - no frameworks, no npm, no build step
- **Offline-first**: Service Worker with cache-first strategy
- **iOS Safari compatible**: Safe-area support for notch and home indicator
- **GitHub Pages hosting**: Static files deployed directly
- **Single user**: Local IndexedDB storage only
- **Dark mode**: Minimal UI design

## Development

### Running Locally

```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx serve .
```

Access at http://localhost:8000

### Deployment

Push to GitHub - GitHub Pages serves the files directly from root.

## Architecture

### Core Files

| File | Purpose |
|------|---------|
| `app.js` | Main application (~1300 lines): utilities, IndexedDB layer, routing, rendering |
| `styles.css` | All styles with CSS custom properties for theming |
| `sw.js` | Service Worker (cache name: `memo-v5`) |
| `index.html` | Entry point, loads data files before app.js |

### Data Files (in `/data`)

- `mental_casillero.js` - 100 number-to-object mappings (0-99)
- `objetos.js` - 300+ concrete objects for exercises
- `conceptos.js` - 300+ abstract concepts and countries

### IndexedDB Stores

- `casillero` - Mental palace number-object associations
- `exercises` - Exercise history and results
- `config` - App configuration
- `casillero_state` - Rolling permutation state for daily variation

### Routing

Hash-based routing: `#home`, `#numeros`, `#objetos`, `#conceptos`, `#ajustes`

### Key Patterns

- IIFE pattern for initialization
- Direct DOM manipulation (no virtual DOM)
- Fuzzy answer matching using Levenshtein distance (20% threshold)
- Cache-first service worker with network fallback

## Custom Slash Commands

Feature development workflow (all commands in `.claude/commands/`):

1. `/feature "description"` - Create new feature with tracking
2. `/prd {feature_id}` - Generate PRD from feature description
3. `/tasks {feature_id}` - Generate user stories from PRD
4. `/plan {task_path}` - Create implementation plan for a task
5. `/code {task_path}` - Implement task following its plan

Run `/feature` without arguments to see pending work and next recommended action.

## Important Notes

- All UI text is in Spanish
- The app must work 100% offline after first load
- Service worker cache version must be incremented when updating cached files
- Use `env(safe-area-inset-*)` for iOS notch/home indicator compatibility
- Do not invent features - implement only what is explicitly requested
