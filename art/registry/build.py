"""Rebuild the Spacegame ship registry page from the fleet list.

Reads the old page for its CSS, the SVG defs and symbols, and the viewer
script; replaces the data, the grid and the lineups with the post-pivot
fleet (docs/fleet.md). Draft hulls get a dashed class placeholder symbol.
"""
import html
import json
import re
import sys
import kod, vantage, mars, older, specops, venus, indep, belt, civil, beltciv, venciv, pass4, pass5, aurel, fitting

SRC = sys.argv[1]
OUT = sys.argv[2]
t = open(SRC).read()

# ---------------------------------------------------------------- old parts
head = t[: t.index("<body>") + len("<body>")]
defs_start = t.index('<svg width="0" height="0"')
defs_end = t.index("</svg>", t.index("</defs>")) + len("</svg>")
artblock = t[defs_start:defs_end]
script = t[t.index("const order = ["): t.index("</script>")]
old_ships = json.loads(re.search(r"const SHIPS = (\{.*?\});\n", t, re.S).group(1))

head = head.replace("</style>", ".chip.gen{opacity:.72;border-style:dashed} .chip.t3{border-style:double;border-width:3px} #marks a{color:inherit;text-decoration:underline dotted} .tier-cell{width:108px;vertical-align:top;padding:6px 8px;border-right:1px solid var(--line);white-space:normal} .tier-cell .row-sub{font-size:10px;line-height:1.25} .tier-col{width:108px} .grid th[scope=row]{white-space:normal;overflow-wrap:anywhere} tr:not(.maker-first) .tier-cell{border-top:1px dashed var(--line)}</style>", 1)
head = head.replace(".grid { border-collapse: collapse; width: 100%; min-width: 1180px; table-layout: fixed; }",
                    ".grid { border-collapse: collapse; width: 100%; min-width: 1180px; table-layout: fixed; }\n.grid.civil { min-width: 1080px; }\n.marks { margin: 10px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }\n.marks .cap { display: inline; margin-right: 6px; }\n.chip.draft svg { opacity: 0.8; }")

# Retire Oru art; drop Paragon and Halo rows (no hulls).
RETIRED_KEYS = {"oru-light", "oru-heavy", "oru-miner"}

# ---------------------------------------------------------------- powers
POWERS = {
    "earth": ("Earth", "#5b8fc7", "The corporate core. Steel blue and white, sleek wedges, clean panels and seams. Missiles, shields and electronic warfare; shield tank."),
    "mars": ("Mars", "#c9654a", "Disciplined and dutiful. Rust red and bone, symmetrical, armour plates, hard edges. Energy weapons; armour tank."),
    "venus": ("Venus", "#d9c07a", "Cloud cities. Pale gold and green, smooth curves, domes. Hybrids, drones, repair; a regenerative mix."),
    "belt": ("The Belt", "#c8642e", "Cooperatives and clans. Rust and gunmetal, asymmetric, exposed trusses, patched plating, hazard stripes. Projectile guns; whatever tank the hull came with."),
    "indep": ("Independents", "#e8c547", "No flag. Licensed by the Ceres Registry, based at Accord free ports, selling civil and combat hulls to anyone at any size. No Navy tag, no licence."),
    "aurel": ("The Aurel", "#cfefff", "Alien and receded. Pale white with a cyan glow, floating segments that do not quite touch. Every ship a voice; sealed and unrefittable."),
}

# Builders: key -> (name, power, blurb)
BUILDERS = [
    ("kessari", "Kessari Orbital Defence", "earth", "Earth's naval yard: the Earth Charter Fleet and the toll patrols. Legal and enforcement names."),
    ("tessaract", "Tessaract Logistics", "earth", "Earth's freight line: cargo and passengers at every size. Freight paperwork names."),
    ("vantage", "Vantage Aerospace", "earth", "Luna. Builds Earth's fighters and no hulls; names its craft for blades. The Foil is sold openly, so the UDF and pirates fly it too."),
    ("seraphine", "Seraphine Naval Yards", "mars", "The Martian Republic Navy's yard; sells nothing to anyone else. Martian places for the big ships, virtues for the small."),
    ("arcadia", "Arcadia Works", "mars", "Mars's state yard: civilian hulls named what they are and Mk-numbered. One hull per job, no brands."),
    ("ishtar", "Ishtar Fleet Works", "venus", "The Space Guard's yard. Venus highlands for the hulls; its guns are replies. No battleships."),
    ("solace", "Solace Medical", "venus", "Support, repair and rescue, protected everywhere by the Mercy Clause."),
    ("halden", "Halden Institute", "venus", "Survey and exploration hulls full of instruments."),
    ("arbor", "Arbor Dynamics", "venus", "Venus's drone house, and one tender to carry them."),
    ("lavinia", "Lavinia Atmospherics", "venus", "Venus's civil yard: gas skimmers, tankers and the Cyclone, a skimmer carrier. Named for a lowland; hulls for winds. Agreed 7 November."),
    ("union", "Union Defence Works", "belt", "The Belt's refit shop, not a yard: the Union pattern is a UDF standard applied to captured, bought or copied hulls. Strike words. The UDF is a rota; the UDF tag is a shift, not a possession."),
    ("beltforge", "Belt Forge Collective", "belt", "The best mining kit in known space and the hulls that carry it, with spare mounts and no questions asked."),
    ("rookrivet", "Rook and Rivet", "belt", "The Belt's salvage firm: tugs, tenders and shipbreakers."),
    ("clans", "The clans", "belt", "Vesk, Saro and the Long Wake. Bespoke hulls built over generations; no two alike."),
    ("meridian", "Meridian Yards", "indep", "Independent. The small civilian ships everyone starts in, and armed utility for anyone with a licence. Seabird names. Registry grey with one safety-yellow stripe."),
    ("corvane", "Corvane Heavy Industries", "indep", "Independent: Earth money, Belt yards, nobody's flag. Heavy ore haulage and refining, and the corporate security that guards it. Dark steel and industrial orange."),
    ("aurel", "Aurel", "aurel", "No yards and no companies. Every ship is a voice: white, hyper-modern, a collection of parts held apart by field, nothing touching. All T3, beyond human."),
    ("unsung", "The Unsung", "aurel", "The broken voices, caged in the Dark. The same shapes gone wrong: bone plate, a violet voice, segments drifting and missing. The hollow ships."),
]

MIL = [("pod", "Pod", "Escape pods and lifeboats."), ("craft", "Subcraft", "Crewed small craft carried in bays, flown by NPC crews: fighters, mining, salvage and rescue subcraft. Not a class in the game yet."),
       ("corvette", "Corvette", "Small, quick, lightly armed. The Tern is a corvette sold civilian-grade."), ("patrol", "Patrol boat", "A small warship for patrol and escort."),
       ("frigate", "Frigate", "A heavier small warship."), ("destroyer", "Destroyer", "The workhorse warship."), ("cruiser", "Cruiser", "Built to stand in a battle line."),
       ("battleship", "Battleship", "The line's anchor."), ("carrier", "Carrier", "Squadrons aboard."), ("dreadnought", "Dreadnought", "A flagship with station services aboard.")]
CIV = [("light", "Light civil", "Couriers, shuttles and taxis."), ("cargo", "Cargo", "Haulers and freighters."), ("bulk", "Bulk", "Bulk freighters and superfreighters."),
       ("passenger", "Passenger", "Ferries, buses and liners."), ("mining", "Mining", "Prospectors, miners and barges."), ("industry", "Industry", "Refinery and factory ships."),
       ("service", "Service", "Tugs, tenders, salvage, survey and exploration."), ("drone", "Drone", "Uncrewed craft launched from a bay."), ("voice", "Voice", "The Aurel, whose ships fit no human class.")]
CLASSES = {k: n for k, n, _ in MIL + CIV}
MIL_WEIGHT = {"corvette": "Light", "patrol": "Medium", "frigate": "Medium", "destroyer": "Heavy", "cruiser": "Super-heavy", "battleship": "Super-heavy", "carrier": "Capital", "dreadnought": "Capital", "pod": "Pod", "craft": "Subcraft", "drone": "Drone", "voice": "Voice"}
CIV_WEIGHT = {
  "tes-docket": "Light", "bf-pony": "Light", "arc-courier": "Light", "arc-shuttle": "Light", "mer-gull": "Light", "mer-petrel": "Light",
  "tes-waybill": "Medium", "bf-mule": "Medium", "mer-skua": "Medium", "arc-hauler": "Medium", "tes-timetable": "Medium", "mer-fulmar": "Medium", "arc-ferry": "Medium",
  "tessaract-spine": "Heavy", "bf-adit": "Heavy", "arc-freighter": "Heavy", "tes-itinerary": "Heavy",
  "tes-lading": "Super-heavy", "cor-dray": "Super-heavy", "arc-bulk": "Super-heavy", "tes-passage": "Super-heavy", "tes-consignment": "Capital",
  "rookrivet-prospector": "Light", "lav-zephyr": "Light", "lav-gale": "Medium", "lav-monsoon": "Heavy", "lav-cyclone": "Capital", "tes-tariff": "Heavy", "arc-ice": "Heavy", "bf-auger": "Medium", "bf-cistern": "Heavy", "bf-burrow": "Light", "cor-still": "Capital", "mer-grebe": "Medium", "rookrivet-breacher": "Medium", "rookrivet-hulk": "Heavy", "bf-winder": "Super-heavy", "cor-smelter": "Super-heavy", "cor-foreman": "Super-heavy", "bf-headframe": "Capital",
  "rr-shunt": "Light", "rr-scrapper": "Light", "rr-wrecker": "Medium", "arc-tug": "Medium", "lw-trawl": "Heavy", "lw-keel": "Medium", "rr-breaker": "Super-heavy",
  "sol-respite": "Light", "sol-haven": "Medium", "arc-tender": "Medium", "sol-refuge": "Heavy", "sol-sanctuary": "Super-heavy",
  "hal-query": "Light", "hal-inquiry": "Medium", "saro-waystar": "Medium", "hal-expedition": "Heavy", "saro-farwalker": "Heavy", "arb-canopy": "Medium",
}
RADIUS_W = {"Light": 16, "Medium": 28, "Heavy": 42, "Super-heavy": 72, "Capital": 150}
MILCOLS = {k for k, _, _ in MIL}

