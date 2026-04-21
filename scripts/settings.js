// settings constants and variables
const METRICS = new Set();
/*METRICS.add("ER");
METRICS.add("EER");
METRICS.add("TER");
METRICS.add("Custom");*/
METRICS.add("DPS");
METRICS.add("TDO");
METRICS.add("eDPS");
let settings_metric = "eDPS";
let settings_default_level = [40];
let settings_xl_budget = false;
let settings_pve_turns = true;
let settings_strongest_count = 25;
let settings_compare = "budget";
let settings_tiermethod = "jenks";
let settings_party_size = 1;
let settings_relobbytime = 10;
let settings_team_size_normal = 6;
let settings_team_size_mega = 6;
let settings_type_affinity = true;
let settings_theme = "darkmode";
let settings_speculative = true;

// inaccessible
let settings_metric_exp = 0.225;
let settings_newdps = true;

/**
 * Bind event handlers for all settings options
 */
function BindSettings() {
    // Dark Mode
    $("#settings-darkmode").change(function() { 
        if ($("#settings-darkmode").is(":checked"))
            SetTheme("darkmode"); 
        else 
            SetTheme("lightmode"); 
    });

    // Expand/Shrink Dev Note
    //$("#note-icon").click(function() { ToggleNote(); });
    //$("#note-title").click(function() { ToggleNote(); });

    // Metrics
    /*$("#metric-er").click(function() { SetMetric("ER"); });
    $("#metric-eer").click(function() { SetMetric("EER"); });
    $("#metric-ter").click(function() { SetMetric("TER"); });
    $("#tof-exp").change(function() { SetMetric("Custom"); });*/
    $("#metric-dps").click(function() { SetMetric("DPS"); });
    $("#metric-tdo").click(function() { SetMetric("TDO"); });
    $("#metric-edps").click(function() { SetMetric("eDPS"); });

    // Party Power
    $("#pp-1").click(function() { SetPartySize(1); });
    $("#pp-2").click(function() { SetPartySize(2); });
    $("#pp-3").click(function() { SetPartySize(3); });
    $("#pp-4").click(function() { SetPartySize(4); });

    // Raid Team Size
    $("#rt-1").click(function() { SetTeamSize(1, 1); });
    $("#rt-6").click(function() { SetTeamSize(6, 6); });
    $("#rt-m1").click(function() { SetTeamSize(6, 1); });

    // Pokemon Lvl
    $("#lvl-30").click(function() { SetDefaultLevel([30], false); });
    $("#lvl-40").click(function() { SetDefaultLevel([40], false); });
    $("#lvl-50").click(function() { SetDefaultLevel([50], false); });
    $("#lvl-xl-budget").click(function() { SetDefaultLevel([40], true); });
    //$("#lvl-both").click(function() { SetDefaultLevel([40, 50], false); });

    // Metric Calc options
    $("#chk-newdps").change(function() { 
        settings_newdps = this.checked;
        estimated_y_numerator = (settings_newdps ? 1970 : 900);
        CheckURLAndAct(); 
    });
    /*$("#strongest-count").change(function() { 
        SetStrongestCount(this.value); 
        this.style.width = (this.value.length + 2) + "ch";
    });*/
    $("#relobby-time").change(function() { 
        SetRelobbyPenalty(this.value); 
    });
    $("#settings-affinity").change(function() { 
        SetAffinity($("#settings-affinity").is(":checked")); 
    });
    
    // Comparison baseline
    $("#cmp-top").click(function() { SetCompare("top"); });
    $("#cmp-budget").click(function() { SetCompare("budget"); });
    $("#cmp-espace").click(function() { SetCompare("ESpace"); });
    
    // TierList method
    $("#tier-jenks").click(function() { SetTierMethod("jenks"); });
    $("#tier-broad").click(function() { SetTierMethod("broad"); });
    $("#tier-espace").click(function() { SetTierMethod("ESpace"); });
    $("#tier-abs").click(function() { SetTierMethod("absolute"); });

    // Speculative Data
    $("#settings-speculative").change(function() { 
        SetSpeculative($("#settings-speculative").is(":checked")); 
    });

    // Language Selector
    $("#lang-en").click(function() { SetLocale("en"); });
    $("#lang-es").click(function() { SetLocale("es"); });
    $("#lang-fr").click(function() { SetLocale("fr"); });
    $("#lang-de").click(function() { SetLocale("de"); });
    $("#lang-it").click(function() { SetLocale("it"); });

}

