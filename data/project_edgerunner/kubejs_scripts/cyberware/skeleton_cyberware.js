// priority: 60
// Server script: Skeleton cyberware passive implants and Palladium upgrade trees.

const SKELETON_PARTS_BY_TIER = {
    1: "project_edgerunner:cyberware_internal_parts_t1",
    2: "project_edgerunner:cyberware_internal_parts_t2",
    3: "project_edgerunner:cyberware_internal_parts_t3",
    4: "project_edgerunner:cyberware_internal_parts_t4",
    5: "project_edgerunner:cyberware_internal_parts_t5"
};

const SKELETON_TREE_LAYOUT = {
    rootY: 0.375,
    baseRowY: -0.375,
    upgradeStepY: 0.56,
    branchStepX: 1.15
};

const SKELETON_IMPLANTS = [
    {
        id: "titanium_bones",
        name: "Titanium Bones",
        load: 8,
        tier: 1,
        rarity: "uncommon",
        summary: "Heavy Skeleton implant for physical and elemental damage resistance, knockback stability, and Gorilla Slam weight.",
        fixed: [
            fixed("titanium_fall_weight", "Fall Weight", "minecraft:iron_boots", "Fall damage taken: +25%.")
        ],
        branches: [
            branch("bone_matrix", "Physical Resistance", "minecraft:shield", "Physical damage resistance: 8%.", ["Physical damage resistance: 10%.", "Physical damage resistance: 12%."]),
            branch("titanium_stability", "Knockback Resistance", "minecraft:chain", "Knockback resistance: 15%.", ["Knockback resistance: 18%.", "Knockback resistance: 20%."]),
            branch("elemental_conduction", "Elemental Damage Resistance", "project_edgerunner:textures/gui/upgrades/elemental_resistance.png", "Thermal, electric, and freeze damage resistance: 6%.", ["Thermal, electric, and freeze damage resistance: 9%.", "Thermal, electric, and freeze damage resistance: 12%."]),
            branch("weighted_frame", "Gorilla Slam Damage", "minecraft:anvil", "Gorilla Slam damage: +10%.", ["Gorilla Slam damage: +15%.", "Gorilla Slam damage: +20%; Slam radius and knockback +10%."]),
            single("impact_transfer", "Impact Transfer", "minecraft:target", "Incoming damage >= 8 before Skeleton reductions grants 90 Gorilla Fury.", 2, "No reactive Gorilla Fury.")
        ]
    },
    {
        id: "bionic_joints",
        name: "Bionic Joints",
        load: 12,
        tier: 1,
        rarity: "uncommon",
        summary: "Mobility Skeleton implant for movement speed, fall reduction, and joint stability.",
        branches: [
            branch("lubrication", "Movement Speed", "minecraft:sugar", "Movement speed: +15%.", ["Movement speed: +18%.", "Movement speed: +20%."]),
            branch("impact_dampers", "Fall Reduction", "minecraft:hay_block", "Fall damage taken: -25%.", ["Fall damage taken: -30%.", "Fall damage taken: -35%.", "Fall damage taken: -40%."]),
            branch("joint_stability", "Knockback Control", "minecraft:chain", "Knockback strength taken: -10%.", ["Knockback strength taken: -15%.", "Knockback strength taken: -20%."]),
            single("reinforced_landing", "Reinforced Landing", "minecraft:feather", "Falls of at least 4 blocks grant 70 Gorilla Fury.", 2, "No landing Fury conversion.")
        ]
    },
    {
        id: "dense_marrow",
        name: "Dense Marrow",
        load: 16,
        tier: 3,
        rarity: "rare",
        summary: "Offensive Skeleton implant for melee damage, Gorilla Fury, and Slam pressure.",
        branches: [
            branch("compressed_fibers", "Compressed Fibers", "minecraft:bone_block", "Melee damage: +20%; Gorilla Fury generation: +25%.", ["Melee damage: +22%; Fury generation: +28%.", "Melee damage: +25%; Fury generation: +32%.", "Melee damage: +27%; Fury generation: +35%."]),
            branch("conductive_skeleton", "Conductive Skeleton", "minecraft:copper_ingot", "Conductive Slam bonus: +0%.", ["Titanium Slam damage or Bionic Slam radius: +3%.", "Titanium Slam damage or Bionic Slam radius: +5%."]),
            branch("saturation_burn", "Saturation Burn", "minecraft:cooked_beef", "Saturation can trigger normal Dense Marrow pressure.", ["Consumes saturation for +25% extra Fury generation.", "Consumes saturation for +50% extra Fury generation."]),
            single("bonebreaker_fury", "Bonebreaker Fury", "minecraft:netherite_sword", "Gorilla Slams slow and weaken non-bosslike targets; bosslike targets receive knockback.", 3, "No Slam crowd-control conversion.")
        ]
    },
    {
        id: "epimorphic_skeleton",
        name: "Epimorphic Skeleton",
        load: 40,
        tier: 5,
        rarity: "epic",
        summary: "Late-game stability Skeleton implant for health, healing, Load, and defensive pressure.",
        branches: [
            branch("bone_structure", "Max Health", "minecraft:bone", "Max health: +13%.", ["Max health: +15%.", "Max health: +18%."]),
            branch("medical_compatibility", "Healing Received", "minecraft:golden_apple", "Healing received: +10%.", ["Healing received: +15%.", "Healing received: +20%."]),
            branch("chrome_tolerant", "Max Load", "minecraft:netherite_ingot", "Max Load: +5%.", ["Max Load: +7%.", "Max Load: +10%."]),
            branch("stable_architecture", "Defensive Pressure", "minecraft:amethyst_shard", "Defensive pressure: -5%.", ["Defensive pressure: -7%.", "Defensive pressure: -10%.", "Defensive pressure: -12%."])
        ]
    },
    {
        id: "kinetic_frame",
        name: "Kinetic Frame",
        load: 16,
        tier: 3,
        rarity: "rare",
        summary: "Mobile defense Skeleton implant. Sandevistan active always counts as high movement.",
        fixed: [
            fixed("kinetic_sandevistan_movement", "Sandevistan Movement", "minecraft:compass", "Sandevistan active: high-movement mitigation chance.")
        ],
        branches: [
            branch("motion_calibration", "Mitigation Chance", "minecraft:compass", "Moving chance: 12%; high movement or Sandevistan chance: 18%.", ["Moving chance: 14%; high movement or Sandevistan chance: 20%.", "Moving chance: 15%; high movement or Sandevistan chance: 22%."]),
            branch("impact_redirection", "Mitigation Strength", "minecraft:netherite_chestplate", "Successful Kinetic mitigation reduces damage by 25%.", ["Successful Kinetic mitigation reduces damage by 30%.", "Successful Kinetic mitigation reduces damage by 35%."]),
            branch("momentum_recovery", "Momentum Recovery", "minecraft:sugar", "No speed recovery after Kinetic mitigation.", ["After mitigation, speed +10% for 3s.", "After mitigation, speed +15% for 6s.", "After mitigation, speed +20% for 10s."])
        ]
    },
    {
        id: "para_bellum",
        name: "Para Bellum",
        load: 25,
        tier: 3,
        rarity: "rare",
        summary: "General Skeleton implant for physical, projectile, explosion, and elemental damage resistance.",
        branches: [
            branch("combat_skeleton", "Physical Damage Resistance", "minecraft:shield", "Physical damage resistance: 12%.", ["Physical damage resistance: 13.5%.", "Physical damage resistance: 15%."]),
            branch("blast_hardened", "Explosion Damage Resistance", "minecraft:obsidian", "Explosion damage resistance: 8%.", ["Explosion damage resistance: 12%.", "Explosion damage resistance: 15%."]),
            branch("ballistic_reinforcement", "Projectile Damage Resistance", "minecraft:crossbow", "Projectile damage resistance: 8%.", ["Projectile damage resistance: 12%.", "Projectile damage resistance: 15%."]),
            branch("insulated_armor", "Elemental Damage Resistance", "project_edgerunner:textures/gui/upgrades/elemental_resistance.png", "Thermal, electric, and freeze damage resistance: 5%.", ["Thermal, electric, and freeze damage resistance: 8%.", "Thermal, electric, and freeze damage resistance: 10%."])
        ]
    },
    {
        id: "rara_avis",
        name: "Rara Avis",
        load: 45,
        tier: 5,
        rarity: "epic",
        summary: "Iconic heavy Skeleton implant with high resistances, movement penalty, and combat pressure.",
        branches: [
            branch("iconic_reinforcement", "Iconic Reinforcement", "minecraft:shield", "Physical damage resistance: 40%; projectile damage resistance: 25%.", ["Physical damage resistance: 45%; projectile damage resistance: 28%.", "Physical damage resistance: 50%; projectile damage resistance: 30%."]),
            branch("iconic_insulation", "Iconic Insulation", "project_edgerunner:textures/gui/upgrades/elemental_resistance.png", "Thermal, electric, and freeze damage resistance: 10%.", ["Thermal, electric, and freeze damage resistance: 13%.", "Thermal, electric, and freeze damage resistance: 15%."]),
            branch("heavy_impact_body", "Heavy Impact Body", "minecraft:heavy_weighted_pressure_plate", "No defensive shockwave.", ["Incoming damage >= 12 emits a defensive shockwave (visible enemies only, 2s cooldown).", "Shockwave damage improves."]),
            branch("armored_momentum", "Armored Momentum", "minecraft:golden_boots", "No sprint-hit bonus.", ["First hit after 2s sprint deals +15%.", "First hit after 2s sprint deals +25%, or +35% with Titanium."]),
            branch("redline", "Redline", "minecraft:redstone_block", "No Redline resistance bonus.", ["Below 35% HP: +5% resist, +10% Slam damage and Fury.", "Below 35% HP: +10% resist, +15% Slam damage and Fury."])
        ]
    },
    {
        id: "scar_coalescer",
        name: "Scar Coalescer",
        load: 20,
        tier: 2,
        rarity: "uncommon",
        summary: "Low-health Skeleton implant for physical damage resistance, bleed control, and survival damage.",
        branches: [
            branch("scar_tissue", "Scar Tissue", "minecraft:leather", "Below 50% HP, physical damage resistance: 22%.", ["Below 50% HP, physical damage resistance: 26%.", "Below 50% HP, physical damage resistance: 30%."]),
            branch("emergency_coagulation", "Emergency Coagulation", "minecraft:honey_bottle", "No Bleeding protection yet.", ["No Bleeding protection yet.", "At or below 30% HP, new Bleeding is blocked and existing Bleeding is removed."]),
            branch("survival_aggression", "Survival Aggression", "minecraft:iron_sword", "No low-health melee damage bonus.", ["Below 40% HP, melee damage +10%.", "Below 25% HP, melee damage +15%."]),
            single("cyberpsycho_scar_response", "Cyberpsycho Scar Response", "minecraft:echo_shard", "At Cyberpsychosis Phase III+, defense +10% with extra Pressure.", 2, "No Cyberpsychosis phase defense bonus.")
        ]
    },
    {
        id: "scarab",
        name: "Scarab",
        load: 14,
        tier: 2,
        rarity: "uncommon",
        summary: "Crouch-brace Skeleton implant for bunker-style defense.",
        branches: [
            branch("scarab_plating", "Crouch Physical Resistance", "minecraft:iron_block", "While crouching, physical damage resistance: 20%.", ["While crouching, physical damage resistance: 24%.", "While crouching, physical damage resistance: 28%."]),
            branch("grounded_shell", "Brace Knockback", "minecraft:deepslate", "After 1s crouched, Brace knockback resistance: 10%.", ["Brace knockback resistance: 20%.", "Brace knockback resistance: 30%."]),
            branch("burrowed_defense", "Burrowed Projectile Defense", "minecraft:scute", "No extra burrowed projectile defense.", ["After 2s crouched, projectile reduction adds 15%.", "After 2s crouched, projectile reduction adds 25%."]),
            single("scarab_counterweight", "Counterweight", "minecraft:anvil", "After leaving Brace, next melee hit within 3s deals +15% and grants 70 Gorilla Fury.", 2, "No post-Brace counterattack.")
        ]
    },
    {
        id: "spring_joints",
        name: "Spring Joints",
        load: 16,
        tier: 3,
        rarity: "rare",
        summary: "Impact Skeleton implant for strong-hit mitigation, fall reduction, and rebound movement.",
        branches: [
            branch("elastic_fibers", "Strong Impact Mitigation", "minecraft:string", "Incoming damage >= 4 is reduced by 18%.", ["Incoming damage >= 4 is reduced by 21%.", "Incoming damage >= 4 is reduced by 24%."]),
            branch("fall_springs", "Fall Reduction", "minecraft:hay_block", "Fall damage taken: -15%.", ["Fall damage taken: -22%.", "Fall damage taken: -30%."]),
            branch("impact_rebound", "Impact Rebound", "minecraft:rabbit_foot", "No rebound jump after incoming damage >= 4.", ["Incoming damage >= 4 empowers next jump by 10% and adds +1 safe fall block for that jump.", "Incoming damage >= 4 empowers next jump by 15% and adds +1.5 safe fall blocks for that jump."]),
            single("slam_recoil", "Slam Recoil", "minecraft:piston", "After Gorilla Slam, speed +10% for 2s; 3+ targets grants 90 Gorilla Fury.", 2, "No Slam recovery speed.")
        ]
    },
    {
        id: "universal_booster",
        name: "Universal Booster",
        load: 25,
        tier: 4,
        rarity: "rare",
        summary: "One activation per Blood Pump injection or 4 HP of actual healing. Duration starts at use; two stacks require distinct uses. Overhealing does not count.",
        branches: [
            branch("booster_plating", "Booster Resistance", "minecraft:shield", "One stack: 10% resist; two stacks: 15%.", ["One stack: 12%; two stacks: 17%.", "One stack: 13%; two stacks: 18%."]),
            branch("extended_flow", "Booster Duration", "project_edgerunner:textures/gui/upgrades/duration.png", "Booster duration: 5s.", ["Booster duration: 6s.", "Booster duration: 7s."]),
            branch("blood_pump_integration", "Blood Pump Integration", "minecraft:honey_bottle", "Blood Pump trigger adds no extra resistance.", ["Blood Pump trigger adds +3% resistance.", "Blood Pump trigger adds +5% resistance."]),
            single("emergency_medical_frame", "Emergency Medical Frame", "minecraft:totem_of_undying", "Below 30% HP, Booster clears Bleeding, and grants Absorption.", 3, "No low-health emergency Booster.")
        ]
    },
    {
        id: "hollow_bones",
        name: "Hollow Bones",
        load: 10,
        tier: 2,
        rarity: "uncommon",
        summary: "Lightweight Skeleton implant for movement and jumping, with physical vulnerability.",
        fixed: [
            fixed("hollow_drawbacks", "Light Frame Drawbacks", "minecraft:bone", "Physical vulnerability: +10% damage taken; Gorilla Slam damage and Fury generation: -10%; knockback resistance: -15%.")
        ],
        branches: [
            branch("carbon_lattice", "Light Movement", "minecraft:phantom_membrane", "Movement speed: +10%; sprinting/climbing: an extra +15%. Air steering: +10%, with normal gravity.", ["Movement speed: +12%; sprinting/climbing: an extra +18%. Air steering: +15%, with normal gravity.", "Movement speed: +14%; sprinting/climbing: an extra +20%. Air steering: +20%, with normal gravity."]),
            branch("featherweight_launch", "Jump Height", "minecraft:feather", "Jump height: +15%; safe fall threshold +1 block.", ["Jump height: +20%; safe fall threshold +1.5 blocks.", "Jump height: +25%; safe fall threshold +2 blocks."]),
            branch("soft_landing", "Fall Reduction", "minecraft:hay_block", "Fall damage taken: -20%.", ["Fall damage taken: -28%.", "Fall damage taken: -35%; with Bionic, landings grant speed."]),
            branch("evasion_skeleton", "Moving Evasion", "minecraft:rabbit_foot", "No moving evasion.", ["While moving, 10% chance to reduce damage by 25%.", "While moving, 15% chance to reduce damage by 25%."])
        ]
    }
];