# Placeholder radii by column, for the lineups and the viewer.
RADIUS = {"pod": 6, "craft": 6, "corvette": 18, "patrol": 25, "frigate": 34, "destroyer": 42, "cruiser": 70, "battleship": 100, "carrier": 150, "dreadnought": 190,
          "light": 16, "cargo": 30, "bulk": 70, "passenger": 40, "mining": 30, "industry": 80, "service": 24, "drone": 5, "voice": 20}

# Fleet: (key, builder, col, name, job, character, status, extra)
# status: game | named | draft | clan.  extra: dict with marks (legacy), patterns, art key to reuse, size.
F = []
def add(key, b, col, name, job, char, status="draft", **x):
    F.append(dict(key=key, builder=b, col=col, name=name, job=job, char=char, status=status, **x))

# Earth: Kessari Orbital Defence
add("kes-citation", "kessari", "corvette", "Kessari Citation", "Fast interceptor and toll runner", "The hull that catches a dark ship before it reaches the gate", legacy=("Kessari Notice", "Sold off by the toll patrols when the Citation came in"), patterns=[("Pursuit pattern", "Interceptor: afterburners and a tackle fit, little else")])
add("warrant", "kessari", "patrol", "Kessari Warrant", "Toll patrol and escort", "Pirates prize captured ones as trophies", "game", art="warrant", legacy=("Kessari Writ", "Sold off in bulk; the Black Strike's other favourite"), patterns=[("Toll pattern", "Electronic warfare and sensors; stops ships without shooting them")])
add("kessari-brig", "kessari", "frigate", "Kessari Injunction", "Missile frigate, the Earth Charter Fleet's backbone", "Keeps you where it wants you", "game", art="kessari-brig", legacy=("Kessari Decree", "A few in private hands, most in Earth's reserve"), patterns=[("Siege pattern", "Torpedo tubes in place of launchers; slow, brutal")])
add("kes-verdict", "kessari", "destroyer", "Kessari Verdict", "Heavy missile destroyer", "Ends arguments", patterns=[("Picket pattern", "PDC coverage for the line; a swarm's nightmare")])
add("kes-statute", "kessari", "cruiser", "Kessari Statute", "Line cruiser", "The law, in bulk")
add("kes-precedent", "kessari", "battleship", "Kessari Precedent", "The Earth Charter Fleet's heaviest line ship", "Earth has never lost one and intends to keep it that way")
add("kes-mandate", "kessari", "carrier", "Kessari Mandate", "Drone and fighter carrier", "Launches the contract and lets it do the work")
add("kes-charter", "kessari", "dreadnought", "Kessari Charter", "The Earth Charter Fleet's flagship", "Named for the document everything else is built on")
add("kes-light", "vantage", "craft", "Vantage Foil", "Light fighter", "A steel-blue dart with white chevrons, twin nose guns, one engine. Sold openly.", art="kes-light")
add("kes-heavy", "vantage", "craft", "Vantage Sabre", "Heavy fighter", "The Foil's bigger brother, with missiles. Behind a licence.", art="kes-heavy")
# Earth: Tessaract
add("tes-docket", "tessaract", "light", "Tessaract Docket", "Courier", "Earth's courier, a shade quicker than a Tern and softer", legacy=("Tessaract Memo", "Cheap and everywhere"))
add("tes-waybill", "tessaract", "cargo", "Tessaract Waybill", "Hauler", "The workhorse of a trade triangle", legacy=("Tessaract Invoice", "The hauler every Marches trader started in"))
add("tessaract-spine", "tessaract", "cargo", "Tessaract Manifest", "Freighter, six bays", "On half the contracts in Accord space", "game", art="tessaract-spine", legacy=("Tessaract Ledger", "Four bays, not six, and nobody has ever scrapped one that still flew"), patterns=[("Deep-space pattern", "Long-range tanks, a nav suite and armour for the Marches and beyond")])
add("tes-lading", "tessaract", "bulk", "Tessaract Lading", "Bulk freighter", "Slow, deep, and a pirate's dream if it is alone", patterns=[("Convoy pattern", "PDCs and a tougher hull; sold to firms that lost a Lading")], legacy=("Tessaract Bill", "The bulk hull the Marches' ore moved in for a generation"))
add("tes-consignment", "tessaract", "bulk", "Tessaract Consignment", "Superfreighter (convoy command ship)", "Moves a station's worth of goods; never travels without escort")
add("tes-tariff", "tessaract", "bulk", "Tessaract Tariff", "Tanker", "Liquid and gas bulk for Earth; gas in, tolls out")
add("tes-timetable", "tessaract", "passenger", "Tessaract Timetable", "Ferry", "Earth's ferry; Meridian's Fulmar is the cheaper one", legacy=("Tessaract Almanac", "Slower, roomier, and the seats recline"))
add("tes-itinerary", "tessaract", "passenger", "Tessaract Itinerary", "Heavy bus, short-route liner", "The Marches run: a hundred seats and a bar")
add("tes-passage", "tessaract", "passenger", "Tessaract Passage", "Liner", "Comfort, speed and a tempting target")
# Mars: Seraphine
add("ser-deimos", "seraphine", "corvette", "Seraphine Deimos", "Picket and scout", "Small, fast and never alone", legacy=("Seraphine Deimos Mk I", "Sold to Martian colonies as picket boats"))
add("ser-phobos", "seraphine", "patrol", "Seraphine Phobos", "Patrol and escort", "The hull Martian patrols intercept dark ships in", legacy=("Seraphine Phobos Mk II", "The Navy's reserve; a Mk I is a museum piece"), patterns=[("Escort pattern", "Heavy armour, convoy work")])
add("ser-resolve", "seraphine", "frigate", "Seraphine Resolve", "Energy frigate", "Armour and lasers, no supply line", patterns=[("Vanguard pattern", "More guns, less armour; the ship that goes in first")])
add("ser-constancy", "seraphine", "destroyer", "Seraphine Constancy", "Energy destroyer", "Stands and keeps firing", patterns=[("Bastion pattern", "The thickest armour Mars builds; stands and does not move")])
add("ser-valles", "seraphine", "cruiser", "Seraphine Valles", "Line cruiser", "The Navy's workhorse heavy")
add("ser-tharsis", "seraphine", "battleship", "Seraphine Tharsis", "Line battleship", "The best big ship in known space, and Mars knows it")
add("carrier", "seraphine", "carrier", "Seraphine Hellas", "Fighter carrier", "Squadrons, not drones: Martian pilots fly. Drawn before the pivot as a Halcyon carrier; the spires become Martian.", art="carrier")
add("ser-olympus", "seraphine", "dreadnought", "Seraphine Olympus", "Flagship", "One exists. It has never fired in anger.")
add("hal-light", "arcadia", "craft", "Arcadia Fighter Mk V", "Light fighter", "A slender spire with swept blades and an energy emitter on each blade. Drawn before the pivot in ivory and gold; repaint to Mars.", art="hal-light")
add("hal-heavy", "arcadia", "craft", "Arcadia Heavy Fighter Mk II", "Heavy fighter", "The light fighter's armoured brother. Repaint to Mars.", art="hal-heavy")
# Mars: Arcadia
add("arc-shuttle", "arcadia", "light", "Arcadia Shuttle Mk III", "Shuttle", "Seats and straps", legacy=("Arcadia Shuttle Mk II", "Every Martian port's spare"))
add("arc-courier", "arcadia", "light", "Arcadia Courier Mk IV", "Courier", "Faster than it looks, and it looks like a brick", legacy=("Arcadia Courier Mk III", "Mars does not scrap"))
add("arc-hauler", "arcadia", "cargo", "Arcadia Hauler Mk III", "Hauler", "Every Martian colony has a hangar full of them", legacy=("Arcadia Hauler Mk II", "Every Martian colony has a hangar full of those too"))
add("arc-freighter", "arcadia", "cargo", "Arcadia Freighter Mk II", "Freighter", "Armoured where a Tessaract hull is roomy", legacy=("Arcadia Freighter Mk I", "Built to last forty years and did"), patterns=[("Navy pattern", "The Martian Republic Navy's own supply ship; armoured, PDCs")])
add("arc-ice", "arcadia", "bulk", "Arcadia Ice Hauler Mk II", "Ice hauler", "Polar ice to the Martian cities; water is a state matter", legacy=("Arcadia Ice Hauler Mk I", "Still hauling; Mars does not scrap"))
add("arc-miner", "arcadia", "mining", "Arcadia Miner Mk II", "Miner, medium", "The state's own cutter: armoured, slow, a small hold for its size. Mars never contracts its supply out", legacy=("Arcadia Miner Mk I", "Mars does not scrap; the colonies cut with these"))
add("arc-bulk", "arcadia", "bulk", "Arcadia Bulk Freighter Mk I", "Bulk freighter", "New, and already looks twenty years old")
add("arc-ferry", "arcadia", "passenger", "Arcadia Ferry Mk II", "Ferry", "Seats, straps and a schedule kept to the second")
add("arc-tug", "arcadia", "service", "Arcadia Tug Mk II", "Tug", "Every Martian port has a dozen")
add("arc-tender", "arcadia", "service", "Arcadia Tender Mk I", "Repair tender", "The one Martian civilian hull with a navy pattern", legacy=("Arcadia Tender Mk 0", "The only used repair hull anyone can buy; Solace's marks do not age"))
add("lav-zephyr", "lavinia", "mining", "Lavinia Zephyr", "Skimmer, small", "Upper-air gas skimming; the first skimmer anyone flies", legacy=("Lavinia Breeze", "Shallow only, comes back hot; every skimmer pilot's first"))
add("lav-gale", "lavinia", "mining", "Lavinia Gale", "Skimmer, medium", "Deeper skimming, a bigger hold; comes back hot")
add("lav-monsoon", "lavinia", "bulk", "Lavinia Monsoon", "Gas tanker", "Carries gas to the refineries; Venus's freight, finally")
add("lav-cyclone", "lavinia", "industry", "Lavinia Cyclone", "Skimmer carrier, capital (gas command ship)", "Its wing skims; it stores, refines, shields and commands. A city that breathes a planet through its children")
# Venus: Ishtar
add("ish-sedna", "ishtar", "corvette", "Ishtar Sedna", "Fast rescue and picket", "Reaches a pod before anyone else does", legacy=("Ishtar Sedna '218", "Handed down to Venusian rescue volunteers"))
add("ish-lakshmi", "ishtar", "patrol", "Ishtar Lakshmi", "Space Guard patrol and rescue escort", "Carries a Solace kit and a railgun, in that order", legacy=("Ishtar Lakshmi '205", "The Space Guard sells them with the guns removed"), patterns=[("Lifeline pattern", "Repair and shield transfer; a Solace kit built in")])
add("ish-maat", "ishtar", "frigate", "Ishtar Maat", "Hybrid frigate", "Answers from range", patterns=[("Longbow pattern", "Railguns and nothing else; answers from farther than anyone")])
add("ish-maxwell", "ishtar", "destroyer", "Ishtar Maxwell", "Hybrid destroyer", "The heaviest thing Venus will admit to owning")
add("ish-aphrodite", "ishtar", "cruiser", "Ishtar Aphrodite", "Rescue cruiser and command ship", "A hospital with railguns")
add("vae-light", "arbor", "drone", "Arbor Thorn", "Light combat drone", "Sold openly. Drawn before the pivot as a crewed Vael fighter; redraw uncrewed and in Venus colours.", art="vae-light")
add("vae-heavy", "arbor", "drone", "Arbor Bramble", "Heavy combat drone", "Heavier, slower, hits harder; behind standing. Drawn before the pivot as a crewed fighter; redraw uncrewed.", art="vae-heavy")
# Venus: Solace, Halden, Arbor
add("sol-respite", "solace", "service", "Solace Respite", "Tender, small", "Flies with a wing and keeps it alive")
add("sol-haven", "solace", "service", "Solace Haven", "Repair tender, medium", "The ship that fishes your pod out", patterns=[("Field pattern", "Armour over comfort; flies with the Space Guard into the Marches")])
add("sol-refuge", "solace", "service", "Solace Refuge", "Repair ship, heavy", "Rebuilds a frigate in the field")
add("sol-sanctuary", "solace", "service", "Solace Sanctuary", "Hospital ship, large (SAR command ship)", "Attacking one is the crime every power hunts")
add("sol-stretcher", "solace", "craft", "Solace Stretcher", "Heavy SAR fighter", "Sold to every navy under the Mercy Clause; flies from everyone's bays")
add("ish-hathor", "ishtar", "craft", "Ishtar Hathor", "Light fighter", "The Space Guard's fighter; a volcano's name on a very small ship")
add("hal-query", "halden", "service", "Halden Query", "Survey ship, small", "More sensor than ship", legacy=("Halden Footnote", "One dish, no lab; the prospector's cheap scanner"))
add("hal-inquiry", "halden", "service", "Halden Inquiry", "Survey ship, medium", "What Novum expeditions borrow")
add("hal-expedition", "halden", "service", "Halden Expedition", "Explorer, large (exploration command ship)", "Built for the Dark, and the Shoals one day")
add("arb-shoot", "arbor", "drone", "Arbor Shoot", "Repair drone", "A Solace repair kit on a thruster frame; no cockpit, no wings")
add("arb-tendril", "arbor", "drone", "Arbor Tendril", "Collector drone", "Gathers cut ore, ice blocks and loose salvage for the mother ship; the drone every mining wing assumes")
add("hal-probe", "halden", "drone", "Halden Probe", "Survey drone, one-shot", "Launched from a bay, reads a system and does not come back; the Expedition's wing")
add("arb-canopy", "arbor", "service", "Arbor Canopy", "Drone tender, medium", "A civilian hull that fights like a small carrier")
# Belt: Union
add("uni-wildcat", "union", "corvette", "Union Wildcat", "Fast raider and picket; Union pattern over a Kessari Notice", "A wildcat strike: sudden, unofficial, over before the bosses arrive")
add("uni-blockade", "union", "patrol", "Union Blockade", "UDF patrol; Union pattern over a Kessari Writ", "Holds a lane shut", patterns=[("Raider pattern", "Afterburners, projectile guns, no shields worth the name; the Black Strike's dream")])
add("uni-boycott", "union", "frigate", "Union Boycott", "Projectile frigate; Union pattern over a Kessari Decree", "Refuses to deal", patterns=[("Picket pattern", "PDCs and flak for the UDF's rotas")])
add("walkout", "union", "destroyer", "Union Walkout", "Heavy gun destroyer; Union pattern over a Kessari Ruling", "Rebuilt so far that Earth no longer recognises it; everyone walks out together", "game", art="walkout")
add("uni-general-strike", "union", "carrier", "Union General Strike", "Carrier; Union pattern over a Belt Forge Headframe (UDF command ship)", "An industrial capital refitted for war: hangars where the hoppers were, gun decks on the frames. When the Belt brings everyone out", base="bf-headframe")
add("uni-solidarity", "union", "cruiser", "Union Solidarity", "Line cruiser; Union pattern over a Statute-generation Earth cruiser", "Rebuilt once, by every cooperative at once, for the Gate War. Three exist.")
add("bel-light", "union", "craft", "Vantage Dirk, UDF refit", "Light fighter; Union pattern over a Vantage Dirk", "A second-hand Dirk as the UDF flies it: Belt paint, Belt guns, a frame with an engine", art="bel-light")
add("bel-heavy", "union", "craft", "Vantage Cutlass, UDF refit", "Heavy fighter; Union pattern over a Vantage Cutlass", "A stolen or surplus Cutlass with more of everything bolted on", art="bel-heavy")
# Belt: Belt Forge
add("bf-pony", "beltforge", "light", "Belt Forge Pony", "Courier", "A pit pony: small, stubborn, goes anywhere", legacy=("The old Pony", "Nobody has ever thrown one away"))
add("bf-mule", "beltforge", "cargo", "Belt Forge Mule", "Hauler", "A Belter's answer to the Waybill: uglier, tougher, cheaper", legacy=("The old Mule", "See the Pony"))
add("bf-adit", "beltforge", "cargo", "Belt Forge Adit", "Freighter", "Named for a mine's entrance; a Belt freighter with teeth", legacy=("The old Adit", "Four bays, patched twice"))
add("bf-auger", "beltforge", "mining", "Belt Forge Auger", "Ice miner, medium", "Cuts ice in the outer Belt; where the rock runs out, the ice begins")
add("bf-rime", "beltforge", "mining", "Belt Forge Rime", "Ice cutter, light", "A Prospector frame with an ice saw in place of the laser; the first ice anyone cuts", legacy=("The old Rime", "A saw on a frame; there is not much to wear out"))
add("bf-cistern", "beltforge", "bulk", "Belt Forge Cistern", "Ice hauler", "Water to the habitats; water is the Belt's money")
add("bf-burrow", "beltforge", "light", "Belt Forge Burrow", "Courier, blockade runner", "Fast, quiet, a hidden hold as standard; nobody asks what a Burrow carries")
add("rookrivet-prospector", "beltforge", "mining", "Belt Forge Prospector", "Prospector", "The lone digger looking for a strike", "game", art="rookrivet-prospector", legacy=("The old Prospector", "Belters do not throw ships away"))
add("rookrivet-breacher", "beltforge", "mining", "Belt Forge Sinker", "Miner, medium", "Shaft sinkers dug the deep, dangerous bores", "game", art="rookrivet-breacher", legacy=("The old Sinker", "Breaches like the new one, carries less"), patterns=[("Breaching pattern", "Two shotfirer rigs and a Sounder; the knot hunter")])
add("rookrivet-hulk", "beltforge", "mining", "Belt Forge Collier", "Barge", "Big, slow, filthy, and it keeps the world warm", "game", art="rookrivet-hulk", patterns=[("Deep pattern", "Long-range tanks and bunkers; mines where the patrols do not go")], legacy=("The old Collier", "Carries less, breaks less"))
add("bf-winder", "beltforge", "industry", "Belt Forge Winder", "Refinery ship, large", "A winding engine for the whole field")
add("bf-headframe", "beltforge", "industry", "Belt Forge Headframe", "Mining carrier, capital (mining command ship)", "The frame over the shaft; the Belt's answer to a station")
add("rookrivet-drone", "beltforge", "drone", "Belt Forge Knocker", "Mining drone", "In the old mines knockers were spirits heard tapping at the rock face", "game", art="rookrivet-drone")
add("bel-miner", "beltforge", "craft", "Belt Forge Jackleg", "Mining subcraft", "A cab on a frame: mining laser on a forward boom, grab arms, an open ore skip aft. Mining mounts only.", art="bel-miner")
# Belt: Rook and Rivet
add("rr-shunt", "rookrivet", "service", "Rook and Rivet Shunt", "Tug", "Moves anything, slowly")
add("rr-scrapper", "rookrivet", "service", "Rook and Rivet Scrapper", "Salvage tender, small", "Cuts, grabs, leaves", legacy=("The old Scrapper", "Half of them are made of other Scrappers"))
add("rr-wrecker", "rookrivet", "service", "Rook and Rivet Wrecker", "Salvage tender, medium", "Takes the wreck, not the parts")
add("rr-gantry", "rookrivet", "service", "Rook and Rivet Gantry", "Salvage tender, heavy", "Two cranes, a hull cradle and a Grab bay; the step between taking parts and taking ships")
add("rr-breaker", "rookrivet", "industry", "Rook and Rivet Breaker", "Shipbreaker, large (salvage command ship)", "Where ships go to become Patchplate")
add("rr-grab", "rookrivet", "craft", "Rook and Rivet Grab", "Salvage subcraft", "Cutters and claws on a cab; launched from Wreckers and Breakers")
# Belt: clans
add("vesk-vane", "clans", "corvette", "Vesk Vane", "Stealth raider and escort", "Black hull, red vanes; cold-coasts better than anything humans build", "clan")
add("vesk-shade", "clans", "frigate", "Vesk Shade", "Stealth raider", "A stealth raider with a destroyer's teeth", "clan")
add("saro-farwalker", "clans", "service", "Saro Farwalker", "Explorer, large", "The hull that crossed the Shoals", "clan")
add("saro-waystar", "clans", "service", "Saro Waystar", "Survey ship", "Charting: finds lanes nobody else can", "clan")
add("lw-trawl", "clans", "service", "Long Wake Trawl", "Recovery tender, heavy", "Trailing cables and nets; finds what everyone else gave up", "clan")
add("lw-keel", "clans", "service", "Long Wake Keel", "Salvage tender", "Brings back whole what others bring back in pieces", "clan")
add("dri-light", "clans", "craft", "Vesk light raider", "Light raider", "A spar with a ring round the cockpit and two red vanes; twin guns", "clan", art="dri-light")
add("dri-heavy", "clans", "craft", "Vesk heavy raider", "Heavy raider", "Two spars and a heavier ring; the clans' answer to a heavy fighter", "clan", art="dri-heavy")
add("dri-miner", "clans", "craft", "Long Wake Dredge", "Salvage subcraft", "A cab and a net on a spar", "clan", art="dri-miner")
# Everywhere: Meridian
add("escape-pod", "meridian", "pod", "Meridian Ark", "The lifeboat every registered ship carries", "Carries what matters out of the flood", "game", art="escape-pod")
add("tern", "meridian", "corvette", "Meridian Tern", "The Registry-issue starter; a courier", "Crosses oceans on almost nothing", "game", art="tern", legacy=("Meridian Knot", "Thirty years of Registry issue; half the Marches learned to fly in one"), patterns=[("Courier pattern", "Faster, lighter, one less mount; Meridian's only pattern")])
add("mer-gull", "meridian", "light", "Meridian Gull", "Shuttle", "Cheap, slow, everywhere", legacy=("Meridian Auk", "Still on half the station hops in Sol"))
add("mer-petrel", "meridian", "light", "Meridian Petrel", "Taxi", "What a pilot flies when the fare is in a hurry", legacy=("Meridian Shearwater", "The taxi before the taxi"))
add("mer-fulmar", "meridian", "passenger", "Meridian Fulmar", "Bus or ferry", "The commuter run between a world's port and its moon", legacy=("Meridian Puffin", "The commuter run's old bus"))
add("mer-dunlin", "meridian", "mining", "Meridian Dunlin", "Prospector", "The first miner anyone buys, sold everywhere: a Gull box with a light laser and a small ore hold; outgrown fast")
add("mer-skua", "meridian", "cargo", "Meridian Skua", "Hauler", "The first step up from a Tern for a trader", legacy=("Meridian Gannet", "Slower, roomier, and nobody minds"))
add("mer-kite", "meridian", "corvette", "Meridian Kite", "Armed courier", "The first ship an outfit buys that can shoot back")
add("mer-harrier", "meridian", "patrol", "Meridian Harrier", "Gunboat", "Every outfit's security starts with a pair of these")
add("mer-osprey", "meridian", "frigate", "Meridian Osprey", "Armed hauler, the Q-ship", "Looks like a Skua until it opens")
add("mer-shrike", "meridian", "patrol", "Meridian Shrike", "Bounty hull", "Civilian tackle, a pod bay and a cell; brings them in, hull or pod")
add("mer-grebe", "meridian", "service", "Meridian Grebe", "Tug", "The open-market tug; pushes anything for a fee")
# Everywhere: Corvane
add("cor-dray", "corvane", "bulk", "Corvane Dray", "Bulk ore freighter", "The ore truck the Black Strike hunts hardest", legacy=("The old Dray", "Corvane sells them off when the furnaces no longer want them; the Black Strike buys"))
add("cor-pithead", "corvane", "mining", "Corvane Pithead", "Miner, heavy", "Two heavy lasers, breach kit, a sorting hopper and guns; Earth's mining, done by the nearest thing Earth has to a mining navy")
add("cor-smelter", "corvane", "industry", "Corvane Smelter", "Refinery ship, large", "A piece of Lantern Works that flies")
add("cor-warden", "corvane", "destroyer", "Corvane Warden", "Corporate security escort", "Paid by the tonne it brings home")
add("cor-bulwark", "corvane", "cruiser", "Corvane Bulwark", "Corporate security, a mining fleet's bodyguard (security command ship)", "The biggest ship you can buy without a flag")
add("cor-foreman", "corvane", "industry", "Corvane Foreman", "Factory ship, armed", "Refines under fire and does not stop")
add("cor-still", "corvane", "industry", "Corvane Still", "Skimmer carrier, capital (gas command ship)", "Corvane's answer to the Cyclone, uglier; its wing skims, it holds the line")
add("cor-miner", "corvane", "craft", "Corvane Navvy", "Mining subcraft", "The civilian one: a rounded cab, a laser on the roof, an ore pod each side, nothing that can fight", art="cor-miner")
# Aurel
add("aurel-tacet", "aurel", "voice", "Aurel Tacet", "The sealed development and test ship", "A voice that never sang", "voice", art="aurel-tacet")
for (k, bb, col, name, job, char) in aurel.ENTRIES: add(k, bb, col, name, job, char, "voice")
CIV_WEIGHT.update(aurel.WEIGHT)

