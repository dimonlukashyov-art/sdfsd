// priority: 61
// Server script: delegates cyberware capacity resolution to the authoritative Java service.
(function () {
var CyberwareCapacityService = null;
try {
    CyberwareCapacityService = Java.loadClass("com.edgerunner.cyberware.CyberwareCapacityService");
} catch (errCapacityService) {
    CyberwareCapacityService = null;
}

const CYBERWARE_CAPACITY_DEFAULT_BASE = 260;

function toEntity(playerOrEntity) {
    if (!playerOrEntity) {
        return null;
    }
    return playerOrEntity.minecraftEntity ? playerOrEntity.minecraftEntity : playerOrEntity;
}

function recomputeCapacityNow(playerOrEntity) {
    var entity = toEntity(playerOrEntity);
    if (!entity) {
        return CYBERWARE_CAPACITY_DEFAULT_BASE;
    }
    if (CyberwareCapacityService) {
        try {
            return Number(CyberwareCapacityService.recomputeAndPersist(entity));
        } catch (errRecompute) {
            console.error("[Cyberpunk] Failed to recompute cyberware capacity: " + errRecompute);
        }
    }
    return CYBERWARE_CAPACITY_DEFAULT_BASE;
}

global.recomputeCyberwareCapacityNow = recomputeCapacityNow;

global.getCyberwareEffectiveMaxCapacity = function (playerOrEntity) {
    return recomputeCapacityNow(playerOrEntity);
};
})();
