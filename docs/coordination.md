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

1. **Foundation (lead only).** The lead builds the shared core that everything else hangs off. No workstreams open until it is on `main`. The 6a foundation (hull and module model, fitting, derived stats) landed in 0.7.0. The 6b foundation (ownership, pads, ship mart, boarding, escape pods, save version 4) is on `main` since 4 November 2026, unreleased; 0.8.0 ships when the ship mart workstream merges.
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

6b contracts (on `main` from 4 November 2026):

- **Owning versus flying** (`ownership.ts`): `Ship.ownerId` is who owns a ship; `Pilot.shipId` is the ship a pilot is aboard. Never read the owner as the pilot aboard. `pilotsAboard`, `shipPilot`, `isEmptyShip` (no pilot, no NPC brain), `isEscapePod`, `ownedShips` (pods left out). Empty ships get no input and coast.
- **Pads** (`types.ts`, `docking.ts`): `Pad` (`id`, `size`, `position` offset from the station centre, `facing`), `Station.pads`, `Ship.padId` (set while docked, null otherwise). `padFits`, `freePadFor`, `occupiedPads`, `padWorldPosition`, `launchPoint`, `onPad`. Docking refuses with `noPad`. A docked ship's `position` is its pad's world position and its `heading` the pad's facing.
- **Ship mart** (`types.ts`, `pilots.ts`): `HullSpec.price`, `Station.shipMart` (loadout ids; empty means no ship mart), `shipPrice`, `buyShip`, `buyRefusal`, `BuyRefusal`.
- **Boarding** (`pilots.ts`): `boardShip`, `boardRefusal`, `boardableShips`, `BoardRefusal`; `BOARD_RANGE` and `BOARD_MAX_RELATIVE_SPEED` in `constants.ts`.
- **Pods and waking** (`pilots.ts`): `HullSpec.escapePod`, the `escape-pod` hull and `ESCAPE_POD_LOADOUT_ID`; `wakePilot` (and `respawnPilot`, which returns only the world), `WakeRefusal`; `claimStarterShip`, `claimRefusal`, `ClaimRefusal`. Pilot commands return `CommandResult` (the world and an event, or the world and a reason).
- **Events** (`types.ts`): `docked` carries `padId`; `dockRefused` may say `noPad`; new `shipBought`, `boarded`, `podEjected`, `pilotWoke`, `starterClaimed`. Each names its ship in `shipId` (for `podEjected` and `boarded`, the ship the pilot is now in; `from` is the one left).

## Workstreams

| Name | Branch | Owns | Status | Brief |
| --- | --- | --- | --- | --- |
| 6a foundation | `main` (lead) | Everything in milestone 6a | Closed, 0.7.0 | `docs/ships.md`, "First build slice" |
| Lore | `ws/lore` | `docs/lore.md` (new), `docs/races.md` | Open (long-lived) | "Brief: Lore" below |
| 6b foundation | `main` (lead) | The 6b sim side | Done on `main`, unreleased | `docs/ships.md`, "6b" |
| Ship mart | `ws/ship-mart` | 6b client: see brief | Open | "Brief: Ship mart" below |

6a was built whole by one chat before this process existed, so its planned workstreams (ship rendering, outfitting screen, catalogue) never opened.

Candidates (not open yet):

- **Catalogue and balance:** hull and module data, tuning against play. Not needed yet; balance is in the player's favour and that is fine for now.

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

### Brief: Ship mart

- **Goal:** everything 6b adds, playable. Docked at Harbour you can see the ships for sale with prices and buy one; your ships sit visibly on the station's pads; you can board one you own, docked or alongside in space, with a key and a clear prompt; a pod looks and reads like a pod; a pilot in a pod at Harbour who owns nothing can claim the free starter. After this, the lead releases 0.8.0.
- **Owns:** `packages/client/` only: `index.html`, `style.css`, `main.ts`, `ui.ts`, `bindings.ts`, `controls-panel.ts`, `render/`, and a new panel file for the ship mart (and one for "your ships" if wanted). May touch `outfitting-panel.ts` and `market-panel.ts` only to fit a new tab into the docked panel. Updates `docs/controls.md` for any new key.
- **Uses:** the 6b contracts above. The client never applies ownership, pad, boarding, buying or claiming rules itself: it asks `buyRefusal`, `boardRefusal`, `boardableShips` and `claimRefusal`, and calls the commands. Ships are drawn from their fit as now; a docked ship is drawn at its `position`, which is already its pad.
- **Deliver:**
  1. Pads drawn on stations (sized by `size`, at `padWorldPosition`, facing `facing`), and docked ships drawn on them, flown or empty. Today the client skips every ship that is not flying.
  2. A ship mart tab in the docked panel at stations whose `shipMart` is not empty: each loadout's name, hull, size class, price (`shipPrice`) and a short read of its stats (`fitStats`), with Buy greyed and the reason shown when `buyRefusal` says no. Previews must never change layout (the 0.7.2 rule).
  3. Your ships: a list, docked or not, of `ownedShips`, with where each is, so a pilot can find what they own. Board from the list when `boardRefusal` allows it.
  4. A board key (B is free) and a prompt in flight naming the nearest ship in `boardableShips`, and the refusal when one is close but not boardable (too fast, too far).
  5. Empty ships labelled as empty (`shipLabel` in `ui.ts` already does this) and drawn distinctly from flown ones.
  6. The pod's look: it already draws from its hull outline and three modules; make it read as a lifeboat, not a tiny ship, and make the HUD say you are in a pod.
  7. "Claim a free Courier" in the docked panel when `claimRefusal` is null.
  8. Toasts for `shipBought`, `boarded`, `starterClaimed` and `pilotWoke`; the client already toasts `podEjected` and `noPad`.