# ---------------------------------------------------------------- data for the page
STATUS = {"game": "In game", "named": "Named", "draft": "Draft, not in game", "clan": "Clan hull, draft", "legacy": "Legacy mark, draft", "surplus": "Retired navy, draft", "t3": "Special operations, draft", "voice": "A voice, draft"}
GAP_LEGACY = [
    ("arc-miner-mk1", "arcadia", "mining", "Arcadia Miner Mk I", "Miner, legacy", "Mars does not scrap; the colonies cut with these", "legacy", "arc-miner"),
    ("arc-tender-mk0", "arcadia", "service", "Arcadia Tender Mk 0", "Repair tender, legacy", "The only used repair hull anyone can buy; Solace's marks do not age", "legacy", "arc-tender"),
    ("lav-breeze", "lavinia", "mining", "Lavinia Breeze", "Skimmer, legacy", "Shallow only, comes back hot; every skimmer pilot's first", "legacy", "lav-zephyr"),
    ("bf-rime-old", "beltforge", "mining", "The old Rime", "Ice cutter, legacy", "A saw on a frame; there is not much to wear out", "legacy", "bf-rime"),
    ("hal-footnote", "halden", "service", "Halden Footnote", "Survey ship, legacy", "One dish, no lab; the prospector's cheap scanner", "legacy", "hal-query"),
]
CIV_WEIGHT.update({"mer-dunlin": "Light", "cor-pithead": "Heavy", "arc-miner": "Medium", "bf-rime": "Light", "rr-gantry": "Heavy",
                   "arc-miner-mk1": "Medium", "arc-tender-mk0": "Medium", "lav-breeze": "Light", "bf-rime-old": "Light", "hal-footnote": "Light"})
