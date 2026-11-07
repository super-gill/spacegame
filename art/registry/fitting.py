"""The fitting model per hull, for the registry page and the handover.

Fitting stays free (fitting.md, approved 5 November): any hull fits anything
its slots take. A hull is fitting constraints (frame), role bonuses (nudges at
full size) and built-in role equipment (its identity, never fitted out).
This module derives the last three for every registry entry from its class,
job, builder, tier and flags, with overrides where a hull is unusual.
"""

FAMILY = {  # the power's weapon family, from lore.md "Weapons and war"
    "kessari": "launchers (missiles)", "vantage": "launchers (missiles)",
    "seraphine": "energy guns", "arcadia": "energy guns",
    "ishtar": "railguns and blasters (hybrid)",
    "union": "projectile guns", "clans": "projectile guns", "corvane": "projectile guns (heavy blisters)",
    "meridian": "any gun on the standard ring (no family; every part interchangeable)",
}
MIL = {"corvette", "patrol", "frigate", "destroyer", "cruiser", "battleship", "dreadnought", "carrier"}
T3 = {
    "watcher": "Lock emitter: holds a lock that is a jump target; cold-running hull",
    "hunter": "Gate-born jump drive; pin field (burn, turn and capacitor penalties on the target); heavy tank",
    "striker": "Gate-born jump drive; alpha far above its class",
}

OVERRIDE = {
    # method-specific mining and gas
    "mer-dunlin": (["Mining lasers, small (L1)"], ["Ore hold, large for a light hull"]),
    "rookrivet-prospector": (["Mining lasers, small (L1)", "Survey scanners"], ["Ore hold, large for a light hull", "The best scanner mount at its size"]),
    "rookrivet-prospector-old": (["Mining lasers, small (L1)"], ["Ore hold"]),
    "arc-miner": (["Mining lasers, medium (L2)", "Armour"], ["Ore hold, small for its size", "Armoured frame"]),
    "arc-miner-mk1": (["Mining lasers, small (L1)"], ["Ore hold"]),
    "rookrivet-breacher": (["Mining lasers, medium (L2)", "Charge rig"], ["Ore hold, unusually large"]),
    "rookrivet-breacher-old": (["Mining lasers, medium (L2)"], ["Ore hold"]),
    "cor-pithead": (["Mining lasers, large (L3)", "Charge rig", "Projectile guns"], ["Ore hold, unusually large", "Sorting hopper (ore sorted by kind)"]),
    "rookrivet-hulk": (["Ore hold capacity", "Mining turrets"], ["Ore hold, very large (ore only)"]),
    "rookrivet-hulk-old": (["Ore hold capacity"], ["Ore hold, very large (ore only)"]),
    "bf-rime": (["Ice saws, small (S1)"], ["Ice hold"]),
    "bf-rime-old": (["Ice saws, small (S1)"], ["Ice hold"]),
    "bf-auger": (["Ice saws, medium (S2)"], ["Ice hold, unusually large"]),
    "lav-breeze": (["Intakes"], ["Heat-rated hull, D1 (upper band only)", "Gas tanks"]),
    "lav-zephyr": (["Intakes", "Heat sinks"], ["Heat-rated hull, D1 (briefly D2)", "Gas tanks"]),
    "lav-gale": (["Intakes", "Heat sinks"], ["Heat-rated hull, D2", "Gas tanks, large"]),
    "lav-tempest": (["Intakes", "Heat sinks"], ["Heat-rated hull, D3 (below the death line)", "Gas tanks"]),
    "bf-burrow": (["Afterburners", "Countermeasures"], ["Hidden hold (scans read it as empty)"]),
    "mer-shrike": (["Tackle (civilian)", "Tractor"], ["Cell block", "Pod bay with a grab"]),
    "mer-osprey": (["Launchers", "Cargo pods"], ["Launcher pods that read as cargo pods on a scan"]),
    "escape-pod": ([], ["Fixed fit: a lifeboat. Flight mount only"]),
    "aurel-tacet": ([], ["Sealed: no slots a pilot can reach"]),
    "rr-grab": ([], ["Fixed fit (bay product): claw and tow line"]),
    "lw-dredge": ([], ["Fixed fit (bay product): clan salvage subcraft"]),
}


