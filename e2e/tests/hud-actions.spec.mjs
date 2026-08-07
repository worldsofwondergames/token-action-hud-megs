/* global canvas -- Foundry global used inside page.evaluate callbacks */
import { test, expect } from '../fixtures/foundry-test.mjs';
import {
    prefixName,
    createHeroActor,
    addPowerToActor,
    addSkillToActor,
    addSubskillToActor,
    addGadgetToActor,
    deleteActor,
} from '../fixtures/test-data.mjs';
import {
    getChatMessageCount,
    parseLatestRollMessage,
    queueDice,
    restoreDice,
} from '../fixtures/roll-helpers.mjs';
import {
    HUD_SELECTOR,
    buildScene,
    captureModuleConfig,
    clickAction,
    enableTah,
    hudActions,
    hudText,
    reload,
    restoreModuleConfig,
    selectToken,
    teardownScene,
} from '../fixtures/tah.mjs';

/**
 * What the HUD offers for a MEGS character, and that clicking it goes through
 * the system's own roll path rather than a parallel one.
 */
test.describe('HUD actions', () => {
    let actorId;
    let inertGadgetId;
    let scene;
    let moduleConfig;

    

    test.beforeEach(async ({ page }) => {
        moduleConfig = await captureModuleConfig(page);
        await enableTah(page);

        actorId = await createHeroActor(page, prefixName('HUD'), { dex: 8, str: 6, body: 5 });
        await addPowerToActor(page, actorId, { name: '_E2E_Flight', aps: 7, link: 'dex' });
        await addSkillToActor(page, actorId, { name: '_E2E_Acrobatics', aps: 4, link: 'dex' });

        // A 0-AP skill whose subskill beats it: specialising without buying the
        // parent skill is normal in MEGS, and both must be reachable.
        const vehicles = await addSkillToActor(page, actorId, { name: '_E2E_Vehicles', aps: 0, link: 'dex' });
        await addSubskillToActor(page, actorId, {
            name: '_E2E_Air', aps: 3, parent: vehicles, linkedSkill: vehicles, isTrained: true,
        });

        // A 0-AP skill whose only subskill is also 0 AP: nothing to offer.
        const hidden = await addSkillToActor(page, actorId, { name: '_E2E_Hidden', aps: 0, link: 'dex' });
        await addSubskillToActor(page, actorId, {
            name: '_E2E_HiddenSub', aps: 0, parent: hidden, linkedSkill: hidden, isTrained: true,
        });

        // A skill whose subskill does not beat it: the subskill adds nothing.
        const rich = await addSkillToActor(page, actorId, { name: '_E2E_Rich', aps: 5, link: 'dex' });
        await addSubskillToActor(page, actorId, {
            name: '_E2E_Weak', aps: 3, parent: rich, linkedSkill: rich, isTrained: true,
        });

        await addGadgetToActor(page, actorId, { name: '_E2E_Blaster', av: 6, ev: 8 });
        // Nothing to roll: no AV/EV, no attributes, no child items.
        inertGadgetId = await addGadgetToActor(page, actorId, {
            name: '_E2E_Inert', av: 0, ev: 0,
            hasAttributes: { physical: 'false', mental: 'false', mystical: 'false' },
        });

        scene = await buildScene(page, [actorId]);
        await selectToken(page, actorId);
    });

    test.afterEach(async ({ page }) => {
        await restoreDice(page).catch(() => {});
        await restoreModuleConfig(page, moduleConfig);
        if (scene) await teardownScene(page, scene);
        if (actorId) await deleteActor(page, actorId);
        await reload(page);
    });

    test('builds a tab for each category', async ({ page }) => {
        const groups = await page.evaluate(sel => [...document.querySelectorAll(`${sel} .tah-group-button`)]
            .map(b => b.textContent.trim()), HUD_SELECTOR);
        expect(groups).toEqual(
            expect.arrayContaining(['Attributes', 'Powers', 'Skills', 'Gadgets', 'Utility'])
        );
    });

    test('shows only the Acting attributes, abbreviated', async ({ page }) => {
        const actions = await hudActions(page);
        expect(actions).toEqual(expect.arrayContaining(['DEX 8', 'INT 3', 'INFL 2']));
        // STR, BODY and the rest are Effect/Resisting attributes and are off by
        // default; assert their absence only after confirming the rollable ones
        // are present, so a broken selector cannot make this pass vacantly.
        expect(actions.some(a => a.startsWith('STR'))).toBe(false);
        expect(actions.some(a => a.startsWith('BODY'))).toBe(false);
    });

    test('lists powers and gadgets', async ({ page }) => {
        const text = await hudText(page);
        expect(text).toContain('_E2E_Flight');
        expect(text).toContain('_E2E_Blaster');
    });

    test('applies the skill and subskill visibility rules', async ({ page }) => {
        const text = await hudText(page);

        expect(text).toContain('_E2E_Acrobatics');
        // 0-AP parent kept because its subskill beats it, and both are offered.
        expect(text).toContain('_E2E_Vehicles');
        expect(text).toContain('_E2E_Air');
        expect(text).toContain('_E2E_Rich');

        // A subskill at or below its parent adds nothing over rolling the skill.
        expect(text).not.toContain('_E2E_Weak');
        // 0-AP skill with only a 0-AP subskill: hidden by the actor's own
        // "Hide Zero Rank Skills" setting.
        expect(text).not.toContain('_E2E_Hidden');
    });

    test('renders no tooltips', async ({ page }) => {
        const count = await page.evaluate(
            sel => document.querySelectorAll(`${sel} [data-tooltip]`).length, HUD_SELECTOR
        );
        expect(count).toBe(0);
    });

    test('an attribute click rolls through the MEGS roll dialog', async ({ page }) => {
        await clickAction(page, 'DEX');

        await page.waitForSelector('dialog.dialog[open] .megs-dialog #actionValue', { timeout: 15_000 });
        const values = await page.evaluate(() => {
            const d = document.querySelector('dialog.dialog[open] .megs-dialog');
            return { av: d.querySelector('#actionValue').value, ev: d.querySelector('#effectValue').value };
        });
        // AV is DEX; EV is its paired Effect attribute, STR.
        expect(values.av).toBe('8');
        expect(values.ev).toBe('6');

        await queueDice(page, [6, 5]);
        const before = await getChatMessageCount(page);
        await page.evaluate(() => {
            const d = [...document.querySelectorAll('dialog.dialog[open]')]
                .find(x => x.querySelector('#actionValue'));
            d.querySelector('#opposingValue').value = '5';
            const btn = d.querySelector('footer button[data-action="submit"]');
            btn.closest('form').requestSubmit(btn);
        });
        await page.waitForFunction(
            n => document.querySelectorAll('.chat-log .chat-message').length > n,
            before,
            { timeout: 15_000 }
        );

        // actionTable row for AV 7-8 against OV 5 gives 9.
        const msg = await parseLatestRollMessage(page);
        expect(msg.difficulty).toBe(9);
    });

    test('a gadget click opens the roll dialog', async ({ page }) => {
        await clickAction(page, '_E2E_Blaster');
        await page.waitForSelector('dialog.dialog[open] .megs-dialog #actionValue', { timeout: 15_000 });
        await expect(page.locator('dialog.dialog[open] .megs-dialog #actionValue')).toBeVisible();
    });

    test('a gadget with nothing to roll opens its sheet, not edit mode', async ({ page }) => {
        await clickAction(page, '_E2E_Inert');

        const sheet = page.locator('.sheet.item:has-text("_E2E_Inert")');
        await expect(sheet).toBeVisible({ timeout: 15_000 });

        // The sheet must open read-only. Assert the flag the sheet reads rather
        // than a rendered control, so a template change cannot quietly pass.
        // Looked up by id: searching actors by name prefix can land on a stale
        // actor from an earlier test and silently report undefined.
        // Read the token's own actor, not the base actor. Tokens are unlinked by
        // default, so the HUD acts on a synthetic copy and that is where the
        // flag lands -- asserting against the base actor reports undefined.
        const editMode = await page.evaluate((name) => {
            const actor = canvas.tokens.controlled[0]?.actor;
            const gadget = actor?.items.find(i => i.name === name);
            if (!gadget) throw new Error('Inert gadget not found on the controlled token');
            return gadget.getFlag('megs', 'edit-mode');
        }, '_E2E_Inert');
        expect(editMode).toBe(false);

        // And it must not have tried to roll.
        await expect(page.locator('dialog.dialog[open] .megs-dialog #actionValue')).toHaveCount(0);
    });
});
