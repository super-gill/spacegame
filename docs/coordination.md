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

1. **Foundation (lead only).** The lead builds the shared core that everything else hangs off. No workstreams open until it is on `main`. The 6a foundation (hull and module model, fitting, derived stats) landed in 0.7.0. The next foundation is 6b's pads and owned ships.
2. **Fan-out.** The lead opens workstreams for parts with clean boundaries, writes their briefs below, and Jason starts a chat for each one.
3. **Integrate.** The lead merges branches, resolves conflicts, runs the full test suite and a headless play check, then releases.

## When to split work

The lead decides when work goes to its own chat and tells Jason, unprompted, at these points:

- the start of each milestone: what the foundation is and which workstreams follow it
- when a foundation lands on `main`: which workstreams open now
- whenever a request to the lead or an idea from Jason is big enough to stand alone

**Split when all of these hold:**

1. The contracts it depends on are on `main` and not expected to change.
2. It lives mostly in its own files, such as client rendering vs client UI vs sim catalogue vs docs.
3. It can be tested or played on its own, without another open workstream's branch.
4. It is at least a full session's work. Anything smaller, the lead does directly.

**Keep it in the lead chat when any of these hold:**

- It changes core types, the save format, `stepWorld` or anything most of the code touches.
- Two workstreams would need the same files at the same time.
- It is a balance pass that needs the whole game in view.
- It is a small fix, even in an area a workstream owns. The lead tells that workstream in the log.

**Limits:**

- At most three workstreams open at once. Jason carries messages between chats and the lead merges every branch, so more than three costs more than it saves.
- Short-lived workstreams (one feature) close when merged. Long-lived ones (lore, balance) stay open across milestones but rebase often.

### Opening a workstream

The lead adds a row to "Workstreams" with a brief in the same commit:

- **Goal:** what done looks like, in play terms
- **Owns:** the files and folders it may change
- **Uses:** the contracts it depends on
- **Out of scope:** what it must leave alone
- **Done when:** tests, a play check, docs updated

Then the lead gives Jason this opener to paste into a new chat in the Spacegame project:

> You are the `<name>` workstream for Spacegame. Read the project handover doc, then clone the repo and read `docs/coordination.md` and your brief in it. Work on branch `ws/<name>`. Start now.

### Closing a workstream

The lead merges the branch, moves its log entries and changelog lines onto `main`, marks the row "Closed", and tells Jason that chat is finished.

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

Changing any of these needs the lead. All live in `packages/sim/src` and are exported from `index.ts`.

- **Catalogue types** (`types.ts`): `HullSpec`, `MountPoint`, `ModuleSpec`, `Loadout`, `HullBonus`, `Manufacturer`. Hulls, modules and loadouts are data; adding entries is fine, changing the shape is a contract change.
- **Derived stats** (`stats.ts`): `ShipStats`, `shipStats(world, ship)`, `fitStats(cat, hull, fit, cargoMass)`. Nothing stores performance; everything calls these.
- **Fitting** (`fitting.ts`): `FitRefusal`, `mountRefusal`, `planRefit`, `fitModule`, `unfitModule`. The client never applies fitting rules itself; it asks `planRefit`.
- **Ship fit** (`types.ts`): `Ship.fit` maps mount id to module id; `WeaponState` is keyed by `mountId`.
- **Pilot storage** (`types.ts`): `Pilot.storage` maps station id to module id to count.
- **Save format** (`save.ts`): `SAVE_VERSION`. Only the lead bumps it.

## Workstreams

| Name | Branch | Owns | Status | Brief |
| --- | --- | --- | --- | --- |
| 6a foundation | `main` (lead) | Everything in milestone 6a | Closed, 0.7.0 | `docs/ships.md`, "First build slice" |
| Lore | `ws/lore` | `docs/lore.md` (new), `docs/races.md` | Open (long-lived) | "Brief: Lore" below |

6a was built whole by one chat before this process existed, so its planned workstreams (ship rendering, outfitting screen, catalogue) never opened.

Candidates (not open yet):

- **Catalogue and balance:** hull and module data, tuning against play. Opens once Jason has played 0.7.0 and has views.
- **6b workstreams:** decided when the lead plans 6b.

### Brief: Lore

- **Goal:** the story that defines the world, written down in the repo where every chat can build on it. Today the lore lives in a claude.ai doc that code chats cannot rely on; from now on `docs/lore.md` is canon for the game.
- **Owns:** `docs/lore.md` (create it) and `docs/races.md`. May keep the claude.ai lore doc in step, but the repo copy wins.
- **Uses:** the claude.ai docs "Spacegame: Lore of the Known Universe" and "Spacegame: Races and Manufacturers", the "Spacegame ship concepts" canvas, `docs/ships.md` and `docs/design.md` for what the game already does.
- **Deliver, in this order:**
  1. `docs/lore.md`: the setting, the races, the powers and factions, and the starter sector in lore terms (who runs Harbour Station and Ridge Outpost, who the trader and the pirate work for).
  2. Answers to the lore questions under "Questions for Jason", put to Jason in the lore chat, with his answers recorded in the log entry.
  3. A naming table in `docs/lore.md` for the three hulls, the Sparrow's replacement as an Aurel dev hull, every module and every manufacturer. Module makers are a mix of their own companies and the hull makers. Names only: the lead puts them into the catalogue.
  4. Lore hooks for what is coming: ship ownership and pads (6b), escape pods, hired NPC pilots and captains, law and security (7).
