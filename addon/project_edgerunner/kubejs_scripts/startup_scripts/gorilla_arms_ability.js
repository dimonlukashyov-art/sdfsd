// Startup script: arms cyberware toggle bridge.
(function () {
const GorillaArmsRuntimeBridge = Java.loadClass("com.edgerunner.gorilla.GorillaArmsRuntime");

function resolveRuntimeEntity(entity) {
    if (entity && entity.minecraftEntity) {
        return entity.minecraftEntity;
    }
    return entity;
}

function resolvePersistentTag(entity) {
    if (!entity) {
        return null;
    }
    if (typeof entity.getPersistentData === "function") {
        return entity.getPersistentData();
    }
    return entity.persistentData || null;
}

function resolveGameTime(entity) {
    if (!entity) {
        return 0;
    }
    try {
        if (entity.level && entity.level.gameTime !== undefined) {
            return Number(entity.level.gameTime || 0);
        }
        if (typeof entity.level === "function") {
            var levelObj = entity.level();
            if (levelObj && typeof levelObj.getGameTime === "function") {
                return Number(levelObj.getGameTime());
            }
        }
    } catch (errTick) {
    }
    return 0;
}

function gorillaRequestToggle(entity) {
    var target = resolveRuntimeEntity(entity);
    if (!target) {
        return;
    }
    try {
        if (GorillaArmsRuntimeBridge) {
            GorillaArmsRuntimeBridge.requestToggle(target);
            return;
        }
    } catch (errToggle) {
    }
    var tag = resolvePersistentTag(target);
    if (!tag) {
        return;
    }
    var tick = resolveGameTime(target);
    try {
        if (typeof tag.putInt === "function") {
            tag.putInt("cyb_ga_toggle_req", 1);
        } else {
            tag.cyb_ga_toggle_req = 1;
        }
    } catch (errTag) {
        return;
    }
    var lastTick = Number((tag.cyb_ga_toggle_req_log_tick || 0));
    if ((tick - lastTick) >= 15) {
        tag.cyb_ga_toggle_req_log_tick = tick;
        console.info("[Cyberpunk/GorillaArms/KubeJS] toggle request queued (tick=" + tick + ")");
    }
}

function registerArmsToggleAbility(event, id, iconItem) {
    event.create(id)
        .icon(palladium.createItemIcon(iconItem))
        .firstTick(function (entity, entry, holder, enabled) {
            if (enabled === false) {
                return;
            }
            gorillaRequestToggle(entity);
        });
}

StartupEvents.registry("palladium:abilities", function (event) {
    registerArmsToggleAbility(event, "cyberpunk/gorilla_arms_toggle", "project_edgerunner:gorilla_arms");
});
})();
