// priority: 59
// Content and numerical previews use exactly the same catalog as the Java runtime.
var SupportCatalog = Java.loadClass("com.edgerunner.cyberware.SupportCyberwareCatalog");
var SUPPORT_IMPLANTS = JSON.parse(String(SupportCatalog.json()));

function supportUnlocked(id) { return { type: "palladium:ability_unlocked", ability: id }; }
function supportNode(icon, title, description, x, y, unlocking) {
    return {
        type: "palladium:command", icon: icon, title: title, description: description,
        hidden_in_bar: true, first_tick_commands: [], last_tick_commands: [], commands: [],
        gui_position: [x, y], conditions: { enabling: [{ type: "palladium:true" }], unlocking: unlocking || [] }
    };
}
function supportRule(id, icon, title, description, track, requiresMod) {
    return { id: id, icon: icon, title: title, description: description, track: track || null, requiresMod: requiresMod || "" };
}
function supportTrack(id, label, unit, value, lower) {
    return { id: id, label: "stat.project_edgerunner.support_label." + label, unit: unit, values: [value], lower: !!lower };
}
// Stat columns keep their original layout: centred under the core, base row, then the upgrades above.
// The operating rules are small nodes around the core, always mirrored: pairs sit left and right of it,
// an odd one sits on the centre line below it, and a second pair hangs under the first one.
var SUPPORT_LAYOUT = { rootY: 0.375, baseY: -0.375, stepY: 0.56, stepX: 1.15 };
var SUPPORT_RULE_SLOTS = {
    1: ["C"],
    2: ["L1", "R1"],
    3: ["L1", "R1", "C"],
    4: ["L1", "R1", "L2", "R2"]
};
// Listed in slot order: the first of each pair goes left, the second right, then the centre or the lower pair.
var SUPPORT_RULES = {
    threatevac: [
        supportRule("activation", "minecraft:comparator", "Activation", "Activation: 25% HP.", supportTrack("activation", "activation", "PERCENT", 25)),
        supportRule("end", "minecraft:target", "End", "Ends: above 35% HP.", supportTrack("end_health", "end_health", "PERCENT", 35)),
        supportRule("combat", "minecraft:clock", "Combat Window", "Combat window: 10s.", supportTrack("combat_window", "combat_window", "SECONDS", 10))
    ],
    neofiber: [
        supportRule("chance_cap", "minecraft:compass", "Chance Cap", "Chance cap: 60%.", supportTrack("chance_cap", "chance_cap", "PERCENT", 60)),
        supportRule("strength", "minecraft:netherite_chestplate", "Shared Strength", "Shared strength: 25%.", supportTrack("shared_strength", "shared_strength", "PERCENT", 25)),
        supportRule("strength_cap", "minecraft:netherite_chestplate", "Strength Cap", "Strength cap: 55%.", supportTrack("strength_cap", "strength_cap", "PERCENT", 55))
    ],
    heal_on_kill: [
        supportRule("absorption", "minecraft:golden_apple", "Absorption", "Absorption: 4 HP.", supportTrack("absorption", "absorption", "HP", 4)),
        supportRule("saturation", "minecraft:cooked_beef", "Saturation Window", "Saturation window: 10s.", supportTrack("saturation_window", "saturation_window", "SECONDS", 10)),
        supportRule("absorption_time", "project_edgerunner:textures/gui/upgrades/duration.png", "Absorption Time", "Absorption: 10s.", supportTrack("absorption_time", "absorption_time", "SECONDS", 10)),
        supportRule("cooldown", "minecraft:clock", "Cooldown", "Cooldown: 1s.", supportTrack("cooldown", "cooldown", "SECONDS", 1, true))
    ],
    countershell: [
        supportRule("trigger", "minecraft:shield", "Trigger", "Trigger: 30% max HP.", supportTrack("trigger_loss", "trigger_loss", "PERCENT", 30)),
        supportRule("window", "minecraft:clock", "Window", "Window: 3s.", supportTrack("trigger_window", "trigger_window", "SECONDS", 3))
    ],
    proxishield: [
        supportRule("armor", "minecraft:iron_chestplate", "Armor", "Armor: +1.", supportTrack("armor_bonus", "armor", "COUNT", 1))
    ],
    biomonitor: [
        supportRule("priority", "minecraft:honeycomb", "Priority", "Priority: Blood Pump, healing potion, regeneration potion."),
        supportRule("search", "minecraft:hopper", "Search", "Offhand first, then hotbar.")
    ],
    microgenerator: [
        supportRule("rounds", "minecraft:glowstone_dust", "Loaded Rounds", "Loaded rounds: 1-5 at 50-100% damage.", supportTrack("round_damage_min", "round_damage_min", "PERCENT", 50), "tacz"),
        supportRule("hops", "minecraft:water_bucket", "Wet Hops", "Wet hops: 2, at 70% and 49%.", supportTrack("wet_hops", "wet_hops", "COUNT", 2), "tacz")
    ]
};

