// Startup script: Sandevistan toggle bridge.
(function () {
const SandevistanRuntimeBridge = Java.loadClass("com.edgerunner.sandevistan.SandevistanController");

function resolveRuntimeEntity(entity) {
    if (entity && entity.minecraftEntity) {
        return entity.minecraftEntity;
    }
    return entity;
}

function sandevistanRequestToggle(entity) {
    var target = resolveRuntimeEntity(entity);
    if (!target) {
        return;
    }
    try {
        if (SandevistanRuntimeBridge) {
            SandevistanRuntimeBridge.requestToggle(target);
        }
    } catch (errToggle) {
        console.error("[Cyberpunk/Sandevistan/KubeJS] toggle bridge failed: " + errToggle);
    }
}

StartupEvents.registry("palladium:abilities", function (event) {
    event.create("cyberpunk/sandevistan_toggle")
        .icon(palladium.createItemIcon("project_edgerunner:sandevistan_warp_dancer"))
        .firstTick(function (entity, entry, holder, enabled) {
            if (enabled === false) {
                return;
            }
            sandevistanRequestToggle(entity);
        });
});
})();
