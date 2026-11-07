# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions are 0.x until a proper 1.0 release; minor versions may break saves.

## [Unreleased]

## [0.20.0] - 2026-11-07

Open Lanes step 2, the first fleet (`docs/ship-pipeline.md`, `docs/ship-standards.md`): ships drawn from their artwork, hull shapes from the art, and ten new hulls.

### Added

- **Ship art in flight**: every ship in the game is drawn from its artwork, with turrets on top that turn to aim.
- **Hull shapes from the art** (`hull-geometry.ts`, `npm run geometry`): ships are hit where they are drawn and fire from where their turrets are.

- **Ten new ships** (the first fleet): the Kessari Citation, Seraphine Deimos and Phobos, Ishtar Lakshmi and Union Blockade (navy), the Tessaract Waybill, Belt Forge Mule and Meridian Skua (haulers), and the Belt Forge Rime and Meridian Dunlin (miners). Each is sold at its power's yards, and the five warships are in the Arena.
- **Navies fly their own ships**: Mars patrols in Phobos boats with Deimos pickets, Venus in the Lakshmi, the Belt in the Blockade; Earth adds a Citation picket. Traders fly a mix of haulers, and two more miners work Ceres.

### Fixed

- **Ships bouncing through stations at the end of a burn**: a burn that bent round a world (Ceres, for ships coming in to Ceres Accord from behind it) arrived too fast, overshot, and could never settle, passing through the station again and again. The brake now allows for the turn the ship actually needs, so an overshoot is recovered (found by Jason).

### Changed

- **Medium pads** sit a little further out from stations (new stations only).
- **Hull sizes follow the art**: the Aurel Tacet is much longer (radius 38, now a large hull that needs a large pad), the Manifest and Collier are bigger, and the Prospector, Sinker and Knocker smaller.
- **Large pads** sit a little further out from stations (new stations only).
- **Belt mining hulls** carry their lasers on the booms, where the art draws them.
- **Ship sprite build** (`npm run ships`, `server.bat ships`): builds every hull and turret picture from `art/ships/`, as part of every build and update.
- **Ship export and standards** (`art/registry/export.py`, `docs/ship-standards.md`, `docs/ship-pipeline.md`).

## [0.19.0] - 2026-11-07

Sol slice 2: worlds as burn targets, the pass round a world, the pod lost in a fall at burn speed; all 31 of Sol's ports and the five Accord lanes; the Accord's Relay and security worked out from it; traffic that burns, patrols by navy, pirates where nobody answers, and ships on the chart. Played by Jason.