for (k, bb, col, name, job, char, gen, base) in older.ENTRIES + venus.ENTRIES + civil.ENTRIES + beltciv.ENTRIES + pass4.ENTRIES + GAP_LEGACY: add(k, bb, col, name, job, char, gen, base=base)
CIV_WEIGHT.update(civil.LEGACY_WEIGHT); CIV_WEIGHT.update(beltciv.LEGACY_WEIGHT); CIV_WEIGHT.update(pass4.LEGACY_WEIGHT)
T3 = [
    ("kes-summons", "kessari", "frigate", "Kessari Summons", "Watcher", "You never see the one that found you"),
    ("kes-custody", "kessari", "cruiser", "Kessari Custody", "Hunter", "Grabs and calls for backup"),
    ("kes-sentence", "kessari", "battleship", "Kessari Sentence", "Striker", "Committed the moment it lands"),
    ("ser-noctis", "seraphine", "frigate", "Seraphine Noctis", "Watcher", "Named for the labyrinth of night; cold, quiet, always there"),
    ("ser-cerberus", "seraphine", "cruiser", "Seraphine Cerberus", "Hunter", "The dog that holds"),
    ("ser-medusae", "seraphine", "battleship", "Seraphine Medusae", "Striker", "Elite crews, no armour to speak of, no second pass"),
    ("ish-hecate", "ishtar", "cruiser", "Ishtar Hecate", "Hunter", "The one Venus cannot account for; nobody has seen it twice"),
]
for (k, bb, col, name, job, char) in T3: add(k, bb, col, name, job, char, "t3", role=job.lower())
CIVT3 = [
    ("tes-covenant", "tessaract", "bulk", "Tessaract Covenant", "Prototype superfreighter", "A hold that survives the ship: Lattice-laced frame", "Capital"),
    ("arc-mk0", "arcadia", "bulk", "Arcadia Prototype Mk 0", "Prototype bulk freighter", "Slower, armoured, refines in transit; gate-glass heat exchangers", "Super-heavy"),
    ("lav-tempest", "lavinia", "mining", "Lavinia Tempest", "Prototype skimmer", "Skims below the death line and comes back; a Lattice heat sink", "Heavy"),
    ("bf-lodestar", "beltforge", "industry", "Belt Forge Lodestar", "Prototype mining carrier", "Its wing cuts pockets scanners read as empty: platinum and rare earths in Sol, gate-glass where it exists; a gate-glass resonator", "Capital"),
    ("rr-lazarus", "rookrivet", "service", "Rook and Rivet Lazarus", "Prototype recovery tender", "Brings back a hulk nothing else can tow, and its crew; a Lattice tether", "Heavy"),
    ("sol-grace", "solace", "service", "Solace Grace", "Prototype hospital ship", "Keeps a fleet alive under fire; regen nanites grown on Lattice seed", "Super-heavy"),
    ("hal-threshold", "halden", "service", "Halden Threshold", "Prototype explorer", "Reads a broken gate; built to cross the Shoals if a drive ever exists; gate-glass sensors", "Heavy"),
    ("arb-grove", "arbor", "service", "Arbor Grove", "Prototype drone tender", "Runs a swarm nothing else can control; a Lattice control lattice", "Capital"),
    ("cor-colossus", "corvane", "industry", "Corvane Colossus", "Prototype mining carrier (command ship)", "Parks at the field edge and processes what its wing and fleet bring in faster than anything human; furnaces lined with gate-glass", "Capital"),
]
for (k, bb, col, name, job, char, w) in CIVT3:
    add(k, bb, col, name, job, char, "t3", role="prototype"); CIV_WEIGHT[k] = w
