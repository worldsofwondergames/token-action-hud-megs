/* global canvas, Scene -- Foundry globals used inside page.evaluate callbacks */

/**
 * Helpers for driving Token Action HUD in a live world.
 *
 * These tests enable Token Action HUD in the shared test world and must put the
 * module configuration back afterwards, so every spec pairs enableTah() with
 * restoreModuleConfig() in a finally block.
 */

export const HUD_SELECTOR = '#token-action-hud-app';

/** Snapshot the world's module configuration so it can be restored. */
export function captureModuleConfig(page) {
    return page.evaluate(() =>
        foundry.utils.deepClone(game.settings.get('core', 'moduleConfiguration'))
    );
}

export async function restoreModuleConfig(page, config) {
    if (!config) return;
    await page.evaluate(async (cfg) => {
        await game.settings.set('core', 'moduleConfiguration', cfg);
    }, config);
}

/**
 * Enable Core, this module and socketlib, then reload.
 *
 * socketlib is not optional: Core gates registerCoreModule() on
 * isSocketlibActive() and registerHud() calls getSocket(), so without it Core
 * silently does nothing at all -- no HUD and no error.
 */
export async function enableTah(page) {
    const known = await page.evaluate(() => game.modules.has('token-action-hud-megs'));
    if (!known) {
        throw new Error(
            'Foundry cannot see token-action-hud-megs. It scans Data/modules at '
            + 'server startup, so Foundry must be restarted after the module is added.'
        );
    }

    await page.evaluate(async () => {
        const cfg = foundry.utils.deepClone(game.settings.get('core', 'moduleConfiguration'));
        cfg['token-action-hud-core'] = true;
        cfg['token-action-hud-megs'] = true;
        cfg.socketlib = true;
        await game.settings.set('core', 'moduleConfiguration', cfg);
    });
    await reload(page);

    const active = await page.evaluate(() => ({
        core: game.modules.get('token-action-hud-core')?.active ?? false,
        module: game.modules.get('token-action-hud-megs')?.active ?? false,
    }));
    // Foundry silently declines to enable a module whose declared dependencies
    // are unmet, so assert rather than press on into a confusing timeout.
    if (!active.core || !active.module) {
        throw new Error(`Modules did not activate: ${JSON.stringify(active)}`);
    }
}

export async function reload(page) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
        () => typeof game !== 'undefined' && game.ready === true,
        null,
        { timeout: 90_000 }
    );
}

/** Build a scene holding one token per actor and view it. */
export async function buildScene(page, actorIds) {
    const ids = await page.evaluate(async (list) => {
        const previousSceneId = canvas?.scene?.id ?? null;
        const scene = await Scene.create({ name: '_E2E_TahScene', width: 2000, height: 2000 });
        let x = 500;
        for (const id of list) {
            const token = (await game.actors.get(id).getTokenDocument({ x, y: 500 })).toObject();
            await scene.createEmbeddedDocuments('Token', [token]);
            x += 400;
        }
        await scene.view();
        return { sceneId: scene.id, previousSceneId };
    }, actorIds);

    await page.waitForFunction(
        (list) => canvas?.ready === true
            && list.every(id => canvas.tokens.placeables.some(p => p.actor?.id === id)),
        actorIds,
        { timeout: 30_000 }
    );
    return ids;
}

export async function teardownScene(page, { sceneId, previousSceneId }) {
    await page.evaluate(async ({ sid, prev }) => {
        if (prev) await game.scenes.get(prev)?.view();
        if (sid) await game.scenes.get(sid)?.delete();
    }, { sid: sceneId, prev: previousSceneId });
}

/**
 * Select a token and wait for the HUD to reflect it.
 *
 * Waits on a condition rather than a delay: Core's first initialisation runs
 * DataHandler and MigrationManager setup before the HUD exists at all, which
 * takes far longer than a fixed sleep would allow for.
 */
export async function selectToken(page, actorId) {
    await page.evaluate((id) => {
        const token = canvas.tokens.placeables.find(p => p.actor?.id === id);
        if (!token) throw new Error(`No token on canvas for actor ${id}`);
        token.control({ releaseOthers: true });
    }, actorId);

    await page.waitForFunction(
        ({ sel, name }) => {
            const el = document.querySelector(sel);
            return !!el && (el.textContent || '').includes(name);
        },
        { sel: HUD_SELECTOR, name: await actorName(page, actorId) },
        { timeout: 60_000 }
    );
}

async function actorName(page, actorId) {
    return page.evaluate(id => game.actors.get(id).name, actorId);
}

/** Text of the whole HUD, after forcing it to rebuild. */
export async function hudText(page) {
    return page.evaluate(async (sel) => {
        game.tokenActionHud?.update?.({ type: 'hook', name: 'e2e' });
        await new Promise(r => setTimeout(r, 1500));
        return document.querySelector(sel)?.textContent || '';
    }, HUD_SELECTOR);
}

/** Every action label currently rendered in the HUD. */
export async function hudActions(page) {
    return page.evaluate(sel => [...document.querySelectorAll(`${sel} .tah-action`)]
        .map(a => a.textContent.trim()).filter(Boolean), HUD_SELECTOR);
}

/** Click an action button by its visible label. */
export async function clickAction(page, label) {
    await page.evaluate(({ sel, text }) => {
        // The bound element is the inner button, not the .tah-action wrapper.
        const button = [...document.querySelectorAll(`${sel} button.tah-action-button`)]
            .find(b => b.textContent.includes(text));
        if (!button) throw new Error(`No HUD action button matching "${text}"`);
        button.click();
    }, { sel: HUD_SELECTOR, text: label });
}
