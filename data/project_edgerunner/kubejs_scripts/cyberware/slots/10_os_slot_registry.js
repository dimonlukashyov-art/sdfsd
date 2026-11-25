// priority: 160
// Server script: OS slot entries (Sandevistan and Berserk variants).

if (!global.registerCyberwareSlotEntry) {
    throw new Error("[Cyberpunk/Cyberware] Slot registry bootstrap not loaded before OS slot registry.");
}

var berserkVariants = global.BERSERK_VARIANTS || [];
for (var b = 0; b < berserkVariants.length; b++) {
    var berserk = berserkVariants[b];
    if (!berserk || !berserk.itemId || !berserk.powerId) {
        throw new Error("[Cyberpunk/Cyberware] Invalid BERSERK_VARIANTS entry at index " + b);
    }
    global.registerCyberwareSlotEntry("os", {
        item: String(berserk.itemId), body_slot: "os", activation_mode: "manual",
        power: String(berserk.powerId), ability: "Berserk",
        cooldown_ticks: Math.round(Number((berserk.cooldown || [0])[0]) * 20),
        icon_index: 6 + b, icon_alias: String(berserk.id || "berserk").replace(/^berserk_/, "")
    });
}

var cyberwareOsVariants = global.SANDEVISTAN_VARIANTS || [];
for (var i = 0; i < cyberwareOsVariants.length; i++) {
    var variant = cyberwareOsVariants[i];
    if (!variant || !variant.itemId || !variant.powerId) {
        throw new Error("[Cyberpunk/Cyberware] Invalid SANDEVISTAN_VARIANTS entry at index " + i);
    }

    var cooldownTicks = 0;
    if (variant.cooldownSeconds !== undefined && variant.cooldownSeconds !== null) {
        var parsedCooldown = Number(variant.cooldownSeconds);
        if (!Number.isFinite(parsedCooldown) || parsedCooldown < 0) {
            throw new Error("[Cyberpunk/Cyberware] Invalid cooldownSeconds for variant '" + variant.id + "'");
        }
        cooldownTicks = Math.round(parsedCooldown * 20);
    }

    var alias = String(variant.id || "sandevistan").replace(/^sandevistan_/, "");
    global.registerCyberwareSlotEntry("os", {
        item: String(variant.itemId),
        body_slot: "os",
        activation_mode: "manual",
        power: String(variant.powerId),
        ability: "Sandevistan",
        cooldown_ticks: cooldownTicks,
        icon_index: i + 1,
        icon_alias: alias || "sandevistan"
    });
}