- **Out of scope:** any change in `packages/sim`. Selling ships, hired pilots, taking other people's ships. If the sim lacks something the screens need, add it to "Requests to the lead" and work round it.
- **Done when:** `npm test` and `npm run build` pass; a headless play check with real mouse clicks covers buying, seeing the ship on its pad, boarding it docked, undocking, boarding back in space, losing a ship to a pod, docking the pod and claiming the starter; `docs/controls.md` updated; log entry with changelog lines; branch pushed.

## Questions for Jason

Open design questions any chat needs answered. Jason answers in the lead chat or in the chat that asked; the lead moves answers to "Decisions".

- Navy duties.
- Should pirates hunt escape pods? A pod carries nothing, so it is not piracy, but a pirate finishing you off is a threat that sticks. For now they leave pods alone (`PIRATE_TUNING.huntPods`); one line flips it. Shooting pods as a crime comes with law (7) either way.

## Ideas inbox

Jason's ideas that are not scheduled yet. The lead triages them into the roadmap, a workstream or "not now".

- **Station functions on ships** (2026-11-03, later): bigger ships could carry station services such as outfitting; player stations, or station ships, may follow.
- **Boarding abandoned ships** (2026-11-03): taking a ship nobody owns, or someone else's. Belongs with law (7) and salvage (9). Owning ships, swapping in space and pods are scheduled in 6b.
- **Hireable NPC agents** (2026-11-03, long term): pay a station for an escort; hire a pilot to fly another ship you own alongside you; later, a hired captain who takes one of your ships off to work a trade route or mine, building towards a fleet. Lead's notes: the sim already suits this, because NPCs fly through the same inputs as people and their brains are plain data, so a hired pilot is a brain attached to a ship a pilot owns. 6b should keep "who owns a ship" separate from "who is flying it" so this slots in later. Escorts need little more than today's AI; captains on routes need the economy (10), industry (9) and off-screen traffic (8) first.

## Decisions

Settled design and process decisions, newest first. Each line: date, decision, who decided.

- 2026-11-04: Lore (from the lore chat): the core premise stands (the Aurel caged the Unsung by silencing the Lattice, and gate-waking undoes it); Hive Ossk grows every station's core and each race clads it; pilots can start as Oru, as human wards; all three routes to an Aurel ship stand, including the 604 AL sale; player organisations are "outfits"; the Unsung appear later as hostile ships in the Dark; pilots can gain standing with four pirate factions (Red Tithe, Null Ledger, Black Strike, Cutloose; not the Hiveless; the Hollow Choir only late); the starter sector stands. Follow-ups are on the roadmap: wards at character creation (11), pirate faction standing (7), the Unsung (8). (Jason)
- 2026-11-03: 6b plan: board ships you own in space as well as docked; escape pods come in 6b; a free starter Courier only when you own no ship; empty ships stay where left and can be attacked. Full plan in `docs/ships.md`. (Jason)
- 2026-11-03: The 0.7.0 calls stand: outfitting at Harbour only for now; the world aligns to the lore, so the Mule and Jackal stay gone (Aurel ships can serve as dev and test ships); the Spine's six bays; bonus values are a dial to tune later; names come from the lore, with module makers a mix of their own companies and hull makers. (Jason)
- 2026-11-03: The lore workstream opens now, so the story defines the world. (Jason)
- 2026-11-03: Modules are owned. Unfitting stores the module at that station for the pilot; fitting uses a stored one if there is one, else buys new. Fitting and unfitting each cost 5% of the module's price. Stored modules sell back for half. Storage is shaped like a cargo hold so modules can join the goods economy later and be carried and traded. (Jason)
- 2026-11-03: The lead decides when work splits into its own chat, using the rules in "When to split work", and tells Jason at each milestone start and foundation landing. (Jason)
- 2026-11-03: Work runs as a lead chat plus workstream chats coordinated through this file; the lead builds the 6a foundation before any workstream opens. (Jason)