function branch(id, title, icon, baseDescription, descriptions) {
    return {
        id: id,
        title: title,
        icon: icon,
        baseDescription: baseDescription,
        tiers: descriptions || []
    };
}

function fixed(id, title, icon, description) {
    return {
        id: id,
        title: title,
        icon: icon,
        description: description
    };
}

function single(id, title, icon, description, cost, baseDescription) {
    return {
        id: id,
        title: title,
        icon: icon,
        baseDescription: baseDescription || "Locked.",
        tiers: [description],
        single: true,
        cost: Math.max(1, Number(cost || 1))
    };
}

function roman(value) {
    return ["I", "II", "III", "IV", "V"][value - 1] || String(value);
}

function partsItemFor(implant) {
    var tier = Math.max(1, Math.min(5, Number(implant.tier || 1)));
    return SKELETON_PARTS_BY_TIER[tier] || SKELETON_PARTS_BY_TIER[1];
}

function iconTextureFor(implant) {
    return "project_edgerunner:textures/item/" + implant.id + "_item.png";
}

function skeletonBuyCondition(implant, amount) {
    return {
        type: "palladium:item_buyable",
        ingredient: {
            item: partsItemFor(implant)
        },
        amount: Math.max(1, Math.floor(Number(amount || 1)))
    };
}

