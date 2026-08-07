import { GROUP } from './constants.js';

export let DEFAULTS = null;

Hooks.once('tokenActionHudCoreApiReady', async (coreModule) => {
    const groups = GROUP;
    Object.values(groups).forEach((group) => {
        group.name = coreModule.api.Utils.i18n(group.name);
        group.listName = `Group: ${group.name}`;
    });

    DEFAULTS = {
        layout: [
            {
                nestId: 'attributes',
                id: 'attributes',
                name: coreModule.api.Utils.i18n('tokenActionHud.megs.attributes'),
                groups: [
                    { ...groups.physical, nestId: 'attributes_physical' },
                    { ...groups.mental, nestId: 'attributes_mental' },
                    { ...groups.mystical, nestId: 'attributes_mystical' },
                ],
            },
            {
                nestId: 'powers',
                id: 'powers',
                name: coreModule.api.Utils.i18n('tokenActionHud.megs.powers'),
                groups: [{ ...groups.powers, nestId: 'powers_powers' }],
            },
            {
                nestId: 'skills',
                id: 'skills',
                name: coreModule.api.Utils.i18n('tokenActionHud.megs.skills'),
                groups: [{ ...groups.skills, nestId: 'skills_skills' }],
            },
            {
                nestId: 'gadgets',
                id: 'gadgets',
                name: coreModule.api.Utils.i18n('tokenActionHud.megs.gadgets'),
                groups: [{ ...groups.gadgets, nestId: 'gadgets_gadgets' }],
            },
            {
                nestId: 'utility',
                id: 'utility',
                name: coreModule.api.Utils.i18n('tokenActionHud.megs.utility'),
                groups: [{ ...groups.combat, nestId: 'utility_combat' }],
            },
        ],
        groups: Object.values(groups),
    };
});