for s in F:
    if s["key"] == "vesk-vane": s["role"] = "watcher"; s["job"] = "Watcher; stealth raider and escort"
    if s["key"] == "vesk-shade": s["role"] = "striker"; s["job"] = "Striker; stealth raider"
ships = {}
for s in F:
    old = old_ships.get(s.get("art", ""), None)
    b = dict(BUILDERS_MAP := {k: (n, p, bl) for k, n, p, bl in BUILDERS}).get(s["builder"])
    pname, power, _ = b
    entry = {
        "key": s["key"], "id": old["id"] if old and old.get("id") else None, "race": s["builder"], "power": power,
        "name": s["name"], "working": False, "status": STATUS[s["status"]] + (", drawn" if old and old.get("art") else (", today's outline" if old else "")),
        "art": bool(old and old.get("art")), "maker": pname, "cls": s["col"], "type": s["job"],
        "size": old["size"] if old else "", "radius": old["radius"] if old else RADIUS[s["col"]],
        "aspect": old["aspect"] if old else 0.6, "notes": [s["char"]] + (old["notes"] if old and old.get("art") else []),
        "facts": old.get("facts") if old else None,
        "legacy": list(s["legacy"]) if s.get("legacy") else None,
        "patterns": s.get("patterns") or None,
        "base": s.get("base"), "gen": s["status"] if s["status"] in ("legacy", "surplus") else None,
        "tier": 1 if s["status"] in ("legacy", "surplus") else (3 if s["status"] in ("clan", "t3", "voice") else 2), "role": s.get("role"),
        "command": "command ship" in s["job"],
        "navy": (bool(b[2] and s["col"] in MILCOLS and s["col"] not in ("drone", "pod", "voice") and s["status"] != "legacy") or s["builder"] in ("vantage",) or s["key"] == "ish-hathor") and s["builder"] not in ("meridian", "corvane", "beltforge", "rookrivet") and "subcraft" not in s["job"].lower(),
    }
    col = s["col"]
    if col == "voice": w = CIV_WEIGHT.get(s["key"], MIL_WEIGHT[col])
    elif col in ("craft", "drone", "pod"): w = MIL_WEIGHT[col]
    elif col in MILCOLS: w = MIL_WEIGHT[col]
    else: w = CIV_WEIGHT.get(s["key"], "Unrated")
    fn = s["job"] if col in ("craft", "drone") else (CLASSES[col] if col in MILCOLS and col != "pod" else s["job"].split(",")[0])
    if col == "pod": fn = "Lifeboat"
    if col == "voice": fn = s["job"].split(";")[0].split(",")[0].replace("A dead voice", "Husk")
    if s.get("role") and s["role"] != "prototype": fn = s["role"].capitalize()
    if s.get("role") == "prototype": fn = "Prototype " + (s["job"].split("Prototype ")[-1].split(",")[0]).capitalize()
    if fn.lower().startswith(w.lower() + " "): fn = fn[len(w) + 1:].capitalize()
    entry["weight"] = w
    entry["tag"] = w + "-" + fn
    if not old and w in RADIUS_W: entry["radius"] = RADIUS_W[w]
    if s["status"] == "clan": entry["notes"].append("A clan hull: bespoke, rare, standing with the clan or a very rare sale.")
    ships[s["key"]] = entry

races = {}
for k, n, p, bl in BUILDERS:
    pn, col, look = POWERS[p]
    col = {"meridian": "#d8d2b8", "corvane": "#e07b2a"}.get(k, col)
    races[k] = {"id": k, "name": n, "colour": col, "look": bl + " " + pn + ": " + look, "maker": True, "power": pn}

# ---------------------------------------------------------------- KOD art
KOD_DEFS, KOD_SYMS, KOD_META = kod.all_art()
V_DEFS, V_SYMS, V_META = vantage.all_art()
M_DEFS, M_SYMS, M_META = mars.all_art()
O_DEFS, O_SYMS, O_META = older.all_art()
S_DEFS, S_SYMS, S_META = specops.all_art()
VE_DEFS, VE_SYMS, VE_META = venus.all_art()
I_DEFS, I_SYMS, I_META = indep.all_art()
BE_DEFS, BE_SYMS, BE_META = belt.all_art()
C_DEFS, C_SYMS, C_META = civil.all_art()
BC_DEFS, BC_SYMS, BC_META = beltciv.all_art()
VC_DEFS, VC_SYMS, VC_META = venciv.all_art()
P4_DEFS, P4_SYMS, P4_META = pass4.all_art()
P5_DEFS, P5_SYMS, P5_META = pass5.all_art()
AU_DEFS, AU_SYMS, AU_META = aurel.all_art()
KOD_DEFS += V_DEFS + M_DEFS + O_DEFS + S_DEFS + VE_DEFS + I_DEFS + BE_DEFS + C_DEFS + BC_DEFS + VC_DEFS + P4_DEFS + P5_DEFS + AU_DEFS; KOD_SYMS += V_SYMS + M_SYMS + O_SYMS + S_SYMS + VE_SYMS + I_SYMS + BE_SYMS + C_SYMS + BC_SYMS + VC_SYMS + P4_SYMS + P5_SYMS + AU_SYMS; KOD_META = {**KOD_META, **V_META, **M_META, **O_META, **S_META, **VE_META, **I_META, **BE_META, **C_META, **BC_META, **VC_META, **P4_META, **P5_META, **AU_META}
for k, m in KOD_META.items():
    e = ships[k]
    e["art"] = True
    e["radius"] = m["radius"]; e["aspect"] = m["aspect"]
    e["notes"] = [e["notes"][0]] + m["notes"]
    if m.get("civ"): e["civ"] = True
    base = e["status"].split(",")[0]
    e["status"] = base + ", drawn"
    if not e.get("size"): e["size"] = {"Light": "S", "Medium": "M", "Heavy": "L", "Super-heavy": "XL", "Capital": "XXL"}.get(e["weight"], "")
