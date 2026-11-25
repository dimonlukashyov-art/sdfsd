(function () {
const BerserkRuntime = Java.loadClass("com.edgerunner.berserk.BerserkRuntime");

global.BERSERK_VARIANTS = [
    {
        id: "berserk_moore_tech", itemId: "project_edgerunner:berserk_moore_tech",
        powerId: "project_edgerunner:berserk_moore_tech", name: "Moore Tech Berserk",
        manufacturer: "Moore Technologies", tier: 2, loadCost: 24, rarity: "uncommon",
        internalParts: "project_edgerunner:cyberware_internal_parts_t2",
        armor: [30, 40, 50], duration: [8, 9.5, 11], cooldown: [60, 45, 35, 25],
        branches: [
            { id: "bastion", title: "Bastion", icon: "minecraft:shield", description: "Resist knockback while Berserk is active.", masteryDescription: "Sustained incoming hits build five Bastion stacks, granting up to 10% additional damage reduction." },
            { id: "breach", title: "Breach", icon: "minecraft:iron_axe", description: "Fully charged melee attacks deal 10% additional damage.", masteryDescription: "Fully charged melee attacks deal 20% additional damage and briefly stagger the target." }
        ]
    },
    {
        id: "berserk_biodyne", itemId: "project_edgerunner:berserk_biodyne",
        powerId: "project_edgerunner:berserk_biodyne", name: "BioDyne Berserk",
        manufacturer: "BioDyne Systems", tier: 2, loadCost: 40, rarity: "uncommon",
        internalParts: "project_edgerunner:cyberware_internal_parts_t2",
        armor: [30, 40, 50], duration: [8, 9.5, 11], cooldown: [60, 47.5, 35],
        attackSpeed: [15, 22.5, 30], crit: [5, 10, 15, 20],
        branches: [
            { id: "hemorrhage", title: "Hemorrhage", icon: "minecraft:redstone", description: "Critical hits inflict Bleed and begin tracking that target.", masteryDescription: "Critical hits against the tracked bleeding target build up to +15% critical chance." },
            { id: "predation", title: "Predation", icon: "minecraft:spider_eye", description: "Gain +10% critical chance on the first hit against each target.", masteryDescription: "Each neutralization primes your next successful hit as a guaranteed critical." }
        ]
    },
    {
        id: "berserk_zetatech", itemId: "project_edgerunner:berserk_zetatech",
        powerId: "project_edgerunner:berserk_zetatech", name: "Zetatech Berserk",
        manufacturer: "Zetatech", tier: 3, loadCost: 32, rarity: "uncommon",
        internalParts: "project_edgerunner:cyberware_internal_parts_t3",
        armor: [35, 42.5, 50], duration: [9, 10, 11], cooldown: [45, 35, 25],
        attackSpeed: [10, 15, 20], fall: [20, 25, 30],
        branches: [
            { id: "momentum", title: "Momentum", icon: "minecraft:rabbit_foot", description: "Gain +10% movement speed while sprinting during Berserk.", masteryDescription: "Sprinting melee attacks deal 15% additional damage." },
            { id: "seismic", title: "Seismic", icon: "minecraft:anvil", description: "Landings from four or more blocks emit a damaging knockback shockwave.", masteryDescription: "The landing shockwave gains more radius, damage, knockback and stagger duration." }
        ]
    },
    {
        id: "berserk_militech", itemId: "project_edgerunner:berserk_militech",
        powerId: "project_edgerunner:berserk_militech", name: "Militech Berserk",
        manufacturer: "Militech", tier: 4, loadCost: 70, rarity: "rare",
        internalParts: "project_edgerunner:cyberware_internal_parts_t4",
        armor: [100], duration: [11, 12], cooldown: [40, 32.5, 25],
        attackSpeed: [25, 30], movement: [15, 20],
        branches: [
            { id: "last_stand", title: "Last Stand", icon: "minecraft:totem_of_undying", description: "At or below 20% health, deal 50% additional damage.", masteryDescription: "At or below 20% health, increase the damage bonus from 50% to 65%." },
            { id: "shock_assault", title: "Shock Assault", icon: "minecraft:firework_rocket", description: "Sprinting melee attacks deal 15% additional damage.", masteryDescription: "Sprinting melee attacks also apply a brief neural stagger." }
        ]
    }
];

function resolveRuntimeEntity(entity) {
    return entity && entity.minecraftEntity ? entity.minecraftEntity : entity;
}

StartupEvents.registry("palladium:abilities", function (event) {
    event.create("cyberpunk/berserk_toggle")
        .icon(palladium.createItemIcon("project_edgerunner:berserk_moore_tech"))
        .firstTick(function (entity, entry, holder, enabled) {
            if (enabled === false) return;
            var target = resolveRuntimeEntity(entity);
            if (!target) return;
            try {
                BerserkRuntime.requestActivation(target);
            } catch (err) {
                console.error("[Project Edgerunner/Berserk] Activation bridge failed: " + err);
            }
        });
});
})();
