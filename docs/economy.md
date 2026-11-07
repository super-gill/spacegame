# The economy

Open Lanes step 4, the money loop (agreed with Jason, 7 November 2026): Sol's markets run on supply and demand now, in one system, so that a second system later is more ports on the same model. A fuller simulated economy (recipe chains between ports, ownership and wages, prices across systems) stays parked as its own milestone.

Sol's wealth is ordinary and enormous (`materials.md`): common ores and resources, and most of humanity's manufacturing. Nothing exotic is mined or sold in Sol; gate-glass, husk material and each new system's exotic are reasons to go through the gate later.

## Step 4 in three pushes

1. **Stock and prices** (built, below): every port holds stock, prices follow it, ports produce and consume back to equilibrium, and your trades move the stock.
2. **NPC traders trade for real**, miners sell into stock, and a route check that the loop pays.
3. **Mining sites and bounties**: two or three rock sites beyond Ceres (rock only; ice and gas wait), and bounties on pirates claimed at a port of the power that posted them.

## As built: push 1, stock and prices (7 November 2026, Lead 9)

`packages/sim/src/economy.ts`; the market screen in `client/src/market-panel.ts`.

- **Stock** is saved world state: `World.stock`, by station then good. Sol has it; Calder and the Arena do not, and trade at design prices as before. A Sol save from before the economy starts every port at equilibrium; a port or good the save lacks joins at equilibrium.
- **Equilibrium:** a port's design prices (`Station.market`, the templates in `sol-ports.ts`) are its prices at equilibrium stock. What the port does with a good comes from those prices against the good's base price: well under (10%) is a **producer**, holding 600; well over, or bought and never sold, a **consumer**, holding 150; in between a **trader**, holding 300 (`EQUILIBRIUM`).
- **Price follows stock:** the design price times (equilibrium / stock) to the power 0.5 (`ELASTICITY`), between 0.4 and 2.5 times (`PRICE_FLOOR`, `PRICE_CEILING`). A quarter of the stock costs twice as much; four times the stock fetches half. The design spread between buying and selling is kept. Sold out: nothing to buy. Full (four times equilibrium, `STOCK_CAP`): the port stops buying.
- **Lots** are priced unit by unit: selling 200 machinery at once fetches steadily less per unit, and the market screen's Sell all says what the whole lot fetches. `maxBuyable` finds the largest lot you can afford, carry and the port has.
- **Production and consumption:** every 10 seconds (`ECONOMY_STEP_SECONDS`) each port's stock closes on equilibrium by the share that makes about 63% of any gap go in 30 minutes (`RECOVERY_SECONDS`). A big sale is felt for most of an hour, then the port has used it up (or made more).
- **Kit is not stocked:** ammunition, missiles and torpedoes, countermeasures, drones and charges keep fixed prices (`isTradeGood`): the port always has them.
- **On screen:** the market shows each good's Stock beside the prices; Buy is greyed with "Sold out here." when the port has none.

### Not yet

- NPC traders and miners do not move stock (push 2), so today only pilots do.
- Recipes (a foundry turning ore into machinery as one process) are not modelled: each good recovers on its own. The port roles make the same shape of trade: ore flows to foundries, machinery flows out.
- The numbers are first guesses, to be tuned with push 2's route check.
