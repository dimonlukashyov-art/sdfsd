// priority: 58
// Server script: block direct replacement between Reinforced Tendons and Fortified Ankles.

var CYB_BODY_SLOT_KEY = "legs";
var CYB_LEGACY_EXTRA_SLOT_KEY = "extra";
var CYB_LAST_EXTRA_ITEM_KEY = "cyb_last_extra_item";
var CYB_LAST_EXTRA_WARN_TICK = "cyb_last_extra_warn_tick";

var CYB_RT_ITEM = "project_edgerunner:reinforced_tendons";
var CYB_FA_ITEM = "project_edgerunner:fortified_ankles";
var CYB_CONFLICT_SCAN_INTERVAL = 5;

function cybIsLegConflictPair(a, b) {
    return (a === CYB_RT_ITEM && b === CYB_FA_ITEM) || (a === CYB_FA_ITEM && b === CYB_RT_ITEM);
}

function cybSendMessage(player, text) {
    try {
        if (player && typeof player.sendSystemMessage === "function") {
            player.sendSystemMessage(text);
        }
    } catch (_) {}
}

function cybTryRefundItem(player, itemId) {
    if (!player || !player.server || !itemId) return;
    var username = "";
    try { username = String(player.username || ""); } catch (_) {}
    if (!username) return;
    try {
        player.server.runCommandSilent("give " + username + " " + itemId + " 1");
    } catch (_) {}
}

// Disabled by design: legs slot changes are constrained to RipperDoc menu flow
// and already handled at source, so periodic conflict scans are unnecessary.
