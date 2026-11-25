// priority: 70
// Server script: generate powers and item_powers plus cyberware OS slots for Sandevistan variants.
// Variants are defined in addon/cyberpunk/kubejs_scripts/startup_scripts/sandevistan/sandevistan_variants.js
const sandeBuilders = global.SANDEVISTAN_BUILDERS || {};
const sandeRawVariants = global.SANDEVISTAN_VARIANTS || [];
const sandeBuiltVariants = sandeBuilders.buildVariants ? sandeBuilders.buildVariants(sandeRawVariants) : [];
const sandeRuntimeDescriptors = sandeBuilders.buildRuntimeDescriptor
    ? sandeBuiltVariants.map(function (variant) { return sandeBuilders.buildRuntimeDescriptor(variant); })
    : [];

if (!sandeBuilders.buildVariants || !sandeBuilders.buildPower || !sandeBuilders.buildRuntimeDescriptor) {
    console.error("[Cyberpunk] Sandevistan builders missing. Check script load order.");
}

ServerEvents.highPriorityData(function (event) {
    if (!sandeBuilders.buildPower) {
        return;
    }
    sandeBuiltVariants.forEach(function (variant) {
        const powerName = variant.powerId.split(':')[1];
        global.addLocalizedPowerJson(event, "project_edgerunner:palladium/powers/" + powerName, sandeBuilders.buildPower(variant));
        global.addLocalizedPowerJson(event, "project_edgerunner:palladium/item_powers/" + variant.id + "_power", {
            slot: "chest",
            item: variant.itemId,
            power: variant.powerId
        });
    });
    global.addLocalizedPowerJson(event, "project_edgerunner:sandevistan/runtime_descriptors", {
        variants: sandeRuntimeDescriptors
    });
});

if (!global.registerCyberwareInstallOs) {
    throw new Error("[Cyberpunk/Cyberware] Install registry not loaded before sandevistan variants.");
}

sandeBuiltVariants.forEach(function (variant) {
    global.registerCyberwareInstallOs({
        item: variant.itemId,
        name: variant.name,
        body_slot: "os",
        activation_slot: "os",
        activation_mode: "manual",
        load_cost: variant.loadCost !== undefined ? variant.loadCost : variant.maxLoad || 0,
        palladium_power: variant.powerId,
        command: function (player) {
            player.sendSystemMessage(global.localizedCyberwareMessage("message.project_edgerunner.install.online", [global.localizedCyberwareName(variant.itemId, variant.name)], "green"));
        }
    });
});
