// priority: 60
// Server script: Arasaka Mantis Blades (arms slot). Java owns combat (MantisBladesRuntime) and reads
// the unlocked upgrade abilities directly (MantisUpgrades); this power owns the upgrade tree and the
// two always-on arm layers that MantisRig animates on the client.
(function () {
const POWER = "project_edgerunner:mantis_blades";
const ITEM = "project_edgerunner:mantis_blades";
const PARTS = "project_edgerunner:cyberware_internal_parts_t4";
const ICON = "project_edgerunner:textures/item/mantis_blades_item.png";
const DAMAGE_TIERS = [10, 20, 30, 40];
const BLEED_TIERS = [12, 16, 20, 25];
const TIER_COSTS = [1, 2, 3, 4];
const ROMAN = ["I", "II", "III", "IV"];
const LAYOUT = {
    rootY: 0.5, baseRowY: -0.35, branchX: 0.65, sideX: 1.85,
    stepY: 0.68, upgradeStartY: -1.03, edgeSocketY: -3.75, elementRowY: -4.43
};

const SPECIALS = [
    {
        id: "deflect", icon: "minecraft:shield", title: "Deflector Edge",
        x: -LAYOUT.sideX, y: LAYOUT.baseRowY, cost: 2, requires: ["base_damage"],
        description: "Guard (hold use) now deflects arrows, fireballs and bullets.\nPerfect Parry: raise the guard just before impact to send projectiles back at the shooter and return bullet fire."
    },
    {
        id: "climb", icon: "minecraft:vine", title: "Arachnid Grip",
        x: LAYOUT.sideX, y: LAYOUT.baseRowY, cost: 2, requires: ["base_bleed"],
        description: "Walk towards a wall at least 1.5 blocks tall to sink the blades in and climb. Leaps catch the wall on contact.\nForward climbs; left/right traverse and round corners; hold sneak to slide down faster and faster; back lets go.\nJump: facing the wall lunges up it, facing along it vaults sideways, facing away kicks off where you look."
    },
    {
        id: "climb_fast", icon: "minecraft:rabbit_foot", title: "Rapid Ascent",
        x: LAYOUT.sideX, y: LAYOUT.upgradeStartY, cost: 2,
        requires: ["upgrade_special_climb"],
        description: "Reinforced blade actuators: every climbing step, up or sideways, is about 40% quicker."
    },
    {
        id: "jailbreak", icon: "minecraft:ender_pearl", title: "Jailbreak",
        x: -LAYOUT.sideX, y: LAYOUT.upgradeStartY - LAYOUT.stepY, cost: 3, requires: ["upgrade_damage_2"],
        description: "Leap range 12 -> 24 blocks and cooldown 5s -> 3s.\nKills from a leap or a combo finisher instantly reset the leap."
    },
    {
        id: "crimson", icon: "minecraft:nether_star", title: "Crimson Dance",
        x: LAYOUT.sideX, y: LAYOUT.upgradeStartY - 2 * LAYOUT.stepY, cost: 4, requires: ["upgrade_bleed_3"],
        description: "Attack an enemy below 25% health to execute it: dash in, impale it on both blades and rip them out.\nEach execution restores a little health, cuts the leap cooldown to at most 1.5s and starts a 2.5s dance. During the dance, the next execution works below 35% health."
    }
];

const ELEMENTS = [
    { id: "thermal", icon: "minecraft:blaze_powder", title: "Thermal Edge", x: -1.05,
      description: "Exclusive. Blades glow white-hot: hits have a 12% ignition chance; finishers and leaps have a 35% chance and scorch the landing zone." },
    { id: "electric", icon: "minecraft:lightning_rod", title: "Electrical Edge", x: 0,
      description: "Exclusive. Hits have a 10% Electroshock chance; finishers and leaps have a 30% chance to shock and arc into one nearby enemy." },
    { id: "toxic", icon: "minecraft:slime_ball", title: "Chemical Edge", x: 1.05,
      description: "Exclusive. Hits have a 12% poison chance; finishers and leaps have a 35% chance. A toxic leap poisons nearby enemies at impact." }
];

function unlocked(ability) {
    return { type: "palladium:ability_unlocked", power: POWER, ability: ability };
}

function notUnlocked(ability) {
    return { type: "palladium:not", conditions: [unlocked(ability)] };
}

function cost(amount) {
    return { type: "palladium:item_buyable", ingredient: { item: PARTS }, amount: amount };
}

function node(icon, title, description, x, y, unlocking, firstTick) {
    return {
        type: "palladium:command", icon: icon, title: title, description: description,
        hidden_in_bar: true, list_index: -1, gui_position: [x, y],
        first_tick_commands: firstTick || [], last_tick_commands: [], commands: [],
        conditions: { enabling: [{ type: "palladium:true" }], unlocking: unlocking }
    };
}

// The blade arm replaces the vanilla arm for as long as the implant is installed (closed it looks
// like a normal arm), so the model never swaps mid-animation.
function armLayer(side) {
    return {
        type: "palladium:render_layer", hidden: true, hidden_in_bar: true,
        render_layer: "project_edgerunner:mantis_blades_" + side,
        conditions: { enabling: [{ type: "palladium:true" }], unlocking: [] }
    };
}

function buildAbilities() {
    var abilities = {
        mantis_blades_toggle: {
            type: "kubejs:cyberpunk/mantis_blades_toggle", icon: ICON, title: "Mantis Blades",
            description: "Deploy or sheathe both forearm blades. Held items are stowed while the blades are out.\n"
                + "Attack: three-hit combo ending in a cross cut. Hold attack: charge a Mantis Leap.\nHold use: guard, cancel a leap charge, or cancel a leap during flight.",
            hidden: false, hidden_in_bar: true, list_index: 0, gui_position: [0, LAYOUT.rootY],
            conditions: {
                enabling: [{ type: "palladium:action", cooldown: 0, key_type: "key_bind", needs_empty_hand: false, allow_scrolling_when_crouching: true }],
                unlocking: []
            }
        },
        base_damage: node("minecraft:iron_sword", "Monomolecular Edge",
            "Base: +5 attack damage, +25% attack speed and +1 reach while deployed.\nUpgrades add +10% to +40% blade damage.",
            -LAYOUT.branchX, LAYOUT.baseRowY, [unlocked("mantis_blades_toggle")]),
        base_bleed: node("minecraft:redstone", "Serrated Spine",
            "Base: 8% Bleed chance. Finishers and leaps detonate Bleed as Hemorrhage.\nUpgrades raise Bleed chance to 25%.",
            LAYOUT.branchX, LAYOUT.baseRowY, [unlocked("mantis_blades_toggle")])
    };

    for (var tier = 1; tier <= 4; tier++) {
        var y = LAYOUT.upgradeStartY - (tier - 1) * LAYOUT.stepY;
        abilities["upgrade_damage_" + tier] = node("minecraft:iron_sword", "Blade Damage " + ROMAN[tier - 1],
            "+" + DAMAGE_TIERS[tier - 1] + "% blade damage (slashes, cross cuts, leaps).",
            -LAYOUT.branchX, y,
            [unlocked(tier === 1 ? "base_damage" : "upgrade_damage_" + (tier - 1)), cost(TIER_COSTS[tier - 1])]);
        abilities["upgrade_bleed_" + tier] = node("minecraft:redstone", "Bleed " + ROMAN[tier - 1],
            BLEED_TIERS[tier - 1] + "% chance to apply Bleed on hit.",
            LAYOUT.branchX, y,
            [unlocked(tier === 1 ? "base_bleed" : "upgrade_bleed_" + (tier - 1)), cost(TIER_COSTS[tier - 1])]);
    }

    SPECIALS.forEach(function (special) {
        var id = "upgrade_special_" + special.id;
        var unlocking = special.requires.map(unlocked);
        unlocking.push(cost(special.cost));
        abilities[id] = node(special.icon, special.title, special.description, special.x, special.y, unlocking);
    });

    abilities.edge_socket = node("minecraft:anvil", "Edge Calibration",
        "Maximize Blade Damage and Bleed to calibrate an exclusive Thermal, Electrical or Chemical edge.",
        0, LAYOUT.edgeSocketY, [unlocked("upgrade_damage_4"), unlocked("upgrade_bleed_4")]);

    ELEMENTS.forEach(function (element) {
        var id = "upgrade_element_" + element.id;
        var unlocking = [unlocked("edge_socket")];
        var firstTick = [];
        ELEMENTS.forEach(function (other) {
            if (other.id !== element.id) {
                unlocking.push(notUnlocked("upgrade_element_" + other.id));
                firstTick.push("ability lock @s " + POWER + " upgrade_element_" + other.id);
            }
        });
        unlocking.push(cost(5));
        abilities[id] = node(element.icon, element.title, element.description, element.x, LAYOUT.elementRowY,
            unlocking, firstTick);

        var retune = [];
        ELEMENTS.forEach(function (candidate) {
            retune.push("ability lock @s " + POWER + " upgrade_element_" + candidate.id);
            retune.push("ability lock @s " + POWER + " retune_element_" + candidate.id);
        });
        abilities["retune_element_" + element.id] = node("minecraft:barrier", "Retune Edge",
            "Clear the installed edge coating so another element can be chosen. Spent parts are not refunded.",
            element.x, LAYOUT.elementRowY - LAYOUT.stepY, [unlocked(id), cost(3)], retune);
    });
    abilities.mantis_blades_arm_left = armLayer("left");
    abilities.mantis_blades_arm_right = armLayer("right");
    return abilities;
}

ServerEvents.highPriorityData(function (event) {
    global.addLocalizedPowerJson(event, "project_edgerunner:palladium/powers/mantis_blades", {
        name: "Mantis Blades",
        persistent_data: true,
        background: "minecraft:textures/block/crimson_hyphae.png",
        ability_bar_texture: "project_edgerunner:textures/gui/ability_bar.png",
        icon: ICON,
        gui_display_type: "tree",
        abilities: buildAbilities()
    });
});

if (!global.registerCyberwareInstallComponent) {
    throw new Error("[Cyberpunk/Cyberware] Install registry not loaded before Mantis Blades registration.");
}

global.registerCyberwareInstallComponent({
    item: ITEM,
    name: "Mantis Blades",
    type: "arms",
    body_slot: "arms",
    activation_slot: "arms",
    activation_mode: "manual",
    load_cost: 30,
    palladium_power: POWER,
    install_message: "Mantis Blades installed. Arasaka Daikon NT online.",
    remove_message: "Mantis Blades removed."
});
})();