/**
 * Swaps whether the settings list is being displayed or not.
 */
function ToggleDrawer(drawer_icon, drawer_elem) {

    if (drawer_elem.css("display") == "none") {
        drawer_elem.css("display", "revert");
        drawer_icon.addClass("active");
    } else {
        drawer_elem.css("display", "none");
        drawer_icon.removeClassClass("active");
    }
}

/**
 * Sets the metric setting and, if necessary, updates the page accordingly.
 */
function SetMetric(metric) {

    if (!METRICS.has(metric))
        return;
    
    // sets global variable
    settings_metric = metric;

    if (metric == "Custom") {
        settings_metric_exp = parseFloat($("#tof-exp").val());
        switch (settings_metric_exp) {
            case 0.25:
                settings_metric = "ER";
                break;
            case 0.225:
                settings_metric = "EER";
                break;
            case 0.15:
                settings_metric = "TER";
                break;
            case 0.0:
                settings_metric = "DPS";
                break;
            case 1.0:
                settings_metric = "TDO";
                break;
        }
    }

    // show/hide eDPS parameters
    if (metric == "eDPS") {
        $("#settings-teamsize-header, #settings-teamsize").css("display", "");
        $("#settings-relobby-header, #relobby-time").css("display", "");
    }
    else {
        $("#settings-teamsize-header, #settings-teamsize").css("display", "none");
        $("#settings-relobby-header, #relobby-time").css("display", "none");
    }

    // sets settings options selected class
    /*$("#metric-er").removeClass("settings-opt-sel");
    $("#metric-eer").removeClass("settings-opt-sel");
    $("#metric-ter").removeClass("settings-opt-sel");*/
    $("#metric-dps").removeClass("settings-opt-sel");
    $("#metric-tdo").removeClass("settings-opt-sel");
    $("#metric-edps").removeClass("settings-opt-sel");
    switch (settings_metric) {
        case "ER":
            $("#metric-er").addClass("settings-opt-sel");
            settings_metric_exp = 0.25;
            break;
        case "EER":
            $("#metric-eer").addClass("settings-opt-sel");
            settings_metric_exp = 0.225;
            break;
        case "TER":
            $("#metric-ter").addClass("settings-opt-sel");
            settings_metric_exp = 0.15;
            break;
        case "DPS":
            $("#metric-dps").addClass("settings-opt-sel");
            settings_metric_exp = 0.00;
            break;
        case "TDO":
            $("#metric-tdo").addClass("settings-opt-sel");
            settings_metric_exp = 1.00;
            break;
        case "eDPS":
            $("#metric-edps").addClass("settings-opt-sel");
            break;
        case "Custom":
            settings_metric_exp = parseFloat($("#tof-exp").val());
            break;
    }
    
    //$("#tof-exp").val(settings_metric_exp.toFixed(3));

    // sets pokemondex move table header
    //$("#table-metric-header").html(settings_metric);
    //$("#table-metric-header-sh").html(settings_metric + "<br>(Shadow)");

    // Reset any cached tier rankings
    ClearTypeTiers();

    // reload page
    CheckURLAndAct();
}

/**
 * Sets the size of party for party power and updates the page accordingly.
 */
function SetPartySize(party_size) {
    party_size = parseInt(party_size);
    party_size = Math.max(1, Math.min(party_size, 4));

    // sets global variable
    settings_party_size = party_size;

    // sets settings options selected class
    $("#pp-1").removeClass("settings-opt-sel");
    $("#pp-2").removeClass("settings-opt-sel");
    $("#pp-3").removeClass("settings-opt-sel");
    $("#pp-4").removeClass("settings-opt-sel");
    
    $("#pp-" + party_size.toString()).addClass("settings-opt-sel");

    // Reset any cached tier rankings
    ClearTypeTiers();

    // reload page
    CheckURLAndAct();
}

/**
 * Sets the size of raid team as an eDPS calculation parameter
 * and updates the page accordingly.
 */
