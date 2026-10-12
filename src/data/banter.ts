import type { PartnerId } from '../engine/types';

/** Short battle quips per partner. "Mario" is swapped for the current hero when shown. */
export interface Banter {
  /** a boss fight starts */
  boss: string[];
  /** this partner's card defeats an enemy */
  kill: string[];
  /** the hero drops low */
  worry: string[];
  /** this partner's combo bonus kicks in (said by the combo partner) */
  combo: string[];
}

export const BANTER: Record<PartnerId, Banter> = {
  goombario: {
    boss: ["I've read about this one! Hit it where it's Soft!", "Tattle time! It's tougher than it looks.", 'Okay, deep breath. We can do this!'],
    kill: ['Bonk! Did you see that?', 'Right on the noggin!', "That's in the Tattle Log now!"],
    worry: ['Mario, you look awful! Heal up!', "Careful! You can't take much more!"],
    combo: ['Teamwork, just like the book said!', 'I knew that would work!'],
  },
  kooper: {
    boss: ["My shell's ready. Are you?", "I've faced worse... probably.", "Stay behind my shell!"],
    kill: ['Strike! Just like bowling!', 'Shell shock!', "That's how we do it in Koopa Village!"],
    worry: ["Mario! Get behind my shell!", "You're hurt bad. I'll cover you!"],
    combo: ['Shell power, combined!', 'Great timing, partner!'],
  },
  bombette: {
    boss: ["Big target. Bigger boom!", "Let's blow this joint!", 'I was born for this fight!'],
    kill: ['KA-BOOM!', 'Blown away!', "That's what I call a blast!"],
    worry: ["Mario! Don't you dare fall on me!", "Hang on! I'll blast a path!"],
    combo: ['Double the boom!', 'Now THAT is an explosion!'],
  },
  parakarry: {
    boss: ["This wasn't on my delivery route...", 'Special delivery: one beating!', "Let's sign for this one quickly."],
    kill: ['Return to sender!', 'Delivered!', 'Postage paid in full!'],
    worry: ["Mario! I'll airmail you a Mushroom!", "You need first-class healing, fast!"],
    combo: ['Priority shipping!', 'Right on schedule!'],
  },
  bow: {
    boss: ['How dreadfully rude. Let me handle this.', "Hmph. I've slapped bigger.", 'Booooo. Not scary at all.'],
    kill: ['Hmph! Know your place.', "Slapped silly.", 'Ohohoho! Too easy.'],
    worry: ["Mario, don't you dare faint in front of me!", 'Stay close. I can hide you.'],
    combo: ['Elegant, if I do say so.', 'Finally, a partner with taste.'],
  },
  watt: {
    boss: ["Let's light 'em up!", "I'm all charged up!", "Ooh, it's big! It's shiny!"],
    kill: ['Zap!', 'Shocking, right?', "Lights out!"],
    worry: ['Mario! Your light is fading!', "I'll keep shining for you!"],
    combo: ['Power surge!', 'Super charged!'],
  },
  sushie: {
    boss: ['Children, stay behind me!', "Nobody hurts my little ones!", 'Time for a splash of discipline.'],
    kill: ['Washed away!', 'Mind your manners!', 'There, all clean.'],
    worry: ["Mario, dear, you need rest!", "Oh my, you're hurt! Hold still!"],
    combo: ['Lovely teamwork, dears!', 'Just like I taught you!'],
  },
  lakilester: {
    boss: ["Heh. This guy's toast.", "Whatever. Let's just do this.", 'Spiny storm incoming!'],
    kill: ['Too slow!', 'Get spiked!', 'Later, loser.'],
    worry: ["Yo, Mario! Don't quit on me now!", "You look rough. Heal, man!"],
    combo: ["Not bad. Not bad at all.", "Okay, that was kinda cool."],
  },
  kolorado: {
    boss: ['By Jove, what a specimen!', "Splendid! A discovery for the ages!", 'Stand back, old chap. Science!'],
    kill: ['Excavated!', 'Into the museum with you!', 'A fine artifact indeed!'],
    worry: ["Mario, old bean, you're looking peaky!", "Steady on! Take a breather!"],
    combo: ['A historic collaboration!', 'Ha! Textbook!'],
  },
  kammy: {
    boss: ['Hee hee! This will be fun!', 'My magic is ready, Your Nastiness!', "Let's teach it some manners!"],
    kill: ['Hexed!', 'Hee hee hee!', 'Poof! Gone!'],
    worry: ['Your Majesty! Let me shield you!', "Careful, careful! You're hurt!"],
    combo: ['Wonderful magic!', 'Just as I planned!'],
  },
};
