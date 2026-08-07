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
            const attributes = Object.entries(this.actor.system?.attributes ?? {});
            if (!attributes.length) return;

            const showNonRollable = game.settings.get(MODULE.ID, 'showNonRollableAttributes');

            // Only the Acting attributes: put all three in one group. Splitting
            // three entries across Physical / Mental / Mystical would give three
            // submenus holding one item each.
            if (!showNonRollable) {
                const actions = attributes
                    .filter(([, attr]) => (attr.rolls ?? []).includes(ACTION_ROLL))
                    .map(([key, attr]) => this.#attributeAction(key, attr, true));
                if (actions.length) this.addActions(actions, { id: GROUP.acting.id });
                return;
            }

            // All nine: group by the attribute's own category so they form a
            // 3x3 square.
            const byCategory = new Map(ATTRIBUTE_CATEGORIES.map(c => [c, []]));
            for (const [key, attr] of attributes) {
                const isRollable = (attr.rolls ?? []).includes(ACTION_ROLL);
                const category = attr.type ?? ATTRIBUTE_CATEGORIES[0];
                if (!byCategory.has(category)) byCategory.set(category, []);
                byCategory.get(category).push(this.#attributeAction(key, attr, isRollable));
            }

            for (const [category, actions] of byCategory) {
                if (!actions.length) continue;
                const group = GROUP[category];
                if (group) this.addActions(actions, { id: group.id });
            }
        }

        /**
         * The abbreviation, not the full label: nine of these have to fit a 3x3
         * grid, and the character sheet labels them the same way. The full name
         * stays on the tooltip via listName.
         *
         * @private
         */
        #attributeAction(key, attribute, isRollable) {
            const abbr = key.toUpperCase();
            const name = attribute.label ?? abbr;
            return {
                id: `attribute-${key}`,
                name: `${abbr} ${attribute.value ?? 0}`,
                listName: `Action: ${name}`,
                cssClass: isRollable ? '' : 'disabled',
                system: {
                    actionType: isRollable ? ACTION_TYPE.attribute : ACTION_TYPE.attributeInfo,
                    actionId: key,
                },
            };
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
                    // Automatic powers are not rolled; the character sheet greys
                    // their d10 and the HUD dims them to match.
                    cssClass: item.system.type === 'auto' ? 'disabled' : '',
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

            // The actor's own "Hide Zero Rank Skills" checkbox. Stored as a
            // string by the sheet template, so "false" must not read as truthy --
            // a mistake this system has made before with other flags.
            const raw = this.actor.system?.settings?.hideZeroAPSkills;
            const hideZeroApSkills = String(raw ?? true) !== 'false';

            const subskillsByParent = new Map();
            if (showSubskills) {
                for (const item of this.actor.items) {
                    if (item.type !== 'subskill' || !item.system.isTrained) continue;
                    const list = subskillsByParent.get(item.system.parent) ?? [];
                    list.push(item);
                    subskillsByParent.set(item.system.parent, list);
                }
            }

            const skills = this.actor.items
                .filter(i => i.type === 'skill' && !i.system.parent)
                .sort(byName);

            const flat = [];
            for (const skill of skills) {
                const skillAps = skill.system.aps ?? 0;

                // A subskill is only worth listing when it beats the base skill;
                // at or below it, rolling the skill itself is the same or better.
                const subskills = (subskillsByParent.get(skill.id) ?? [])
                    .filter(sub => (sub.system.aps ?? 0) > skillAps)
                    .sort(byName);

                if (skillAps === 0 && !subskills.length && hideZeroApSkills) continue;

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
            ];

            // End Turn is only offered to whoever is actually up. Showing it
            // otherwise invites a player to end someone else's turn.
            if (this.#isActorsTurn()) {
                actions.push({
                    id: 'endTurn',
                    name: coreModule.api.Utils.i18n('tokenActionHud.megs.endTurn'),
                    listName: 'Action: End Turn',
                    system: { actionType: ACTION_TYPE.endTurn, actionId: 'endTurn' },
                });
            }

            this.addActions(actions, { id: GROUP.utility.id });
        }

        /**
         * True only when an encounter has actually begun and the current
         * combatant is this token. A combat that exists but has not been started
         * has no current turn, so nobody's turn it is.
         *
         * @private
         */
        #isActorsTurn() {
            const combat = game.combat;
            if (!combat?.started) return false;

            const combatant = combat.combatant;
            if (!combatant) return false;

            // Match on the token first: an actor can have several tokens in the
            // encounter, and only the one whose turn it is should offer End Turn.
            if (this.token?.id) return combatant.tokenId === this.token.id;
            return !!this.actor && combatant.actorId === this.actor.id;
        }
    };
});

function byName(a, b) {
    return a.name.localeCompare(b.name);
}
