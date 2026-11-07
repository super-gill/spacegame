# Game loops

What a pilot does in each industry, how they get better at it, what they are paid in, what goes wrong, and how the industries feed each other. Written 7 November 2026 from the lore chat. **Direction, not specification** (Jason): this page says what each loop is for and how it should feel; hull names, pay multiples and the data shapes are illustrations, and the lead decides the granular detail when a loop is built. Nothing here is built, and the parts Open Lanes needs are marked. Industries are listed in `industries.md`, hulls in `hulls.md`, materials in `materials.md`, the law in `navy.md`, the Relay and the Return in `infrastructure.md`.

The brief (Jason): plan the loops, advancement, special cases, reward types and levels; mining has a good start and must feed manufacturing and industry; think in systems, the universe is living.

## The spine every loop shares

Every industry is the same five beats with different nouns. Build the five once and each industry is a data table on top.

1. **Find work.** A board at a station, a contract from a company, a scan that shows a rich rock, a distress call on the Relay, a rumour at the bar. Work is always visible in the world first and on the board second: a shortage is a price before it is a contract.
2. **Fit for it.** Pick a hull, fit the tool, take the risk (a long hold is a slow ship). The fitting model is `fitting.md`: free fitting, role bonus, built-in equipment.
3. **Do it.** The ten minutes of play: fly there, work the site, survive what turns up, come back.
4. **Convert.** Sell the goods, hand in the contract, claim the bounty, book the fare. Payment lands in credits, goods, standing or access, and almost always more than one.
5. **Spend.** Better hull, better tool, a bigger wing, a licence, a home station further out. Spending is what makes the next rung reachable, and the rung is what makes the next contract visible.

Rules that hold across all of it, from `design.md`:

- **No career classes and no XP.** A pilot is what they fly, what they own, who trusts them and what the Registry has written about them. Advancement is hulls, access, standing and knowledge, never a number on the pilot. The one number on the pilot is the Fade, and it only goes one way.
- **Reputation is a record, not a stat.** Standing is a ledger of what a power, company or clan saw you do. Crime counts only if witnessed. Nothing auto-flags.
- **Every gain is paid for somewhere.** A loop that pays more is slower, riskier, further out, or owes someone.
- **The world does not care which industry you are in.** A miner carries cargo. A trader is a target. A bounty hunter who shoots the wrong hull is a pirate.

## The rungs

One ladder, five rungs, shared by every industry. A pilot can stand on different rungs in different industries. The rung is never shown as a level; it is what the pilot can see and reach.

| Rung | Name | What it looks like | What opens it | Typical pay, as a multiple of rung 1 |
| --- | --- | --- | --- | --- |
| 1 | **Odd jobs** | A T1 or starter T2 hull, one tool, work off the public board at your home station | A start | 1 |
| 2 | **Trade** | A production T2 hull fitted for the job, a company that knows your name, work on the company board | Money, and a few completed contracts | 3 |
| 3 | **Contract** | A pattern hull or a specialist, standing with a power or a company, contracts offered to you rather than posted, a licence if you want one | Standing | 8 |
| 4 | **Fleet** | A command ship and a wing of subcraft or drones, or a group of friends, work sized for a fleet (a field, a convoy, a response, a blockade) | A capital, which is money and standing both | 20 |
| 5 | **Name** | A T3 or clan hull, work nobody posts: a power's quiet job, a clan's ask, the Aurel's price | The top of a ladder, or a story | Not money. Ships, marks, access, the Voice |

The multiples are shape, not tuning. The lead sets numbers by play. The important property is that each rung roughly triples, so a pilot never has to grind the same job for long before the next one is worth it, and never skips a rung because the hull for the next one costs about ten of the current rung's jobs.

## Reward types

Credits are the smallest reward. Most work pays in two or three of these at once.