function skeletonUnlockCondition(abilityId) {
    return {
        type: "palladium:ability_unlocked",
        ability: abilityId
    };
}

function skeletonCommandAbility(icon, title, description, x, y, unlocking) {
    return {
        type: "palladium:command",
        icon: icon,
        title: title,
        description: description,
        hidden_in_bar: true,
        first_tick_commands: [],
        last_tick_commands: [],
        commands: [],
        gui_position: [x, y],
        conditions: {
            enabling: [{ type: "palladium:true" }],
            unlocking: unlocking || []
        }
    };
}

function branchBaseId(branchId) {
    return "base_" + branchId;
}

function branchTierId(branch, tierIndex) {
    return branch.single ? branch.id : branch.id + "_" + tierIndex;
}

function buildBranchNodes(implant, branch, x, baseY) {
    var abilities = {};
    baseY = baseY === undefined ? SKELETON_TREE_LAYOUT.baseRowY : baseY;
    var baseId = branchBaseId(branch.id);

    abilities[baseId] = skeletonCommandAbility(
        branch.icon,
        "Base " + branch.title,
        branch.baseDescription || "Base effect.",
        x,
        baseY,
        [skeletonUnlockCondition(implant.id + "_core")]
    );

    var previousAbility = baseId;
    for (var t = 0; t < branch.tiers.length; t++) {
        if (!abilities[previousAbility]) break;
        var tierIndex = t + 1;
        var abilityId = branchTierId(branch, tierIndex);
        var title = branch.single ? branch.title : branch.title + " " + roman(tierIndex);
        var cost = branch.single ? branch.cost : Math.max(1, Math.ceil((tierIndex + Number(implant.tier || 1)) / 2));
        abilities[abilityId] = skeletonCommandAbility(
            branch.icon,
            title,
            branch.tiers[t],
            x,
            baseY - (SKELETON_TREE_LAYOUT.upgradeStepY * tierIndex),
            [
                skeletonUnlockCondition(previousAbility),
                skeletonBuyCondition(implant, cost)
            ]
        );
        previousAbility = abilityId;
    }

    return abilities;
}

