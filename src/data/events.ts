import type { Reward, RunState } from '../engine/types';
import type { Rng } from '../engine/rng';
import { addBadge, addCard, addItem, canUpgrade, healTeam, rollBadge, rollCards, rollItem, upgradeCard } from '../engine/run';

export interface EventOption {
  label: string;
  detail?: string;
  /** reason this option can't be picked, or null */
  disabled?: string | null;
  /** apply the choice, return the next page key ('end' leaves the event) */
  go: (run: RunState, data: any, r: Rng) => string;
}

export interface EventPage {
  text: string;
  options: EventOption[];
  /** ask the player to pick cards from the deck, then go to `then` */
  pick?: { kind: 'remove' | 'upgrade' | 'transform' | 'duplicate'; count: number; then: string };
  /** a claimable reward shown on the page (stored in data.reward) */
  reward?: Reward;
  /** timing minigame: UI stores successes in data.hits, then goes to `then` */
  minigame?: { rounds: number; then: string };
}

export interface EventDef {
  id: string;
  title: string;
  /** sprite id (or icon id when npcIcon) */
  npc: string;
  npcIcon?: boolean;
  acts: number[];
  when?: (run: RunState) => boolean;
  init?: (run: RunState, data: any) => void;
  pages: Record<string, (run: RunState, data: any) => EventPage>;
}

const leave = (label = 'Leave'): EventOption => ({ label, go: () => 'end' });
const cardReward = (cards: string[]): Reward => ({ coins: 0, cards: [cards], items: [], badges: [], superBlocks: 0, taken: { coins: true, cards: [false], items: [], badges: [] } });
const badgeReward = (id: string | null): Reward => ({ coins: 0, cards: [], items: [], badges: id ? [id] : [], superBlocks: 0, taken: { coins: true, cards: [], items: [], badges: id ? [false] : [] } });

const hurtMario = (run: RunState, n: number) => {
  run.mario.hp = Math.max(1, run.mario.hp - n);
};
const loseMaxHp = (run: RunState, n: number) => {
  run.mario.maxHp -= n;
  run.mario.hp = Math.min(run.mario.hp, run.mario.maxHp);
};
const bagFull = (run: RunState) => (run.items.includes(null) ? null : 'Item bag is full');

const QUIZ: [string, string, string, string][] = [
  ["What color is Luigi's cap?", 'Green', 'Red', 'Blue'],
  ['Who kidnapped Princess Peach?', 'Bowser', 'Kammy Koopa', 'Tubba Blubba'],
  ['What does a Mushroom restore?', 'HP', 'FP', 'Star Power'],
  ['Which partner is a Bob-omb?', 'Bombette', 'Bow', 'Watt'],
  ['How many Star Spirits need rescuing?', 'Seven', 'Five', 'Eight'],
  ["What is Goombario's grandpa called?", 'Goompa', 'Goomama', 'Goombaria'],
  ['Which partner delivers the mail?', 'Parakarry', 'Lakilester', 'Sushie'],
  ['What does Lakilester ride?', 'A cloud', 'A shell', 'A broom'],
  ['Who flies around on a broom?', 'Kammy Koopa', 'Bow', 'Chanterelle'],
  ['Spiky foes hurt you when you...', 'Jump on them', 'Hammer them', 'Throw items at them'],
  ["Who is Bow's loyal butler?", 'Bootler', 'Bumpty', 'Bartender'],
  ['What does FP stand for?', 'Flower Points', 'Fire Power', 'Fun Points'],
  ['Which item puts foes to sleep?', 'Sleepy Sheep', 'Dizzy Dial', 'POW Block'],
  ["What is Kolorado's job?", 'Archaeologist', 'Chef', 'Mail carrier'],
  ["Which partner can make Mario invisible?", 'Bow', 'Watt', 'Kooper'],
];

