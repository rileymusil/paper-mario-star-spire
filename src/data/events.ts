import type { Reward, RunState } from '../engine/types';
import type { Rng } from '../engine/rng';
import { addCard, addItem, canUpgrade, healTeam, rollBadge, rollCards, rollItem, upgradeCard } from '../engine/run';

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
  pick?: { kind: 'remove' | 'upgrade' | 'transform'; count: number; then: string };
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
