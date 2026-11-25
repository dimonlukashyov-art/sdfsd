// Startup script: manual suppressor injector ability.
(function () {
    const CyberpsychosisRuntime = Java.loadClass("com.edgerunner.cyberpsychosis.CyberpsychosisRuntime");
    const SuppressorSlotService = Java.loadClass("com.edgerunner.content.ripperdoc.SuppressorSlotService");
    const MobEffectInstance = Java.loadClass("net.minecraft.world.effect.MobEffectInstance");
    const ResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");
    const ServerPlayer = Java.loadClass("net.minecraft.server.level.ServerPlayer");
    const SuperpowerUtil = Java.loadClass("net.threetag.palladium.power.SuperpowerUtil");
    const ForgeRegistries = Java.loadClass("net.minecraftforge.registries.ForgeRegistries");

    const INMUNOSUPRESION_EFFECT = new ResourceLocation("project_edgerunner", "inmunosupresion");
    const INJECTOR_POWER_ID = new ResourceLocation("project_edgerunner", "inmunosupresor_injector");
    const DURATION_TICKS = 36000;

    function applyInmunosupresion(entity) {
        var effect = ForgeRegistries.MOB_EFFECTS.getValue(INMUNOSUPRESION_EFFECT);
        if (!effect || !entity || typeof entity.addEffect !== "function") {
            return;
        }
        entity.addEffect(new MobEffectInstance(effect, DURATION_TICKS, 0, false, true, true));
    }

    StartupEvents.registry("palladium:abilities", function (event) {
        event.create("cyberpunk/inmunosupresor_inject")
            .firstTick(function (entity, entry, holder, enabled) {
                if (!entity || enabled === false || !(entity instanceof ServerPlayer)) {
                    return;
                }

                var remaining = Number(SuppressorSlotService.consumeOne(entity));
                if (!Number.isFinite(remaining) || remaining < 0) {
                    return;
                }

                applyInmunosupresion(entity);
                CyberpsychosisRuntime.onSuppressorInjected(entity);
                if (global.recomputeCyberwareCapacityNow) {
                    global.recomputeCyberwareCapacityNow(entity);
                }
                if (global.refreshCyberwarePointerRuntimeNow) {
                    global.refreshCyberwarePointerRuntimeNow(entity);
                }

                if (remaining === 0) {
                    SuperpowerUtil.removeSuperpower(entity, INJECTOR_POWER_ID);
                }
            });
    });
})();