export const EVENT_LIST: EventDef[] = [
  {
    id: 'quizmo', title: "Chuck Quizmo's Quiz", npc: 'quizmo', acts: [1, 2, 3],
    pages: {
      start: () => ({
        text: "Chuck Quizmo pops up out of nowhere! \"Hey hey! It's quiz time! Get it right and the coins are yours!\"",
        options: [
          {
            label: 'Play!', detail: 'Answer a question for 40 coins.',
            go: (_run, d, r) => {
              d.q = r.int(0, QUIZ.length - 1);
              d.order = r.shuffle([1, 2, 3]);
              return 'question';
            },
          },
          leave('No thanks'),
        ],
      }),
      question: (_run, d) => ({
        text: QUIZ[d.q][0],
        options: (d.order as number[]).map((i) => ({
          label: QUIZ[d.q][i],
          go: (run: RunState) => {
            if (i !== 1) return 'wrong';
            run.coins += 40;
            return 'right';
          },
        })),
      }),
      right: () => ({ text: '"Correct-a-mundo!" Confetti everywhere. You win 40 coins!', options: [leave()] }),
      wrong: (_run, d) => ({ text: `"Bzzzt! Sorry, the answer was ${QUIZ[d.q][1]}!"`, options: [leave()] }),
    },
  },
  {
    id: 'luigi', title: "Luigi's Training", npc: 'luigi', acts: [1, 2],
    pages: {
      start: () => ({
        text: 'Luigi is practicing jumps behind a pipe. "Bro! Want to train with me? I\'ve been reading about new moves!"',
        options: [
          {
            label: 'Train together', detail: 'Mario loses 6 HP. Upgrade 2 random cards.',
            go: (run, _d, r) => {
              run.mario.hp = Math.max(1, run.mario.hp - 6);
              const options = run.deck.filter((c) => canUpgrade(run, c));
              for (const c of r.sample(options, 2)) upgradeCard(run, c.uid);
              return 'trained';
            },
          },
          {
            label: 'Swap stories', detail: 'Choose a card to add.',
            go: (run, d, r) => {
              d.reward = cardReward(rollCards(run, r, 3, [['common', 50], ['uncommon', 50]]));
              return 'stories';
            },
          },
          leave(),
        ],
      }),
      trained: () => ({ text: 'You spar until sundown. Luigi is out of breath, but you both feel sharper. (2 cards upgraded)', options: [leave()] }),
      stories: (_run, d) => ({ text: 'Luigi tells you all about the moves he\'s been dreaming up.', reward: d.reward, options: [leave('Continue')] }),
    },
  },
  {
    id: 'peach', title: "Peach's Secret Kitchen", npc: 'peach', acts: [2, 3],
    pages: {
      start: (run) => ({
        text: 'Princess Peach has snuck away from her guards to bake. "Mario! I made too much. Please take some!"',
        options: [
          { label: 'Eat it now', detail: 'Heal your whole team 50%.', go: (r2) => { healTeam(r2, 0.5); return 'ate'; } },
          {
            label: 'Pack it to go', detail: 'Gain a Cake item.',
            disabled: run.items.includes(null) ? null : 'Item bag is full',
            go: (r2) => { addItem(r2, 'cake'); return 'packed'; },
          },
          { label: 'Ask for advice', detail: 'Remove a card from your deck.', go: () => 'advice' },
        ],
      }),
      ate: () => ({ text: 'Delicious! Everyone feels much better.', options: [leave()] }),
      packed: () => ({ text: 'You tuck the cake into your bag. It smells amazing.', options: [leave()] }),
      advice: () => ({ text: '"Sometimes less is more, Mario." Choose a card to remove.', pick: { kind: 'remove', count: 1, then: 'removed' }, options: [] }),
      removed: () => ({ text: 'Peach smiles. "Good luck out there!"', options: [leave()] }),
    },
  },
  {
    id: 'kolorado', title: "Kolorado's Dig Site", npc: 'kolorado', acts: [1, 2],
    pages: {
      start: (run) => ({
        text: 'Kolorado is digging furiously. "Mario, old chap! Treasure is surely under here. Lend a hand, or fund the expedition?"',
        options: [
          {
            label: 'Help dig', detail: '55%: find a rare badge. Otherwise Mario takes 10 damage.',
            go: (r2, d, r) => {
              if (r.chance(0.55)) {
                d.reward = badgeReward(rollBadge(r2, r, [['uncommon', 40], ['rare', 60]]));
                return 'found';
              }
              r2.mario.hp = Math.max(1, r2.mario.hp - 10);
              return 'boulder';
            },
          },
          {
            label: 'Fund it (50 coins)', detail: 'Gain a badge.',
            disabled: run.coins >= 50 ? null : 'Not enough coins',
            go: (r2, d, r) => {
              r2.coins -= 50;
              d.reward = badgeReward(rollBadge(r2, r));
              return 'found';
            },
          },
          leave(),
        ],
      }),
      found: (_run, d) => ({ text: '"By Jove! Look at this!" Something glints in the dirt.', reward: d.reward, options: [leave('Continue')] }),
      boulder: () => ({ text: 'A boulder rolls loose and flattens Mario. Kolorado keeps digging. (-10 HP)', options: [leave()] }),
    },
  },
  {
    id: 'goompa', title: 'Goompa by the Fire', npc: 'goompa', acts: [1],
    pages: {
      start: () => ({
        text: 'Goompa warms himself by a campfire. "Sit a spell, sonny. These old bones have learned a trick or two."',
        options: [
          { label: 'Learn a trick', detail: 'Upgrade a card.', go: () => 'learn' },
          {
            label: 'Rest by the fire', detail: 'Partners heal to full.',
            go: (run) => {
              for (const p of run.partners) p.hp = p.maxHp;
              return 'rested';
            },
          },
        ],
      }),
      learn: () => ({ text: 'Goompa leans in. "Now watch closely..."', pick: { kind: 'upgrade', count: 1, then: 'learned' }, options: [] }),
      learned: () => ({ text: '"Back in my day, we walked to the castle uphill both ways!"', options: [leave()] }),
      rested: () => ({ text: 'Your partners nap by the fire and wake up refreshed.', options: [leave()] }),
    },
  },
  {
    id: 'bartender', title: 'Club 64', npc: 'bartender', acts: [1, 3],
    pages: {
      start: (run) => ({
        text: 'A Toad wipes down the bar. "Welcome to Club 64! Something to drink? Or care to test your timing at arm wrestling?"',
        options: [
          {
            label: 'Buy a round (30 coins)', detail: 'Gain 2 random items.',
            disabled: run.coins >= 30 ? null : 'Not enough coins',
            go: (r2, _d, r) => {
              r2.coins -= 30;
              addItem(r2, rollItem(r));
              addItem(r2, rollItem(r));
              return 'drinks';
            },
          },
          { label: 'Arm wrestle', detail: 'Timing challenge: win 60 coins, or Mario takes 6 damage.', go: () => 'wrestle' },
          leave(),
        ],
      }),
      drinks: () => ({ text: 'The bartender slides a couple of goodies your way. (Items you had no room for were left behind.)', options: [leave()] }),
      wrestle: () => ({ text: 'Press at the right moment!', minigame: { rounds: 1, then: 'wrestled' }, options: [] }),
      wrestled: (run, d) => {
        if (!d.applied) {
          d.applied = true;
          if (d.hits >= 1) run.coins += 60;
          else run.mario.hp = Math.max(1, run.mario.hp - 6);
        }
        return { text: d.hits >= 1 ? 'Slam! The crowd roars. You win 60 coins!' : 'Your arm gets pinned. Ouch! (-6 HP)', options: [leave()] };
      },
    },
  },
  {
    id: 'twirler', title: 'The Parade', npc: 'twirler', acts: [1, 2],
    pages: {
      start: () => ({
        text: 'A baton twirler leads a parade down the road. "Come march with us! It\'s great for the spirit!"',
        options: [
          { label: 'Join the parade', detail: 'Your next 3 battles start with +2 Star Power.', go: (run) => { run.paradeBuff = 3; return 'joined'; } },
          { label: 'Watch from the side', detail: 'Heal Mario 12 HP.', go: (run) => { run.mario.hp = Math.min(run.mario.maxHp, run.mario.hp + 12); return 'watched'; } },
        ],
      }),
      joined: () => ({ text: 'You twirl, you march, you shine. Star Power hums inside you!', options: [leave()] }),
      watched: () => ({ text: 'The music is lovely. Mario feels rested.', options: [leave()] }),
    },
  },
  {
    id: 'bootler', title: 'The Haunted Chest', npc: 'bootler', acts: [2],
    pages: {
      start: () => ({
        text: 'Bootler floats beside an old chest. "Lady Bow forbids anyone to open this. But... I suppose I didn\'t see you."',
        options: [
          {
            label: 'Open it', detail: 'Gain a rare badge. Add a Haunted curse to your deck.',
            go: (run, d, r) => {
              d.reward = badgeReward(rollBadge(run, r, [['rare', 1]]));
              addCard(run, 'haunted');
              return 'opened';
            },
          },
          leave(),
        ],
      }),
      opened: (_run, d) => ({ text: 'A chill runs up your spine as a ghostly wail fills the room...', reward: d.reward, options: [leave('Continue')] }),
    },
  },
  {
    id: 'bumpty', title: 'Ice Rink', npc: 'bumpty', acts: [2, 3],
    pages: {
      start: () => ({
        text: 'A Bumpty slides across a frozen pond. "Wanna skate? The ice makes you forget things!"',
        options: [
          { label: 'Skate gracefully', detail: 'Remove a card.', go: () => 'remove' },
          { label: 'Skate wildly', detail: 'Transform 2 cards into random ones.', go: () => 'transform' },
          leave(),
        ],
      }),
      remove: () => ({ text: 'Choose a card to leave on the ice.', pick: { kind: 'remove', count: 1, then: 'done' }, options: [] }),
      transform: () => ({ text: 'Choose 2 cards to spin into something new.', pick: { kind: 'transform', count: 2, then: 'done' }, options: [] }),
      done: () => ({ text: '"Wheee!" Bumpty waves goodbye.', options: [leave()] }),
    },
  },
  {
    id: 'chanterelle', title: 'A Song in the Air', npc: 'chanterelle', acts: [2, 3],
    pages: {
      start: () => ({
        text: 'Chanterelle is singing on a little stage. Her voice makes the flowers sway.',
        options: [
          {
            label: 'Listen', detail: 'Partners heal to full and gain 3 max HP.',
            go: (run) => {
              for (const p of run.partners) {
                p.maxHp += 3;
                p.hp = p.maxHp;
              }
              return 'listened';
            },
          },
          { label: 'Sing along', detail: '+1 max Star Power.', go: (run) => { run.starMax += 1; return 'sang'; } },
          leave(),
        ],
      }),
      listened: () => ({ text: 'Your partners are moved to tears. They feel stronger.', options: [leave()] }),
      sang: () => ({ text: 'Your duet echoes up to the stars. Star Power grows!', options: [leave()] }),
    },
  },
  {
    id: 'danet', title: 'Dance-Off', npc: 'danet', acts: [1, 3],
    pages: {
      start: () => ({
        text: 'Dane T. is busting moves. "Hey! Dance-off! Hit the beat three times, earn coins!"',
        options: [{ label: "Let's dance!", detail: '15 coins per beat. All 3: bonus item.', go: () => 'dance' }, leave('Maybe later')],
      }),
      dance: () => ({ text: 'Hit the beat!', minigame: { rounds: 3, then: 'danced' }, options: [] }),
      danced: (run, d) => {
        if (!d.applied) {
          d.applied = true;
          run.coins += 15 * d.hits;
          if (d.hits >= 3) d.bonus = addItem(run, 'honey') ? 'Honey Syrup' : null;
        }
        return { text: `You hit ${d.hits}/3 beats and earn ${15 * d.hits} coins!${d.bonus ? ' Perfect! Dane T. hands you a Honey Syrup.' : ''}`, options: [leave()] };
      },
    },
  },
  {
    id: 'parakarry', title: 'Lost Mail', npc: 'parakarry', acts: [1, 2],
    when: (run) => !run.partners.some((p) => p.id === 'parakarry'),
    pages: {
      start: () => ({
        text: 'Letters are scattered all over the path. Parakarry is in a flap. "My mailbag split open! Could you help me gather these up?"',
        options: [
          { label: 'Help search the bushes', detail: 'Mario loses 8 HP. Gain 75 coins.', go: (run) => { hurtMario(run, 8); run.coins += 75; return 'helped'; } },
          {
            label: 'Open a stray letter', detail: '50%: a gift inside (a badge). 50%: a bill (lose up to 40 coins).',
            go: (run, d, r) => {
              const badge = r.chance(0.5) ? rollBadge(run, r) : null;
              if (badge) {
                d.reward = badgeReward(badge);
                return 'gift';
              }
              d.paid = Math.min(40, run.coins);
              run.coins -= d.paid;
              return 'bill';
            },
          },
          leave(),
        ],
      }),
      helped: () => ({ text: 'Thorns everywhere, but you find every last letter. Parakarry pays you from his own pocket. (-8 HP, +75 coins)', options: [leave()] }),
      gift: (_run, d) => ({ text: '"Oh! That one was addressed to you anyway." There\'s a badge inside!', reward: d.reward, options: [leave('Continue')] }),
      bill: (_run, d) => ({ text: `It's an unpaid bill from the Toad Town Post Office... with Mario's name on it. (-${d.paid} coins)`, options: [leave()] }),
    },
  },
  {
    id: 'bandit', title: 'The Shell Game', npc: 'bandit', acts: [1, 2, 3],
    pages: {
      start: (run) => ({
        text: 'A Bandit has three shells lined up on a stump. "Step right up! Find the pea, win big! Only 25 coins a game!"',
        options: [
          {
            label: 'Play (25 coins)', detail: 'Pick the right shell to win 75 coins.',
            disabled: run.coins >= 25 ? null : 'Not enough coins',
            go: (r2, d, r) => {
              r2.coins -= 25;
              d.pea = r.int(0, 2);
              return 'shells';
            },
          },
          leave('Keep walking'),
        ],
      }),
      shells: (_run, d) => ({
        text: 'The shells blur around the stump... and stop. Which one hides the pea?',
        options: ['Left shell', 'Middle shell', 'Right shell'].map((label, i) => ({
          label,
          go: (run: RunState) => {
            if (i !== d.pea) return 'lost';
            run.coins += 75;
            return 'won';
          },
        })),
      }),
      won: () => ({ text: 'There it is! The Bandit grumbles and counts out 75 coins.', options: [leave()] }),
      lost: (_run, d) => ({ text: `Empty! "It was under the ${['left', 'middle', 'right'][d.pea]} one, see?" The Bandit grins and pockets your coins.`, options: [leave()] }),
    },
  },
  {
    id: 'hammerbro', title: 'Hammer Training', npc: 'hammerbro', acts: [1, 2],
    pages: {
      start: () => ({
        text: 'A Hammer Bro is juggling hammers in a clearing. "Hey, plumber! Think you can keep up? Catch my rhythm and I\'ll teach you a thing or two."',
        options: [
          { label: 'Spar with him', detail: 'Timing challenge: upgrade a card for each hit. Miss them all and Mario takes 10 damage.', go: () => 'spar' },
          leave(),
        ],
      }),
      spar: () => ({ text: 'Dodge the hammers! Press as each ring closes.', minigame: { rounds: 3, then: 'sparred' }, options: [] }),
      sparred: (run, d) => {
        if (d.hits >= 1) return { text: `You read his throws ${d.hits} time${d.hits > 1 ? 's' : ''}. "Not bad! Here's what I know."`, pick: { kind: 'upgrade', count: d.hits, then: 'done' }, options: [] };
        if (!d.applied) {
          d.applied = true;
          hurtMario(run, 10);
        }
        return { text: 'Bonk, bonk, bonk. "Come back when you\'re faster!" (-10 HP)', options: [leave()] };
      },
      done: () => ({ text: 'The Hammer Bro tips his helmet and goes back to juggling.', options: [leave()] }),
    },
  },
  {
    id: 'mushrooms', title: 'Wild Mushrooms', npc: 'i_mushroom', npcIcon: true, acts: [1, 2, 3],
    pages: {
      start: (run) => ({
        text: 'A ring of spotted mushrooms grows in the shade. They look tasty. Mostly.',
        options: [
          {
            label: 'Eat one', detail: 'Usually heals, sometimes raises max HP... and sometimes it\'s a Poison Shroom.',
            go: (r2, d, r) => {
              const roll = r.next();
              if (roll < 0.25) {
                hurtMario(r2, 8);
                d.ate = 'poison';
              } else if (roll < 0.6) {
                r2.mario.maxHp += 5;
                r2.mario.hp = Math.min(r2.mario.maxHp, r2.mario.hp + 5);
                d.ate = 'ultra';
              } else {
                r2.mario.hp = Math.min(r2.mario.maxHp, r2.mario.hp + 20);
                d.ate = 'super';
              }
              return 'ate';
            },
          },
          { label: 'Pick one for later', detail: 'Gain a Mushroom item.', disabled: bagFull(run), go: (r2) => { addItem(r2, 'mushroom'); return 'picked'; } },
          leave(),
        ],
      }),
      ate: (_run, d) => ({
        text: d.ate === 'poison' ? 'Bleh! A Poison Shroom. Mario turns a little green. (-8 HP)' : d.ate === 'ultra' ? 'Mario feels a surge of vigor! (+5 max HP)' : 'A Super Shroom! Delicious. (Heal 20 HP)',
        options: [leave()],
      }),
      picked: () => ({ text: 'You wrap a mushroom in a leaf and tuck it in your bag.', options: [leave()] }),
    },
  },
  {
    id: 'shrine', title: 'Star Shrine', npc: 'i_starpiece', npcIcon: true, acts: [1, 3],
    pages: {
      start: (run) => ({
        text: 'A tiny shrine glows at the side of the road. An inscription reads: "Give, and the stars will give back."',
        options: [
          {
            label: 'Offer 60 coins', detail: 'Gain a Super Block.',
            disabled: run.coins >= 60 ? null : 'Not enough coins',
            go: (r2) => { r2.coins -= 60; r2.superBlocks += 1; return 'block'; },
          },
          {
            label: 'Offer your strength', detail: 'Mario loses 5 max HP. +1 max Star Power.',
            disabled: run.mario.maxHp > 20 ? null : 'Too weak',
            go: (r2) => { loseMaxHp(r2, 5); r2.starMax += 1; return 'star'; },
          },
          leave(),
        ],
      }),
      block: () => ({ text: 'The coins vanish in a twinkle, and a Super Block drops into your hands. Use it at a rest site to rank up a partner.', options: [leave()] }),
      star: () => ({ text: 'Mario feels a little weaker, but a new star glimmers in his Star Power gauge.', options: [leave()] }),
    },
  },
  {
    id: 'kammy', title: "Kammy's Brew", npc: 'kammy', acts: [2, 3],
    when: (run) => !run.badges.includes('fpPlus'),
    pages: {
      start: () => ({
        text: 'Kammy Koopa swoops down on her broom, stirring a bubbling pot. "Mario! How about a little taste? It\'s perfectly safe. Mostly. Hee hee!"',
        options: [
          { label: 'Drink the brew', detail: 'Mario loses 8 max HP. Gain the FP Plus badge (+1 FP every turn).', go: (run) => { loseMaxHp(run, 8); addBadge(run, 'fpPlus'); return 'drank'; } },
          { label: 'Insult her hat', detail: 'Gain 80 coins. Add a Haunted curse to your deck.', go: (run) => { run.coins += 80; addCard(run, 'haunted'); return 'insulted'; } },
          leave('Back away slowly'),
        ],
      }),
      drank: () => ({ text: 'It tastes like old socks... but Mario\'s Flower Points surge! Kammy cackles and flies off. (-8 max HP, +FP Plus)', options: [leave()] }),
      insulted: () => ({ text: '"How DARE you!" She hurls a bag of coins at your head in a rage... and a curse along with it.', options: [leave()] }),
    },
  },
  {
    id: 'boo', title: "Boo's Mirror", npc: 'boo', acts: [2, 3],
    pages: {
      start: () => ({
        text: 'A Boo is admiring itself in a tall, dusty mirror. "Ooh, a visitor! This mirror shows you a second you. Want a look?"',
        options: [
          { label: 'Look into the mirror', detail: 'Duplicate a card in your deck.', go: () => 'look' },
          { label: 'Smash it', detail: 'Gain 50 coins from the frame. Add a Haunted curse to your deck.', go: (run) => { run.coins += 50; addCard(run, 'haunted'); return 'smashed'; } },
          leave(),
        ],
      }),
      look: () => ({ text: 'Your reflection winks back. Choose a card to copy.', pick: { kind: 'duplicate', count: 1, then: 'looked' }, options: [] }),
      looked: () => ({ text: 'When you step away, the copy steps out with you. The Boo giggles.', options: [leave()] }),
      smashed: () => ({ text: 'CRASH! You pry the gold off the frame. The Boo shrieks: "Seven years of bad luck!"', options: [leave()] }),
    },
  },
  {
    id: 'ninji', title: 'Snowball Fight', npc: 'ninji', acts: [3],
    pages: {
      start: (run) => ({
        text: 'A gang of Ninjis pops out of a snowdrift. "Snowball fight! Loser pays!"',
        options: [
          { label: 'Fight!', detail: 'Timing challenge: 20 coins per hit, plus a Snowman Doll for all 3. Miss them all and you catch Frostbite.', go: () => 'fight' },
          { label: 'Build a snowman', detail: 'Gain a Snowman Doll item.', disabled: bagFull(run), go: (r2) => { addItem(r2, 'snowman'); return 'built'; } },
          leave(),
        ],
      }),
      fight: () => ({ text: 'Throw when the ring closes!', minigame: { rounds: 3, then: 'fought' }, options: [] }),
      fought: (run, d) => {
        if (!d.applied) {
          d.applied = true;
          run.coins += 20 * d.hits;
          if (d.hits >= 3) d.doll = addItem(run, 'snowman');
          if (d.hits === 0) addCard(run, 'frozen');
        }
        const text =
          d.hits === 0
            ? 'You get buried in a snowdrift. Brrr! (Frostbite added to your deck)'
            : `You land ${d.hits}/3 throws and win ${20 * d.hits} coins!${d.doll ? ' The Ninjis hand over a Snowman Doll.' : ''}`;
        return { text, options: [leave()] };
      },
      built: () => ({ text: 'You build a tiny snowman. The Ninjis are impressed. It fits right in your bag.', options: [leave()] }),
    },
  },
  {
    id: 'clubba', title: 'Sleeping Guard', npc: 'clubba', acts: [2, 3],
    pages: {
      start: () => ({
        text: 'A Clubba snores in front of a treasure chest, club across its lap. ZZZ...',
        options: [
          {
            label: 'Sneak to the chest', detail: '60%: a rare item and 40 coins. Otherwise Mario takes 12 damage.',
            go: (run, d, r) => {
              if (!r.chance(0.6)) {
                hurtMario(run, 12);
                return 'woke';
              }
              run.coins += 40;
              d.item = addItem(run, rollItem(r, [['rare', 1]]));
              return 'looted';
            },
          },
          leave('Let it sleep'),
        ],
      }),
      looted: (_run, d) => ({ text: `You tiptoe past and pop the chest open: 40 coins${d.item ? ' and a rare item!' : '! There was an item too, but your bag is full.'}`, options: [leave()] }),
      woke: () => ({ text: 'CREAK. The Clubba\'s eye snaps open. WHAM! You run for it. (-12 HP)', options: [leave()] }),
    },
  },
  {
    id: 'drybones', title: 'The Bone Trader', npc: 'drybones', acts: [2, 3],
    pages: {
      start: () => ({
        text: 'A Dry Bones rattles beside a pile of old cards. "Trade? I\'ll take one of yours. You pick one of my best."',
        options: [
          {
            label: 'Trade a card', detail: 'Remove a card, then choose 1 of 3 rare cards.',
            go: (run, d, r) => {
              d.reward = cardReward(rollCards(run, r, 3, [['rare', 1]]));
              return 'give';
            },
          },
          leave(),
        ],
      }),
      give: () => ({ text: 'Which card will you hand over?', pick: { kind: 'remove', count: 1, then: 'take' }, options: [] }),
      take: (_run, d) => ({ text: '"Pleasure doing business." The Dry Bones fans out its best cards.', reward: d.reward, options: [leave('Continue')] }),
    },
  },
  {
    id: 'block', title: '? Block', npc: 'quiz', npcIcon: true, acts: [1, 2, 3],
    pages: {
      start: () => ({
        text: 'A ? Block floats by the path, spinning gently.',
        options: [
          {
            label: 'Hit it!',
            go: (run, d, r) => {
              const roll = r.next();
              if (roll < 0.2) {
                run.superBlocks += 1;
                d.got = 'a Super Block! Use it at a rest site to rank up a partner.';
              } else if (roll < 0.6) {
                const id = rollItem(r);
                d.got = addItem(run, id) ? 'an item!' : 'an item, but your bag is full.';
              } else {
                run.coins += 30;
                d.got = '30 coins!';
              }
              return 'hit';
            },
          },
          leave(),
        ],
      }),
      hit: (_run, d) => ({ text: `Bonk! Out pops ${d.got}`, options: [leave()] }),
    },
  },
];

export const EVENTS: Record<string, EventDef> = Object.fromEntries(EVENT_LIST.map((e) => [e.id, e]));