## Requests to the lead

Contract changes, cross-workstream file changes, merges wanted. Newest first.

_None open._ Done on 2026-11-04: the lore decisions are in "Decisions" and their three follow-ups (Oru wards, pirate faction standing, the Unsung) are on the roadmap under milestones 11, 7 and 8.

## Log

Newest first. One entry per session that changed something.

- 2026-11-04, lead (Lead 2): built the 6b sim foundation on `main`: owning versus flying (`ownership.ts`), station pads and pad docking, hull prices and the ship mart, boarding docked and in space, escape pods with ejection, waking and the free starter claim (`pilots.ts`), station data in `stations.ts`, save version 4 with a migration from 3. 30 new tests (183 in all). Minimal client changes only: credits shown for the pilot flying, empty ships labelled, pod and noPad toasts, the death panel wakes you. Play checked headless: a version 3 save loads docked on a pad and undocks from it; losing a ship leaves you in a pod; losing the pod and waking puts you in a free Courier on a Harbour pad. Merged `ws/lore` (lore canon and Jason's lore decisions). Opened the ship mart workstream. `main` is not release-ready until it merges: a pilot in a pod has no way to claim the starter or board a ship yet. Changelog lines for 0.8.0: "Own several ships: buy them at Harbour's ship mart and board them docked or in space"; "Stations have landing pads; docking takes the smallest free pad that fits"; "Escape pods: lose your ship and get away in a pod; lose the pod and wake at Harbour"; "Save version 4: 0.7.x saves upgrade automatically".
- 2026-11-04, lore: put the lore questions to Jason and recorded his answers in `docs/lore.md` and `docs/races.md`. Decisions (Jason): the core premise stands (the Aurel caged the Unsung by silencing the Lattice, and gate-waking undoes it); Hive Ossk grows every station's core and each race clads it; pilots can start as Oru, as human wards; all three routes to an Aurel ship stand, including the 604 AL sale; player organisations are "outfits"; the Unsung appear later as hostile ships in the Dark; pilots can gain standing with four pirate factions (not the Hiveless; the Hollow Choir only late); the starter sector stands. Removed the answered lore questions from "Questions for Jason". Next: the naming table. Changelog line: "Record lore decisions: wards, outfits, stations, Aurel ships, pirate standing".
- 2026-11-03, lore: created `docs/lore.md` as canon from the claude.ai lore doc: premise, the Lattice, the Aurel and the Sundering, timeline, the six peoples, the Concord and navy service, manufacturer origins, six pirate factions, present-day tensions. Added the starter sector in lore terms (Calder system; Harbour a Concord free port; Ridge a Belt cooperative; the trader on a Tessaract contract; the pirate a Black Strike raider in a captured Kessari Wedge), marked proposed. Pointed `races.md` at `lore.md`. Needs: Jason's answers to the lore questions (being asked in the lore chat). Blocked: nothing. Changelog line: "Add lore.md, the game's canon setting and history".
- 2026-11-03, lead: planned 6b with Jason (ownership, pads, ship mart, boarding, pods) in `docs/ships.md`. Lead handing over to a fresh lead chat to build it, because this one is long.
- 2026-11-03, lead: released 0.7.2. Outfitting names what each module is, warns when a fit cannot thrust or turn, and toasts the same on undock. Fixed outfitting clicks being lost: previewing a module could reflow the panel and move the button out from under the pointer mid-click. Opened the lore workstream.
- 2026-11-03, lead: released 0.7.1, owned modules with per-station storage, handling fees and selling. Save version 3, with an automatic upgrade from 0.7.0. Filed ship ownership and escape pods in the ideas inbox for 6b planning.
- 2026-11-03, lead: released 0.7.0 from the 6a chat's `ws/6a-handoff` branch. Added light armour to the starter so it outlasts the raider (a test now enforces it), stopped "power spare" showing as worse unless negative, moved the docked panel clear of the HUD, did the docs pass and version bump. Play checked: docking, outfitting, the Wedge and Spine in flight, a pirate fight, the old-save refusal.
- 2026-11-03, lead: added "When to split work" with split rules, limits and the opener for new chats. No code change.
- 2026-11-03, lead: added this file and the coordination rules. No code change.