function SetTeamSize(normal_mon_count, mega_count) {
    normal_mon_count = Math.max(1, Math.min(parseInt(normal_mon_count), 6));
    mega_count = Math.max(1, Math.min(parseInt(mega_count), 6));

    // sets global variable
    settings_team_size_normal = normal_mon_count;
    settings_team_size_mega = mega_count;

    // sets settings options selected class
    $("#rt-1").removeClass("settings-opt-sel");
    $("#rt-6").removeClass("settings-opt-sel");
    $("#rt-m1").removeClass("settings-opt-sel");
    
    if (normal_mon_count == mega_count && (normal_mon_count == 1 || normal_mon_count == 6))
        $("#rt-" + normal_mon_count.toString()).addClass("settings-opt-sel");
    else if (normal_mon_count == 6 && mega_count == 1)
        $("#rt-m1").addClass("settings-opt-sel");

    // Reset any cached tier rankings
    ClearTypeTiers();
    
    // reload page
    CheckURLAndAct();
}

/**
 * Sets the relobby penalty timespan for each full raid team wipe
 */
function SetRelobbyPenalty(penalty) {
    // round to nearest 1, clamped between 0 and 300
    penalty = Math.max(0, Math.min(300, Math.round(penalty)))
    $("#relobby-time").val(penalty);

    // sets global variable
    settings_relobbytime = penalty;

    // Reset any cached tier rankings
    ClearTypeTiers();
    
    // reload page
    CheckURLAndAct();
}

/**
 * Sets the default level setting and, if necessary, updates the page accordingly.
 */
function SetDefaultLevel(level, xl_budget = false) {
    // sets global variables
    settings_default_level = level;
    settings_xl_budget = xl_budget;

    // sets settings options selected class
    $("#lvl-30").removeClass("settings-opt-sel");
    $("#lvl-40").removeClass("settings-opt-sel");
    $("#lvl-50").removeClass("settings-opt-sel");
    $("#lvl-xl-budget").removeClass("settings-opt-sel");
    $("#lvl-both").removeClass("settings-opt-sel");

    if (xl_budget) 
        $("#lvl-xl-budget").addClass("settings-opt-sel");
    else if (level.length > 1 && level[0] == 40 && level[1] == 50)
        $("#lvl-both").addClass("settings-opt-sel");
    else if (level[0] == 30)
        $("#lvl-30").addClass("settings-opt-sel");
    else if (level[0] == 40)
        $("#lvl-40").addClass("settings-opt-sel");
    else if (level[0] == 50)
        $("#lvl-50").addClass("settings-opt-sel");

    // Reset any cached tier rankings
    ClearTypeTiers();
    
    // reload page
    CheckURLAndAct();
}

/**
 * Toggles the note body's visibility.
 */
function ToggleNote() {

    let note_body = $("#note-body");

    if (note_body.css("display") == "none")
        note_body.css("display", "block");
    else
        note_body.css("display", "none");
}

/**
 * Sets the length of the "strongest counters" list for a specific type
 */
function SetStrongestCount(count) {
    const nearestV = 5, minV = 10, maxV = 500;

    // round to nearest multiple of 5, clamped between 10 and 500
    count = Math.max(minV, Math.min(maxV, Math.floor(count/nearestV)*nearestV));
    $("#strongest-count").val(count);

    // sets global variable
    settings_strongest_count = count;

    // reload page
    CheckURLAndAct();
}

/**
 * Sets the pokemon used for comparison in "percentage" bars
 */
function SetCompare(compareTo = "top") {
    // sets global variable
    settings_compare = compareTo;

    $("#cmp-top").removeClass("settings-opt-sel");
    $("#cmp-budget").removeClass("settings-opt-sel");
    $("#cmp-espace").removeClass("settings-opt-sel");
    
    switch (compareTo) {
        case "top":
            $("#cmp-top").addClass("settings-opt-sel");
            break;
        case "budget":
            $("#cmp-budget").addClass("settings-opt-sel");
            break;
        case "ESpace":
            $("#cmp-espace").addClass("settings-opt-sel");
            break;
    }

    // Reset any cached tier rankings
    ClearTypeTiers();
    
    // reload page
    CheckURLAndAct();
}

/**
 * Sets the method used for finding tier breaks
 */
