# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Memories
- Run date via base before adding/editing any documentation to ensure you've got the correct date.
- Academy tier added (2025-06-18): Players with 0 caps and 0 XP are now "Academy" (deep teal gradient), while players with >0 caps and 0 XP remain "Retired" (black). This distinction helps differentiate new players from inactive ones.

## Core Development Commands

### Local Development
```bash
npm install    # Install dependencies
npm run dev    # Start development server on http://localhost:5173
```

### Build & Production
```bash
npm run build   # TypeScript check + production build
npm run preview # Preview production build locally
```

### Code Quality
```bash
npm run lint    # ESLint checks (max warnings: 0)
```

[... rest of the existing content remains unchanged ...]