# strip the old warrant and injunction symbols
for k in ("warrant", "kessari-brig", "kes-light", "kes-heavy", "carrier", "hal-light", "hal-heavy", "bel-light", "bel-heavy", "tessaract-spine", "rookrivet-prospector", "rookrivet-breacher", "rookrivet-hulk", "rookrivet-drone", "aurel-tacet"):
    for lvl in ("full", "mid", "sil", "rim"):
        artblock = re.sub(r'<symbol id="s-%s-%s"[^>]*>.*?</symbol>' % (k, lvl), "", artblock, flags=re.S)
artblock = artblock.replace("</defs>", KOD_DEFS + "</defs>" + KOD_SYMS, 1)
artblock = artblock.replace(' filter="url(#glowSoft)"', "")

for _k, _e in ships.items(): _e["fit"] = fitting.fit_for(_e)

# ---------------------------------------------------------------- placeholders
PH = {
    "pod": "M 0 -6 A 6 6 0 1 1 0 6 A 6 6 0 1 1 0 -6 Z",
    "craft": "M 6 0 L -4 -4 L -6 0 L -4 4 Z",
    "corvette": "M 18 0 L 8 -8 L -14 -9 L -18 -5 L -18 5 L -14 9 L 8 8 Z",
    "patrol": "M 25 0 L -18 -10 L -25 -8 L -21 0 L -25 8 L -18 10 Z",
    "frigate": "M 34 0 L 10 -12 L -20 -16 L -30 -12 L -26 0 L -30 12 L -20 16 L 10 12 Z",
    "destroyer": "M 42 0 L 34 -12 L 12 -18 L -26 -18 L -40 -12 L -40 12 L -26 18 L 12 18 L 34 12 Z",
    "cruiser": "M 70 0 L 50 -16 L -40 -22 L -70 -14 L -70 14 L -40 22 L 50 16 Z",
    "battleship": "M 100 0 L 70 -22 L -60 -30 L -100 -18 L -100 18 L -60 30 L 70 22 Z",
    "carrier": "M 150 0 L 110 -30 L -110 -36 L -150 -24 L -150 24 L -110 36 L 110 30 Z",
    "dreadnought": "M 190 0 L 140 -40 L -140 -48 L -190 -30 L -190 30 L -140 48 L 140 40 Z",
    "light": "M 16 0 L 6 -7 L -12 -8 L -16 -4 L -16 4 L -12 8 L 6 7 Z",
    "cargo": "M 30 0 L 22 -9 L -24 -11 L -30 -6 L -30 6 L -24 11 L 22 9 Z",
    "bulk": "M 70 0 L 60 -20 L -60 -24 L -70 -14 L -70 14 L -60 24 L 60 20 Z",
    "passenger": "M 40 0 L 30 -8 L -32 -10 L -40 -5 L -40 5 L -32 10 L 30 8 Z",
    "mining": "M 30 0 L 18 -14 L -22 -14 L -30 -8 L -30 8 L -22 14 L 18 14 Z",
    "industry": "M 80 0 L 60 -26 L -60 -30 L -80 -20 L -80 20 L -60 30 L 60 26 Z",
    "service": "M 24 0 L 16 -10 L -18 -11 L -24 -6 L -24 6 L -18 11 L 16 10 Z",
    "drone": "M 5 0 L -3 -3 L -5 0 L -3 3 Z",
    "voice": "M 20 0 L 6 -8 L -4 -10 L -14 -6 L -20 0 L -14 6 L -4 10 L 6 8 Z",
}
def sym(key, col, rr=None):
    r = (rr or RADIUS[col]) * 1.06; vb = f'viewBox="{-r:.2f} {-r:.2f} {2*r:.2f} {2*r:.2f}"'; d = PH[col]
    return (f'<symbol id="s-{key}-full" {vb}><path d="{d}" fill="rgba(159,211,199,0.08)" stroke="#e0a458" stroke-width="1.2" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" stroke-linejoin="round"></path></symbol>'
            f'<symbol id="s-{key}-mid" {vb}><path d="{d}" fill="rgba(159,211,199,0.08)" stroke="#e0a458" stroke-width="1.2" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"></path></symbol>'
            f'<symbol id="s-{key}-sil" {vb}><path d="{d}" fill="currentColor" stroke="none"></path></symbol>'
            f'<symbol id="s-{key}-rim" {vb}><path d="{d}" fill="none" stroke="currentColor" stroke-width="1.2" vector-effect="non-scaling-stroke"></path></symbol>')
extra = "".join(sym(k, s["cls"], s["radius"]) for k, s in ships.items() if k not in old_ships and k not in KOD_META)
artblock = artblock.replace("</defs>", "</defs>" + extra, 1)

# ---------------------------------------------------------------- grid
def chip(s):
    cls = "chip" + (" draft" if not s["art"] and s["status"].startswith(("Draft", "Clan")) else "") + (" old" if not s["art"] and "outline" in s["status"] else "") + (" gen" if s.get("gen") else "")
    if s.get("civ"): cls += " civ"
    if s.get("tier") == 3: cls += " t3"
    short = s["name"].split(" ")[-1] if not s["name"].endswith(("fighter", "raider", "refit")) else s["type"].split(" ")[0]
    if s["name"].endswith("refit"): short = s["name"].split(" ")[1].rstrip(",") + " refit"
    if s["race"] == "arcadia": short = s["name"].replace("Arcadia ", "")
    if s["race"] == "seraphine" and " Mk " in s["name"]: short = s["name"].replace("Seraphine ", "")
    if s["race"] == "vantage": short = s["name"].replace("Vantage ", "")
    if s["name"].endswith("UDF refit"): short = s["name"].split(" ")[1].rstrip(",") + " refit"
    if s["name"].startswith("The old "): short = "Old " + s["name"][8:]
    col = races[s["race"]]["colour"]
    return (f'<a class="{cls}" href="#{s["key"]}" data-key="{s["key"]}" aria-label="{html.escape(s["name"])}, {html.escape(s["tag"])}" title="{html.escape(s["name"])} [{html.escape(s["tag"])}]">'
            f'<svg viewBox="0 0 10 10" aria-hidden="true"><use href="#s-{s["key"]}-mid" style="color:{col}"></use></svg><span>{html.escape(short)}</span></a>')

TIERNAME = {1: "legacy, retired navy", 2: "production, pattern", 3: "special ops, clan, voices"}

def table(cols, builders, klass):
    th = "".join(f'<th scope="col"{" class=\"wide\"" if k == "craft" else ""} title="{html.escape(tip)}"><span class="cls">{n}</span></th>' for k, n, tip in cols)
    rows = []
    last_power = None
    for k, n, p, bl in builders:
        mine = [s for s in ships.values() if s["race"] == k and s["cls"] in {c[0] for c in cols}]
        if not mine: continue
        col = POWERS[p][1]
        first = ' class="maker-first"' if p != last_power else ""
        last_power = p
        tiers = sorted({s["tier"] for s in mine})
        for ti, tier in enumerate(tiers):
            tmine = [s for s in mine if s["tier"] == tier]
            tds = "".join(f'<td><div class="chips">{"".join(chip(s) for s in tmine if s["cls"] == c[0])}</div></td>' for c in cols)
            if ti == 0:
                head = f'<th scope="row" rowspan="{len(tiers)}"><span class="swatch" style="background:{col}"></span><span style="color:{col}">{html.escape(n)}</span><div class="row-sub">{html.escape(POWERS[p][0])}</div></th>'
            else:
                head = ""
            rows.append(f'<tr{first if ti == 0 else ""} class="tier-row tier-{tier}"><th scope="row" class="tier-head"><span class="cap">T{tier}</span><div class="row-sub">{TIERNAME[tier]}</div></th>{head}{tds}</tr>' if False else f'<tr{first if ti == 0 else ""}>{head}<td class="tier-cell"><span class="cap">T{tier}</span><div class="row-sub">{TIERNAME[tier]}</div></td>{tds}</tr>')
    return f'<div class="grid-wrap"><table class="grid {klass}"><thead><tr><th scope="col" class="corner"><span class="cap">Builder / class</span></th><th scope="col" class="tier-col"><span class="cls">Tier</span></th>{th}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>'

legend = '<div class="legend" style="margin-top:10px"><span>Bright: drawn</span><span>Faded: today\'s in-game outline, not redrawn</span><span style="color:#e0a458">Dashed: a draft hull with no art, shown as its class placeholder</span><span>Click a chip to open it</span></div>'

def lineup(keys, title, scale, big):
    items = []
    for k in keys:
        s = ships[k]; r = s["radius"] * 1.06 * scale
        w = 2 * r; h = 2 * r * (s["aspect"] if big else 1)
        items.append(f'<a class="line-item" href="#{k}"><svg role="img" aria-label="{html.escape(s["name"])}" width="{w:.0f}" height="{h:.0f}" viewBox="{-r:.2f} {-h/2:.2f} {w:.2f} {h:.2f}"><use href="#s-{k}-mid" x="{-r:.2f}" y="{-r:.2f}" width="{w:.2f}" height="{w:.2f}"></use></svg><span class="hint">{html.escape(s["name"])}</span></a>')
    return f'<section class="panel"><h3 class="cap" style="margin:0">{title}</h3><div class="lineup"{" style=\"flex-wrap:wrap\"" if not big else ""}>{"".join(items)}</div></section>'

drawn_big = [k for k in ["kes-charter", "kes-mandate", "kes-precedent", "kes-statute", "carrier", "kes-verdict", "kessari-brig", "walkout", "warrant", "kes-citation", "tern"] if ships[k]["art"]]
craft = [k for k, s in ships.items() if s["cls"] in ("craft", "drone") and s["art"]]

