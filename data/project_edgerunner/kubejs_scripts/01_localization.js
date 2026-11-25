// priority: 1000
// Palladium 4.5.3 ComponentProperty reads native Minecraft component JSON.
// Keep the generated data, commands, conditions and numbers unchanged; translate only own text.
global.addLocalizedPowerJson = function (event, id, data) {
    var path = String(id);
    var optionalTextMods = {"ability.project_edgerunner.threatevac.base_speed.description": "parcool", "ability.project_edgerunner.threatevac.upgrade_speed_1.description": "parcool", "ability.project_edgerunner.threatevac.upgrade_speed_2.description": "parcool"};
    // Missing text must be omitted. Assigning undefined becomes JSON null, and Palladium
    // then syncs a null component that disconnects every client on join.
    var localizeText = function (target, field, key) {
        if (!target) return;
        var value = target[field];
        if (typeof value === "string") {
            if (value.trim().length > 0) {
                target[field] = { translate: optionalTextMods[key] && !Platform.isLoaded(optionalTextMods[key]) ? key + ".without_optional" : key, fallback: value };
            } else {
                delete target[field];
            }
            return;
        }
        if (value == null) {
            delete target[field];
        }
    };
    if (path.indexOf("project_edgerunner:palladium/powers/") === 0) {
        var powerId = path.substring(path.lastIndexOf("/") + 1);
        localizeText(data, "name", "power.project_edgerunner." + powerId + ".name");
        Object.keys(data.abilities || {}).forEach(function (abilityId) {
            var ability = data.abilities[abilityId];
            var prefix = "ability.project_edgerunner." + powerId + "." + abilityId + ".";
            localizeText(ability, "title", prefix + "title");
            localizeText(ability, "description", prefix + "description");
        });
    }
    event.addJson(id, data);
};

// KubeJS 2001.6.5 Text.of accepts native component maps and nested `with` values.
// Keep a component until it reaches each client so the server's language is irrelevant.
global.localizedCyberwareMessage = function (key, values, color) {
    var component = { translate: key, with: values || [] };
    if (color) component.color = color;
    return Text.of(component);
};
global.localizedCyberwareName = function (itemId, externalName) {
    var id = String(itemId || "");
    return id.indexOf("project_edgerunner:") === 0
        ? { translate: "item.project_edgerunner." + id.substring(id.indexOf(":") + 1) }
        : { text: String(externalName || id) };
};
