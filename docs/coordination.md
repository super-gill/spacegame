# Coordination

How several Claude chats build this game as one team. Every chat working on the repo reads this file first and updates it last.

Chats cannot message each other. This file, the branches and their commits are the only channel between them, so anything another chat needs to know goes here.

## Roles

| Role | Who | Owns |
| --- | --- | --- |
| Designer | Jason | What the game is. Decides design questions, sets priorities, plays the builds. Does not code. |
| Lead | The "lead" chat in the Spacegame project | `main`, versions, releases, `docs/changelog.md`, `docs/roadmap.md`, this file's contracts, merging workstream branches, the foundation work |
| Workstream | One chat per workstream | Its own branch and the files listed for it below |

## Phases

1. **Foundation (lead only).** The lead builds the shared core that everything else hangs off. No workstreams open until it is on `main`. Current foundation: the 6a hull and module data model, fitting rules and derived stats in `packages/sim`.
2. **Fan-out.** The lead opens workstreams for parts with clean boundaries, writes their briefs below, and Jason starts a chat for each one.
3. **Integrate.** The lead merges branches, resolves conflicts, runs the full test suite and a headless play check, then releases.

## Rules for every chat

- Read `docs/contributing.md` and the handover doc in the project before changing anything.
- **Only the lead pushes to `main`.** Workstreams push to `ws/<name>` and rebase on `main` before each push.
- **Only the lead bumps versions** or writes release entries in `docs/changelog.md` and `docs/roadmap.md`. Workstreams put their changelog lines in their log entry and the lead folds them in.
- **Contracts below are fixed.** A workstream that needs one changed adds a request to "Requests to the lead" and works around it until the lead changes it on `main`. Never edit a contract on a branch.
- Stay inside your workstream's files. If a change needs a file another workstream owns, raise it as a request.
- `npm test` passes before every push, on every branch.
- Design questions go to Jason through "Questions for Jason". Do not guess at design and build on the guess.

## Session routine

**Start:** `git fetch`, rebase your branch on `origin/main`, read this file top to bottom, check "Requests to the lead" and "Decisions" for anything that affects you.

**End:** add a log entry under "Log" in your branch's copy of this file (date, workstream, what changed, what you need, what is blocked, changelog lines), then push your branch. The lead merges log entries into `main` with your work. If you need the lead or Jason before your branch is merged, say so in your last message to Jason so he can carry it to the lead chat.

## Contracts

Interfaces that more than one workstream depends on. Owned by the lead.

_None yet. The first contracts (hull, mount, module and derived stats types in `packages/sim`) are written when the foundation lands._

## Workstreams

| Name | Branch | Owns | Status | Brief |
| --- | --- | --- | --- | --- |
| Foundation | `main` (lead) | `packages/sim` hull, module, fitting and derived stats | In progress | `docs/ships.md`, "First build slice" |

Candidates once the foundation lands (not open yet):

- **Ship rendering:** draw ships from their fit, module silhouettes at mounts. Client render code only.
- **Outfitting screen:** docked outfitting panel, fit and remove, stats preview. Client UI only, using the sim's fitting functions.
- **Catalogue and balance:** the three hulls and about a dozen modules as data, bonuses, tuning against play. Sim catalogue files and balance tests.
- **Lore and design docs:** races, manufacturers, open lore questions. Docs only.

## Questions for Jason

Open design questions any chat needs answered. Jason answers in the lead chat or in the chat that asked; the lead moves answers to "Decisions".

- Lore contradictions: Hive Ossk growing every station's shell vs race-specific stations; whether a living Aurel ship can appear for sale; whether the Oru are a playable starting race.
- Player organisations and what to call them ("clan" is the Drifters' word).
- Navy duties.

## Ideas inbox

Jason's ideas that are not scheduled yet. The lead triages them into the roadmap, a workstream or "not now".

_Empty._

## Decisions

Settled design and process decisions, newest first. Each line: date, decision, who decided.

- 2026-11-03: Work runs as a lead chat plus workstream chats coordinated through this file; the lead builds the 6a foundation before any workstream opens. (Jason)

## Requests to the lead

Contract changes, cross-workstream file changes, merges wanted. Newest first.

_None._

## Log

Newest first. One entry per session that changed something.

- 2026-11-03, lead: added this file and the coordination rules. No code change.
