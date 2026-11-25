// Startup script: Fortified Ankles – jump request on space press
// Forge 1.20.1 · Palladium · KubeJS
//
// Charge, grace, decay, and the actual boost are handled in fortified_ankles_runtime.js.
// This ability only marks a jump request so takeoff can consume stored charge.

var FA_MIN_CHARGED_RELEASE_TICKS = 6;
var FA_JUMP_REQUEST_GRACE_TICKS = 4;
var FA_KEY_CHARGE = "cyb_fa_charge_ticks";
var FA_KEY_SPACE_HELD = "cyb_fa_space_held";
var FA_KEY_JUMP_REQUESTED = "cyb_fa_jump_requested";
var FA_KEY_JUMP_PENDING_TICKS = "cyb_fa_jump_pending_ticks";

function faIsCrouching(e) {
    try { if (typeof e.isCrouching === "function") return !!e.isCrouching(); } catch (_) {}
    try { if (typeof e.isShiftKeyDown === "function") return !!e.isShiftKeyDown(); } catch (_) {}
    return false;
}

StartupEvents.registry("palladium:abilities", function (event) {
    event.create("cyberpunk/fortified_ankles_charge_jump")
        .tick(function (entity, entry, holder, enabled) {
            if (!entity || !entity.persistentData) return;
            var pd = entity.persistentData;
            if (global.isFortifiedAnklesInstalled && !global.isFortifiedAnklesInstalled(entity)) {
                pd[FA_KEY_SPACE_HELD] = false;
                pd[FA_KEY_JUMP_REQUESTED] = false;
                pd[FA_KEY_JUMP_PENDING_TICKS] = 0;
                return;
            }

            var isSpaceDown = !!enabled;
            var wasSpaceDown = !!pd[FA_KEY_SPACE_HELD];
            var isFirstSpacePress = isSpaceDown && !wasSpaceDown;
            pd[FA_KEY_SPACE_HELD] = isSpaceDown;

            if (!isFirstSpacePress) return;
            if (faIsCrouching(entity)) return;

            var chargeTicks = Number(pd[FA_KEY_CHARGE] || 0);
            if (!isFinite(chargeTicks) || chargeTicks < FA_MIN_CHARGED_RELEASE_TICKS) return;

            if (global.requestFortifiedAnklesJump) {
                global.requestFortifiedAnklesJump(entity);
            } else {
                pd[FA_KEY_JUMP_REQUESTED] = true;
                pd[FA_KEY_JUMP_PENDING_TICKS] = FA_JUMP_REQUEST_GRACE_TICKS;
            }
        });
});
