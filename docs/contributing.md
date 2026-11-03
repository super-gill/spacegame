# Contributing

Conventions for anyone (human or AI) changing this repository.

Several Claude chats work on this repo at once. Read [coordination.md](coordination.md) before starting: it says who owns `main`, which branch and files are yours, and where to leave notes for the other chats.

## Code

- TypeScript strict mode everywhere. No `any`.
- The sim stays headless. If a change needs the DOM, it belongs in the client.
- Prefer plain data and small pure functions over classes with state. Classes are fine in the client where they wrap browser resources (input, camera, UI).
- Every tuning value is a named constant or a field on a spec object.
- Comment the why, not the what. A file-level comment explains the module's job.
- New sim behaviour comes with a test.

## Commits

Summary line: `type(scope): imperative summary (vX.Y.Z)`, 72 characters max, lower case after the colon, no full stop. Version in brackets only when the commit bumps it.

Types: `feat`, `fix`, `balance`, `ui`, `perf`, `refactor`, `docs`, `chore`.
Scopes: `sim`, `client`, `docs`, or omit.

Body: blank line, one short paragraph on why, then grouped bullet sections with short headings and verb-first bullets, wrapped at 72. Footers `Version: X.Y.Z` and `Breaking: <what>` when saves or behaviour change incompatibly.

## Versions

Semantic versioning, starting at 0.x. Bump:

- patch for fixes and balance
- minor for a milestone or anything that breaks saves
- 1.0.0 when milestone 8 is polished

Keep `package.json` (root and both packages), `docs/changelog.md` and `README.md` in step.

## Documentation

Update the relevant doc in the same change as the code:

- new control: `docs/controls.md`
- new rule or system: `docs/design.md`
- new module or structural change: `docs/architecture.md`
- every release: `docs/changelog.md`, `docs/roadmap.md`
