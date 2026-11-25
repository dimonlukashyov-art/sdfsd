// priority: 60
// Server script: Inmunosupresores cyberware (suppressors body slot, extra manual activation).

const INMUNOSUPRESORES = {
    id: "inmunosupresores",
    name: "Immunosuppressants",
    itemId: "project_edgerunner:inmunosupresores",
    bodySlot: "supresors",
    activationSlot: "extra",
    activationMode: "manual",
    loadCost: 0,
    powerId: "project_edgerunner:inmunosupresor_injector"
};

if (!global.registerCyberwareInstallComponent) {
    throw new Error("[Cyberpunk/Cyberware] Install registry not loaded before inmunosupresores registration.");
}

global.registerCyberwareInstallComponent({
    item: INMUNOSUPRESORES.itemId,
    name: INMUNOSUPRESORES.name,
    body_slot: INMUNOSUPRESORES.bodySlot,
    activation_slot: INMUNOSUPRESORES.activationSlot,
    activation_mode: INMUNOSUPRESORES.activationMode,
    load_cost: INMUNOSUPRESORES.loadCost,
    palladium_power: INMUNOSUPRESORES.powerId,
    install_message: "Immunosuppressants installed.",
    remove_message: "Immunosuppressants removed."
});
