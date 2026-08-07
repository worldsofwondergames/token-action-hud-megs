/**
 * Remove Token Action HUD's action tooltips.
 *
 * Core renders one unconditionally: getTooltip() falls back to the action's own
 * name when a module supplies a falsy tooltip, and an object with empty content
 * still yields an empty wrapper div. There is no per-action opt-out, so the
 * attributes are stripped from the rendered HUD instead.
 *
 * Foundry's tooltip manager reads data-tooltip from the element on hover, so
 * removing the attribute is enough -- nothing pops up.
 */
Hooks.on('renderTokenActionHud', (app, element) => {
    const root = element instanceof HTMLElement ? element : app?.element;
    if (!root) return;

    for (const el of root.querySelectorAll('[data-tooltip]')) {
        el.removeAttribute('data-tooltip');
        el.removeAttribute('data-tooltip-class');
        el.removeAttribute('data-tooltip-direction');
    }

    // A tooltip already on screen when the HUD re-renders would otherwise stay.
    game.tooltip?.deactivate?.();
});
