import { MODULE } from './constants.js';

/**
 * Registered by SystemManager.registerSettings(). Both settings are client-scoped
 * so each player controls their own HUD density.
 *
 * @param {function} onChangeFunction Supplied by Token Action HUD Core; rebuilds
 *                                   the HUD when a setting changes.
 */
export function register(onChangeFunction) {
    game.settings.register(MODULE.ID, 'showSubskills', {
        name: game.i18n.localize('tokenActionHud.megs.settings.showSubskills.name'),
        hint: game.i18n.localize('tokenActionHud.megs.settings.showSubskills.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => {
            onChangeFunction(value);
        },
    });

    game.settings.register(MODULE.ID, 'showNonRollableAttributes', {
        name: game.i18n.localize('tokenActionHud.megs.settings.showNonRollableAttributes.name'),
        hint: game.i18n.localize('tokenActionHud.megs.settings.showNonRollableAttributes.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            onChangeFunction(value);
        },
    });
}
