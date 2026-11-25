// priority: 90
// Server script: shared helpers for Sandevistan generation.
const UPGRADE_CONFIGS = global.SANDEVISTAN_UPGRADE_CONFIGS || {};
const ROMAN_NUMERALS = global.SANDEVISTAN_ROMAN_NUMERALS || ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const CYBERWARE_VISUAL_LAYOUT = {
    rootY: 0.375,
    baseRowY: -0.375,
    stepX: 1.0,
    stepY: 0.56,
    specialUnlockY: 0.625,
    specialTierStartOffset: 0.56
};

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function roundTo(value, decimals) {
    if (!decimals) {
        return Math.round(value);
    }
    var factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

function formatNumber(value, decimals) {
    var rounded = roundTo(value, decimals);
    if (!decimals) {
        return String(Math.round(rounded));
    }
    var text = rounded.toFixed(decimals);
    return text.replace(/\.0+$/, "");
}

function formatSignedValue(value, decimals, suffix) {
    var numeric = Number(value || 0);
    var sign = numeric > 0 ? "+" : "";
    return sign + formatNumber(numeric, decimals) + (suffix || "");
}

function formatRange(base, max, suffix, decimals) {
    var start = formatNumber(base, decimals);
    var end = formatNumber(max, decimals);
    var range = (start === end) ? start : (start + "-" + end);
    return range + (suffix || "");
}

function hasRange(base, max) {
    return Math.abs(base - max) > 0.0001;
}

function toId(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function buildTierValues(base, max, tiers, decimals) {
    var list = [];
    var count = Math.max(0, tiers || 0);
    if (count === 0) {
        list.push(roundTo(base, decimals));
        return list;
    }
    for (var i = 0; i <= count; i++) {
        var value = lerp(base, max, i / count);
        list.push(roundTo(value, decimals));
    }
    list[list.length - 1] = roundTo(max, decimals);
    return list;
}

function getBaseUpgradeValue(variantId, key, fallback) {
    var cfg = UPGRADE_CONFIGS[variantId];
    if (cfg && cfg[key] && cfg[key].base !== undefined) {
        return cfg[key].base;
    }
    return fallback;
}

function getUpgradeData(variant) {
    var cfg = UPGRADE_CONFIGS[variant.id] || {};
    var tierCount = Math.max(0, cfg.tiers || 0);
    var durationCfg = cfg.durationSeconds || { base: variant.durationSeconds || 3, max: variant.durationSeconds || 3 };
    var cooldownCfg = cfg.cooldownSeconds || { base: variant.cooldownSeconds || 30, max: variant.cooldownSeconds || 30 };
    var durationDecimals = (durationCfg.decimals !== undefined) ? durationCfg.decimals : 0;
    var cooldownDecimals = (cooldownCfg.decimals !== undefined) ? cooldownCfg.decimals : 0;
    var durationTierCount = hasRange(durationCfg.base, durationCfg.max) ? tierCount : 0;
    var cooldownTierCount = hasRange(cooldownCfg.base, cooldownCfg.max) ? tierCount : 0;
    var durationValues = buildTierValues(durationCfg.base, durationCfg.max, durationTierCount, durationDecimals);
    var cooldownValues = buildTierValues(cooldownCfg.base, cooldownCfg.max, cooldownTierCount, cooldownDecimals);
    var stats = (cfg.stats || []).map(function (stat) {
        var decimals = (stat.decimals !== undefined) ? stat.decimals : 0;
        var statTierCount = hasRange(stat.base, stat.max) ? tierCount : 0;
        var statId = stat.id || toId(stat.label);
        return Object.assign({}, stat, {
            id: statId,
            decimals: decimals,
            tierCount: statTierCount,
            values: buildTierValues(stat.base, stat.max, statTierCount, decimals)
        });
    });
    var xpLevels = (cfg.xpLevels && cfg.xpLevels.length) ? cfg.xpLevels.slice(0) : [];
    while (xpLevels.length < tierCount) {
        xpLevels.push(3 + xpLevels.length * 2);
    }
    return {
        tierCount: tierCount,
        duration: {
            base: durationCfg.base,
            max: durationCfg.max,
            decimals: durationDecimals,
            tierCount: durationTierCount,
            values: durationValues
        },
        cooldown: {
            base: cooldownCfg.base,
            max: cooldownCfg.max,
            decimals: cooldownDecimals,
            tierCount: cooldownTierCount,
            values: cooldownValues
        },
        stats: stats,
        extraLines: cfg.extraLines || [],
        specialLines: cfg.specialLines || [],
        specialTree: normalizeSpecialTree(cfg.specialTree),
        xpLevels: xpLevels
    };
}

function formatStatRange(stat) {
    return stat.label + ": " + formatRange(stat.base, stat.max, stat.suffix || "", stat.decimals || 0);
}

function formatStatValue(stat, value) {
    return stat.label + ": " + formatNumber(value, stat.decimals || 0) + (stat.suffix || "");
}

function buildStatLines(stats, perLine, formatter) {
    var lines = [];
    var size = perLine || 2;
    for (var i = 0; i < stats.length; i += size) {
        var slice = stats.slice(i, i + size);
        var parts = slice.map(function (stat) {
            return formatter(stat);
        });
        lines.push(parts.join(" | "));
    }
    return lines;
}

function buildUpgradeLines(upgradeData) {
    var lines = [];
    var upgradeStats = upgradeData.stats.filter(function (stat) {
        return stat.tierCount > 0;
    });
    var statLines = buildStatLines(upgradeStats, 2, function (stat) {
        return formatStatRange(stat);
    });
    statLines.forEach(function (line) {
        lines.push(line);
    });
    (upgradeData.extraLines || []).forEach(function (line) {
        lines.push(line);
    });
    return lines;
}

function normalizeSpecialTree(rawTree) {
    if (!rawTree || !Array.isArray(rawTree.branches) || rawTree.branches.length === 0) {
        return null;
    }
    var branches = [];
    rawTree.branches.forEach(function (rawBranch, branchIndex) {
        if (!rawBranch) {
            return;
        }
        var decimals = (rawBranch.decimals !== undefined) ? rawBranch.decimals : 0;
        var values = [];
        (rawBranch.values || []).forEach(function (rawValue) {
            var parsed = Number(rawValue);
            if (Number.isFinite(parsed)) {
                values.push(roundTo(parsed, decimals));
            }
        });
        if (values.length === 0) {
            return;
        }
        var baseActive = !!rawBranch.baseActive;
        branches.push({
            id: toId(rawBranch.id || rawBranch.label || ("special_branch_" + branchIndex)),
            label: rawBranch.label || ("Special " + (branchIndex + 1)),
            descriptionPrefix: rawBranch.descriptionPrefix || rawBranch.label || "Special",
            unlockDescription: String(rawBranch.unlockDescription || ""),
            icon: rawBranch.icon || "minecraft:nether_star",
            effectType: rawBranch.effectType || "",
            baseActive: baseActive,
            anchorMode: String(rawBranch.anchorMode || ""),
            anchorBranchId: rawBranch.anchorBranchId || "",
            anchorTier: Number(rawBranch.anchorTier || 0),
            anchorSide: Number(rawBranch.anchorSide || 0),
            branchOrder: Math.max(1, Number(rawBranch.branchOrder || 1)),
            values: values,
            decimals: decimals,
            suffix: rawBranch.suffix || "",
            tierCount: baseActive ? Math.max(0, values.length - 1) : values.length
        });
    });
    if (branches.length === 0) {
        return null;
    }
    return {
        useTitleNode: !!rawTree.useTitleNode,
        title: String(rawTree.title || ""),
        icon: rawTree.icon || "minecraft:nether_star",
        branches: branches
    };
}

function buildSpecialBranchValueDescription(branch, valueIndex) {
    var safeIndex = Math.max(0, Math.min((branch.values || []).length - 1, valueIndex));
    return (branch.descriptionPrefix || branch.label || "Special")
        + ": "
        + formatSignedValue(branch.values[safeIndex], branch.decimals || 0, branch.suffix || "");
}

function buildSpecialBranchTierDescription(branch, tierIndex) {
    var valueIndex = branch.baseActive ? tierIndex : Math.max(0, tierIndex - 1);
    return buildSpecialBranchValueDescription(branch, valueIndex);
}

function buildSpecialBaseDescription(branch) {
    return "Base: " + buildSpecialBranchValueDescription(branch, 0);
}

function buildBranchTierDescription(branch, tierIndex) {
    var valueText = formatNumber(branch.values[tierIndex], branch.decimals || 0) + (branch.suffix || "");
    return branch.label + ": " + valueText;
}

function buildBaseDescription(branch) {
    return "Base: " + buildBranchTierDescription(branch, 0);
}

function getRomanNumeral(value) {
    return ROMAN_NUMERALS[value - 1] || String(value);
}

function getCyberwareVisualLayout() {
    return Object.assign({}, CYBERWARE_VISUAL_LAYOUT);
}

function getCenteredBranchX(index, count, stepX) {
    var spacing = Number(stepX !== undefined ? stepX : CYBERWARE_VISUAL_LAYOUT.stepX);
    return (index * spacing) - (((Math.max(0, count - 1)) * spacing) / 2);
}

function getSpecialBranchX(index, count, stepX) {
    return getCenteredBranchX(index, count, stepX);
}

function buildBaseTitle(label) {
    return "Base " + String(label || "");
}

function buildTierTitle(label, tierIndex) {
    return String(label || "") + " " + getRomanNumeral(tierIndex);
}

function buildUnlockTitle(label) {
    return "Unlock " + String(label || "");
}

function getBranchTierConditions(powerId, branchId, tierIndex, tierCount) {
    if (tierCount <= 0) {
        return [{ "type": "palladium:true" }];
    }
    var abilityPrefix = "upgrade_" + branchId + "_";
    if (tierIndex === 0) {
        return [{
            "type": "palladium:not",
            "conditions": [{
                "type": "palladium:ability_unlocked",
                "power": powerId,
                "ability": abilityPrefix + "1"
            }]
        }];
    }
    var conditions = [{
        "type": "palladium:ability_unlocked",
        "power": powerId,
        "ability": abilityPrefix + tierIndex
    }];
    if (tierIndex < tierCount) {
        conditions.push({
            "type": "palladium:not",
            "conditions": [{
                "type": "palladium:ability_unlocked",
                "power": powerId,
                "ability": abilityPrefix + (tierIndex + 1)
            }]
        });
    }
    return conditions;
}

function buildBranches(upgradeData, slowPercent) {
    var branches = [];
    var directStatIds = {
        damage: true,
        // Use knockback_resistance as canonical id. Keep mitigation_chance for legacy data.
        knockback_resistance: true,
        mitigation_chance: true,
        mitigation_strength: true
    };
    if (slowPercent !== undefined) {
        branches.push({
            id: "slow",
            label: "Slow",
            icon: "minecraft:cobweb",
            values: [slowPercent],
            decimals: 0,
            suffix: "%",
            tierCount: 0,
            xpLevels: []
        });
    }
    if (upgradeData.duration) {
        branches.push({
            id: "duration",
            label: "Duration",
            icon: "project_edgerunner:textures/gui/upgrades/duration.png",
            values: upgradeData.duration.values,
            decimals: upgradeData.duration.decimals,
            suffix: "s",
            tierCount: upgradeData.duration.tierCount,
            xpLevels: upgradeData.xpLevels
        });
    }
    if (upgradeData.cooldown) {
        branches.push({
            id: "cooldown",
            label: "Cooldown",
            icon: "minecraft:clock",
            values: upgradeData.cooldown.values,
            decimals: upgradeData.cooldown.decimals,
            suffix: "s",
            tierCount: upgradeData.cooldown.tierCount,
            xpLevels: upgradeData.xpLevels
        });
    }
    upgradeData.stats.forEach(function (stat) {
        var hasDirectAttribute = !!directStatIds[stat.id];
        var keepVisibleWithoutBinding = (stat.id === "resist_elements");
        if (!hasDirectAttribute && !keepVisibleWithoutBinding) {
            return;
        }
        branches.push({
            id: "stat_" + stat.id,
            label: stat.label,
            icon: stat.icon || "minecraft:experience_bottle",
            values: stat.values,
            decimals: stat.decimals || 0,
            suffix: stat.suffix || "",
            tierCount: stat.tierCount,
            xpLevels: upgradeData.xpLevels
        });
    });
    return branches;
}

global.SANDEVISTAN_HELPERS = {
    lerp: lerp,
    roundTo: roundTo,
    formatNumber: formatNumber,
    formatSignedValue: formatSignedValue,
    formatRange: formatRange,
    hasRange: hasRange,
    toId: toId,
    buildTierValues: buildTierValues,
    getBaseUpgradeValue: getBaseUpgradeValue,
    getUpgradeData: getUpgradeData,
    formatStatRange: formatStatRange,
    formatStatValue: formatStatValue,
    buildStatLines: buildStatLines,
    buildUpgradeLines: buildUpgradeLines,
    normalizeSpecialTree: normalizeSpecialTree,
    buildSpecialBranchTierDescription: buildSpecialBranchTierDescription,
    buildSpecialBaseDescription: buildSpecialBaseDescription,
    buildBranchTierDescription: buildBranchTierDescription,
    buildBaseDescription: buildBaseDescription,
    getCyberwareVisualLayout: getCyberwareVisualLayout,
    getCenteredBranchX: getCenteredBranchX,
    getSpecialBranchX: getSpecialBranchX,
    buildBaseTitle: buildBaseTitle,
    buildTierTitle: buildTierTitle,
    buildUnlockTitle: buildUnlockTitle,
    getRomanNumeral: getRomanNumeral,
    getBranchTierConditions: getBranchTierConditions,
    buildBranches: buildBranches
};