function buildFixedNode(implant, node, x, y) {
    var abilities = {};
    abilities[node.id] = skeletonCommandAbility(
        node.icon,
        node.title,
        node.description,
        x,
        y === undefined ? SKELETON_TREE_LAYOUT.baseRowY : y,
        [skeletonUnlockCondition(implant.id + "_core")]
    );
    return abilities;
}

// Layout is exactly the original one: branches and fixed nodes share one row, centred under the core.
// Only a node whose optional mod is absent disappears, and the remaining row re-centres itself.
function skeletonColumns(implant) {
    var columns = [];
    (implant.branches || []).concat(implant.fixed || []).forEach(function (node) {
        if (node.requiresMod && !Platform.isLoaded(node.requiresMod)) return;
        columns.push(node);
    });
    return columns;
}

function buildSkeletonPower(implant) {
    var itemIcon = iconTextureFor(implant);
    var abilities = {};
    var coreId = implant.id + "_core";
    var columns = skeletonColumns(implant);

    abilities[coreId] = skeletonCommandAbility(
        itemIcon,
        implant.name,
        implant.summary,
        0,
        SKELETON_TREE_LAYOUT.rootY,
        []
    );

    columns.forEach(function (node, nodeIndex) {
        var x = columns.length === 1
            ? 0
            : (nodeIndex - ((columns.length - 1) / 2)) * SKELETON_TREE_LAYOUT.branchStepX;
        if (node.tiers) {
            Object.assign(abilities, buildBranchNodes(implant, node, x));
        } else {
            Object.assign(abilities, buildFixedNode(implant, node, x));
        }
    });

    return {
        name: implant.name,
        persistent_data: true,
        background: "minecraft:textures/block/polished_deepslate.png",
        ability_bar_texture: "project_edgerunner:textures/gui/ability_bar.png",
        icon: itemIcon,
        gui_display_type: "tree",
        abilities: abilities
    };
}

ServerEvents.highPriorityData(function (event) {
    SKELETON_IMPLANTS.forEach(function (implant) {
        global.addLocalizedPowerJson(event, "project_edgerunner:palladium/powers/" + implant.id, buildSkeletonPower(implant));
    });
});

if (!global.registerCyberwareInstallComponent) {
    throw new Error("[Cyberpunk/Cyberware] Install registry not loaded before skeleton registration.");
}

SKELETON_IMPLANTS.forEach(function (implant) {
    global.registerCyberwareInstallComponent({
        item: "project_edgerunner:" + implant.id,
        name: implant.name,
        type: "skeleton",
        body_slot: "skeleton",
        activation_mode: "passive",
        load_cost: implant.load,
        palladium_power: "project_edgerunner:" + implant.id,
        install_message: implant.name + " installed.",
        remove_message: implant.name + " removed."
    });
});
