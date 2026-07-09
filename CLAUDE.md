# MixApp Codebase Onboarding & AI Instructions

## 🏗️ Architecture & Stack
- **Frontend Framework**: React 19 + TypeScript + Vite.
- **Database / Backend**: Supabase (used for playlist storage and syncing).
- **Core Dependencies**:
  - `@hello-pangea/dnd`: Drag and drop for playlist reordering.
  - `react-youtube`: Embedded YouTube player.
  - `lucide-react`: UI Icons.
- **UI Architecture**: 3-Panel Layout (Left: Library, Middle: Active Playlist, Right: Global All Songs).
- **Audio Engine**: `DualPlayer` component that manages two hidden YouTube iframe players to achieve seamless audio crossfading between tracks.

## 🎨 Design System & UI Rules
- **Aesthetics**: Modern Glassmorphism. Dark mode by default, supports Light mode via `data-theme` attribute.
- **Colors**: Use CSS variables defined in `index.css` (e.g., `var(--bg)`, `var(--surface)`, `var(--accent)`, `var(--text)`). Do NOT use generic raw colors (like `red` or `blue`).
- **Typography**: Modern sans-serif. Ensure readable contrast.
- **Modals vs Native Dialogs**: **CRITICAL RULE**. Do NOT use `window.prompt`, `window.confirm`, or `window.alert`. They block the React event loop and cause blank screens or `iframe` freezing. ALWAYS use the custom `<Modal />` component located at `src/components/Modal.tsx`.

## 🔄 State Management & Data Flow
- **Global State**: Managed centrally in `App.tsx` (queue, currentIndex, isPlaying).
- **Auto-save**: Playlists are auto-saved to Supabase.
- **Race Condition Prevention**: When syncing rapidly changing state (like drag-and-drop queues) to Supabase, ALWAYS use debouncing combined with `AbortController` to prevent out-of-order execution and database desyncs.
- **Local Storage**: Used purely for caching UI preferences (theme) and offline fallbacks, not as the primary source of truth for shared playlists.

## 🚀 Commands
- **Dev Server**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint` (uses `oxlint` for speed)

## 🤖 AI Guidelines (ECC / Claude / Gemini)
1. **Never write raw CSS utility classes** unless modifying `index.css`. Reuse existing CSS structure.
2. **Handle Errors Gracefully**: Supabase network requests can fail. Always wrap inserts/updates in try-catch and handle `AbortError` silently.
3. **React Hooks Discipline**: Ensure exhaustive dependencies in `useEffect` and `useCallback`. Do not use `useEffect` for derived state.
