export const MODULE = { ID: 'token-action-hud-megs' };

export const SYSTEM = { ID: 'megs' };

/**
 * "2.1" rather than "2": Token Action HUD Core 2.1 deprecated the encodedValue
 * action format this module does not use, and a further minor could move the
 * contract again. Pinning to the minor makes that break loud instead of silent.
 */
export const REQUIRED_CORE_MODULE_VERSION = '2.1';

/**
 * Attribute category and rollability are read from the actor's own data rather
 * than hardcoded here: every MEGS attribute carries `type` (physical / mental /
 * mystical) and a `rolls` array, and only the three Acting attributes list
 * "action". Deriving from that keeps this module correct if the system ever
 * adds an attribute or changes which ones can be rolled.
 */
export const ACTION_ROLL = 'action';

/** Fallback order for grouping, used only if an attribute is missing `type`. */
export const ATTRIBUTE_CATEGORIES = ['physical', 'mental', 'mystical'];

/** Action types, resolved by the roll handler. */
export const ACTION_TYPE = {
    attribute: 'attribute',
    attributeInfo: 'attributeInfo',
    power: 'power',
    skill: 'skill',
    subskill: 'subskill',
    gadget: 'gadget',
    endTurn: 'endTurn',
    initiative: 'initiative',
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
    utility: { id: 'utility', name: 'tokenActionHud.megs.utility', type: 'system' },
};
