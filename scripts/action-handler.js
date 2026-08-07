import { CHARACTER_TYPES, GADGET_ONLY_TYPES } from './constants.js';

export let ActionHandler = null;

Hooks.once('tokenActionHudCoreApiReady', async (coreModule) => {
    ActionHandler = class ActionHandler extends coreModule.api.ActionHandler {
        /**
         * Called by Token Action HUD Core to populate the HUD for the current
         * selection.
         *
         * Phase 2 skeleton: establishes the actor/type routing and renders an
         * empty HUD. Populating the groups is Phase 3 (see MEGS issue #156).
         *
         * @override
         * @param {string[]} groupIds
         */
        async buildSystemActions(groupIds) {
            this.actorType = this.actor?.type;

            // No token selected, or several: only utility actions apply, and
            // those arrive in Phase 3. Returning early keeps an unsupported
            // selection from throwing rather than rendering nothing.
            if (!this.actor) return;

            if (CHARACTER_TYPES.includes(this.actorType)) {
                await this.#buildCharacterActions();
                return;
            }

            if (GADGET_ONLY_TYPES.includes(this.actorType)) {
                await this.#buildGadgetOnlyActions();
                return;
            }

            // Anything else -- notably `pet`, which the MEGS system removes from
            // game.model.Actor at setup -- is deliberately unsupported and gets
            // an empty HUD rather than an error.
        }

        /** @private */
        async #buildCharacterActions() {
            // Phase 3: attributes, powers, skills, gadgets, utility.
        }

        /** @private */
        async #buildGadgetOnlyActions() {
            // Phase 3: gadgets only.
        }
    };
});