| Reward | What it is | Who gives it | Where it is spent |
| --- | --- | --- | --- |
| **Credits** | Money | Everyone | Hulls, modules, fuel, tolls, fares, fines |
| **Goods** | Ore, refined, alloy, parts, salvage, contraband | The site, the wreck, the fence | Sold, or fed into manufacturing |
| **Standing** | A power, company, cooperative or clan ledger | Whoever the work was for, and whoever watched | Licences, patterns, Union pattern hulls, clan hulls, company boards, cheaper berths |
| **Access** | A licence, a board, a lane permit, a berth at a capital station, a works slot | A power or company at a standing threshold | It is the thing itself |
| **Ships** | Surplus, a pattern, a Union pattern, a clan hull, a T3, an Aurel gift | Standing thresholds, stories, the used market | Flown; owned ships are never taken back |
| **Knowledge** | A chart, a lane, a field survey, a contact, a recipe, a fence's name | Exploration, survey, the bar, a clan | Sold, or used; knowledge is the only reward that can be shared between pilots for free |
| **Marks** | A Registry mark on the pilot: a commendation, a title, the Voiced mark, a wanted flag | The Registry, a navy, the Aurel, the law | Read by every board and every NPC that scans you |
| **Story** | A one-off: the Aurel's price, a clan's secret, what is in the Shoals | The world | Not spent. Remembered |

## The living universe

The point of thinking in systems: nothing in the loops above should be a tap the player turns. Every job exists because an NPC needs it done, and the NPCs keep doing it whether the player is there or not. The player is a small perturbation on an economy that would run without them.

### The chain

```
rock, ice, gas, atmosphere  ──mine──▶  raw  ──refine──▶  refined  ──works──▶  alloy, parts
                                                   │                                │
                                           sold at ports                   ──manufacture──▶  modules, hulls
                                                   │                                                │
   ◀──salvage── wrecks, hulks ◀──combat, hazard── ships ◀──────────────────── markets ◀─────────────┘
                   │
           recycled as patchplate, parts, and the used market
```

Every arrow is an NPC job and therefore a player job. Freight moves goods along the arrows. Security guards the arrows. Crime taps them. SAR picks up what falls off. Exploration finds new sources at the left end. Sovereignty, later, decides who owns the arrows beyond Sol.

### What ticks

Proposed, for after Open Lanes except where marked.

