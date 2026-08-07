export const MODULE = { ID: 'token-action-hud-megs' };

export const SYSTEM = { ID: 'megs' };

/**
 * "2.1" rather than "2": Token Action HUD Core 2.1 deprecated the encodedValue
 * action format this module does not use, and a further minor could move the
 * contract again. Pinning to the minor makes that break loud instead of silent.
 */
export const REQUIRED_CORE_MODULE_VERSION = '2.1';

/**
 * MEGS attribute order is fixed: every third attribute is an Acting attribute
 * and is the only one that can be rolled. The other six are Effect and
 * Resisting attributes, which the system shows but does not roll.
 */
export const ACTING_ATTRIBUTES = ['dex', 'int', 'infl'];

export const ATTRIBUTE_CATEGORIES = {
    physical: ['dex', 'str', 'body'],
    mental: ['int', 'will', 'mind'],
    mystical: ['infl', 'aura', 'spirit'],
};

/** Action types, resolved by the roll handler. */
export const ACTION_TYPE = {
    attribute: 'attribute',
    power: 'power',
    skill: 'skill',
    subskill: 'subskill',
    gadget: 'gadget',
    utility: 'utility',
};

/** Actor types the HUD builds a full action set for. */
export const CHARACTER_TYPES = ['hero', 'villain', 'npc'];

/** Actor types that only carry gadgets. */
export const GADGET_ONLY_TYPES = ['vehicle', 'location'];

export const GROUP = {
    physical: { id: 'physical', name: 'tokenActionHud.megs.physical', type: 'system' },
    mental: { id: 'mental', name: 'tokenActionHud.megs.mental', type: 'system' },
    mystical: { id: 'mystical', name: 'tokenActionHud.megs.mystical', type: 'system' },
    powers: { id: 'powers', name: 'tokenActionHud.megs.powers', type: 'system' },
    skills: { id: 'skills', name: 'tokenActionHud.megs.skills', type: 'system' },
    gadgets: { id: 'gadgets', name: 'tokenActionHud.megs.gadgets', type: 'system' },
    combat: { id: 'combat', name: 'tokenActionHud.megs.combat', type: 'system' },
};
