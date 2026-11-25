// Startup script: Mantis Blades deploy/retract bridge into the Java runtime.
(function () {
const MantisBladesRuntime = Java.loadClass("com.edgerunner.mantis.MantisBladesRuntime");

function resolveRuntimeEntity(entity) {
    return entity && entity.minecraftEntity ? entity.minecraftEntity : entity;
}

StartupEvents.registry("palladium:abilities", function (event) {
    event.create("cyberpunk/mantis_blades_toggle")
        .icon(palladium.createItemIcon("project_edgerunner:mantis_blades"))
        .firstTick(function (entity, entry, holder, enabled) {
            if (enabled === false) return;
            var target = resolveRuntimeEntity(entity);
            if (!target) return;
            try {
                MantisBladesRuntime.requestToggle(target);
            } catch (err) {
                console.error("[Project Edgerunner/Mantis Blades] Toggle bridge failed: " + err);
            }
        });
});
})();