- **Stations have stock and appetite.** Each station consumes some goods per hour (a shipyard eats alloy, a habitat eats water and food, a refinery eats raw) and produces others. Price is stock against appetite. Stock does not refill by itself: NPC freight carries it along the lanes. *Open Lanes 4 needs the simplest form of this: a handful of goods, prices that move with stock.*
- **Shortage becomes contract.** When a station's stock of a good falls below its appetite for long enough, the station posts a freight contract at a premium. When a shipyard has orders and no alloy, it posts for alloy. When a refinery has no raw, it posts a mining contract. Contracts are the economy asking for help, never a random job table.
- **Fields deplete and recover.** A mining site has a stock and a slow regrowth (rock from the belt's own churn, ice from comet falls, gas is effectively infinite). A worked-out field posts nothing and the NPC miners move. A rich new field, found by a survey, is news on the Relay.
- **Traffic follows value, pirates follow traffic, patrols follow pirates.** Pirate spawn weight is traffic value times inverse security. Patrol weight is witnessed crime in the region. So a profitable lane in Held space grows pirates until it grows patrols, and a lane nobody uses goes quiet.
- **Events are system states, not scripts.** A Belt strike closes Union yards and Belt Forge for a week: patchplate dries up, surplus prices climb, Earth shipyards queue. A Relay station knocked out drops a region's security a grade until repaired, and repair is a contract. A comet fall opens an ice field. A Venus storm season raises the price of sulphur and closes the skimmers. Each event is a change to appetites and weights; the loops react.
- **The Registry remembers.** Marks, wanted flags and standing are world state, visible to every NPC that scans a transponder. A pilot's record precedes them to every station.

## The industries

Each entry: the loop; the rungs; what goes wrong (special cases); what it pays; what it feeds and what feeds it. Hull names are examples from `hulls.md`, not requirements, since any hull can fit any tool its slots take.

### 1 Freight

**Loop.** Read the prices (or the board), buy where it is cheap or take a contract, fly the lane, sell or deliver. Pay is the spread minus fuel and tolls, times the hold.

**Rungs.** 1: courier runs between neighbouring ports in a Kite with a small hold. 2: a Tessaract hauler on an Accord lane, buying your own cargo. 3: company freight contracts (Tessaract, Halden) with a schedule and a penalty; bulk ore from the Belt in a Barge; a lane permit for a capital station's berth. 4: a convoy you command with a freight carrier and escort drones, moving a station's whole month. 5: the quiet runs: Aurel husk material to Cantor-Vell, a clan's secret, the Voiced out of Core space.

**Special cases.** A scan finds contraband you did not know you carried (a planted good, a crime for the shipper not you unless you knew). A convoy escort who is actually the pirate. The buyer's station changes hands or strikes while you fly. A toll gate you cannot afford: pay, detour, or run it and be witnessed. Perishables (medicine, live cargo) that spoil past a time. A hold full of goods when the pod goes: all of it stays with the wreck, and salvage law decides who owns it.

**Pays.** Credits above all; standing with the company and the destination station; knowledge (which lane pays this week).

**Feeds and fed by.** Carries every other industry's output. Fed by mining and manufacturing (what there is to move) and by events (what is short). Feeds security (escort demand) and crime (targets).

### 2 Passenger transport

**Loop.** Take fares at a station, fly people to where they are going, be paid on arrival. Comfort, speed and safety set the fare class.

**Rungs.** 1: a taxi between a planet's stations in a Kite with a cabin. 2: a shuttle route on a schedule; a Halden ferry. 3: a liner on an Accord lane with a company (Halden, Solace medical transfers); VIP charters with a security requirement. 4: a liner fleet or an evacuation: a hundred people out of a struck station on a schedule, with escort. 5: carrying someone who should not be found.

**Special cases.** The passenger is wanted, and a stop-and-scan finds them (harbouring, if you knew). A medical passenger whose window runs out. Refugees from a Belt strike who cannot pay. A hijack from inside the cabin. The Voiced passenger: Earth and Mars want them, Venus will pay to get them home. Passengers in a pod death: they die, and the Registry writes that down.

**Pays.** Credits by fare class; standing with the destination power (you brought their people home) and the company; marks for evacuations.

**Feeds and fed by.** Fed by events (strikes, storms, evacuations) and by crime (people fleeing). Feeds security (charters want escort) and SAR (liners in trouble).

### 3 Mining

Already designed in `mining.md` (survey, analyse, break, cut, collect) and sourced in `materials.md`. This entry is where it goes next.

**Loop.** Survey a field, read a rock, cut or breach, collect, then **choose**: sell raw at the nearest port, refine on board at a loss of about 0.3 and sell refined, or carry raw to a refinery that pays best. The choice is the loop's depth: the Prospector sells raw; the professional refines in the field; the fleet feeds a refinery.

**Rungs.** 1: a Prospector on the common rock near home, selling raw. 2: a Sinker or Belt Forge breacher, working a field for a day, refining on board. 3: a mining contract from a refinery (Lantern Works, a Mars works) for a stated tonnage of a stated metal by a date; a pattern hull; a claim on a field. 4: a mining carrier (Colossus) with a wing of mining subcraft and collector drones, taking a whole field, with the refinery's freight coming to you. 5: a clan's field in the Dark; the exotics beyond Sol; the Aurel's husks.

**Special cases.** A rich strike: a rock far above the field's grade, worth a contract on its own, and worth stealing. **Claims:** a surveyed field can be registered with the Registry for a fee; working a claimed field is not a crime, but the claim holder is paid a cut at the port, and jumping a claim in Held space is witnessed theft. Claim jumpers and the miner who turns pirate when a better-fitted ship arrives. Hazards: breaching charges hurt the careless; the Venus skimmer that stays too long; a comet field that is moving. A field that runs out mid-contract. The Hive: Ossk growth on a station's own rock (lore), which the station pays to clear.

**Pays.** Goods first, credits second; standing with the refinery and the Belt cooperative; knowledge (the field survey, sellable to other miners); a claim as access.

**Feeds and fed by.** Feeds refining and manufacturing directly: a refinery's appetite is the mining contract, and a works with no metal posts both a mining and a freight contract. Fed by exploration (new fields), drones (collectors), security (escort for a fleet in Held space). The reason mining was given real minerals and two-stage processing is so this arrow has something to carry.

### 4 Salvage and recovery

**Loop.** Find a wreck (the Relay reports combat; a salvage scanner finds hulks), check whose it is (`mining.md` "Whose loot"), strip it: modules, cargo, alloy as scrap, pods if any. Tow a hulk whole to a breaker for more. Sell scrap to Belt Forge as patchplate feedstock, parts to the used market.

**Rungs.** 1: picking over a fight's leavings in a Kite with a tractor. 2: a Rook and Rivet salvager with a cutter and a scanner, working the lane edges after patrols. 3: a breaker's contract (bring hulks, paid by tonnage and intact parts); a licence to recover navy wrecks for a navy; a salvage claim on a battlefield. 4: a salvage carrier and a wing of salvage subcraft clearing a battlefield or a dead station. 5: a husk in the Shoals, and the only buyer who will admit to wanting it.

**Special cases.** The wreck is not dead: a pilot still in it, which makes this SAR, or a pirate playing dead. Navy wrecks are navy property: stripping one unlicensed is witnessed theft. A wreck with a Registry record: its parts carry the dead ship's hull id, and selling them at an honest port is a question. Salvage rights contested on the spot by another salvager, or by the owner's friends. Ossk-infested hulks. A husk's material and what it does to a hull (Cantor-Vell's secret).