### Added
- **Traffic across Sol.** Traders burn along every lane and out to the far ports; each navy patrols its own space (ECF round Earth, VSG round Venus, the MRN on the Accord lanes, the UDF on the Belt Lane), labelled by navy; pirates wait at Psyche Dig, the Ganymede Local and Hilda Moot, where nobody answers a call.
- **Ships on the chart.** A ship squawking its transponder shows on the chart, named, if a relay buoy hears it, or if you are within its transponder's own range; a ship running dark does not, unless it is burning, when its plume shows with no name. Burns are drawn to where they are going. In Open space, ships vanish from the chart.
- **Security on the chart, worked out from the Relay.** The Accord's relay buoys ring the lane ports and navy bases, chain along the lanes and sit singly at other ports; none at the clans' moots or past Saturn but the Gate Lane. Where two buoys hear you and a base is a short burn away is Core; covered but thin or far is Held; where neighbouring holders quarrel (Psyche, Jupiter's moons) is Contested; where nobody hears is Open. The chart shades it with each buoy's reach as a faint circle (Core teal, Held in the holder's colour, Contested amber), rings each port in its level when zoomed out, says which you are in at the top, and the burn plan says what you arrive in.
- **All of Sol's ports: 31 now, up from six.** Venus's Solace Station Mercy, Lavinia Alpha Dock and Halden Beta Regio Observatory; round Earth, the ECF and Tessaract yards at the Lagrange points, Tycho Port on Luna, Corvane Apollo Works and Rook and Rivet Shell Station; Corvane Caloris Foundry at Mercury; MRN Yard Phobos, State Yard Deimos and State Mine Eureka at Mars; in the Belt, Vesta Concession, Psyche Dig, Bellows, the Boneyard and Hilda Moot; out past Jupiter, Callisto Freight Depot, the Ganymede Local, VSG Haven Europa, Rimehold, Plume and Triton Moot; and the ECF Toll Station and MRN Gate Station at the Gate Reach. Each trades, outfits and sells ships by what it is: foundries pay best for ore, salvage ports for scrap, clinics sell medicine cheap, the far outposts pay dear for everything brought in. A port's card says who runs it. Existing worlds gain them on their next start.
- **The Accord lanes on the chart:** the Inner, Ceres, Belt, Long and Gate lanes as wide bands between their ports, named, with a key.
- **Burn for a world.** Click a planet or moon on the chart (M) and press U: the burn ends above its gravity well, at rest with it. The target card calls it a world; the plan says ABOVE THE WELL.
- **The pass round a world.** A burn whose line crosses a world bends round it: a tangent in, an arc grazing its clearance, a tangent out. The ship slows for the pass to what its drive can bend at that radius and burns on after. The chart draws the route the ship will fly, rings the world it rounds, and the plan's ROUTE line says ROUND MARS and how much longer it takes than the straight line. The burn banner reads ROUNDING EARTH during the pass. Leaving Slagline, dug into Pallas, goes straight out first.

- **The chart zooms and pans.** The wheel zooms about the pointer, dragging moves the chart; zoomed all the way out it locks on the Sun with all of Sol in view. LOCAL, INNER, BELT and ALL SOL remain as quick jumps.

### Changed
- A port's protected zone holds only where security is Core or Held: at a Contested or Open port, pirates hunt up to the door. Pirates never chase a ship mid-burn, and the Ceres field's pirate has moved out to contested space.
- A ship mid-burn no longer rams other ships; it still hits worlds.
- The game runs faster with many ships about: a ship's performance is worked out once per change of fit or cargo instead of many times a tick.
- The chart places names so they never overlap: worlds, capitals and free ports first, the rest as you zoom in. Capitals and free ports have a larger mark.
- A burn to or from a port in low orbit or dug into a rock passes round the world at the port's height instead of climbing out first. Flying in to Rook and Rivet Shell Station no longer circles Earth.
- Hitting a world at burn speed (2,000 u/s or more) loses the pod too: nothing gets away, and you wake at your home station with what you own elsewhere, as after losing a pod. Slower falls still end the ship and the nearest port recovers your pod.
- The burn plan's times count the flips (about a second each).
- The burn refusal for an unknown target reads "No such port or world."

## [0.18.0] - 2026-11-07

Sol, the plotted burn and the chart; the Arena as a world of its own with a mode screen; the setting's Sol pivot in every name on screen; one-command server management. Played by Jason in both control modes.

### Added
- **Server management:** `npm run update` (or double-click `server.bat`) stops the server, pulls, installs, builds and starts it; `npm stop` stops it cleanly from another window, saving first; `npm restart` and `npm run status` too (docs/hosting.md, "Managing the server").
- **Sol.** The persistent world is Sol: the Sun, the planets, their moons and the big Belt rocks, at enormous sizes and compressed distances. Six ports to begin with: Earth Orbital Exchange, where new pilots start, Thetis Orbital at Venus, Republic Station Elysium at Mars, Ceres Accord Station with a rock field round Ceres, Slagline on Pallas and Titan Free Port. Ships and stations keep their real size; planets stay off the local view.
- **The burn.** Pick a port on the board or the chart and press U: the ship turns, burns, flips at the midpoint and brakes, arriving at rest beside the port. Earth to Mars takes about three minutes. Weapons, locks and docking are off while burning. U again cancels, and you keep your speed; U with no target while coasting fast brakes you to a stop.
- **The chart** (M): all of Sol, with local, inner, Belt and whole-system views. Click a port to plot the burn to it.
- The mode screen: after choosing a character, pick where to go: the Universe (Sol) or the Arena. Leave a mode from the menu (F2, Back to modes) to come back to it.
- The Arena, a world of its own that is never saved and never touches Dev, open to every player. Pick a ship (every hull with a ready-to-fly fit), one of its fits and a scenario, then LAUNCH. Skirmish is the first scenario: pick the enemy fit and how many (1 to 8). Losing your ship or destroying every enemy brings you back to the setup three seconds later, with your choices kept; Leave the fight in the menu (F2) does it at once. Waves and To the death are shown, greyed, until they are built.

### Changed
- Calder leaves the persistent world. On the first start of this version, the Calder save is kept as `world-calder-backup.json` and Sol starts fresh: characters and keys carry over, ships and credits start again. The Arena is still fought in Calder's empty space.
- NPC traders are away until NPCs can burn between ports; the patrol, the miners and a pirate work round Earth Orbital Exchange and Ceres.
- The setting moves to Sol (the lore pivot): four human powers, Earth, Mars, Venus and the Belt. What you see follows it:
  - Hull classes: the Tern is a corvette, the Warrant a patrol boat, the Injunction a frigate, the Walkout a destroyer, the Manifest a freighter, the Prospector a prospector, the Sinker a miner and the Collier a barge.
  - Close-in weapons are PDCs (they were swivels), in the HUD tile and outfitting.
  - The Plot is the board (P). Your transponder is squawking or dark: the chip reads SQUAWK or DARK, and K still switches it.
  - Renamed modules: Meridian Course S, Paragon Vector S, Ito-Marr Trajectory M (flight computers), Meridian Pod Rack S, Paragon Fire Control S, M and L, Ito-Marr Surge M; guns Cantor-Vell Volley and Enfilade, Ishtar Retort and Answer (the maker is Ishtar Fleet Works now); Meridian Yards.
  - Ores take their real names: copper, zinc and platinum.
  - The reference fits Brig brawler and Frigate anti-small are Injunction brawler and Walkout anti-small.
  - Mars's and Venus's makers draw in their powers' colours.
- The admin arena in the menu is gone: the Arena replaces it, for everyone. An admin arena still running in a save is ended when the save loads, and you are back in the ship you came from.
- Logging in no longer drops you straight into the world: the mode screen comes first. Saves move to version 17. Clients must reload (protocol version 3).
- The menu's admin controls show only in Dev, not in the Arena.

### Fixed
- Hitting a world at speed no longer bounces you, or your escape pod, off it at tens of thousands of units a second. At 500 u/s or more into a planet, moon or big rock the ship is lost with no wreck, and the nearest port picks up your pod, docked. A burning ship can no longer pass through a world either.
- Coasting fast (after cancelling a burn, say), a COASTING banner shows your speed and that U brakes you to a stop in seconds, or burns for your nav target; thrusters alone take minutes.
- Clicking the warning banner silences the alarm again. With a countdown showing (a collision in 1.3 s) a normal click often did nothing, because the banner redrew under the pointer mid-click; it now silences as the button goes down.

## [0.17.0] - 2026-11-06

The interface pass and the shared world: each player is sent only what their sensors see, ships running dark are only radar contacts, and the HUD gains the Plot, the selection window, warnings with sounds, turret arcs and aim reticles (docs/interface.md, docs/shared-world.md).

Saves move to version 16: pirates already in a save start running dark; everything else shows its colours. Clients must reload (protocol version 2).

### Added
- Name colours, running dark and the Plot from the lore.
- Name close-in weapon systems swivels, from the lore.
- The Plot (P): a window listing what is around you, with distance, type, name, closing speed and your lock. Tabs for general, combat (hostiles first) and mining (rocks, caches, your drones); click a column to sort. Click a row to make it your nav target; right-click a ship or rock to lock it.
- Aim reticle styles for mouse steering, chosen in the Controls panel (F1): ring, brackets or dot, with a tick where your nose points now, or the plain crosshair. Over windows the normal pointer shows.
- The selection window replaces the target card: it shows what you selected (a right-click in space, a click in the Plot), or your active lock, with buttons to lock, make active, dock, send a drone or clear. Stations and caches can be selected too. Selecting sets your nav target.
- The nav target: a marker over it, or at the screen edge pointing its way, with its distance and arrival time.
- Colours: every ship shows its Registry beacon unless it runs dark (K, or click the COLOURS chip by your credits). A ship running dark is only a radar contact, small, medium or large, until someone locks and identifies it; the server sends nothing else about it. Pirates and arena enemies run dark.
- Warnings with sounds: a banner at the top centre lists what holds now (missiles inbound or about to hit, shields low or down, hull low or critical, someone locking you, a collision ahead with a rock or station, pirates hunting you, an empty capacitor, a full hold with the tractor on, gravity), highest tier first, each with its own tone; alarms repeat until they clear or you click to silence them. Locks completing, targets destroyed, drones lost and the like sound with their toast. Volume and an off switch in the Controls panel (F1).

### Changed
- The corner readout by the fps shows which build the client is (its commit), and the server prints its build when it starts, so a stale client or server is easy to spot.
- Saves move to version 16: pirates already in a save start running dark; everything else shows its colours. Clients must reload (protocol version 2).
- The caution "pirate hunting you" now comes only for a pirate you have identified; a dark one warns once it locks you.
- With weapons hot, a ring round your ship shows where your main guns can bear (thicker where more can, missing in blind spots), with a tick for where each gun points: bright when it bears on your lock, amber while it turns.
- Outfitting and the fitter draw every fitted main gun's arc faintly, with the selected mount's over them.
- The server sends each player only what they can see: ships and shots within their sensor range (plus a margin), their own ships and caches wherever they are. Other players' credits, storage and ship holds are no longer sent to anyone (a lock whose computer reads cargo still sees a hold).
- Your own shots and missiles are drawn leaving from your guns, rather than from where your ship was a moment ago.
- Close-in weapon systems are called swivels in the HUD and outfitting, and the Paragon CIWS M is now the Paragon Sentry M.
- Drones thrust backwards and sideways like a ship with thrusters, so they back off and sidestep among rocks instead of only flying where they point. Ships are unchanged.

### Fixed
- The Plot's mining tab no longer fidgets with drones out: your drones are listed first, and rows at nearly the same range keep their order.
- Rocks no longer stutter beside you when orbits are on: they are drawn smoothly between server updates, like ships and planets.
- Drones (and NPC miners) close to a rock no longer plan straight through it and rub along its face; a prospector's drone in a crowded patch could get stuck that way and never cut.
- Drones no longer get boxed in against a rock by a sister drone cutting on the same face; drones of one mother pass through each other, so they no longer steer round each other.
- A new character joining while someone else's ship appeared could hit "Unknown hull" errors and see ships that were no longer there: updates that came while the key was on screen were dropped.

## [0.16.0] - 2026-11-06

The turret model: every main gun is a turret, range costs shot guns accuracy and lasers power, and close-in weapon systems replace swivels (docs/turrets.md).

Saves move to version 15: turreted gun modules become the gun of the same name, and you get the turret mounting's price back in credits; swivels become close-in weapon systems on ships that have hardpoints for them, and every other swivel, fitted or stored, is refunded at 800 credits.

### Changed
- Every main gun is a turret. Its group's guns follow your active lock and fire on Space when they bear; you no longer have to point the nose. Small turrets slew 3 rad/s, medium 1.5, large 0.75, so big guns struggle to follow small, quick ships close in.
- Where a gun can bear is set by its hardpoint: bow guns cover the forward half, side and stern mounts on big ships cover their side or the stern.
- With no lock, guns settle along their mount and fire straight ahead.
- The weapon tiles say whether each gun bears on your lock (`BEARS`, `SLEWING`, `RANGE`, `NO ARC`), or `AHEAD` with no lock.
- Outfitting shows gun and swivel damage per second instead of fixed and turret; the target card shows weapons and total damage.
- Pirates, the Calder Watch and the arena's enemies fire whenever you are locked and in range, not only when their nose is on you.
- Stock big ships refit for the turret model: the Kessari Injunction carries autocannons on both flanks and aft with a small third reactor (it beats one Warrant and loses to two); the Walkout the same, with a second medium reactor where a cargo bay was (it beats four Warrants and loses to six).

- Range costs accuracy: every autocannon, blaster, artillery and railgun shot leaves inside a small cone (autocannon 2.0°, blaster 2.5°, artillery 0.8°, railgun 0.3°), so a small ship far away is hard to hit and a big one is hit anyway. Outfitting shows each gun's spread.
- Lasers lose power with range: full damage to half their range, fading to 40% at full range.

### Added
- Close-in weapon systems (CIWS): the Paragon CIWS M, on their own hardpoints that only medium hulls and up have (the brig, the Manifest and the Collier two, one on each beam, with gaps dead ahead and astern; the frigate four, covering all round). About 30 light rounds a second out to 350 units, shooting down missiles and torpedoes first and ships when weapons are hot. Gunlayers set how many you can run.
- The Controls panel (F1) offers the two steering schemes at the top: steer with the mouse, or steer with the keys (A and D spin the ship). It is the same setting as the menu's checkbox.

### Removed
- The separate turreted gun modules (the Picket L Turret and the rest): every gun is a turret now.
- Swivels (the Paragon Watchman S). Small ships defend against missiles with chaff and flares. The starter Tern carries an autocannon S in its old swivel slot; the Prospector and Sinker leave it free; stock medium and large ships carry CIWS, and their old swivel slots stand empty until the next refit.
- The Frigate crowd clearer reference fit: every frigate now has full CIWS cover.

### Fixed
- Closing the menu lets go of the button last clicked, so Space (fire) no longer clicks it again (it started a second arena).

## [0.15.0] - 2026-11-06

Fitting step 4 (the costs) and the arena.

Saves move to version 13: medium and large swivels become small ones, and you get the difference back in credits.

### Added
- Turreted main guns: every medium and large gun also comes on a turret. It follows your lock without turning the ship, fires with its group, needs no fire control, but hits a quarter softer and slews slowly (the large ones very slowly).
- The Paragon Gunlayer L fire control runs eight swivels, so a heavy ship can carry nothing but point defence.
- Signature from kit: big engines and guns make a ship easier to lock, the charge rig more so, and a burning afterburner blooms it by half. The fitting window shows it.
- The market shows cargo and the ore hold separately, and a greyed Buy button says why on hover.
- The arena (operators): in the menu, pick a fit to fly and a fit and number of enemies, and fight them far out in space; end it to go back to your ship.

### Fixed
- The menu scrolls when it is taller than the screen (the admin tools ran off the bottom), and long ship names no longer push buttons off it.

### Changed
- Point defence is small only: the Paragon Sentry M and Bulwark L are gone (fitted and stored ones become Watchman S, refunded); big ships carry several small swivels. The Walkout's fire control mount is large.
- Bigger guns fire slower shots, and bigger turrets slew slower, so small, quick ships are hard for big guns to hit.
- Swivels fire light rounds fast (30 a second each) out to 900 units, so a big ship covered in them is dangerous to small ships.
- The Cantor-Vell Vigil M armour plate carries 460 structure (was 100, worse than the small plate).
- Mining ships and kit take their names from the lore: Belt Forge Collective builds the Prospector, Sinker (was Breacher), Collier (was Hulk) and the Knocker drone, with the Pick, Dowser, Assay, Sounder (was Deep Assay), Shotfirer (was Charge Rig), Hopper, Nibbler, Cradle and Cage; Corvane Heavy Industries builds the Excavator and the Furnace. Rook and Rivet stays the salvage firm.
- Ores and charges renamed: Copperband (was Banded ore), Blackjack (was Black ore), crackers (were breach charges), and the Knocker as a good.
- Ship systems renamed: Meridian Davit (was Ark Bay), Paragon Gunlayer (was Director), Tessaract Collection (was Long Gleaner), Slagline Bolt (the afterburner, was Kick, like the engine), Ito-Marr Sally (was Surge). Ids are unchanged, so worlds carry on.

## [0.14.0] - 2026-11-05

The shared world. The world runs on a server on the host's PC, and everyone plays in it from their browser; friends join over Tailscale. Characters with keys, players and operators, a connection meter, and updates small enough for a home connection. Worlds from 0.13.0 browser saves are not carried over: a server starts a new world.

### Added
- The shared world (docs/shared-world.md, docs/hosting.md). The world runs on a server on the host's PC (`npm start`), saved to a file every minute; everyone plays in their browser, friends over Tailscale.
- Characters: make one with a name (a suggestion fills the box) and get a key, shown once to keep; log in from any browser with name and key; this browser remembers it too. Names are unique. Two tabs can play two characters at once; logging in as a character already playing disconnects the other tab and says why.
- Players and operators: only operators get the admin controls, and the server refuses admin commands from players. The first character on a new server is an operator; the host makes others with `op` and `deop` in the server's console (also `who`, `save`, `stop`).
- Logging off in space: your ship stays where it is for a minute, then disappears with its drones taken aboard, and comes back where it was, stopped, when you return. A docked ship stays docked. When the server starts, everyone counts as logged off.
- `stats` in the server console: ticks a second, time per tick against the budget, and what each player is sent, before and after compression.
- A connection meter in the top right corner: the round trip to the server, green, amber or red. Click it away; the menu brings it back.

### Changed
- No single-player mode and no browser saves: the server keeps the world. Save, export, import and new game are gone from the menu; the menu shows your character and key instead.

### Known
- Each player is sent every ship in the system 30 times a second; sending only what a player's sensors can see comes next.

### Fixed
- Motion no longer stutters: the client draws a steady moment about 67 ms behind the newest update (30 updates a second), so updates that arrive unevenly (Windows timers, the network) are absorbed. Your own ship is drawn from the newest update instead, carried forward by its speed, so steering responds after only the round trip.
- Updates were about 90 KB each while anyone was mining, because the whole belt was resent, and every ship's fit and hold went every time. Rocks now go one by one and ships field by field: about 3.6 KB an update before compression in a quiet system, about 0.3 Mbit/s a player after.

## [0.13.0] - 2026-11-05

Mining grows up and fitting is rebuilt. Drones, NPC miners and breaching for gate-glass; ore holds, sorting hoppers and loot that remembers whose it is; slot tiers (high, mid, low) with placement on the hull, buy then fit, and a new fitting window shared with the fitter page; the first big warships. Saves from 0.12.0 load and are upgraded (save version 12).

### Added
- Two big warships at Harbour: the Kessari Injunction, a brig, and the Union Defence Works Walkout, a Free Belt frigate (working names). Large engines, thrusters, shields and armour came with them.
- A new fitting window: budget bars, your slots by tier, the ship with every slot drawn where it sits (and a swivel's arc and blind spot), and what fits the selected slot from your storage or for sale. Buy modules straight into storage, fit them from there, or buy and fit in one. Fitting and unfitting are free, every station outfits for now, and goods and modules share one storage at each station.
- Slots now sit where they belong on each hull: high slots on the edges, mids in the body, lows deep inside.
- Slot tiers: every ship now has high slots (guns, launchers, mining lasers, tractor, charge rig), mid slots (shields, afterburner, countermeasures, scanners, hopper) and low slots (armour, cargo, drone bays, extra reactors) alongside its core systems, and any module of a tier fits any slot of that tier and size. Fits carry over; anything with nowhere to go goes to your storage.
- The fitter: a second page (from the menu, or `fitter.html`) to fit any hull with any module in the same fitting window as the game, compare two fits with the game's own numbers, and duel them. Fits save in the browser and export as JSON.
- Breaching for gate-glass. Some big rocks hide a glass core that only a deep assay finds; it marks the breach points round the rock. Fly to each, plant a breach charge from the charge rig's tile, get clear and press the tile again to set them off. Bigger rocks hold more glass and more breach points; some cores are fractured and give half. The rock splits and its chunks drift apart, and the glass is exposed for three minutes: cut it with drones or a light laser, because heavy lasers shatter it. The blast hurts anything close, you included, and its bloom brings pirates from far off.
- Loot remembers whose it is: ore you or your drones cut, spoils from your kills and your caches. Your tractor's tile now cycles OFF, MINE (yours, and nobody's) and ALL (other people's too), so you no longer scoop up other miners' canisters by accident.
- Mining hulls carry a big ore hold built in (Prospector 100, Breacher 250, Hulk 1,200): ore goes there and cargo pods never take it, so charges, ammunition and trade goods always have room. Ore Hold modules are gone; older saves get cargo containers in their place.
- Hoppers sort instead of holding: the small one drops one ore, the medium one keeps or drops each ore from a list, and the large one (new, on the Hulk) also swaps your cheapest ore for better when the ore hold is full.
- Jettison: throw a whole stack out of the hold, for anyone to take.
- Station storage for goods: store and take stacks when docked.
- The hold panel (I) and windows: the hold and drone manager open as windows you can move, from their keys or a launcher strip; Esc closes the top one.
- The Rook and Rivet Breacher, a mid-size mining ship sold at Ridge: two mining lasers, a deep assay, a charge rig, three drones and a hopper.
- Breach charges and gate-glass at the markets: charges at Ridge and Harbour, glass bought at Harbour, Ridge and Lantern Works.
- NPC miners: two prospectors working the field round Ridge and selling there, and a hulk with its drones hauling to Lantern Works. Pirates hunt them like any traffic. Older saves gain them on load.
- Mining drones. They fly themselves, work only rocks you have locked, and cut ore for your tractor to collect. The prospector carries one, the hulk four (six fit its bay). Open the drone manager with N to launch, recall or send them to your active lock. Buy more at Harbour or Ridge; they go straight into your drone bay.

### Changed
- The belt has more rocks round the whole ring (350 rather than 120), and refills every 5 seconds instead of every 20, into the emptiest gaps, so miners no longer strip the field round Ridge. Older saves fill up over the first twenty minutes or so.

### Known
- Drones left out when you dock are lost, so recall them first.
- Drones still sometimes get stuck on rocks and rub against them; to be looked at.

### Fixed
- Waiting drones say why in the drone manager (nothing locked, rocks too hard for them, or out of range), and a locked rock's card says whether your drones can cut it.
- Drones launch clear of rocks instead of into a rock the mother is parked beside.
- Buying a drone with full drone bays says the bays are full, not the cargo hold: drones never use cargo.
- The fitting window shows what each fitted module is (autocannon, shield generator) under its name again.
- Drones no longer sit idle when they stop just short of their spot: they cut from anywhere the rock is in laser range, nose on.
- A ship full of drone bays spreads its drones round the rock, in a second ring if need be, instead of piling them up.
- The game starts when opened over plain http on another machine's address (a tailnet IP, say): the new-pilot id no longer needs a secure page.
- Drones plan their way round rocks instead of wedging themselves between them, slow down among rocks so they stop wrecking themselves, and skip rocks too hard for their lasers.

## [0.12.0] - 2026-11-05

Mining, first slice (9a): ore in the Scree's rocks, the prospector and the hulk, surveying, cutting, caches and the ore hopper; and two accessibility fixes from playtesting.

### Added
- Mining, part 1. Every rock in the Scree holds ore: mostly common ore, some richer ores, and the best only in bigger, harder rocks. Mined-out rocks crumble, and the belt slowly brings in new ones.
- A survey scanner: press its tile to pulse, and rocks worth a look light up for a few seconds. A better scanner reaches further and names the best ore in each rock.
- An UNLOCK button on the target card, so a lock can be dropped without the keyboard.
- Heading lock (V): with mouse steering, the nose holds its bearing while you move the pointer. A chip shows when it is on.
- Lock a rock by clicking it. A mining computer (the Assay) reads what it holds and how hard it is.
- Mining lasers: hold fire on a rock to cut ore free in canisters, and scoop them with the tractor. A laser only cuts rock no harder than it is strong.
- The Rook and Rivet Prospector, a mining cutter, sold at Ridge Outpost and Harbour.
- The Rook and Rivet Hulk, a big mining ship sold at Ridge Outpost: two heavy mining turrets, each given its own locked rock to cut, an eight-rock assay, and 1,100 units of ore hold. A turret lets its rock go whenever the lock goes.
- Three new ores to sell: Banded ore, Black ore and Glintstone. Lantern Works pays best.
- Soft rock cuts faster, and every rock has a seam: your mining computer shows it, and a beam on it cuts half as fast again.
- An ore hopper (an internal module): hold space for ore only, and its tile sets one ore it spits back out astern while your tractor takes in everything else. The prospector carries one.
- Ore caches (J): leave the ore aboard, and loose ore nearby, as a cache that lasts an hour and shows on your radar. Anyone can take it.
- The tractor tile says HOLD FULL, and a message says so once, when there is no room left to pull loot into.

### Changed
- Save format version 7: saves upgrade automatically, and their rocks are given ore.
- Plain ore is now called Nickel-iron, what the Scree is made of.
- Freed ore stays where it was cut and lasts 10 minutes; with gravity off, loose loot comes to rest. With a full hold, a tractor gathers canisters into a bunch beside you while you sit still, and leaves the bunch where it is when you move off.
- Lasers free ore in the rock's mix, so richer ore comes out from the first canister.
- The prospector carries 20 units of cargo plus 40 of ore.
- Station ship marts refresh from the game's data when a save loads.

### Known
- Ore and mining module names are provisional until the lore pass.
- No NPC miners, mining charges, hulks or drones yet (mining part 2).

## [0.11.0] - 2026-11-04

Milestone 6f, ship systems: everything a ship does comes from something fitted, in slots budgeted by hull class. (Release commit recorded in `docs/coordination.md`.)

### Added
- Ship systems: a flight computer, a pod bay and fire control are fitted systems. No flight computer means manual flight with no assist or mouse steering; a better one turns and settles faster. No pod bay means losing your ship leaves you with nothing. Fire control decides how many swivels you can run and how fast they track.
- Slots by hull class: weapon, utility (active kit) and internal (passive kit) slots, with any gun or swivel in any weapon slot.
- The tractor beam is a module (the starter has one); the afterburner is a module, held on Shift.
- Numbered tiles on the HUD: 1 to 9 select fire groups and switch modules.
- Weapon tiles name the gun and the ammunition it needs, so an empty gun says what to buy.

### Changed
- More ammunition: bigger boxes (rounds 100, shells 20, charges 40, missiles 8, chaff and flares 12) and bigger magazines, cheaper per shot. Boxes already in your hold count at the new size.
- Armour fits internal slots; dispensers utility slots.
- Station prices refresh from the game's data when a save loads, so rebalanced prices reach old saves.
- Save format version 6: saves upgrade automatically, with the new systems fitted free (a tractor too; an afterburner is a purchase).

### Known
- Electronic warfare is not built yet; it comes with law.
- NPCs do not use afterburners.
- The tile row and afterburner chip are plain stopgaps until the interface workstream's versions.
- Module names for the new systems are provisional until the lore pass.

## [0.10.0] - 2026-11-04

Milestone 6e, weapons and power, and the flight that playtesting settled. (Release commit recorded in `docs/coordination.md`; tags do not reach the remote through this session's git proxy.)

### Added
- The capacitor: energy guns, shield recharge and full-size sensors draw on your hull's pool, which the reactor refills fastest when it is low. The dial's inner ring shows it.
- Six gun types in three sizes across projectile (autocannon, artillery), energy (pulse and beam lasers) and hybrid (blaster, railgun) families, plus swivels.
- Ammunition is cargo: buy boxes of rounds, shells and charges, reload from the hold, run dry.
- Damage types: shields resist heat, armour resists rounds and shrapnel.
- Firing arcs and blind spots: the Manifest cannot shoot behind itself.
- Fire groups on 1 to 4; new guns join group 1, launchers group 2.
- Missiles and torpedoes: launchers fire at your active lock; radar seekers follow it, heat seekers chase the hottest thing ahead. A Tern can outrun a torpedo.
- Swivels shoot down missiles coming for you by themselves, hot or cold.
- Countermeasures: chaff, flares and decoys from four makers, dropped with C. Chaff may draw radar missiles off; flares outshine a small hull.
- Shields cover the bow and beams only; the stern is open, because the drive fires through it. Hits from behind go straight to the hull, and your shield is drawn as an arc round your ship.
- Admin (testing) in the F2 menu: grant credits, spawn any ship (the Aurel Tacet included), and switch gravity, orbits and manoeuvring speed.
- Suns are drawn in amber with a glow.

### Changed
- The ship turns to face the mouse, as in Flatspace; A and D strafe. The left button fires the selected group, the right button locks. Keyboard steering is a menu setting.
- Ships thrust only where the nose points: side and reverse thrusters only slow a drift. To reposition or stop, turn and burn.
- Gravity is off and the planets, moons and stations hold still. Bodies keep their solid surfaces and still carry what is near them.
- Pirates and the Calder Watch fly attack runs: in firing, away past you, and back round. Pirates open with missiles; the Watch carries them too; traders carry chaff.
- Ships are tougher and fights last longer.
- The Warrant's hull bonus is now to missiles.
- New pilots start just off Harbour, at rest.
- Saves stay at format version 5. Worlds from 0.9.0 load with gravity off and their orbits stopped where they stood, with nothing in flight lost.

### Known
- Pirates rarely destroy traders yet.
- Ships bump each other at low speed now and then in fights.

## [0.9.0] - 2026-11-04

Release commit `fac7702` on `main`. (Tags do not reach the remote through this session's git proxy; versions are identified by their release commits.)

Milestone 6c: the living system. Calder is a star system that moves, and every capability and every readout comes from a system fitted to your ship.

### Added
- Calder is a star system: the star, the garden world Fieldmark, its ice moon Lantern and the asteroid belt the Scree, all moving on their orbits. Harbour Station orbits Fieldmark and Ridge Outpost turns with the Scree, so routes change length as they move.
- Gravity. Planets and moons pull inside their sphere of influence; orbits are free, so a ship left coasting stays up; full assist hovers as far as your thrusters can, while rotation assist and manual fly orbits. Shots, loot and wrecks fall too. Hitting a planet hurts like hitting a station hull.
- Speed, full assist, braking and docking are relative to the station or body you are near. A docked ship rides its pad as the station moves.
- Lantern Works, a Corvane foundry round Lantern with outfitting: it wants ore, food and medicine and sells machinery cheap. Two Tessaract traders run the triangle between the three stations.
- The Scree: 180 solid rocks that block shots and give cover, with Ridge's approach kept clear.
- The Calder Watch patrols near the stations and fights pirates, and can lose. There is no Concord; law is local.
- Target locks, EVE style: lock ships with a click, hold several, Tab switches the active one, Esc unlocks. Locking takes time; turrets fire only at a completed lock. Lock time depends on the target's hull: freighters lock fast, small and stealthy frames slowly.
- Radars, targeting computers and nav computers are fitted systems. Range, lock count and lock speed come from what you fit; no radar sees nothing, no computer locks nothing. What a lock shows depends on your targeting computer: rough condition from a civil plotter, exact shields and guns from a Paragon Marksman, cargo from a Tessaract Tally. Your speed, orbit, gravity warnings and predicted path come from your nav computer; an Ito-Marr Chartvault sees two minutes ahead.
- Sensor range as a ship stat: ships beyond it are not shown.
- The flight HUD: a status dial with shield and hull rings and your speed, weapon tiles that show reloading, the zone and credits top left, a lock strip with a card per lock, and a target card for the active lock.
- Radar: a north-up disc showing ships within your sensor range, stations and bodies always, and what the screen covers; click a contact to lock it. Off-screen markers are gone.
- Zoom with the mouse wheel or = and -.
- Names from the lore for Calder's bodies, Lantern Works, the Calder Watch and the new modules; `docs/lore.md` gains the Landfall Accord, local law and why ships are built from systems.

### Changed
- Turn with A and D, strafe with Q and E; the arrows still turn.
- The old text readout is gone; position, heading and spin are no longer shown.
- Health bars over ships show only for ships you have locked with a combat computer.
- Harbour's machinery is dearer and its ore bid lower, so the trade triangle pays.
- NPCs fly the living system: round planets, rocks and security zones, in and out of moving stations.
- Save format version 5. Saves from 0.8.x upgrade automatically: pilots keep credits, storage and ships; docked ships stay on their pads; ships in space are towed to Harbour; old ships get the stock radar, plotter and nav computer free. Milestone 6c's later changes stayed inside version 5.

### Known
- An empty ship left at rest near a planet falls. Park in orbit, at a station or in open space.
- The Calder Watch is strong against the raider; balance is by test, not yet by play.

## [0.8.0] - 2026-11-04

Milestone 6b: ships you own.

### Added
- Own several ships. Harbour's ship mart sells the Meridian Tern, the Kessari Warrant and the Tessaract Manifest; each shows its stats and price, and Buy says why when it cannot.
- Your ships tab: every ship you own, where it is, its condition and cargo, and Board.
- Board your nearest empty ship with B: docked at the same station, or in space within 150 units and under 20 u/s relative. The HUD says when you can, or what to do first.
- Step out with G, pressed twice: you leave in an escape pod and your ship stays where it is, empty, to come back for.
- Landing pads round stations (Harbour 10, Ridge 6). Docking takes the smallest free pad that fits the hull, and is refused when none does. Docked ships sit on their pads, flown or empty.
- Escape pods. Lose your ship and you get away in a pod, a lifeboat with a beacon, and the HUD says you are in one. Lose the pod and you wake at Harbour: in a new pod if you own a ship, or in a free Meridian Tern if you own none. A pod at Harbour owning nothing can claim the free Tern.
- Empty ships drift with whatever momentum they had, can be shot and destroyed, and are drawn faded and dashed; yours are always labelled. Pirates leave empty ships and pods alone.
- Names from the lore for every hull, module, maker and fit. The Sparrow development ship is replaced by the Aurel Tacet.
- `docs/lore.md`, the game's canon setting and history.

### Changed
- Undocking launches you from your pad, along its facing.
- The docked panel keeps one width, so switching tabs never moves them under the pointer.
- Save format version 4. Saves from 0.7.x upgrade automatically: stations gain pads and docked ships are set down on one.

### Fixed
- Loading a save made after losing your escape pod, and before waking, crashed on start.

## [0.7.2] - 2026-11-03

### Added
- Outfitting says what each module is (engine, thruster package, reactor, shield generator, armour, cargo, fixed gun, turret) beside its brand name.
- Outfitting warns when the fit shown cannot thrust forward or cannot turn, and undocking in such a ship shows the same warning.
- `flightWarnings` in the sim, with a test.
- The lore workstream: `docs/coordination.md` has its brief.

### Fixed
- Clicks in outfitting were sometimes lost. Previewing a module could make the panel reflow, moving the button out from under the pointer between press and release. The panel is now anchored at the top and previews never change its layout.

## [0.7.1] - 2026-11-03

### Added
- Modules are owned. Unfitted and replaced modules go to the pilot's storage at that station, and fitting one you have stored there takes it out instead of buying a new one.
- Fitting and unfitting cost a handling fee of 5% of the module's price, each way.
- Stored modules can be sold back to the station for half their price.
- Outfitting shows how many of each module you have stored here and what fitting it costs, and a Stored here list with Sell buttons.
- Tests for buying, storing, fitting from storage, fees, selling and the save upgrade.

### Changed
- Removing or replacing a module no longer refunds half its price; it goes to storage instead.
- Save format version 3. Saves from 0.7.0 upgrade automatically, with empty storage for every pilot.

## [0.7.0] - 2026-11-03

Milestone 6a: modular ships.

### Added
- Hulls with mount points (type, size, position, facing, services), modules, manufacturers, loadouts and hull bonuses, all as catalogue data.
- Derived ship stats (`shipStats`, `fitStats`): mass, thrusts, shields, structure, cargo, power and weapons worked out from hull, fit and cargo whenever needed.
- Fitting rules and refits: mount type, size and services, power within reactor output, cargo still fits, credits. Refused changes leave the world untouched and say why.
- Hulls: Meridian Courier (civilian starter), Kessari Wedge (frigate), Tessaract Spine (hauler, six bays). The Sparrow stays as a sealed development hull.
- 17 modules across engines, thruster packages, reactors, shield generators, armour, cargo pods and containers, and small and medium fixed weapons and turrets, including a medium autocannon and a medium turret.
- Role and race bonuses on the three new hulls, applying only to full-size modules.
- Outfitting tab in the docked panel at Harbour Station: ship drawing with selectable mounts, stats now and after on hover, fit and remove with prices.
- Ships drawn from their fit: hull outline plus each module's silhouette at its mount, tinted by its maker's race; engine plumes from each fitted engine.
- `docs/ships.md`, `docs/races.md` and `docs/coordination.md`, with contributing rules for parallel chats.
- Tests for catalogue integrity, derived stats, bonuses, fitting rules and prices, refits, weapon state across refits, and the starter outlasting the pirate raider.

### Changed
- `HullSpec` is a frame only. Flight, physics, combat, cargo, collisions, NPC steering, loot and scrap all read derived stats.
- Weapons fire per mount, with hull damage bonuses applied; weapon sizes are S, M, L and XL.
- New pilots and respawns start in a Meridian Courier with the starter fit, including light armour.
- The NPC trader flies a Tessaract Spine and the pirate a Kessari Wedge in a raider fit; the Mule and Jackal are gone.
- Scrap on destruction comes from built mass (hull plus modules), so ships drop more scrap than before.
- Removing or replacing a module pays back half its price.
- The docked panel sits clear of the flight HUD and menu buttons on screens 900 pixels wide or more.

### Breaking
- Save format version 2. Saves from 0.6 and earlier are refused with a clear message and kept aside, and a new world starts.

## [0.6.0] - 2026-11-03

Milestone 5: persist.

### Added
- Versioned save format for the whole world (`save.ts`): serialize, load with validation, migrations, and clear reasons for refusing bad files.
- Autosave to browser storage every 10 seconds and when the tab is hidden or closed; the world loads on start.
- Export the world as a `.json` file and import one back; New game.
- Game menu (F2 or the Menu button): pilot name, show or hide ship labels, save status, Save now, Export, Import, New game.
- Client settings stored in the browser, separate from the world.
- Tests for saving, loading, refusals and migrations.

### Changed
- Hull, weapon and goods stats are taken from the code when a world loads, so tuning applies to existing saves.
- Keys typed into a text box no longer fly the ship.

## [0.5.0] - 2026-11-03

Milestone 4: trade.

### Added
- Goods catalogue: scrap, food, ore, machinery, medicine.
- Station markets with scripted buy and sell prices, read through a swappable `PriceSource`. Harbour and Ridge Outpost trade complementary goods, so there is a profitable run each way.
- Pilot credits (1,000 to start), kept when a ship is lost.
- Cargo capacity per hull (Sparrow 20, Mule 120, Jackal 15) and cargo mass: a loaded ship is slower to accelerate, turn and stop, and rams harder.
- Buy and sell commands while docked, all or nothing, with a reason when refused.
- Market screen in the docked panel; credits and cargo on the HUD; trade toasts.
- The NPC trader carries food and machinery.
- Tests for trade, economy data, cargo mass, cargo spill and capacity-aware scooping.

### Changed
- Destroyed ships spill 60% of each good aboard as loot (previously only scrap).
- The tractor beam only pulls when there is space in the hold, and takes only what fits.
- `collideShips` takes a function giving each ship's loaded hull.

## [0.4.0] - 2026-11-03

Combat controls rework: the mouse chooses, the keyboard flies and fires.

### Added
- Target selection: left click a ship, Tab cycles nearest first, Esc clears. Corner brackets on the target and a target readout (hull, range, closing speed, shields, structure).
- Weapons hot / cold (H). While hot, turrets engage the selected target on their own: they slew to its lead point at their turn rate and fire when on aim and in range.
- Lead marker for fixed guns: where to put the nose so shots meet the target.
- `WPN` line on the HUD; toasts for weapons hot and cold.
- `Ship.targetId`, `Ship.weaponsHot`, `ShipInput.selectTarget`, `ShipInput.toggleWeaponsHot`, `weaponsHotChanged` event.
- Tests for target selection, hot and cold turrets, range limits and turret tracking.

### Changed
- Space fires fixed guns. Brake is X only.
- Traders defend themselves through the same targeting as pilots.

### Removed
- Mouse firing (left and right click) and mouse turret aiming; `ShipInput.fireTurret` and `ShipInput.aimAt`.

## [0.3.0] - 2026-11-03

Milestone 3: fight.

### Added
- Weapons: fixed guns that fire along the heading (left click) and turrets that track the mouse pointer (right click). At the same size, fixed weapons always out-damage turrets; a test enforces it.
- Weapon catalogue (`weapons.ts`): pulse cannon (fixed) and light turret. Hulls gain shields, structure and a default fit.
- Projectiles with travel time, inherited velocity and range, hit-tested along their whole path.
- Shields that recharge after a delay, structure that does not, and repairs while docked.
- Ship to ship collision with momentum shared by mass: heavy ships can ram light ones safely. Hard station impacts now cause damage.
- Destruction: wrecks that drift and fade, scrap canisters, and a tractor beam (hold R) to scoop them into your hold.
- Respawn in a new Sparrow at Harbour after losing your ship.
- NPC spawners that replace destroyed or departed NPCs.
- Armed pirates that lead their target and fire when on aim, turn on whoever attacks them, break off when badly hurt, and leave the sector to repair.
- Armed traders that shoot back at a hunting pirate.
- HUD shield, structure and hold readouts; health bars on damaged ships; turret barrels and aim reticle; explosions; death panel.
- Tests for weapons, projectiles, damage, ramming, destruction, loot, respawn and NPC combat.

### Changed
- Pilot ship ids are now `ship-<pilot>-<n>`; `Pilot.shipsIssued` counts them.
- NPCs are created by spawners instead of directly in the starter world.
- Mule hull now carries a light turret.

## [0.2.0] - 2026-11-03

Milestone 2: company. The sector now has traffic and a threat.

### Added
- NPCs that fly through the same flight computer and physics as pilots, steering by pressing the same virtual keys (`ai/steer.ts`).
- Trader NPC (Mule hull) running a loop between Harbour Station and Ridge Outpost, docking at each.
- Pirate NPC (Jackal hull) that prowls off the lane, hunts lone ships outside station security, holds station on their tail, and gives up when they dock, reach security, escape or outlast it.
- Second station, Ridge Outpost.
- Station security zones (`Station.securityRadius`), drawn as a faint ring.
- Station hull collision with bounce and friction, and a `collided` event with impact speed.
- Mule and Jackal hulls, each with its own outline.
- Off-screen edge markers for stations and ships, with distance.
- HUD lines for the current security zone and for being hunted; toasts for hunts and hull contact.
- NPC colours and labels.
- `World.npcs` brain storage; `huntStarted`, `huntEnded` and `collided` events.
- Tests for steering, trader loop, pirate behaviour and security, station collision, and whole-sim determinism.

### Changed
- `stepWorld` runs NPC brains each tick; an input passed in for an NPC ship overrides its brain.

## [0.1.4] - 2026-11-03

Groundwork for the private-server model: a few friends on one shared world, each with their own progress. No networking yet.

### Changed
- The sim no longer has a single player. `World.playerShipId` is replaced by `World.pilots`; each pilot owns and flies their own ship.
- `stepWorld` takes a map of ship id to input and steps every ship in the world, not just one.
- `PlayerInput` renamed to `ShipInput`.
- The starter world starts empty; pilots are added with `joinPilot`.
- The client joins as a local pilot and only shows events about its own ship.
- Every ship in the world is drawn, not only your own.

### Added
- `Pilot` type, `Ship.ownerId`, `joinPilot`, `pilotShip`.
- Stable local pilot identity kept in browser storage (`identity.ts`).
- Spawn points spread round the starter station so pilots joining together do not overlap.
- Design doc section on the multiplayer model and the rules every milestone must keep.
- Roadmap milestone 11, shared world.
- Tests for pilots: joining, returning pilots keeping their ship, renaming, inputs only moving their own ship, whole-world save round trip.

### Removed
- `playerShip`.

## [0.1.3] - 2026-11-03

### Changed
- Physics is now pure Newtonian: removed space drag entirely. A ship left alone drifts and spins forever.
- Top speed and spin are hard physics limits per hull, applied in every flight mode.
- Brake now uses the real thrusters on each axis (forward motion is stopped by the weaker reverse engine) and overrides any flight keys held at the same time.
- Thruster flames are drawn from what actually fired, scaled by throttle, so assist and brake burns are visible.
- Key bindings moved to a single table in `bindings.ts`.

### Added
- Flight computer (`flight.ts`) with three modes, cycled with Z: full assist (default), rotation assist and manual.
- `FLT` flight mode readout on the HUD and a toast when the mode changes.
- Developer controls panel listing every control in the game, opened with F1, ` or the Controls button. Generated from the bindings table.
- `Ship.flightMode`, `Ship.thrusters`, `PlayerInput.cycleFlightMode`, `flightModeChanged` event.
- Tests for every flight mode, brake in all modes, and assist being limited by hull mass.

### Removed
- `SPACE_DRAG`, `SPACE_ANGULAR_DRAG` and `thrustFromInput`.

## [0.1.2] - 2026-11-03

### Changed
- Rotation now has momentum: Q/E fire rotation thrusters that add or remove spin, and the ship keeps turning after release until countered.
- Replaced heavy proportional drag (25% of velocity lost per second) with a small fixed space drag that only bleeds off stray drift and spin.
- Top speed and top spin are now flight computer limits per hull instead of a side effect of drag. Sparrow: 350 u/s and about 140°/s.
- Brake now also kills spin.
- Drag and braking stop at exactly zero instead of snapping below a threshold.

### Added
- `Ship.angularVelocity`; `HullSpec.maxSpeed`, `rotationThrust`, `maxTurnRate`.
- `ROT` spin readout on the HUD.
- Tests for angular momentum, speed and spin limits, drift bleed-off, and drag staying under 5% of thrust.

### Removed
- `DRAG_PER_SECOND` and `HullSpec.turnRate`.

## [0.1.1] - 2026-11-03

### Changed
- Flight is now keyboard only: Q/E (or Left/Right arrows) rotate the ship at the hull's turn rate. The mouse no longer steers, freeing it for targeting and interaction later.
- Strafe is now A/D only; the Left/Right arrows rotate instead.
- `PlayerInput.aimHeading` replaced by `turnLeft` and `turnRight`.

### Added
- Rotation thruster puffs at the nose while turning.
- Tests for rotation and the angle helpers.

### Removed
- Crosshair cursor over the game canvas.

## [0.1.0] - 2026-11-02

Milestone 1: fly and dock.

### Added
- Headless sim package: Newtonian flight model with mouse-aim heading, soft drag, braking; docking and undocking rules; starter sector with one station.
- Browser client: Canvas 2D vector renderer, infinite parallax starfield, fixed 60 Hz sim loop with render interpolation, keyboard and mouse input, HUD, docked panel, refusal toasts.
- Unit tests for the flight model, docking and sim purity.
- Documentation: design, architecture, controls, roadmap, contributing.
