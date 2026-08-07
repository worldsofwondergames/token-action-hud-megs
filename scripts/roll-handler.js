import { ACTION_TYPE } from './constants.js';

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
         * @override
         * @param {object} event
         */
        async handleActionClick(event) {
            const { actionType, actionId } = this.action.system;

            if (!this.actor) {
                for (const token of coreModule.api.Utils.getControlledTokens()) {
                    await this.#handleAction(actionType, token.actor, token, actionId);
                }
                return;
            }

            await this.#handleAction(actionType, this.actor, this.token, actionId);
        }

        /**
         * Every branch calls an existing MEGS entry point rather than
         * reimplementing a roll, so a HUD roll behaves exactly like the same roll
         * from the character sheet -- hero point dialog, doubles prompt, column
         * shifts and chat formatting included.
         *
         * @private
         */
        async #handleAction(actionType, actor, token, actionId) {
            switch (actionType) {
                case ACTION_TYPE.attribute:
                    return this.#rollAttribute(actor, actionId);

                case ACTION_TYPE.power:
                case ACTION_TYPE.skill:
                case ACTION_TYPE.subskill:
                case ACTION_TYPE.gadget:
                    return this.#rollItem(actor, actionId);

                case ACTION_TYPE.attributeInfo:
                    // Effect and Resisting attributes are not rolled on their own.
                    // Opening the sheet is more useful than doing nothing.
                    return actor.sheet.render(true);

                case ACTION_TYPE.initiative:
                    return this.#rollInitiative(actor, token);

                case ACTION_TYPE.endTurn:
                    return this.#endTurn(token);

                default:
                    console.warn(
                        `token-action-hud-megs: no handler for action type "${actionType}"`
                    );
            }
        }

        /**
         * Attribute rolls are the one case with no ready-made entry point on the
         * document: the system builds them inline in actor-sheet._onRoll(). The
         * classes come from game.megs, which the MEGS system publishes for this
         * purpose (megs#156).
         *
         * @private
         */
        async #rollAttribute(actor, key) {
            const api = game.megs;
            if (!api?.RollValues || !api?.MegsTableRolls) {
                ui.notifications.error(
                    'Token Action HUD MEGS requires MEGS 1.1.1 or later '
                    + '(game.megs does not expose the roll classes).'
                );
                return;
            }

            const attribute = actor.system.attributes?.[key];
            if (!attribute) return;

            const targetActor = api.MegsTableRolls.getTargetActor?.();
            const effectValue = getEffectValue(actor, key);

            let opposingValue = 0;
            let resistanceValue = 0;
            if (targetActor) {
                opposingValue = targetActor.system.attributes?.[key]?.value ?? 0;
                resistanceValue = getResistanceValue(targetActor, key);
            }

            const rollValues = new api.RollValues(
                `${actor.name} - ${attribute.label ?? key.toUpperCase()}`,
                'attribute',
                attribute.value,
                attribute.value,
                opposingValue,
                effectValue,
                resistanceValue,
                '1d10 + 1d10',
                false
            );

            const speaker = ChatMessage.getSpeaker({ actor });
            const rolls = new api.MegsTableRolls(rollValues, speaker);
            await rolls.roll(null, actor.system.heroPoints?.value ?? 0);
        }

        /**
         * Powers, skills, subskills and gadgets all dispatch through
         * MEGSItem.roll(), which routes to rollMegs() or rollGadget().
         *
         * @private
         */
        async #rollItem(actor, itemId) {
            const item = actor.items.get(itemId);
            if (!item) {
                console.warn(`token-action-hud-megs: item ${itemId} not found on ${actor.name}`);
                return;
            }
            return item.roll();
        }

        /** @private */
        async #rollInitiative(actor, token) {
            if (!game.combat) return;

            const combatant = game.combat.combatants.find(c =>
                (token && c.tokenId === token.id) || c.actorId === actor.id);
            if (!combatant) {
                ui.notifications.warn(`${actor.name} is not in the current encounter.`);
                return;
            }

            // MEGSCombat.rollInitiative() prompts for hero points spent on
            // initiative, so this reuses that dialog rather than rolling raw.
            await game.combat.rollInitiative([combatant.id]);
            Hooks.callAll('forceUpdateTokenActionHud');
        }

        /** @private */
        async #endTurn(token) {
            if (!game.combat) return;
            if (token && game.combat.current?.tokenId !== token.id) return;
            await game.combat.nextTurn();
        }
    };
});

/**
 * MEGS pairs each Acting attribute with an Effect attribute: DEX/STR, INT/WILL,
 * INFL/AURA. Mirrors Utils.getEffectValue() without importing from the system,
 * which a Foundry module cannot do directly.
 */
function getEffectValue(actor, key) {
    const pairs = { dex: 'str', int: 'will', infl: 'aura' };
    return actor.system.attributes?.[pairs[key]]?.value ?? 0;
}

/** Resisting counterpart: DEX/BODY, INT/MIND, INFL/SPIRIT. */
function getResistanceValue(actor, key) {
    const pairs = { dex: 'body', int: 'mind', infl: 'spirit' };
    return actor.system.attributes?.[pairs[key]]?.value ?? 0;
}
