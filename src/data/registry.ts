import type { BadgeDef, CardDef, EnemyDef, ItemDef, PartnerDef, SpecialDef, StatusDef } from '../engine/defs';
import type { PartnerId } from '../engine/types';
import { CARD_LIST } from './cards';
import { ENEMY_LIST } from './enemies';
import { PARTNER_LIST } from './partners';
import { BADGE_LIST, ITEM_LIST, SPECIAL_LIST, STATUS_LIST } from './misc';

const byId = <T extends { id: string }>(list: T[]): Record<string, T> => Object.fromEntries(list.map((x) => [x.id, x]));

export const CARDS: Record<string, CardDef> = byId(CARD_LIST);
export const ENEMIES: Record<string, EnemyDef> = byId(ENEMY_LIST);
export const PARTNERS = byId(PARTNER_LIST) as Record<PartnerId, PartnerDef>;
export const ITEMS: Record<string, ItemDef> = byId(ITEM_LIST);
export const BADGES: Record<string, BadgeDef> = byId(BADGE_LIST);
export const SPECIALS: Record<string, SpecialDef> = byId(SPECIAL_LIST);
export const STATUSES = byId(STATUS_LIST) as Record<string, StatusDef>;