**Pays.** Goods and parts; credits from the breaker; standing with Belt Forge and Rook and Rivet; the used market as a thing you supply; knowledge (where the fighting is).

**Feeds and fed by.** The recycling arrow: feeds manufacturing (patchplate, parts) and the used market. Fed by combat everywhere (security, bounty, military, crime make the wrecks) and by hazards. Overlaps SAR at the moment of finding a live pod.

### 5 Search, rescue and repair

**Loop.** A distress call on the Relay, or a beacon. Fly to it, find the pod or the stranded hull, pull the pod in or repair the hull in the field, carry the pilot home or tow the hull. Paid by the pilot's insurer, the station, or the navy under the Mercy Clause.

**Rungs.** 1: answering beacons near home in anything with a tractor. 2: a Solace Stretcher or a Halden repair tender; a standing contract with a station for its approaches. 3: Solace's rota (SAR contracts in a region, with a response time); a repair licence for navy hulls; the clinic ship carrying Solace's treatment to the Fade-worn. 4: a response group: a rescue carrier, rescue subcraft, a tug, covering a region's distress traffic. 5: the ship that goes beyond the Relay where nobody else will, and what it brings back.

**Special cases.** The stranded pilot is wanted: carry them in (bounty, standing with the law, and they know your name) or let them go (standing with the Belt, a mark if witnessed). Distress calls as bait, the oldest pirate trick. Two rescuers, one pod. A pilot whose Fade is advanced and who asks to be taken to Solace, not home. A rescue in a region with no Relay: no call, so the only rescues are the ones you stumble on. Fuel: the stranded ran dry, and so can you.

**Pays.** Credits from insurer or station; standing with every power at once (the Mercy Clause is the one thing they agree on); marks for rescues under fire; knowledge of who owes you.

**Feeds and fed by.** Fed by everything that strands or kills: combat, hazards, fuel, the range shape. Feeds passenger transport (the pilot needs carrying), repair and manufacturing (the hull needs parts), and the Fade story (Solace).

### 6 Exploration and survey

**Loop.** Fly where the chart is thin, scan, chart. Sell the chart, or use it: a lane shorter than the Accord's, a field nobody has worked, a Relay gap where the law cannot see. Beyond the Shoals, the gates.

**Rungs.** 1: charting the local rocks for a station's survey board. 2: a Meridian survey hull with a long scanner, charting a region's fields and selling the surveys to miners. 3: Accord survey contracts (lane surveys, hazard surveys after a comet); a Relay-extension survey; a pattern hull with the deep scanner. 4: a survey fleet opening a region: survey ship, a tender, a Relay-laying contract behind you. 5: beyond the Shoals, where the Relay ends and the gates wait; the Aurel.

**Special cases.** Knowledge is the reward, and it is copyable: sell a field survey and the buyer can resell it, so the first sale is the one that pays. A survey that finds a claim-jumping operation, a pirate base, a dark station: sell it to the law, the Belt, or the pirates. Range: exploration is the industry that runs out of fuel, and star scooping is how it does not. Finding a husk. Finding the Unsung.

**Pays.** Knowledge first; credits for surveys; standing with the Accord; marks for firsts (the Registry names fields and lanes for their finder); story.

**Feeds and fed by.** Feeds mining (fields), freight (lanes), security and crime (Relay gaps), sovereignty (what is out there). Fed by the fuel system and the Relay's edge.

### 7 Security

