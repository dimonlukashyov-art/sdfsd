// priority: 69
// Generates the four official Berserk OS powers, upgrade trees and install bindings.
(function () {
const variants = global.BERSERK_VARIANTS || [];
const BERSERK_VISUAL_LAYOUT = {
    rootY: 0.26,
    baseRowY: -0.26,
    stepX: 1.0,
    stepY: 0.55,
    // Statistics and the fork of the two branches share one row of columns; the native viewport is 234px (about
    // 3.9 units) wide.
    maxSpanX: 3.9
};
const BERSERK_RETUNE_COST = 3;

function roman(value) {
    return ["I", "II", "III", "IV", "V"][Math.max(0, value - 1)] || String(value);
}

function abilityUnlocked(power, ability) {
    return { type: "palladium:ability_unlocked", power: power, ability: ability };
}

function abilityNotUnlocked(power, ability) {
    return { type: "palladium:not", conditions: [abilityUnlocked(power, ability)] };
}

function itemCost(item, amount) {
    return { type: "palladium:item_buyable", ingredient: { item: item }, amount: amount };
}

function columnStep(count) {
    return Math.min(BERSERK_VISUAL_LAYOUT.stepX, BERSERK_VISUAL_LAYOUT.maxSpanX / Math.max(1, count - 1));
}

function centeredX(index, count) {
    var step = columnStep(count);
    return (index * step) - (((count - 1) * step) / 2);
}

function addTrack(abilities, variant, track, trackIndex, trackCount) {
    var values = track.values || [];
    if (!values.length) return [];
    var baseId = "base_" + track.id;
    var xPos = centeredX(trackIndex, trackCount + 2);
    abilities[baseId] = {
        type: "palladium:command", icon: track.icon, title: track.title,
        description: "Base: " + values[0] + track.suffix + ". Upgrade this statistic independently.",
        hidden: false, hidden_in_bar: true, list_index: -1,
        gui_position: [xPos, BERSERK_VISUAL_LAYOUT.baseRowY],
        first_tick_commands: [], last_tick_commands: [], commands: [],
        conditions: { enabling: [{ type: "palladium:true" }], unlocking: [abilityUnlocked(variant.powerId, "Berserk")] }
    };
    var upgradeIds = [];
    for (var i = 1; i < values.length; i++) {
        var id = "upgrade_" + track.id + "_" + i;
        var unlock = [abilityUnlocked(variant.powerId, i === 1 ? baseId : "upgrade_" + track.id + "_" + (i - 1))];
        unlock.push(itemCost(variant.internalParts, 1));
        abilities[id] = {
            type: "palladium:command", icon: track.icon,
            title: track.title + " " + roman(i),
            description: track.title + ": " + values[i] + track.suffix + ".",
            hidden: false, hidden_in_bar: true, list_index: -1,
            gui_position: [xPos, BERSERK_VISUAL_LAYOUT.baseRowY - (i * BERSERK_VISUAL_LAYOUT.stepY)],
            first_tick_commands: ["data modify entity @s ForgeData." + track.nbt + " set value " + i],
            last_tick_commands: [], commands: [],
            conditions: { enabling: [{ type: "palladium:true" }], unlocking: unlock }
        };
        upgradeIds.push(id);
    }
    return upgradeIds;
}

function addSpecializations(abilities, variant, prerequisiteIds, trackCount) {
    // A fork, so it reads as one or the other: one Specialization node rises from the root beside the statistics,
    // and the two branches split from it side by side, each with its Mastery and its Retune above it.
    var hubY = BERSERK_VISUAL_LAYOUT.baseRowY;
    var branchY = hubY - BERSERK_VISUAL_LAYOUT.stepY;
    var masteryY = hubY - 2 * BERSERK_VISUAL_LAYOUT.stepY;
    var retuneY = hubY - 3 * BERSERK_VISUAL_LAYOUT.stepY;
    var hubId = "branch_fork";
    // It opens by itself once the first upgrade of every statistic is bought (grouped so Palladium draws no line for
    // it: those would cross every column). It costs nothing and does nothing but lead to the two branches.
    abilities[hubId] = {
        type: "palladium:command", icon: "minecraft:comparator", title: "Specialization",
        description: "Choose one branch: " + variant.branches[0].title + " or " + variant.branches[1].title
            + ". Taking one locks the other until you retune. Opens once every statistic has its first upgrade.",
        hidden: false, hidden_in_bar: true, list_index: -1,
        gui_position: [(centeredX(trackCount, trackCount + 2) + centeredX(trackCount + 1, trackCount + 2)) / 2, hubY],
        first_tick_commands: [], last_tick_commands: [], commands: [],
        conditions: {
            enabling: [{ type: "palladium:true" }],
            unlocking: [abilityUnlocked(variant.powerId, "Berserk"), {
                type: "palladium:and",
                conditions: prerequisiteIds.map(function (id) { return abilityUnlocked(variant.powerId, id); })
            }]
        }
    };
    for (var i = 0; i < variant.branches.length; i++) {
        var branchX = centeredX(trackCount + i, trackCount + 2);
        var branch = variant.branches[i];
        var branchNumber = i + 1;
        var choiceId = "specialization_" + branch.id;
        var other = variant.branches[1 - i];
        var unlock = [abilityUnlocked(variant.powerId, hubId)];
        unlock.push(itemCost(variant.internalParts, 1));
        unlock.push(abilityNotUnlocked(variant.powerId, "specialization_" + other.id));
        abilities[choiceId] = {
            type: "palladium:command", icon: branch.icon, title: branch.title,
            description: branch.description,
            hidden: false, hidden_in_bar: true, list_index: -1,
            gui_position: [branchX, branchY],
            first_tick_commands: [
                "data modify entity @s ForgeData.cyb_bz_specialization set value " + branchNumber,
                "data modify entity @s ForgeData.cyb_bz_specialization_tier set value 1",
                "ability lock @s " + variant.powerId + " specialization_" + other.id,
                "ability lock @s " + variant.powerId + " specialization_" + other.id + "_mastery"
            ],
            last_tick_commands: [], commands: [],
            conditions: { enabling: [{ type: "palladium:true" }], unlocking: unlock }
        };
        abilities[choiceId + "_mastery"] = {
            type: "palladium:command", icon: branch.icon, title: branch.title + " II",
            description: branch.masteryDescription,
            hidden: false, hidden_in_bar: true, list_index: -1,
            gui_position: [branchX, masteryY],
            first_tick_commands: ["data modify entity @s ForgeData.cyb_bz_specialization_tier set value 2"],
            last_tick_commands: [], commands: [],
            conditions: {
                enabling: [{ type: "palladium:true" }],
                unlocking: [abilityUnlocked(variant.powerId, choiceId), itemCost(variant.internalParts, 1)]
            }
        };

        var retuneCommands = [
            "data remove entity @s ForgeData.cyb_bz_specialization",
            "data remove entity @s ForgeData.cyb_bz_specialization_tier"
        ];
        variant.branches.forEach(function (candidate) {
            retuneCommands.push("ability lock @s " + variant.powerId + " specialization_" + candidate.id + "_mastery");
            retuneCommands.push("ability lock @s " + variant.powerId + " specialization_" + candidate.id);
        });
        variant.branches.forEach(function (candidate) {
            retuneCommands.push("ability lock @s " + variant.powerId + " retune_" + candidate.id);
        });

        abilities["retune_" + branch.id] = {
            type: "palladium:command",
            icon: "minecraft:barrier",
            title: "Retune Branch",
            description: "Clear this specialization so another branch can be selected. Spent upgrades are not refunded.",
            hidden: false,
            hidden_in_bar: true,
            list_index: -1,
            gui_position: [branchX, retuneY],
            first_tick_commands: retuneCommands,
            last_tick_commands: [],
            commands: [],
            conditions: {
                enabling: [{ type: "palladium:true" }],
                unlocking: [
                    abilityUnlocked(variant.powerId, choiceId),
                    { type: "palladium:objective_score", objective: "er_bz_active", min_score: 0, max_score: 0 },
                    itemCost(variant.internalParts, BERSERK_RETUNE_COST)
                ]
            }
        };
    }
}

function buildPower(variant) {
    var itemName = variant.itemId.split(":")[1];
    var modelVariant = itemName.substring("berserk_".length);
    var itemIcon = "project_edgerunner:textures/item/" + itemName + "_item.png";
    var abilities = {
        Berserk: {
            type: "kubejs:cyberpunk/berserk_toggle", icon: itemIcon, title: "Berserk",
            description: "Commit to a fixed melee-only combat window. Health cannot fall below 25%; neutralizations restore health when the window closes. Press again to deactivate.",
            hidden_in_bar: true, list_index: 0,
            gui_position: [0, BERSERK_VISUAL_LAYOUT.rootY],
            conditions: {
                enabling: [{ type: "palladium:action", cooldown: 0, key_type: "key_bind", needs_empty_hand: false, allow_scrolling_when_crouching: true }],
                unlocking: []
            }
        },
        berserk_model_inactive: {
            type: "palladium:render_layer",
            hidden: true,
            hidden_in_bar: true,
            render_layer: "project_edgerunner:berserk_inactive_" + modelVariant,
            conditions: {
                enabling: [
                    { type: "palladium:objective_score", objective: "er_bz_active", min_score: 0, max_score: 0 }
                ],
                unlocking: []
            }
        },
        berserk_model_active: {
            type: "palladium:render_layer",
            hidden: true,
            hidden_in_bar: true,
            render_layer: "project_edgerunner:berserk_active_" + modelVariant,
            conditions: {
                enabling: [
                    { type: "palladium:objective_score", objective: "er_bz_active", min_score: 1, max_score: 2147483647 }
                ],
                unlocking: []
            }
        }
    };
    var tracks = [
        { id: "armor", title: variant.armor[0] >= 100 ? "Invulnerability" : "Damage Reduction", values: variant.armor, suffix: "%", icon: "minecraft:shield", nbt: "cyb_bz_armor_tier" },
        { id: "duration", title: "Duration", values: variant.duration, suffix: "s", icon: "project_edgerunner:textures/gui/upgrades/duration.png", nbt: "cyb_bz_duration_tier" },
        { id: "cooldown", title: "Cooldown", values: variant.cooldown, suffix: "s", icon: "minecraft:clock", nbt: "cyb_bz_cooldown_tier" }
    ];
    if (variant.attackSpeed) tracks.push({ id: "attack_speed", title: "Attack Speed", values: variant.attackSpeed, suffix: "%", icon: "minecraft:golden_sword", nbt: "cyb_bz_attack_speed_tier" });
    if (variant.crit) tracks.push({ id: "crit", title: "Critical Chance", values: variant.crit, suffix: "%", icon: "minecraft:nether_star", nbt: "cyb_bz_crit_tier" });
    if (variant.fall) tracks.push({ id: "fall", title: "Fall Reduction", values: variant.fall, suffix: "%", icon: "minecraft:hay_block", nbt: "cyb_bz_fall_tier" });
    if (variant.movement) tracks.push({ id: "movement", title: "Movement Speed", values: variant.movement, suffix: "%", icon: "minecraft:sugar", nbt: "cyb_bz_move_tier" });

    var specializationPrerequisites = [];
    tracks.forEach(function (track, trackIndex) {
        var upgrades = addTrack(abilities, variant, track, trackIndex, tracks.length);
        specializationPrerequisites.push(upgrades.length ? upgrades[0] : "base_" + track.id);
    });
    addSpecializations(abilities, variant, specializationPrerequisites, tracks.length);

    return {
        name: variant.name, persistent_data: true,
        background: "minecraft:textures/block/red_nether_bricks.png",
        ability_bar_texture: "project_edgerunner:textures/gui/ability_bar.png",
        icon: itemIcon, gui_display_type: "tree", abilities: abilities
    };
}

ServerEvents.highPriorityData(function (event) {
    variants.forEach(function (variant) {
        global.addLocalizedPowerJson(event, "project_edgerunner:palladium/powers/" + variant.id, buildPower(variant));
        global.addLocalizedPowerJson(event, "project_edgerunner:palladium/item_powers/" + variant.id + "_power", {
            slot: "chest", item: variant.itemId, power: variant.powerId
        });
    });
});

if (!global.registerCyberwareInstallOs) {
    throw new Error("[Project Edgerunner/Berserk] Install registry is unavailable.");
}
variants.forEach(function (variant) {
    global.registerCyberwareInstallOs({
        item: variant.itemId, name: variant.name, body_slot: "os", activation_slot: "os",
        activation_mode: "manual", load_cost: variant.loadCost, palladium_power: variant.powerId,
        command: function (player) { player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.online", [global.localizedCyberwareName(variant.itemId, variant.name)], "green")); }
    });
});
})();