def fit_for(e):
    k, cls, job, race, tier = e["key"], e["cls"], (e.get("type") or "").lower(), e["race"], e.get("tier", 2)
    gen, role = e.get("gen"), e.get("role")
    bonus, builtin, frame = [], [], []

    if k in OVERRIDE:
        bonus, builtin = [list(x) for x in OVERRIDE[k]]
    elif cls in ("drone", "pod", "voice"):
        builtin = ["Fixed fit: a bay product, not fitted by the pilot"] if cls == "drone" else builtin
    elif cls == "craft":
        if "fighter" in job or "raider" in job:
            bonus = []; builtin = ["Fixed fit (bay product): " + FAMILY.get(race, "guns")]
            if "sar" in job: builtin = ["Fixed fit (bay product): pod grapple, nanite sprayer, no gun"]
        elif "mining" in job: builtin = ["Fixed fit (bay product): mining laser and ore pods"]
        elif "salvage" in job: builtin = ["Fixed fit (bay product): claw and tow line"]
    elif cls in MIL:
        bonus = [FAMILY.get(race, "guns").capitalize()]
        if cls in ("cruiser", "battleship", "dreadnought", "destroyer"): bonus.append("Armour or shields, by power")
        if cls == "carrier": builtin += ["Hangar bays and wing control (fighters)"]
        if "rescue" in job or "space guard" in job: builtin += ["Pod collars and a Solace kit"]
        if "toll" in job: bonus.append("Electronic warfare")
    else:
        if "courier" in job: bonus += ["Afterburners", "Cargo pods"]
        if "shuttle" in job or "taxi" in job: builtin += ["Passenger seats"]
        if "hauler" in job and "ice" not in job: bonus += ["Cargo pods and containers"]; builtin += ["Cargo hold, large for its size"]
        if "freighter" in job or "superfreighter" in job: bonus += ["Cargo pods and containers"]; builtin += ["Sealed cargo bays, built into the hull"]
        if "tanker" in job: builtin += ["Liquid and gas tanks"]
        if "ice hauler" in job: builtin += ["Ice hold"]
        if "ferry" in job or "bus" in job or "liner" in job: builtin += ["Passenger berths"]; bonus += ["Shields"]
        if "tug" in job: builtin += ["Tow clamp"]; bonus += ["Tractor"]
        if "salvage" in job or "recovery" in job: bonus += ["Salvage cutters", "Tractor"]; builtin += ["Salvage racks"]
        if "shipbreaker" in job: builtin += ["Breaking yard"]
        if "repair" in job or "tender, small" in job or "hospital" in job: bonus += ["Remote repair", "Shield transfer"]; builtin += ["Repair bay"]
        if "hospital" in job: builtin += ["Hospital and pod collars"]
        if "survey" in job or "explorer" in job: bonus += ["Survey scanners", "Probe launchers"]; builtin += ["Sensor dish and mast arrays"]
        if "explorer" in job: builtin += ["Long-range tanks", "Lab"]
        if "drone tender" in job: bonus += ["Drone bays", "Drone control"]; builtin += ["Drone control suite"]
        if "refinery" in job: builtin += ["Field refinery (worse yield than a station)", "Ore hold"]
        if "factory" in job: builtin += ["Field works: refining and repair"]
        if "armed" in job or "security" in job: bonus += [FAMILY.get(race, "guns").capitalize()]
        if "carrier" in job: builtin += ["Hangar bays and wing control (its wing does the work)"]
        if "skimmer carrier" in job: builtin += ["Gas tanks for the wing's run", "Field gas refinery"]
        if "mining carrier" in job: builtin += ["Ore holds and ore transfer without docking", "Field refinery"]
        if not bonus and not builtin: bonus = ["Cargo pods"]

    if e.get("command"): builtin += ["Command suite: bonuses to the wing and any fleet in radius", "Defence umbrella (PDC coverage, shield or armour share)", "Fleet beacon (a jump target and rally point)"]
    if role and role in T3: builtin.insert(0, T3[role])
    if role == "prototype":
        lat = (e.get("notes") or [""])[0].split(";")[-1].strip().rstrip(".")
        builtin.insert(0, "One Lattice component: " + lat)
    if e.get("navy") and gen != "surplus" and tier != 3: frame.append("Navy grade: better frame stats, behind the licence" + ("; civilian grade without them" if e.get("civ") else ""))
    if gen == "surplus": frame.append("Navy tag intact; older mounts and fewer or smaller slots than the current mark")
    if gen == "legacy": frame.append("Older frame: fewer or smaller slots than the production mark, and cheaper")
    if race == "union": frame.append("UDF tag on rota: better frame stats while on shift")
    if race == "clans": frame.append("Clan-built: one-off frame, no drive")
    if tier == 3 and race not in ("clans",) and role != "prototype": frame.append("Navy tag: top of the standing ladder")
    trade = {"corvane": "Heavy, armoured, pricier", "beltforge": "Light, far-ranging, unarmed by default; spare mounts", "rookrivet": "Gunmetal frame, spare mounts",
             "meridian": "Cheap, slight, every part interchangeable", "arcadia": "Slow, armoured, small holds", "tessaract": "Roomy, soft",
             "lavinia": "Heat-rated, light", "solace": "Unarmed; protected by the Mercy Clause", "halden": "Fragile; instruments over armour"}
    if race in trade and cls not in ("drone", "craft", "pod"): frame.append("Builder trade-off: " + trade[race])
    return {"bonus": bonus, "builtin": builtin, "frame": frame}
