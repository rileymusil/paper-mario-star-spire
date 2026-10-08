# Paper Mario: Star Spire

**Play it:** https://rileymusil.github.io/paper-mario-star-spire/

A browser deck-building roguelike in the style of Slay the Spire, built from the Paper Mario 64 sprite sheets in this folder. Mario climbs 3 acts with up to 2 partners fighting beside him.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173). `npm run dev` also listens on your local network, so you can open the "Network" URL on your phone (same Wi-Fi) and play in portrait or landscape.

Other commands:

- `npm test`: engine tests, plus 24 simulated full runs
- `npm run build`: static build in `dist/` (open with `npm run preview`)
- `npm run sprites`: re-slice the sprite sheets (needs Python 3 with Pillow, NumPy and SciPy)

## How it plays

- **Runs**: 3 acts, 10 floors each plus a boss. Branching map with battles, elites, `?` events, shops, rest sites, treasure, and one partner node per act.
- **Battles**: 3 FP and 5 cards per turn. Enemies telegraph their next move and who they will hit.
- **Partners**: start with Goombario, Kooper or Bombette. Each partner stands on the field with their own HP and adds their own cards to your deck; playing a card makes that partner act. If a partner is KO'd, their cards can't be played until the battle ends. Up to 2 fight at once; the rest wait in reserve (swap at rest sites).
- **Action Commands**: when attacking, press Space / click / tap as the ring closes for a Nice! bonus. Press right before an enemy hits to Guard. You can switch to "Always Nice" or "Off" in Settings.
- **Jump vs Hammer**: jumps reach flying foes, flip shelled foes and knock Paragoombas out of the sky, but hurt on spiky foes. Hammers can't reach flying foes.
- **Between fights**: Badges (relics), Items (potions), coins, Star Power specials, and Super Blocks to rank partners up from Normal to Super to Ultra.
- **Unlocks**: clear Act 1 for Parakarry as a starter, Act 2 for Bow, and win for Watt plus Hard mode. Runs auto-save in the browser.

Keyboard: `1`-`0` select cards, `E` ends the turn, `Esc` cancels, `Space` for action commands.

## Project layout

```
tools/slice.py         sprite sheet slicer (blob detection + frame manifest)
tools/sprites.json     which sheet blobs make up each character animation / icon
tools/extract_bg.py    battle backgrounds and title art
public/sprites, bg     generated images
src/engine/            rules: combat, map generation, run state, saving (no DOM)
src/data/              cards, partners, enemies, encounters, items, badges, events
src/ui/                DOM rendering: stage scaling, sprites, battle screen, menus
tests/                 Vitest tests and a headless auto-player
```

To change how a character looks, edit its frame numbers in `tools/sprites.json` (numbers come from the labeled contact sheets `python tools/slice.py scan` writes to `tools/contact/`), then run `npm run sprites`.

Fan-made, non-commercial, and not affiliated with Nintendo. Paper Mario characters and sprites belong to Nintendo / Intelligent Systems. Sprite sheets were ripped by Retriever II, Random Talking Bush, Dazz, Kimimaru and Idro (credits are on each sheet).
