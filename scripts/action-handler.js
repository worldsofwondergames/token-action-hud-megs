import {
    ACTION_ROLL,
    ACTION_TYPE,
    ATTRIBUTE_CATEGORIES,
    CHARACTER_TYPES,
    GADGET_ONLY_TYPES,
    GROUP,
    MODULE,
} from './constants.js';

export let ActionHandler = null;

Hooks.once('tokenActionHudCoreApiReady', async (coreModule) => {
    ActionHandler = class ActionHandler extends coreModule.api.ActionHandler {
        /**
         * Called by Token Action HUD Core to populate the HUD for the current
         * selection.
         *
         * @override
         * @param {string[]} groupIds
         */
        async buildSystemActions(groupIds) {
            if (!this.actor) {
                // Nothing selected, or several tokens: only the actions that do
                // not belong to one actor make sense.
                this.#buildUtility();
                return;
            }

            const type = this.actor.type;

            if (CHARACTER_TYPES.includes(type)) {
                this.#buildAttributes();
                this.#buildPowers();
                await this.#buildSkills();
                this.#buildGadgets();
                this.#buildUtility();
                return;
            }

            if (GADGET_ONLY_TYPES.includes(type)) {
                this.#buildGadgets();
                return;
            }

            // Anything else -- notably `pet`, which the MEGS system removes from
            // game.model.Actor at setup -- is deliberately unsupported and gets
            // an empty HUD rather than an error.
        }

        /* ---------------------------------------------------------------- */

        /**
         * Attributes, grouped by their own `type` field.
         *
         * Only the Acting attributes can be rolled; MEGS marks those by listing
         * "action" in the attribute's `rolls`. The other six are Effect and
         * Resisting attributes, which are shown for reference and open the sheet
         * when clicked.
         */
        #buildAttributes() {
            const attributes = this.actor.system?.attributes ?? {};
            const showNonRollable = game.settings.get(MODULE.ID, 'showNonRollableAttributes');
            const byCategory = new Map(ATTRIBUTE_CATEGORIES.map(c => [c, []]));

            for (const [key, attribute] of Object.entries(attributes)) {
                const isRollable = (attribute.rolls ?? []).includes(ACTION_ROLL);
                if (!isRollable && !showNonRollable) continue;

                const category = attribute.type ?? ATTRIBUTE_CATEGORIES[0];
                if (!byCategory.has(category)) byCategory.set(category, []);

                // The abbreviation, not the full label: nine attributes have to
                // fit a 3x3 grid, and the sheet labels them this way too. The
                // full name still appears in the tooltip via listName.
                const abbr = key.toUpperCase();
                const name = attribute.label ?? abbr;
                byCategory.get(category).push({
                    id: `attribute-${key}`,
                    name: `${abbr} ${attribute.value ?? 0}`,
                    listName: `Action: ${name}`,
                    cssClass: isRollable ? '' : 'disabled',
                    system: {
                        actionType: isRollable ? ACTION_TYPE.attribute : ACTION_TYPE.attributeInfo,
                        actionId: key,
                    },
                });
            }

            for (const [category, actions] of byCategory) {
                if (!actions.length) continue;
                const group = GROUP[category];
                if (!group) continue;
                this.addActions(actions, { id: group.id });
            }
        }

        /* ---------------------------------------------------------------- */

        /**
         * Powers the character owns.
         *
         * Items carrying `system.parent` belong to a gadget and are shown under
         * that gadget on the sheet, so they are excluded here for the same
         * reason -- this mirrors actor-sheet's `_categorizeItem()`.
         */
        #buildPowers() {
            const actions = this.actor.items
                .filter(i => i.type === 'power' && !i.system.parent && (i.system.aps ?? 0) > 0)
                .sort(byName)
                .map(item => ({
                    id: item.id,
                    name: `${item.name}: ${item.system.aps}`,
                    listName: `Action: ${item.name}`,
                    img: coreModule.api.Utils.getImage(item),
                    system: { actionType: ACTION_TYPE.power, actionId: item.id },
                }));

            if (actions.length) this.addActions(actions, { id: GROUP.powers.id });
        }

        /* ---------------------------------------------------------------- */

        /**
         * Skills, with subskills nested under their parent.
         *
         * A skill that has trained subskills becomes its own subgroup holding
         * the skill itself plus each subskill, so the parent stays rollable
         * alongside its specialisations. A skill with no subskills is added
         * directly -- wrapping it in a subgroup would mean opening a submenu
         * containing a single entry.
         */
        async #buildSkills() {
            const showSubskills = game.settings.get(MODULE.ID, 'showSubskills');

            const skills = this.actor.items
                .filter(i => i.type === 'skill' && !i.system.parent && (i.system.aps ?? 0) > 0)
                .sort(byName);
            if (!skills.length) return;

            const subskillsByParent = new Map();
            if (showSubskills) {
                for (const item of this.actor.items) {
                    if (item.type !== 'subskill' || !item.system.isTrained) continue;
                    const list = subskillsByParent.get(item.system.parent) ?? [];
                    list.push(item);
                    subskillsByParent.set(item.system.parent, list);
                }
            }

            const flat = [];
            for (const skill of skills) {
                const subskills = (subskillsByParent.get(skill.id) ?? []).sort(byName);
                const skillAction = this.#skillAction(skill);

                if (!subskills.length) {
                    flat.push(skillAction);
                    continue;
                }

                const groupData = {
                    id: `skill-${skill.id}`,
                    name: skill.name,
                    type: 'system-derived',
                };
                await this.addGroup(groupData, { id: GROUP.skills.id, type: 'system' });
                this.addActions(
                    [skillAction, ...subskills.map(sub => this.#subskillAction(sub))],
                    groupData
                );
            }

            if (flat.length) this.addActions(flat, { id: GROUP.skills.id });
        }

        /** @private */
        #skillAction(item) {
            return {
                id: item.id,
                name: `${item.name}: ${item.system.aps}`,
                listName: `Action: ${item.name}`,
                img: coreModule.api.Utils.getImage(item),
                system: { actionType: ACTION_TYPE.skill, actionId: item.id },
            };
        }

        /** @private */
        #subskillAction(item) {
            return {
                id: item.id,
                name: `${item.name}: ${item.system.aps}`,
                listName: `Action: ${item.name}`,
                img: coreModule.api.Utils.getImage(item),
                system: { actionType: ACTION_TYPE.subskill, actionId: item.id },
            };
        }

        /* ---------------------------------------------------------------- */

        /** Top-level gadgets. Sub-gadgets are reached through their parent. */
        #buildGadgets() {
            const actions = this.actor.items
                .filter(i => i.type === 'gadget' && !i.system.parent)
                .sort(byName)
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    listName: `Action: ${item.name}`,
                    img: coreModule.api.Utils.getImage(item),
                    cssClass: item.system.isBroken ? 'disabled' : '',
                    system: { actionType: ACTION_TYPE.gadget, actionId: item.id },
                }));

            if (actions.length) this.addActions(actions, { id: GROUP.gadgets.id });
        }

        /* ---------------------------------------------------------------- */

        /** Combat actions, only meaningful while an encounter is running. */
        #buildUtility() {
            if (!game.combat) return;

            const actions = [
                {
                    id: 'initiative',
                    name: coreModule.api.Utils.i18n('tokenActionHud.megs.rollInitiative'),
                    listName: 'Action: Roll Initiative',
                    system: { actionType: ACTION_TYPE.initiative, actionId: 'initiative' },
                },
                {
                    id: 'endTurn',
                    name: coreModule.api.Utils.i18n('tokenActionHud.megs.endTurn'),
                    listName: 'Action: End Turn',
                    system: { actionType: ACTION_TYPE.endTurn, actionId: 'endTurn' },
                },
            ];

            this.addActions(actions, { id: GROUP.utility.id });
        }
    };
});

function byName(a, b) {
    return a.name.localeCompare(b.name);
}