body = f"""
{artblock}
<a id="top"></a>
<header>
  <h1>Ship registry</h1>
  <span class="cap">The fleet after the Sol pivot, from docs/fleet.md. Names are first draft; art exists for a few hulls only. Subcraft are crewed NPC small craft; drones are uncrewed.</span>
</header>
<div class="layout">
  <main>
    <section class="panel" aria-labelledby="h-mil"><h2 id="h-mil" class="cap" style="margin:0 0 10px">Military hulls and subcraft, by builder and class</h2>{table(MIL, BUILDERS, "mil")}{legend}</section>
    <section class="panel" aria-labelledby="h-civ"><h2 id="h-civ" class="cap" style="margin:0 0 10px">Civilian hulls, by builder and job</h2>{table(CIV, BUILDERS, "civil")}</section>
    <section id="detail" style="display:flex;flex-direction:column;gap:20px;scroll-margin-top:12px">
    <div class="ship-head"><a href="#top" class="cap" id="back">Back to the grid</a></div>
    <div class="ship-head"><h2 id="name"></h2><span id="tag" class="badge"></span><span id="badge" class="badge"></span><span id="maker" class="cap"></span></div>
    <section class="panel viewer" aria-label="Ship view">
      <div class="controls">
        <div class="group"><span class="cap">View</span>
          <div class="seg" role="group" aria-label="View">
            <button type="button" data-view="close" aria-pressed="true">Close up</button>
            <button type="button" data-view="flight" aria-pressed="false">In flight</button>
          </div></div>
        <div class="group" id="grade-group" hidden><span class="cap">Grade</span>
          <div class="seg" role="group" aria-label="Grade">
            <button type="button" data-grade="navy" aria-pressed="true">Navy</button>
            <button type="button" data-grade="civ" aria-pressed="false">Civilian</button>
          </div></div>
        <div class="group" id="zoom-group"><span class="cap">Zoom</span>
          <div class="seg" role="group" aria-label="Zoom">
            <button type="button" data-zoom="0.55" aria-pressed="false">0.55</button>
            <button type="button" data-zoom="1" aria-pressed="true">1</button>
            <button type="button" data-zoom="1.5" aria-pressed="false">1.5</button>
          </div></div>
        <div class="group"><span class="cap">Detail</span>
          <div class="seg" role="group" aria-label="Detail">
            <button type="button" data-lod="full" aria-pressed="true">Full</button>
            <button type="button" data-lod="mid" aria-pressed="false">No detail</button>
            <button type="button" data-lod="sil" aria-pressed="false">Silhouette</button>
          </div></div>
        <div class="group"><span class="cap">Stance</span>
          <div class="seg" role="group" aria-label="Stance rim">
            <button type="button" data-rim="none" aria-pressed="true">None</button>
            <button type="button" data-rim="#dffbf3" aria-pressed="false">Yours</button>
            <button type="button" data-rim="#e06c5a" aria-pressed="false">Hostile</button>
            <button type="button" data-rim="#8fa8c8" aria-pressed="false">Neutral</button>
          </div></div>
        <div class="group"><label class="cap" for="heading">Heading</label>
          <input id="heading" type="range" min="0" max="359" value="0"><span id="heading-out" class="hint">0°</span></div>
      </div>
      <div class="stage" id="stage"></div>
      <div class="hint" id="stage-note"></div>
    </section>
    <div class="cols">
      <section class="panel" aria-labelledby="h-design"><h3 id="h-design" class="cap" style="margin:0">Notes</h3><ul class="notes" id="notes"></ul>
        <h3 class="cap" style="margin:16px 0 0">Marks and patterns</h3><ul class="marks" id="marks"></ul>
        <h3 class="cap" style="margin:16px 0 0">Fitting</h3>
        <p class="hint" style="margin:6px 0 0">Any hull fits anything its slots take. Role bonuses nudge full-size modules of the role's kind; built-in equipment is the hull's identity and is never fitted out; the frame is the hull's stats. The drawing shows the stock fit, which NPCs fly.</p>
        <ul class="marks" id="fitting"></ul></section>
      <section class="panel" aria-labelledby="h-facts"><h3 id="h-facts" class="cap" style="margin:0">Hull</h3><dl id="facts"></dl>
        <h3 class="cap" style="margin:16px 0 0" id="race-name"></h3><p class="race-look" id="race-look"></p></section>
    </div>
    </section>
    {lineup(drawn_big, "Drawn ships, all to one scale (1 px per world unit)", 1.0, True)}
    {lineup(craft, "Subcraft and drones, all to one scale (6 px per world unit)", 6, False)}
  </main>
</div>
<footer class="hint">At zoom 1 one world unit is one screen pixel, so "In flight" shows ships at the size they appear in game. Every hull carries a Ceres Registry rating, [weight band]-[function]: Light, Medium, Heavy, Super-heavy or Capital, then its job; subcraft, drones and pods are rated by kind. Draft hulls use a placeholder radius by weight band; catalogue figures are the bare hull from version 0.16. Generations (legacy, production, pattern, clan) are in docs/fleet.md; a hull's legacy mark and patterns are listed on its page here.</footer>
<script>
const SHIPS = {json.dumps(ships)};
const RACES = {json.dumps(races)};
const CLASSES = {json.dumps(CLASSES)};
"""
script = script.replace("const order = ['warrant', ...Object.keys(SHIPS).filter((k) => k !== 'warrant')];",
                        "const order = ['tern', ...Object.keys(SHIPS).filter((k) => k !== 'tern')];")
script = script.replace("const rows = [[race.maker ? 'Maker' : 'Faction', race.name], ['Class', (CLASSES[s.cls] || s.cls) + (s.type ? ', ' + s.type.toLowerCase() : '')], ['Size', s.size], ['Radius', s.radius + ' units']];",
                        "const rows = [['Builder', race.name], ['Power', race.power], ['Rating', s.tag], ['Class', CLASSES[s.cls] || s.cls], ['Job', s.type]]; if (s.size) rows.push(['Size', s.size]); rows.push(['Radius', s.radius + ' units' + (s.art || s.facts ? '' : ' (placeholder)')]);")
script = script.replace("$('race-name').textContent = race.name + ': design language';", "$('race-name').textContent = race.name;")
script = script.replace("$('badge').textContent = s.status;", "$('badge').textContent = s.status; $('tag').textContent = '[' + s.tag + ']';")
script = script.replace("  $('notes').replaceChildren(", "  { const f = s.fit || {bonus: [], builtin: [], frame: []}; const rows = []; (f.builtin || []).forEach((t) => rows.push(['Built in', t])); (f.bonus || []).forEach((t) => rows.push(['Bonus', t])); (f.frame || []).forEach((t) => rows.push(['Frame', t])); if (!rows.length) rows.push(['', 'Fits freely; no role bonus or built-in equipment']); $('fitting').replaceChildren(...rows.map(([c, t]) => { const li = document.createElement('li'); if (c) { const b = document.createElement('span'); b.className = 'cap'; b.textContent = c; li.append(b); } li.append(document.createTextNode(t)); return li; })); }\n  $('notes').replaceChildren(", 1)
script = script.replace("  $('notes').replaceChildren(",
                        "  const marks = []; if (s.legacy) marks.push(['Legacy', s.legacy[0] + ': ' + s.legacy[1]]); (s.patterns || []).forEach((p) => marks.push(['Pattern', p[0] + ': ' + p[1]])); if (!marks.length) marks.push(['', 'No legacy mark or pattern planned']);\n  $('marks').replaceChildren(...marks.map(([k, v]) => { const li = document.createElement('li'); if (k) { const c = document.createElement('span'); c.className = 'cap'; c.textContent = k; li.appendChild(c); } li.appendChild(document.createTextNode(v)); return li; }));\n  $('notes').replaceChildren(")