function supportValueDescription(implant, stat, value) {
    if (implant.id === "threatevac" && stat.id === "speed") return {
        translate: "ability.project_edgerunner.threatevac.live_speed" + (Platform.isLoaded("parcool") ? "_parcool" : ""),
        with: [String(value), String(value + 10), String(value + 5)] };
    var suffix = stat.unit === "PERCENT" ? "%" : stat.unit === "BLOCKS" ? "m" : "";
    var formatted = suffix ? String(value) + suffix : String(value);
    if (stat.unit === "HP" || stat.unit === "SECONDS") formatted = { translate: "ability.project_edgerunner.support.value_unit",
        with: [String(value), { translate: stat.unit === "HP" ? "unit.project_edgerunner.health_short" : "unit.project_edgerunner.seconds_short" }] };
    return { translate: "stat.project_edgerunner.support." + stat.id, with: [formatted] };
}
function supportRuleSpot(slot) {
    var below = SUPPORT_LAYOUT.rootY + SUPPORT_LAYOUT.stepY;
    return {
        L1: { x: -SUPPORT_LAYOUT.stepX, y: SUPPORT_LAYOUT.rootY, parent: "" },
        R1: { x: SUPPORT_LAYOUT.stepX, y: SUPPORT_LAYOUT.rootY, parent: "" },
        C: { x: 0, y: below, parent: "" },
        L2: { x: -SUPPORT_LAYOUT.stepX, y: below, parent: "L1" },
        R2: { x: SUPPORT_LAYOUT.stepX, y: below, parent: "R1" }
    }[slot];
}
function supportPower(implant) {
    var abilities = {};
    var core = implant.id + "_core";
    var itemIcon = "project_edgerunner:textures/item/" + implant.id + "_item.png";
    abilities[core] = supportNode(itemIcon, implant.name, implant.summary, 0, SUPPORT_LAYOUT.rootY, []);
    var tracks = [];
    var stats = implant.stats.filter(function (stat) {
        return !(stat.requiresMod && !Platform.isLoaded(stat.requiresMod));
    });
    stats.forEach(function (stat, index) {
        var x = (index - (stats.length - 1) / 2) * SUPPORT_LAYOUT.stepX;
        var base = "base_" + stat.id;
        abilities[base] = supportNode(stat.icon, "Base " + stat.label,
            String(stat.values[0]), x, SUPPORT_LAYOUT.baseY, [supportUnlocked(core)]);
        abilities[base].description = supportValueDescription(implant, stat, stat.values[0]);
        if (implant.id === "proxishield" && stat.id === "full_radius") abilities[base].description = {
            translate: "ability.project_edgerunner.proxishield.radius_fade", with: [String(stat.values[0]), String(stat.values[0] + 3)] };
        var previous = base;
        var nodes = [];
        for (var tier = 1; tier < stat.values.length; tier++) {
            var id = "upgrade_" + stat.id + "_" + tier;
            nodes.push(id);
            abilities[id] = supportNode(stat.icon, stat.label + " " + (tier === 1 ? "I" : "II"),
                String(stat.values[tier]), x, SUPPORT_LAYOUT.baseY - SUPPORT_LAYOUT.stepY * tier, [
                    supportUnlocked(previous),
                    { type: "palladium:item_buyable", ingredient: { item: "project_edgerunner:cyberware_internal_parts_t" + implant.tier }, amount: tier + implant.tier }
                ]);
            abilities[id].description = supportValueDescription(implant, stat, stat.values[tier]);
            if (implant.id === "proxishield" && stat.id === "full_radius") abilities[id].description = {
                translate: "ability.project_edgerunner.proxishield.radius_fade", with: [String(stat.values[tier]), String(stat.values[tier] + 3)] };
            previous = id;
        }
        tracks.push({ id: stat.id, label: "stat.project_edgerunner.support_label." + stat.id,
            unit: stat.unit, values: stat.values, nodes: nodes, lower_is_better: !!stat.lower_is_better,
            condition: "stat.project_edgerunner.support_condition." + implant.id });
    });
    // A rule whose optional mod is missing does not exist; the rest re-mirror around the core.
    var rules = (SUPPORT_RULES[implant.id] || []).filter(function (rule) {
        return !(rule.requiresMod && !Platform.isLoaded(rule.requiresMod));
    });
    var slots = SUPPORT_RULE_SLOTS[rules.length] || [];
    var slotNode = {};
    rules.forEach(function (rule, index) {
        var spot = supportRuleSpot(slots[index]);
        var ruleId = "rule_" + rule.id;
        slotNode[slots[index]] = ruleId;
        abilities[ruleId] = supportNode(rule.icon, rule.title, rule.description, spot.x, spot.y,
            [supportUnlocked(spot.parent ? slotNode[spot.parent] : core)]);
        var ruleTracks = rule.track ? [rule.track] : [];
        if (rule.id === "rounds") ruleTracks.push(supportTrack("round_damage_max", "round_damage_max", "PERCENT", 100));
        if (rule.id === "hops") {
            ruleTracks.push(supportTrack("hop_first", "hop_first", "PERCENT", 70));
            ruleTracks.push(supportTrack("hop_second", "hop_second", "PERCENT", 49));
        }
        ruleTracks.forEach(function (track) {
            tracks.push({ id: track.id, label: track.label, unit: track.unit, values: track.values,
                nodes: [ruleId], lower_is_better: !!track.lower,
                condition: "stat.project_edgerunner.support_condition." + implant.id });
        });
    });
    return { name: implant.name, persistent_data: true,
        background: "minecraft:textures/block/polished_deepslate.png",
        ability_bar_texture: "project_edgerunner:textures/gui/ability_bar.png", icon: itemIcon,
        gui_display_type: "tree", edgerunner_base_load: implant.base_load, edgerunner_stats: tracks, abilities: abilities };
}

ServerEvents.highPriorityData(function (event) {
    SUPPORT_IMPLANTS.forEach(function (implant) {
        if (implant.requires && !Platform.isLoaded(implant.requires)) return;
        global.addLocalizedPowerJson(event, "project_edgerunner:palladium/powers/" + implant.id, supportPower(implant));
    });
});

SUPPORT_IMPLANTS.forEach(function (implant) {
    if (implant.requires && !Platform.isLoaded(implant.requires)) return;
    global.registerCyberwareInstallComponent({
        item: "project_edgerunner:" + implant.id, name: implant.name,
        type: implant.slot, body_slot: implant.slot, activation_mode: "passive",
        load_cost: implant.max_load, palladium_power: "project_edgerunner:" + implant.id,
        install_message: implant.name + " installed.", remove_message: implant.name + " removed."
    });
});
