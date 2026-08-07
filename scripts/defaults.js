import { GROUP } from './constants.js';

export let DEFAULTS = null;

Hooks.once('tokenActionHudCoreApiReady', async (coreModule) => {
    const groups = GROUP;
    Object.values(groups).forEach((group) => {
        group.name = coreModule.api.Utils.i18n(group.name);
        group.listName = `Group: ${group.name}`;
    });

    /**
     * Only Attributes has subgroups. Powers, Skills, Gadgets and Utility each
     * hold a single flat list, so nesting them under a same-named subgroup would
     * make every one of them open a submenu containing exactly one entry before
     * the actions were reachable. Those four are top-level groups that carry
     * their actions directly.
     */
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
            { ...groups.powers, nestId: 'powers', groups: [] },
            { ...groups.skills, nestId: 'skills', groups: [] },
            { ...groups.gadgets, nestId: 'gadgets', groups: [] },
            { ...groups.utility, nestId: 'utility', groups: [] },
        ],
        groups: Object.values(groups),
    };
});
