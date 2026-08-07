import { GROUP } from './constants.js';

export let DEFAULTS = null;

Hooks.once('tokenActionHudCoreApiReady', async (coreModule) => {
    const groups = GROUP;
    Object.values(groups).forEach((group) => {
        group.name = coreModule.api.Utils.i18n(group.name);
        group.listName = `Group: ${group.name}`;
    });

    /**
     * Every tab needs at least one subgroup. Core's group template renders a
     * subgroups container and never renders actions directly, so a top-level
     * group with `groups: []` has nowhere to put its actions and shows up
     * empty. Powers, Skills and Gadgets therefore each keep a subgroup.
     */
    DEFAULTS = {
        layout: [
            {
                nestId: 'attributes',
                id: 'attributes',
                name: coreModule.api.Utils.i18n('tokenActionHud.megs.attributes'),
                groups: [
                    { ...groups.acting, nestId: 'attributes_acting' },
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
                groups: [{ ...groups.utility, nestId: 'utility_utility' }],
            },
        ],
        groups: Object.values(groups),
    };
});
