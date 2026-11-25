// Palladium loads client scripts from assets/<namespace>/kubejs_scripts/.
// The stable internal item remains recoverable in old saves, but is not a selectable ingredient without TaCZ.
// Palladium also evaluates this file during the startup pass, where JEIEvents is not a valid event group and
// KubeJS reports a script error. Only the client pass may register the handler; the startup pass skips it quietly.
if (Platform.isLoaded("jei") && !Platform.isLoaded("tacz")) {
    try {
        JEIEvents.hideItems(function (event) { event.hide("project_edgerunner:microgenerator"); });
    } catch (ignored) {
        // Startup pass: the client pass registers the same handler.
    }
}
