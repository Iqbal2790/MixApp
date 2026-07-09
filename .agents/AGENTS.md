# MixApp Workspace Rules

Please review the primary documentation in `CLAUDE.md` at the project root for architecture, state management, and detailed UI guidelines.

**Critical Rules for this Workspace:**
1. **Modals**: Do NOT use native `window.prompt`, `window.confirm`, or `window.alert`. They freeze the React event loop and cause blank screens. Use the `<Modal />` component in `src/components/Modal.tsx`.
2. **Race Conditions**: When dealing with Supabase auto-saving (e.g. queue dragging), always implement an `AbortController` to cancel stale requests before firing new ones to prevent database desync.
3. **Styling**: Always use the defined CSS variables in `index.css` (e.g., `var(--accent)`, `var(--bg)`). Do not hardcode standard colors.