function SetTierMethod(method = "jenks") {
    // sets global variable
    settings_tiermethod = method;

    $("#tier-jenks").removeClass("settings-opt-sel");
    $("#tier-broad").removeClass("settings-opt-sel");
    $("#tier-espace").removeClass("settings-opt-sel");
    $("#tier-abs").removeClass("settings-opt-sel");
    
    switch (method) {
        case "jenks":
            $("#tier-jenks").addClass("settings-opt-sel");
            break;
        case "broad":
            $("#tier-broad").addClass("settings-opt-sel");
            break;
        case "ESpace":
            $("#tier-espace").addClass("settings-opt-sel");
            break;
        case "absolute":
            $("#tier-abs").addClass("settings-opt-sel");
            break;
    }

    // Reset any cached tier rankings
    ClearTypeTiers();
    
    // reload page
    CheckURLAndAct();
}

/**
 * Sets the css stylesheet
 */
function SetTheme(theme = "darkmode") {
    $("body").removeClass();
    $("body").addClass(theme);
    settings_theme = theme;
}

/**
 * Updates the visual styling of the language selector
 */
function DisplaySelectedLang() {
    $("#lang-en").removeClass("settings-opt-sel");
    $("#lang-es").removeClass("settings-opt-sel");
    $("#lang-fr").removeClass("settings-opt-sel");
    $("#lang-de").removeClass("settings-opt-sel");
    $("#lang-it").removeClass("settings-opt-sel");

    $("#lang-"+currentLocale).addClass("settings-opt-sel");
}

/**
 * Sets the pokemon used for comparison in "percentage" bars
 */
function SetAffinity(useAffinity) {
    // sets global variable
    settings_type_affinity = useAffinity;

    // Reset any cached tier rankings
    ClearTypeTiers();
    
    // reload page
    CheckURLAndAct();
}

/**
 * Modifies the jb_pkm array based on announced upcoming changes
 */
function SetSpeculative(useUpcoming) {
    settings_speculative = useUpcoming;

    PatchSpeculative(settings_speculative);
    
    // Reset caches
    ClearTypeTiers();
    ClearMoveUserMap()
    
    // reload page
    CheckURLAndAct();
}

/**
 * Gets the default search parameters (to be used for generic type-tier-making)
 */
function GetDefaultSearchParams() {
    return {
        versus: false,
        unreleased: false,
        mega: true,
        shadow: true,
        legendary: true,
        elite: true,
        suboptimal: false,
        mixed: true,
        offtype: false
    };
}

/**
 * Gets the default search parameters (to be used for generic type-tier-making)
 */
function IsDefaultSearchParams(search_params) {
    return search_params.type != 'Any' && search_params.type != 'Each' &&
        search_params.versus===false &&
        search_params.unreleased===false &&
        search_params.mega===true &&
        search_params.shadow===true &&
        search_params.legendary===true &&
        search_params.elite===true &&
        search_params.suboptimal===false &&
        search_params.mixed===true &&
        search_params.offtype===false;
}

/**
 * Gets the search parameters
 * The type can be 'each', 'any' or an actual type.
 */
function GetSearchParms(type, versus) {
    let search_params = {
        versus,
        type
    };
    search_params.unreleased =
        $("#filter-settings input[value='unreleased']:checkbox").is(":checked");
    search_params.mega =
        $("#filter-settings input[value='mega']:checkbox").is(":checked");
    search_params.shadow =
        $("#filter-settings input[value='shadow']:checkbox").is(":checked");
    search_params.legendary =
        $("#filter-settings input[value='legendary']:checkbox").is(":checked");
    search_params.elite =
        $("#filter-settings input[value='elite']:checkbox").is(":checked");
    search_params.suboptimal =
        $("#filter-settings input[value='suboptimal']:checkbox").is(":checked");
    search_params.mixed =
        $("#filter-settings input[value='mixed']:checkbox").is(":checked");
    search_params.offtype =
        $("#filter-settings input[value='offtype']:checkbox").is(":checked");
    return search_params;
}

/**
 * Moves the filters popup drawer between cards.
 * Ensures the same filters are shared everywhere, without duplicating all the DOM.
 */
function MoveFilterPopup(new_parent_id) {
    $("#filter-settings").appendTo(new_parent_id);
    $("#filter-settings").css("display", "");
}