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
                this.#buildSkills();
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

                const name = attribute.label ?? key.toUpperCase();
                byCategory.get(category).push({
                    id: `attribute-${key}`,
                    name: `${name}: ${attribute.value ?? 0}`,
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

        #buildSkills() {
            const showSubskills = game.settings.get(MODULE.ID, 'showSubskills');

            const skills = this.actor.items
                .filter(i => i.type === 'skill' && !i.system.parent && (i.system.aps ?? 0) > 0)
                .sort(byName);

            const actions = skills.map(item => ({
                id: item.id,
                name: `${item.name}: ${item.system.aps}`,
                listName: `Action: ${item.name}`,
                img: coreModule.api.Utils.getImage(item),
                system: { actionType: ACTION_TYPE.skill, actionId: item.id },
            }));

            if (showSubskills) {
                const skillIds = new Set(skills.map(s => s.id));
                const subskills = this.actor.items
                    .filter(i => i.type === 'subskill'
                        && i.system.isTrained
                        && skillIds.has(i.system.parent))
                    .sort(byName);

                for (const item of subskills) {
                    const parent = skills.find(s => s.id === item.system.parent);
                    actions.push({
                        id: item.id,
                        name: `${parent.name} / ${item.name}`,
                        listName: `Action: ${parent.name} / ${item.name}`,
                        img: coreModule.api.Utils.getImage(item),
                        system: { actionType: ACTION_TYPE.subskill, actionId: item.id },
                    });
                }
            }

            if (actions.length) this.addActions(actions, { id: GROUP.skills.id });
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

            this.addActions(actions, { id: GROUP.combat.id });
        }
    };
});

function byName(a, b) {
    return a.name.localeCompare(b.name);
}
