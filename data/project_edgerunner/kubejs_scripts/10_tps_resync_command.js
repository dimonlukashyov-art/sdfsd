// priority: 210
// Server command: force-resync scoreboard values used by client-side cyberware logic.

function cyberpunkResyncRunCommand(server, command) {
    try {
        if (server && typeof server.runCommandSilent === "function") {
            server.runCommandSilent(command);
            return true;
        }
        if (server && typeof server.runCommand === "function") {
            server.runCommand(command);
            return true;
        }
    } catch (err) {
        console.error("[Cyberpunk/KubeJS] /projectedgerunner resync failed command: " + command + " -> " + err);
    }
    return false;
}

ServerEvents.commandRegistry((event) => {
    const Commands = event.commands;

    event.register(
        Commands.literal("projectedgerunner")
            .then(Commands.literal("resync")
            .requires((source) => source.hasPermission(2))
            .executes((ctx) => {
                const source = ctx.source;
                const server = source.server;

                let ok = true;
                ok = cyberpunkResyncRunCommand(server, "execute as @a run scoreboard players set @s er_sandy_active 0") && ok;
                ok = cyberpunkResyncRunCommand(server, "execute as @a run scoreboard players set @s er_sandy_exhaust 0") && ok;

                const status = { translate: ok ? "message.project_edgerunner.install.resync_applied" : "message.project_edgerunner.install.resync_incomplete", color: ok ? "green" : "red" };
                cyberpunkResyncRunCommand(server, "tellraw @a " + JSON.stringify(status));

                return ok ? 1 : 0;
            }))
    );
});