**Loop.** Take a guard contract (a station's approaches, a convoy, a mining fleet, a corporate site), be there when something happens, and be paid for the time whether it does or not. Bonus for engagements survived and goods delivered intact.

**Rungs.** 1: riding shotgun on a freight run in an armed Kite. 2: a Meridian Harrier or Corvane Warden on convoy escort for a company. 3: corporate security (Corvane's line, Tessaract's lanes) with a standing contract and a region; station security for a capital station; a pattern hull. 4: a security carrier and a wing of combat subcraft guarding a mining fleet or a convoy in Held space; blockade work. 5: a power's quiet hire for a job it will deny.

**Special cases.** Your client is the criminal (escorting contraband, guarding a claim jumper), and the witness law does not care who paid you. A patrol that mistakes your escort for the threat. Engagement rules: shooting first at a hull that has not committed a witnessed crime is a crime. Security in a region with no Relay is just a gun, with no law to answer to and none to answer for you. Mercenary work for the Belt during a strike, against Earth freight: legal in the Belt, piracy in Core.

**Pays.** Credits by the hour and engagement; standing with the company and the power whose space it was; the right to carry the heavier combat subcraft (Arbor Bramble, behind standing).

**Feeds and fed by.** Fed by freight, mining and passenger demand and by pirate weight. Feeds salvage (wrecks) and the law (witnessed crime, from your transponder).

### 8 Bounty hunting

**Loop.** Read the wanted list (the Registry's, by hull id and pilot), find the hull (the Relay tells you where it was last scanned; after that, hunting), tackle it, bring in the hull or the pod. Hull pays the navy's price; pod pays more, and the pilot's Return is the Registry's business.

**Rungs.** 1: small fry off the public list near home. 2: a Shrike or Harrier with a tackle kit (a lock that holds, an interdiction that stops); the mid list. 3: a navy's hunting licence (access to their list and their last-scan data); a pattern hull; the long hunts in Held space. 4: a hunting group of your own: a tackler, a hitter, a hauler for the hull. 5: the watcher's work: a T3 and the names nobody posts, including the Voiced.

**Special cases.** The bounty is a friend's. The wanted pilot's record is thin and the bounty is political (Earth wants a Belt striker). Tackling the wrong hull (same class, wrong id) is assault. The target is a Voiced pilot: legal in Core, a betrayal in the Belt, an act of war at Venus. Bringing a pod to the wrong power (Mars pays for Earth's wanted too, at a discount). Civilian tackle is Law's new kit, listed in `industries.md`.

**Pays.** Credits; standing with the power whose list it was; marks (the Registry notes who brings them in); the hull itself, sometimes, as a Union pattern seed.

**Feeds and fed by.** Fed by crime and by the law's wanted flags. Feeds the law, salvage (the hull), and the Belt's refit shop (captures).

### 9 Military service

**Loop.** Hold a licence with a navy. Duties come down the ledger: patrols, escorts, responses, stop-and-scan, and later hunting groups and special operations. Do them, and the licence grows: Navy grade, Navy-only hulls, patterns, the T3 ladder. Miss them, and the ledger notices.

**Rungs.** 1: the reservist start (`sol.md`): a civilian hull with the tag, one patrol a week. 2: a full licence, a Navy-grade corvette, regular duties. 3: patterns, task-group work, a hunting group's tackler or hitter. 4: command of a task group with a carrier. 5: the T3: watcher, hunter, striker, and the jobs a power does not post.

**Special cases.** Duties that conflict with your other work (a patrol during your mining contract). Orders against someone you know. Desertion: owned ships are never taken back, so a deserter in a T3 is a deserter forever, and hunted. Serving one navy while standing with another's company is allowed; serving two navies is not. The UDF is a rota, not a career: Belt pilots take shifts and the tag comes and goes with them. Venus's Guard and the Voiced: the only navy that will have you after the Aurel.

**Pays.** Access first (grade, hulls, patterns, the list); standing; marks; a wage that is a floor, not a living; ships at the top.

**Feeds and fed by.** The law's supply of hulls and pilots. Fed by crime and by the other powers. Feeds every other industry by the security it produces, and bounty hunting by the lists.

### 10 Crime

**Loop.** Piracy: stop a hull, take its hold. Smuggling: carry contraband past scans. Fencing: buy what cannot be sold at an honest port. Hijack: take the hull itself. Toll evasion: run a gate. Each pays more than the honest version of the same job, and each is only a crime if witnessed.

**Rungs.** 1: running a toll gate; picking off a Kite in a Relay gap. 2: a fast armed hull with a hidden hold; a fence at an Accord free port who knows you. 3: a dark station as a base; a crew of friends or NPCs; a reputation that makes traders pay rather than fight. 4: a pirate carrier and a wing in Held space; a blockade of your own; a fence network. 5: the names the hunting groups are for.

**Special cases.** Witnessed. The whole system is the special case: a crime nobody saw never happened; a crime the Relay saw is on your record at every port before you dock. Going dark (transponder off) is itself a flag in Core and Held space and nothing in the Dark. The record is per pilot, and the Return does not clear it. A wanted pilot's safe ports: Belt tolerance, Accord free ports to a point, the Dark. Fences pay a fraction of value. Hijacked hulls carry their hull id: a Union pattern refit is the only laundering. Contraband definitions differ by power (Venus nanite goods are contraband at Earth, Earth's are legal everywhere). A pirate who takes pods is a different grade of wanted from one who takes holds.

**Pays.** Credits well above honest rates; goods; standing with no power and with some clans and fences; a record that is the opposite of a mark and works the same way.

**Feeds and fed by.** Fed by freight and passenger value and by Relay gaps. Feeds security, bounty hunting, the law, salvage and SAR. Crime is the system's pressure, not a career: remove it and half the industries have nothing to do.

### 11 Industry and manufacturing

**Loop.** Buy or bring raw, refine it (a refinery ship or a works slot at a station), sell refined; buy or bring refined plus additives, make a maker alloy at a works; later, make modules and hulls from alloy to a recipe and sell them. Each stage multiplies value and shrinks volume, and each stage has a works that wants your input.

**Rungs.** 1: refining your own ore on board (a Sinker's processor) and selling refined. 2: a Corvane Foreman or a refinery ship working a field's output for the miners around you, taking a cut. 3: a works slot at a maker's yard (Belt Forge, Corvane, Tessaract) and their alloy recipe; a contract to supply a shipyard's alloy; standing that unlocks a maker's module recipes. 4: an industrial carrier running a field's whole chain: subcraft mine, the carrier refines, freight carries alloy out. 5: a shipyard of your own at a station that lets you (Belt and Accord ports first), building hulls to a maker's pattern, or a clan's.

**Special cases.** Recipes are knowledge: a maker's alloy recipe is standing-gated and copyable, so makers guard theirs and Cantor-Vell's is never sold. Quality: field refining loses about 0.3; a works loses less; the price knows. A works slot has a queue and a strike closes it. Input purity: raw from a poor field makes poor alloy. Manufacturing contraband (Venus nanite goods for Earth buyers). The husk-derived laminate and who asks where you got the material.

**Pays.** Goods of higher value at each stage; credits; standing with the maker; recipes as knowledge; a yard as access.

**Feeds and fed by.** The arrow mining was built for. Fed by mining and salvage (inputs) and by freight (moving them). Feeds the markets (modules, hulls, the used market's new stock) and so every industry's rung 2. The economy's appetite for alloy is what makes a mining contract exist.

### 12 Drone and subcraft operations

**Loop.** Not an industry of its own so much as the rung-4 form of every other: a command ship or a bay-fitted hull, a wing, and the work done by the wing while the carrier holds, stores and defends (`fleet.md` "Command ships"). The loop is build the wing, keep it alive, replace losses, and scale the other industries' loops by it.

**Rungs.** 1: a collector drone or two on a mining hull. 2: a bay-fitted hull (Lavinia Cyclone's skimmers, a Meridian Osprey's fighters) with a small wing. 3: heavy combat subcraft behind standing (Arbor Bramble); a company's subcraft line at a discount; crew, later. 4: the carrier proper: industrial or military, the wing as the workforce. 5: the Threnody, whose wing is its hull, if you are Voiced and the Aurel allow it.

**Special cases.** Losses: a subcraft lost is a crew lost (standing with the company that crews them, and a cost), a drone lost is just a cost. Recovery: subcraft out of range when you leave are stranded (SAR for your own wing). Control range and the Relay: drones need your signal, subcraft need orders; jamming cuts both. Command radius and the umbrella: a carrier's bonuses reach a radius, and a wing outside it is on its own. A carrier flown alone is fully effective, by rule, but a carrier without a wing is a warehouse.

**Pays.** Scale: whatever the industry pays, times the wing. Standing with subcraft companies. Access to heavier subcraft.

**Feeds and fed by.** Fed by manufacturing (subcraft and drones are products) and by every rung-3 pilot who wants rung 4. Feeds all of it.

### 13 Sovereignty (later)

Beyond Sol, after the gates. Holding a system means holding its Relay: whoever runs the relays sets the security grade, collects the tolls, and decides whose law applies. The loop is build or take the relays, keep them running (supply, repair, defence), and profit from the traffic that follows. Not for Open Lanes. See `navy.md` "Later: sovereignty".

## How the industries feed each other

| Produces | Consumed by |
| --- | --- |
| Mining: raw | Manufacturing (refining), freight (moving it), crime (stealing it) |
| Manufacturing: refined, alloy, modules, hulls | Markets, and so every industry's next hull; freight; shipyards |
| Freight: goods delivered | Station appetites, which set prices, which set contracts |
| Passenger: people moved | Stations' populations, evacuations, the Voiced's escape |
| Combat (security, bounty, military, crime) | Salvage (wrecks), SAR (pods), the law (records), the refit shop (captures) |
| Salvage: scrap and parts | Manufacturing (patchplate), the used market |
| SAR: pilots and hulls recovered | Passenger (carry them), repair, the Fade story |
| Exploration: charts, fields, lanes, Relay gaps | Mining, freight, security, crime, sovereignty |
| Crime: pressure | Security demand, bounties, the law, pirate weight |
| Drones and subcraft: scale | Every rung-4 loop |

## Special cases that cross all of them

- **The Return.** Pod death is rare and permanent in its small way (the Fade). Every loop has a worst case where the pod goes: a convoy ambushed, a breach charge, a relativistic impact, running dry beyond the Relay. The loops should make that case rare and legible, never random.
- **The record.** Every witnessed act, honest or not, is on the pilot at every port. The loops read it: a wanted pilot's contracts dry up in Core, a decorated one's multiply. No loop ever hides the record from an NPC that scans.
- **Standing is never lost for flying a rival's ships**, only for acting against the power. A Belt pilot can fly Earth surplus. An Earth pilot who shoots a Belt miner during the strike has chosen.
- **The Voiced.** Rung 5 in several industries runs through the Aurel. A Voiced pilot's loops invert in Core space (hunted, not hired) and open at Venus and in the Dark.
- **Friends.** Every rung-4 loop can be a group of pilots instead of a wing. The shared world is the point; the wing is the single-player substitute for friends, and both should work.

## For the lead

What this asks for, in dependency order, and what Open Lanes already covers:

1. **Open Lanes 4 (money loop)** is rung 1 and 2 of freight, mining and bounty hunting with static-ish prices. This page asks only that prices be driven by station stock and appetite, however crudely, so that step 2 below is a tuning change and not a rewrite.
2. **Station appetite and NPC supply:** per-station consumption and production tables (data); NPC freight that actually moves stock along lanes; contracts generated from shortage. This is the living universe's engine and most of the rest hangs on it.
3. **Standing as a ledger** with thresholds per power, company, cooperative and clan; the boards read it. Already implied by `hull-terms.md` "Pilot fields".
4. **Contracts as a type:** who posts, what is asked (good, tonnage, hull id, pod, time, region), what is paid (credits, standing, access, goods), penalty, visibility (public, company, offered). One shape for all thirteen industries.
5. **Claims and surveys** as Registry objects with an owner and a cut.
6. **Two-stage processing** (`materials.md`), works slots at stations, recipes as standing-gated knowledge.
7. **Field stock and regrowth; pirate and patrol weights** from traffic and witnessed crime.
8. **Events** as changes to appetites and weights with a duration: strike, Relay outage, comet fall, storm season.
9. **Command ships and wings** (`fleet.md`), already parked.
10. **Sovereignty**, later, as Relay ownership.

## Open (for Jason)

- The five rungs and their names: keep, rename, or fewer?
- Claims: should a Registry claim exist at all, or is a field whoever's is there? It gives miners a reason to survey and a thing to fight over, but it is paperwork.
- Recipes as copyable knowledge: fun, or a way for one pilot to collapse a maker's value overnight in a shared world?
- Pay multiples: roughly tripling per rung is a proposal; the lead tunes by play.
- Should crime at rung 4 and 5 have its own ladder (a pirate's standing with fences and clans), or stay purely as record?
- Events: which ones first? The Belt strike is already lore; the Relay outage is the one that teaches the security system.
