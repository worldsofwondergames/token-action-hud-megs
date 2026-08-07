export let RollHandler = null;

Hooks.once('tokenActionHudCoreApiReady', async (coreModule) => {
    RollHandler = class RollHandler extends coreModule.api.RollHandler {
        /**
         * Called by Token Action HUD Core when an action is clicked.
         *
         * Core 2.1 supplies the action on `this.action.system` and the resolved
         * actor/token on `this.actor` / `this.token`. There is no encodedValue
         * argument -- that format was deprecated in 2.0 and is gone from current
         * system modules.
         *
         * Phase 2 skeleton: dispatch shape only. The individual handlers are
         * Phase 4 (see MEGS issue #156), and every one of them must call an
         * existing MEGS entry point rather than reimplement a roll, so the hero
         * point dialog, doubles prompt, column shifts and chat formatting stay
         * identical to a sheet roll.
         *
         * @override
         * @param {object} event
         */
        async handleActionClick(event) {
            const { actionType, actionId } = this.action.system;

            if (!this.actor) {
                for (const token of coreModule.api.Utils.getControlledTokens()) {
                    await this.#handleAction(event, actionType, token.actor, token, actionId);
                }
                return;
            }

            await this.#handleAction(event, actionType, this.actor, this.token, actionId);
        }

        /** @private */
        async #handleAction(event, actionType, actor, token, actionId) {
            switch (actionType) {
                default:
                    // Phase 4 fills this in. Until then an unknown action type is
                    // reported rather than silently ignored.
                    console.warn(
                        `token-action-hud-megs: no handler for action type "${actionType}"`
                    );
            }
        }
    };
});
