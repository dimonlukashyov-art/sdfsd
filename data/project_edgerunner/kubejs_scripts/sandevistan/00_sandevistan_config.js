// priority: 100
// Server script: Sandevistan upgrade config and constants.
global.SANDEVISTAN_UPGRADE_CONFIGS = {
    sandevistan_dynalar: {
        tiers: 4,
        xpLevels: [3, 5, 7, 9],
        durationSeconds: { base: 8, max: 9, decimals: 1 },
        cooldownSeconds: { base: 55, max: 45 },
        stats: [
            { id: "damage", label: "Damage", icon: "minecraft:iron_sword", base: 4, max: 10, suffix: "%", decimals: 0 }
        ]
    },
    sandevistan_apogee: {
        tiers: 3,
        xpLevels: [6, 9, 12],
        durationSeconds: { base: 6, max: 7, decimals: 1 },
        cooldownSeconds: { base: 30, max: 22 },
        stats: [
            { id: "damage", label: "Damage", icon: "minecraft:iron_sword", base: 8, max: 18, suffix: "%", decimals: 0 }
        ],
        specialTree: {
            branches: [
                {
                    id: "neutralize_duration",
                    label: "Duration on Kill",
                    descriptionPrefix: "Duration extended on kill while active",
                    unlockDescription: "Unlocks duration extension on kill while active.",
                    icon: "project_edgerunner:textures/gui/upgrades/duration.png",
                    effectType: "duration_extend",
                    baseActive: true,
                    anchorMode: "base_branch",
                    anchorBranchId: "duration",
                    anchorTier: 0,
                    anchorSide: -1,
                    branchOrder: 1,
                    values: [10, 20],
                    suffix: "%",
                    decimals: 0
                }
            ]
        }
    },
    sandevistan_falcon: {
        tiers: 5,
        xpLevels: [4, 6, 8, 10, 12],
        durationSeconds: { base: 9, max: 10, decimals: 1 },
        cooldownSeconds: { base: 40, max: 30 },
        stats: [
            { id: "damage", label: "Damage", icon: "minecraft:iron_sword", base: 5, max: 10, suffix: "%", decimals: 0 }
        ],
        specialLines: [
            "On kill while active: duration extends and max health is restored."
        ],
        specialTree: {
            useTitleNode: true,
            title: "On kill while active",
            icon: "minecraft:nether_star",
            branches: [
                {
                    id: "neutralize_duration",
                    label: "Duration on Kill",
                    descriptionPrefix: "Duration extended on kill while active",
                    unlockDescription: "Unlocks duration extension on kill while active.",
                    icon: "project_edgerunner:textures/gui/upgrades/duration.png",
                    effectType: "duration_extend",
                    baseActive: false,
                    anchorMode: "base_branch",
                    anchorBranchId: "duration",
                    anchorTier: 0,
                    anchorSide: -1,
                    branchOrder: 1,
                    values: [5],
                    suffix: "%",
                    decimals: 0
                },
                {
                    id: "neutralize_health",
                    label: "Health on Kill",
                    descriptionPrefix: "Max health restored on kill while active",
                    unlockDescription: "Unlocks max health restoration on kill while active.",
                    icon: "minecraft:glistering_melon_slice",
                    effectType: "heal_percent_max_health",
                    baseActive: false,
                    anchorMode: "base_branch",
                    anchorBranchId: "stat_damage",
                    anchorTier: 0,
                    anchorSide: 1,
                    branchOrder: 1,
                    values: [10, 12],
                    suffix: "%",
                    decimals: 0
                }
            ]
        }
    },
    sandevistan_warp_dancer: {
        tiers: 4,
        xpLevels: [4, 6, 8, 10],
        durationSeconds: { base: 9, max: 10, decimals: 1 },
        cooldownSeconds: { base: 70, max: 40 },
        stats: [
            { id: "knockback_resistance", label: "Knockback Resistance", icon: "minecraft:chain", base: 14, max: 24, suffix: "%", decimals: 0 },
            { id: "mitigation_strength", label: "Mitigation Strength", icon: "minecraft:netherite_chestplate", base: 7, max: 15, suffix: "%", decimals: 0 },
            { id: "resist_elements", label: "Res Therm/Tox/Elec/Cryo", icon: "project_edgerunner:textures/gui/upgrades/elemental_resistance.png", base: 30, max: 60, suffix: "%", decimals: 0 }
        ]
    },
    sandevistan_zetatech: {
        tiers: 4,
        xpLevels: [4, 6, 8, 10],
        durationSeconds: { base: 6, max: 6 },
        cooldownSeconds: { base: 45, max: 40 },
        stats: [
            { id: "damage", label: "Damage", icon: "minecraft:iron_sword", base: 3, max: 12, suffix: "%", decimals: 0 }
        ],
        extraLines: [
            "Airborne: Slow 60%, Damage 6-24%"
        ]
    }
};

global.SANDEVISTAN_ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