script = script.replace("$('badge').className = 'badge' + (s.status === 'Proposed' ? ' proposed' : '');", "$('badge').className = 'badge' + (s.status.startsWith('Draft') || s.status.startsWith('Clan') ? ' proposed' : '');")
script = script.replace("const state = { key: order[0], view: 'close', zoom: 1, lod: 'full', rim: 'none', heading: 0 };", "const state = { key: order[0], view: 'close', zoom: 1, lod: 'full', rim: 'none', heading: 0, grade: 'navy' };")
script = script.replace("    u.setAttribute('href', '#s-' + state.key + '-' + id);", "    u.setAttribute('href', '#s-' + state.key + (state.grade === 'civ' && s.civ && (id === 'full' || id === 'mid') ? '-civ' : '') + '-' + id);")
script = script.replace("  pressed('view', state.view);", "  $('grade-group').hidden = !s.civ; if (!s.civ) state.grade = 'navy'; pressed('grade', state.grade); const belt = s.race === 'union'; document.querySelector('[data-grade=navy]').textContent = belt ? 'UDF' : 'Navy'; document.querySelector('[data-grade=civ]').textContent = belt ? 'Cooperative' : 'Civilian'; $('badge').textContent += s.navy ? (state.grade === 'civ' && s.civ ? (belt ? ', off shift' : ', civilian grade') : (belt ? ', UDF' : ', Navy')) : '';\n  pressed('view', state.view);")
script = script.replace("  if (b.dataset.view) state.view = b.dataset.view;", "  if (b.dataset.view) state.view = b.dataset.view;\n  if (b.dataset.grade) state.grade = b.dataset.grade;")
script = script.replace("const marks = []; if (s.legacy)", "const byName = Object.fromEntries(Object.values(SHIPS).map((x) => [x.name, x.key])); const marks = []; if (s.base && SHIPS[s.base]) marks.push([s.gen === 'surplus' ? 'Surplus of' : 'Legacy of', SHIPS[s.base].name + ': the production hull that replaced it']); if (s.legacy)")
script = script.replace("li.appendChild(document.createTextNode(v)); return li; }));", "const nm = v.split(': ')[0]; if (byName[nm] && byName[nm] !== s.key) { const a = document.createElement('a'); a.href = '#' + byName[nm]; a.textContent = nm; li.appendChild(a); li.appendChild(document.createTextNode(v.slice(nm.length))); } else li.appendChild(document.createTextNode(v)); return li; }));")
out = head + body + script + "</script>\n</body>\n</html>\n"
open(OUT, "w").write(out)
print(len(ships), "ships;", sum(1 for s in ships.values() if s["art"]), "drawn;", len(out) // 1024, "KB")


# ---------------------------------------------------------------- hull handover (docs/hulls.md)
def handover(path):
    T3ROLES = {"watcher": "fast and agile despite size; cold-running; finds the target and holds a lock that is a jump target; no real damage",
               "hunter": "jumps onto a lock (gate-born drive), lands close, pins the target (burn, turn and capacitor penalties); survives until the fleet arrives; modest guns",
               "striker": "jumps in behind the hunter, alpha far above its class, low defences, committed once landed"}
    def grades(e):
        if e["race"] == "union" and e.get("civ"): return "UDF (on rota) / cooperative (off)"
        if e["race"] == "clans": return "none (clan standing)"
        if e["race"] in ("aurel", "unsung"): return "none (a voice; sealed, no grade)"
        if e["race"] in ("meridian", "corvane"): return "none (independent, no licence)"
        if e.get("gen") == "surplus": return "Navy tag intact, open market"
        if e.get("gen") == "legacy": return "none (old civilian mark)"
        if e.get("role") == "prototype": return "none (top of company standing)"
        if e.get("tier") == 3: return "Navy (top of the ladder)"
        if e.get("navy"): return "Navy / civilian" if e.get("civ") else "Navy only"
        return "none (civilian)"
    def route(e):
        if e["race"] == "union": return "Belt only, cooperative standing"
        if e["race"] == "clans": return "clan standing or a very rare sale"
        if e["race"] == "aurel": return "a husk, the one on the pad, or the gift to the Voiced"
        if e["race"] == "unsung": return "never; it is the enemy"
        if e["race"] in ("meridian", "corvane"): return "open market, anywhere"
        if e.get("gen") == "surplus": return "open market, expensive" + (", Martian buyers first" if e["power"] == "mars" else "")
        if e.get("gen") == "legacy": return "used market, cheap"
        if e.get("role") == "prototype": return "top of company standing, or story"
        if e.get("tier") == 3: return "navy standing ladder, stolen, or story"
        if e.get("navy"): return ("yard, Navy grade behind the licence; civilian grade open" + (" to Martians only" if e["power"] == "mars" else "")) if e.get("civ") else "yard, licence only"
        return "yard or ship mart"
    lines = ["# Hull handover", "",
             "Generated from the ship registry's data on 7 November 2026 by the lore chat; regenerate rather than edit. One row per hull. Every term used here is defined in `hull-terms.md`, which is the authority; the rules in one screen:", "",
             "- **Tiers.** T1: legacy (old civilian mark) and retired navy (old navy mark sold whole, Navy tag intact). T2: production hulls and their patterns. T3: special operations and clan hulls. The tier is price band and rarity; the generation is what the hull is.",
             "- **Navy is a tag**, not a generation: better stats. A hull's **grade** is a flag on the owned ship: Navy or civilian for current corvettes, patrol boats and light fighters (frigate and above are Navy only); UDF or cooperative for every Belt hull, toggled by rota; none for independents and legacy.",
             "- **Patterns** are T2 stat variants of a base hull (better at one thing, worse at another), behind standing or a licence; see `fleet.md` \"Pattern grid\". They are not new hulls.",
             "- **T3 roles are hull abilities**, one per hull: watcher, hunter, striker. Jumps need a jump target (a watcher's lock, a fleet or station beacon), are in-system only, loud, and have a long cooldown. Clan hulls are the Belt's T3 and have no drives. See `fleet.md` \"Special operations: the T3 line\".",
             "- **Rebuilds and retired marks point at a source or successor hull** (the Base column). Union pattern hulls are their source rebuilt; retired marks are the hull the production mark replaced.",
             "- **Independents** (Meridian, Corvane) carry no tag and need no licence at any size. **Union pattern** is sold only in the Belt. **Retired navy** is expensive. The five routes to a warship are in `fleet.md`.",
             "- **Weight band and rating tag** come from `fleet.md` \"Weight bands\": `[weight]-[function]`; radius ranges per band are there too.",
             "- The per-power weapon family and tank are in `lore.md` \"Weapons and war\"; who responds with what is in `navy.md`.",
             "", "Columns: key is the catalogue id where one exists (`id` column) or the registry key; grades and route follow the rules above; Drawn says whether the registry has art.", ""]
    order = [b[0] for b in BUILDERS]
    for bk in order:
        mine = [e for e in ships.values() if e["race"] == bk]
        if not mine: continue
        bname = next(n for k, n, p, bl in BUILDERS if k == bk)
        lines.append(f"## {bname} ({mine[0]['power']})"); lines.append("")
        lines.append("| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |")
        lines.append("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
        for e in sorted(mine, key=lambda e: (e["tier"], list(CLASSES).index(e["cls"]) if e["cls"] in CLASSES else 99, e["name"])):
            gen = e.get("gen") or ("clan" if e["race"] == "clans" else (("prototype" if e.get("role") == "prototype" else "special operations") if e.get("tier") == 3 else "production"))
            if e.get("role") == "prototype": gen += ": a civil specialist with one Lattice-derived component; see fleet.md \"Civil T3: prototypes\""
            elif e.get("role"): gen += f", {e['role']}: {T3ROLES[e['role']]}"
            if e.get("command"): gen += "; command ship (fleet bonuses, bay, defence umbrella, fleet beacon)"
            base = SHIP_NAMES.get(e.get("base"), "") if e.get("base") else ""
            pats = "; ".join(f"{p[0]}: {p[1]}" for p in (e.get("patterns") or [])) or ""
            lines.append(f"| `{e['key']}` | {e['id'] or ''} | {e['name']} | {CLASSES.get(e['cls'], e['cls'])}, {e['type']} | T{e['tier']} | {gen} | {grades(e)} | {base} | {e['weight']} | `{e['tag']}` | {pats} | {route(e)} | {'yes' if e['art'] else 'no'} |")
        lines.append(""); lines.append(f"### {bname}: entries"); lines.append("")
        lines.append("One entry per hull: the role it fills, the intention behind it (why it exists in the fleet and what it should feel like to meet or fly), the description the art was drawn to (the stock fit), and its fitting: built-in equipment (its identity, never fitted out), role bonuses (nudges for full-size modules) and frame notes. Every hull fits anything its slots take (`fitting.md`, `hull-terms.md` \"Fitting model\").")
        lines.append("")
        for e in sorted(mine, key=lambda e: (e["tier"], list(CLASSES).index(e["cls"]) if e["cls"] in CLASSES else 99, e["name"])):
            notes = e.get("notes") or []
            intention = (notes[0] if notes else e.get("char", "")).rstrip(".")
            desc = " ".join(n.rstrip(".") + "." for n in notes[1:]) if len(notes) > 1 else "Not yet drawn."
            extras = []
            if e.get("role") and e["role"] != "prototype": extras.append(f"T3 role: {e['role']} ({T3ROLES[e['role']]})")
            if e.get("role") == "prototype": extras.append("Civil T3 prototype: one Lattice-derived component, never a jump")
            if e.get("command"): extras.append("Command ship: fleet bonuses, a bay, a defence umbrella and the fleet beacon")
            if e.get("patterns"): extras.append("Patterns: " + "; ".join(f"{p[0]} ({p[1].rstrip('.')})" for p in e["patterns"]))
            if e.get("base"): extras.append(f"Base: {SHIP_NAMES.get(e['base'], e['base'])}")
            f = e.get("fit") or {}
            if f.get("builtin"): extras.append("Built in: " + "; ".join(x.rstrip(".") for x in f["builtin"]))
            if f.get("bonus"): extras.append("Role bonus: " + "; ".join(x.rstrip(".") for x in f["bonus"]))
            if f.get("frame"): extras.append("Frame: " + "; ".join(x.rstrip(".") for x in f["frame"]))
            lines.append(f"- **{e['name']}** (`{e['key']}`, {CLASSES.get(e['cls'], e['cls'])}, {e['weight']}, T{e['tier']}). Role: {e['type'].rstrip('.')}. Intention: {intention}. Description: {desc}" + ("".join(f" {x}." for x in extras)))
        lines.append("")
    open(path, "w").write("\n".join(lines).replace("\u2014", ", ").replace("\u2013", "-") + "\n")

SHIP_NAMES = {k: e["name"] for k, e in ships.items()}
import sys as _sys
if len(_sys.argv) > 3: handover(_sys.argv[3])