- **Out of scope:** any code, catalogue data or numbers. Lore never sets a stat; if lore needs something mechanical (a race bonus, a station service), it goes to "Requests to the lead".
- **Done when:** never fully; this is long-lived. Each session ends with a log entry and a push to `ws/lore`. Tell Jason when there is something worth merging, and he passes it to the lead.

## Questions for Jason

Open design questions any chat needs answered. Jason answers in the lead chat or in the chat that asked; the lead moves answers to "Decisions".

- Lore contradictions: Hive Ossk growing every station's shell vs race-specific stations; whether a living Aurel ship can appear for sale; whether the Oru are a playable starting race.
- Player organisations and what to call them ("clan" is the Drifters' word).
- Navy duties.

## Ideas inbox

Jason's ideas that are not scheduled yet. The lead triages them into the roadmap, a workstream or "not now".

- **Station functions on ships** (2026-11-03, later): bigger ships could carry station services such as outfitting; player stations, or station ships, may follow.
- **Owning ships and swapping in space** (2026-11-03): pilots own several ships and can change ship without docking. Feeds 6b, which already plans owned ships parked on pads.
- **Escape pods** (2026-11-03, a maybe): when your ship is destroyed you eject in a pod that flies but has no modules, instead of respawning at once. A pod could transfer into a ship you own, or possibly an abandoned ship. Lead's notes: fits the modular model well (a pod is a sealed hull with a fixed fit); needs answers on what happens if the pod is destroyed, whether pod killing is allowed (it matters with friends on a shared world), and whether boarding abandoned ships belongs with salvage in milestone 9.
- **Hireable NPC agents** (2026-11-03, long term): pay a station for an escort; hire a pilot to fly another ship you own alongside you; later, a hired captain who takes one of your ships off to work a trade route or mine, building towards a fleet. Lead's notes: the sim already suits this, because NPCs fly through the same inputs as people and their brains are plain data, so a hired pilot is a brain attached to a ship a pilot owns. 6b should keep "who owns a ship" separate from "who is flying it" so this slots in later. Escorts need little more than today's AI; captains on routes need the economy (10), industry (9) and off-screen traffic (8) first.

## Decisions

Settled design and process decisions, newest first. Each line: date, decision, who decided.

- 2026-11-03: The 0.7.0 calls stand: outfitting at Harbour only for now; the world aligns to the lore, so the Mule and Jackal stay gone (Aurel ships can serve as dev and test ships); the Spine's six bays; bonus values are a dial to tune later; names come from the lore, with module makers a mix of their own companies and hull makers. (Jason)
- 2026-11-03: The lore workstream opens now, so the story defines the world. (Jason)
- 2026-11-03: Modules are owned. Unfitting stores the module at that station for the pilot; fitting uses a stored one if there is one, else buys new. Fitting and unfitting each cost 5% of the module's price. Stored modules sell back for half. Storage is shaped like a cargo hold so modules can join the goods economy later and be carried and traded. (Jason)
- 2026-11-03: The lead decides when work splits into its own chat, using the rules in "When to split work", and tells Jason at each milestone start and foundation landing. (Jason)
- 2026-11-03: Work runs as a lead chat plus workstream chats coordinated through this file; the lead builds the 6a foundation before any workstream opens. (Jason)

## Requests to the lead

Contract changes, cross-workstream file changes, merges wanted. Newest first.

_None._

## Log

Newest first. One entry per session that changed something.

- 2026-11-03, lead: released 0.7.2. Outfitting names what each module is, warns when a fit cannot thrust or turn, and toasts the same on undock. Fixed outfitting clicks being lost: previewing a module could reflow the panel and move the button out from under the pointer mid-click. Opened the lore workstream.
- 2026-11-03, lead: released 0.7.1, owned modules with per-station storage, handling fees and selling. Save version 3, with an automatic upgrade from 0.7.0. Filed ship ownership and escape pods in the ideas inbox for 6b planning.
- 2026-11-03, lead: released 0.7.0 from the 6a chat's `ws/6a-handoff` branch. Added light armour to the starter so it outlasts the raider (a test now enforces it), stopped "power spare" showing as worse unless negative, moved the docked panel clear of the HUD, did the docs pass and version bump. Play checked: docking, outfitting, the Wedge and Spine in flight, a pirate fight, the old-save refusal.
- 2026-11-03, lead: added "When to split work" with split rules, limits and the opener for new chats. No code change.
- 2026-11-03, lead: added this file and the coordination rules. No code change.
