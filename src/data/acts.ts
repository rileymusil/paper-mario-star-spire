export interface ActDef {
  n: number;
  name: string;
  subtitle: string;
  backgrounds: string[];
  bossBg: string;
  /** first fights of the act */
  easy: string[][];
  normal: string[][];
  elite: string[][];
  bosses: string[];
  /** extra enemies that join each boss */
  bossParty: Record<string, string[]>;
  shopkeeper: string;
}

export const ACTS: ActDef[] = [
  {
    n: 1,
    name: 'Pleasant Path',
    subtitle: 'Act 1',
    backgrounds: ['hills', 'hedges', 'flowers'],
    bossBg: 'flowers',
    easy: [['goomba', 'goomba'], ['paragoomba', 'goomba'], ['koopa'], ['bobomb', 'goomba']],
    normal: [
      ['goomba', 'goomba', 'paragoomba'],
      ['koopa', 'koopa'],
      ['bobomb', 'bobomb'],
      ['piranha', 'goomba'],
      ['bandit', 'goomba'],
      ['bubulb_green', 'koopa'],
      ['paragoomba', 'paragoomba', 'paragoomba'],
      ['piranha', 'bubulb_yellow'],
      ['koopa', 'bubulb_yellow', 'paragoomba'],
    ],
    elite: [['hammerbro'], ['bobomb_blue', 'bobomb', 'bobomb'], ['koopa2', 'koopa2']],
    bosses: ['goombaking', 'buzzar', 'lily'],
    bossParty: {},
    shopkeeper: 'danet',
  },
  {
    n: 2,
    name: 'Dry Dry Wilds',
    subtitle: 'Act 2',
    backgrounds: ['desert', 'canyon', 'forest', 'jungle', 'dunes'],
    bossBg: 'sandstorm',
    easy: [['buzzy', 'swooper'], ['drybones', 'drybones'], ['boo', 'boo'], ['bandit2', 'bubulb_pink']],
    normal: [
      ['buzzy', 'buzzy', 'swooper'],
      ['drybones', 'drybones', 'bubulb_blue'],
      ['boo', 'boo', 'boo'],
      ['bulletbill', 'bulletbill', 'bulletbill'],
      ['clubba', 'bubulb_pink'],
      ['swooper', 'swooper', 'buzzy'],
      ['bandit2', 'drybones'],
      ['clubba', 'boo'],
      ['bulletbill', 'buzzy', 'bulletbill'],
    ],
    elite: [['albino'], ['gustyboo', 'boo'], ['drybones', 'drybones', 'drybones']],
    bosses: ['tubba', 'gourmet', 'raphael'],
    bossParty: {},
    shopkeeper: 'bartender',
  },
  {
    n: 3,
    name: 'Star Way',
    subtitle: 'Act 3',
    backgrounds: ['snow', 'candy', 'stars', 'starway'],
    bossBg: 'castle',
    easy: [['ninji', 'ninji_red'], ['koopa2', 'goomba3'], ['clubba3'], ['buzzy3', 'swooper3']],
    normal: [
      ['ninji', 'ninji_blue', 'ninji_green'],
      ['hammerbro3'],
      ['clubba3', 'bubulb_pink3'],
      ['drybones3', 'drybones3', 'bubulb_blue3'],
      ['buzzy3', 'buzzy3', 'swooper3'],
      ['goomba3', 'goomba3', 'goomba3'],
      ['ninji_yellow', 'albino3'],
      ['boo', 'boo', 'gustyboo3'],
    ],
    elite: [['hammerbro3', 'hammerbro3'], ['ninji_red', 'ninji_blue', 'ninji_yellow'], ['albino3', 'bubulb_blue3']],
    bosses: ['bowser'],
    bossParty: { bowser: ['kammy'] },
    shopkeeper: 'twirler',
  },
];

export const FLOORS = 10;
