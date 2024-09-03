/**
 * Author: Javi Bonafonte
 *
 * TODO:
 * - More forms... Minior, Necorzma, Magearma
 * - Missing shinies: Yungoos, Castform forms (pokemonshowdown)
 */

$(document).ready(Main);

// global constants and variables

// whether user has touch screen
let has_touch_screen = false;
if ("maxTouchPoints" in navigator) {
    has_touch_screen = navigator.maxTouchPoints > 0;
} else if ("msMaxTouchPoints" in navigator) {
    has_touch_screen = navigator.msMaxTouchPoints > 0;
} else {
    let mq = window.matchMedia && matchMedia("(pointer:coarse)");
    if (mq && mq.media === "(pointer:coarse)") {
        has_touch_screen = !!mq.matches;
    } else if ('orientation' in window) {
        has_touch_screen = true; // deprecated, but good fallback
    } else {
        // Only as a last resort, fall back to user agent sniffing
        let UA = navigator.userAgent;
        has_touch_screen = (
            /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
            /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA)
        );
    }
}

const JB_URL = "https://raw.githubusercontent.com/javi-b/pokemon-resources/main/";
const GIFS_URL = JB_URL + "graphics/ani/";
const SHINY_GIFS_URL = JB_URL + "graphics/ani-shiny/";
const POGO_PNGS_URL = JB_URL + "graphics/pogo-256/"
const SHINY_POGO_PNGS_URL = JB_URL + "graphics/pogo-shiny-256/"
const ICONS_URL = JB_URL + "graphics/pokemonicons-sheet.png";

const LOADING_MAX_VAL = 5; // max number of files that need to be loaded
let loading_val = 0; // number of files loaded so far
let finished_loading = false; // whether page finished loading all files

// jb json objects
let jb_names, jb_mega, jb_pkm, jb_max_id, jb_fm, jb_cm;

// settings constants and variables
const METRICS = new Set();
METRICS.add("ER");
METRICS.add("EER");
METRICS.add("TER");
METRICS.add("DPS");
METRICS.add("TDO");
METRICS.add("Custom");
let settings_metric = "EER";
let settings_metric_exp = 0.225;
let settings_default_level = 40;
let settings_xl_budget = false;
let settings_pve_turns = true;
let settings_strongest_count = 20;
let settings_compare = "budget";
let settings_tiermethod = "jenks";

// global variables

// FIXME these are not ideal, would be better that, if a new pokemon is loaded,
//        whatever asynchronous operations were being done on the previous mon
//        should be cancelled

// whether pokemon go table moves are currently being loaded asynchronously
let loading_pogo_moves = false;
// whether pokemon go counters are currently being loaded asynchronously
let loading_counters = false;

// search input selected suggestion index
let selected_suggestion_i = -1;

let current_jb_pkm_obj = null; // current pokemon's jb_pkm_obj
let current_mega = false; // whether current pokemon is a mega
let current_mega_y = false; // whether current pokemon is a mega y

// whether counters of current pokemon have been loaded yet
let counters_loaded = false;

/**
 * Main function.
 */
function Main() {

    $(document).click(function(event) { OnDocumentClick(event); });

    // jb
    HttpGetAsync(JB_URL + "pokemon_names.json",
        function(response) { 
            jb_names = JSON.parse(response); 
            InitializePokemonSearch();
        });
    HttpGetAsync(JB_URL + "mega_pokemon.json",
        function(response) { jb_mega = JSON.parse(response); });
    HttpGetAsync(JB_URL + "pogo_pkm.json",
        function(response) {
            jb_pkm = JSON.parse(response);
            jb_max_id = jb_pkm.at(-1).id;
        });
    HttpGetAsync(JB_URL + "pogo_fm.json",
        function(response) { jb_fm = JSON.parse(response); });
    HttpGetAsync(JB_URL + "pogo_cm.json",
        function(response) { jb_cm = JSON.parse(response); });

    // event handlers

    // when going back or forward in the browser history
    window.onpopstate = function() { CheckURLAndAct(); }

    $("#settings-hide").click(SwapSettingsStatus);
    $("#metric-er").click(function() { SetMetric("ER"); });
    $("#metric-eer").click(function() { SetMetric("EER"); });
    $("#metric-ter").click(function() { SetMetric("TER"); });
    $("#metric-dps").click(function() { SetMetric("DPS"); });
    $("#metric-tdo").click(function() { SetMetric("TDO"); });
    $("#lvl-40").click(function() { SetDefaultLevel(40, false); });
    $("#lvl-50").click(function() { SetDefaultLevel(50, false); });
    $("#lvl-xl-budget").click(function() { SetDefaultLevel(40, true); });
    $("#tof-exp").change(function() { SetMetric("Custom"); });

    $("#chk-rescale").change(function() { CheckURLAndAct(); });
    $("#chk-pve-turns").change(function() { 
        settings_pve_turns = this.checked;
        CheckURLAndAct(); 
    });
    
    $("#cmp-top").click(function() { SetCompare("top"); });
    $("#cmp-budget").click(function() { SetCompare("budget"); });
    $("#cmp-espace").click(function() { SetCompare("ESpace"); });
    
    $("#tier-jenks").click(function() { SetTierMethod("jenks"); });
    $("#tier-broad").click(function() { SetTierMethod("broad"); });
    $("#tier-espace").click(function() { SetTierMethod("ESpace"); });
    $("#tier-abs").click(function() { SetTierMethod("absolute"); });

    $("#darkmode-toggle").click(function() { 
        if ($("body").hasClass("darkmode")) {
            $("body").removeClass("darkmode");
            $("#toggle-sun").css("display", "none");
            $("#toggle-moon").css("display", "inline");
        }
        else {
            $("body").addClass("darkmode");
            $("#toggle-sun").css("display", "inline");
            $("#toggle-moon").css("display", "none");
        }
    });

    $("#note-icon").click(function() { ToggleNote(); });
    $("#note-title").click(function() { ToggleNote(); });
    $("#strongest-count").change(function() { 
        SetStrongestCount(this.value); 
        this.style.width = (this.value.length + 2) + "ch";
    });

    $("#stats-form").submit(function(e) {
        UpdatePokemonStatsAndURL();
        return false;
    });

    $("#counters :checkbox").change(function() {
        if (current_jb_pkm_obj) {
            ResetPokemongoCounters(current_jb_pkm_obj);
            LoadPokemongoCounters(current_jb_pkm_obj, current_mega, current_mega_y);
        }
    });

    $("#strongest-link").click(function() {
        LoadStrongestAndUpdateURL();
        return false;
    });

    // "grouping" only applies if we're showing >1 moveset per pokemon
    $("#chk-suboptimal").change(function() {
        $("#chk-grouped").prop("disabled", !this.checked);
    })

    $("#chk-versus").change(function() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (this.checked && urlParams.has('t') 
            && urlParams.get('t') != 'Each' && urlParams.get('t') != 'Any') {
            urlParams.set('v', '');
        }
        else if (urlParams.has('v')) urlParams.delete('v');
        
        window.history.pushState({}, "", "?" + urlParams.toString().replace(/=(?=&|$)/gm, ''));
    });

    $("#strongest :checkbox").change(function() {
        //LoadStrongest();
        CheckURLAndAct();
    });
}

/**
 * Local asynchronous GET request.
 */
function LocalGetAsync(url, callback) {

    $.ajax({
        type: "GET",
        url: url,
        dataType: "text",
        success: callback
    });
}

/**
 * Asynchronous HTTP GET request to a specific url and with a specific
 * callback function.
 */
function HttpGetAsync(url, callback) {

    let xml_http = new XMLHttpRequest();
    xml_http.onreadystatechange = function() { 
        if (xml_http.readyState == 4 && xml_http.status == 200) {
            callback(xml_http.response);
            IncreaseLoadingVal();
        }
    }
    xml_http.open("GET", url, true); // true for asynchronous 
    xml_http.send(null);
}

/**
 * Increases value that represents number of files loaded so far
 * and updates its html loading bar on the page.
 */
function IncreaseLoadingVal() {

    loading_val++;
    let pct = 100 * loading_val / LOADING_MAX_VAL;
    $("#loading-bar").css("width", pct + "%");

    // if finished loading...
    if (pct >= 100) {
        finished_loading = true;
        setTimeout(function() {
            $("#loading-bar").css("display", "none");
        }, 100);
        CheckURLAndAct();
    }
}

/**
 * Document's general click callback.
 */
function OnDocumentClick(event)  {

    // function only used on touch screen devices
    if (!has_touch_screen)
        return;

    let target = $(event.target);

    // if not clicking the counters rating pct or the counters popup...
    if (!$(target).closest("#counters-popup").length
            && !$(target).closest(".counter-rat-pct").length) {
        // hides the counters popup if visible
        if ($("#counter-popup").css("display") != "none")
            ShowCountersPopup(this, false);
        // removes rat pcts borders
        let rat_pcts = $(".counter-rat-pct > a");
        for (rat_pct of rat_pcts)
            $(rat_pct).css("border", "none");
    }
}

/**
 * Swaps whether the settings list is being displayed or not.
 */
function SwapSettingsStatus() {

    const list = $("#settings-container");

    if (list.css("display") == "none") {
        list.css("display", "initial");
        $(this).text("[hide]");
    } else {
        list.css("display", "none");
        $(this).text("[show]");
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
    // sets settings options selected class
    $("#metric-er").removeClass("settings-opt-sel");
    $("#metric-eer").removeClass("settings-opt-sel");
    $("#metric-ter").removeClass("settings-opt-sel");
    $("#metric-dps").removeClass("settings-opt-sel");
    $("#metric-tdo").removeClass("settings-opt-sel");
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
        case "Custom":
            settings_metric_exp = parseFloat($("#tof-exp").val());
            break;
    }
    
    $("#tof-exp").val(settings_metric_exp.toFixed(3));

    // sets pokemongo table header
    $("#table-metric-header").html(settings_metric);
    $("#table-metric-header-sh").html(settings_metric + "<br>(Shadow)");

    // reload page
    CheckURLAndAct();
}

/**
 * Sets the default level setting and, if necessary, updates the page accordingly.
 */
function SetDefaultLevel(level, xl_budget = false) {

    if (level != 40 && level != 50)
        return;

    // sets global variables
    settings_default_level = level;
    settings_xl_budget = xl_budget;

    // sets settings options selected class
    $("#lvl-40").removeClass("settings-opt-sel");
    $("#lvl-50").removeClass("settings-opt-sel");
    $("#lvl-xl-budget").removeClass("settings-opt-sel");
    switch (level) {
        case 40:
            if (xl_budget) 
                $("#lvl-xl-budget").addClass("settings-opt-sel");
            else
                $("#lvl-40").addClass("settings-opt-sel");
            break;
        case 50:
            $("#lvl-50").addClass("settings-opt-sel");
            break;
    }

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
    // round to nearest multiple of 10, clamped between 20 and 50
    if (count % 10) {
        count = Math.max(20, Math.min(50, Math.floor(count/10)*10))
        $("#strongest-count").val(count);
    }

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

    // reload page
    CheckURLAndAct();
}

/**
 * Checks whether the current url contains search parameters that dictate
 * what to do. If it finds something, it does it.
 */
function CheckURLAndAct() {

    const params = new URLSearchParams(location.search);

    // if url has pokemon params...
    if (params.has("p")) {

        const pkm = params.get("p");

        let form = "def";
        if (params.has("f"))
            form = params.get("f");

        let mega = false;
        if (params.has("m"))
            mega = true;

        let mega_y = false;
        if (params.has("y"))
            mega_y = true;

        let level = null;
        if (params.has("lvl"))
            level = Number(params.get("lvl"));

        let ivs = null;
        if (params.has("ivs")) {
            let ivs_str = params.get("ivs");
            ivs = {
                atk: parseInt(ivs_str.slice(0, 2)),
                def: parseInt(ivs_str.slice(2, 4)),
                hp: parseInt(ivs_str.slice(4, 6))
            };
            function IsValidIV(val) {
                return (Number.isInteger(val) && val >= 0 && val <= 15);
            }
            if (!IsValidIV(ivs.atk) || !IsValidIV(ivs.def)
                    || !IsValidIV(ivs.hp)) {
                ivs = null;
            }
        }

        // loads pokemon
        LoadPokemon(pkm, form, mega, mega_y, level, ivs);

        return;
    }

    // if url has 'strongest' param...
    if (params.has("strongest")) {

        // preserve versus param
         $("#chk-versus").prop("checked", params.has("v") == true);

        // if url has 't' param...
        if (params.has("t")) {

            // sets type to 't' value with first char as upper and rest as lower
            let type = params.get("t");
            type = type.charAt(0).toUpperCase()
                + type.slice(1).toLowerCase();
            
            if (type == 'Each')
                LoadStrongest("Each");
            else if (type == "Any")
                LoadStrongest("Any");
            else if (POKEMON_TYPES.has(type))
                LoadStrongest(type);

            return;
        }

        // loads strongest (default)
        LoadStrongest();

        return;
    }
}

/**
 * Calls the 'LoadPokemon' function and updates the url to match the
 * pokemon being loaded.
 */
function LoadPokemonAndUpdateURL(clean_input, form = "def", mega = false,
        mega_y = false, level = null, ivs = null) {

    if (!finished_loading || loading_pogo_moves || loading_counters)
        return false;

    LoadPokemon(clean_input, form, mega, mega_y, level, ivs);

    let url = "?p=" + clean_input;

    if (form != "def")
        url += "&f=" + form;
    if (mega)
        url += "&m";
    if (mega_y)
        url += "&y";
    if (level)
        url += "&lvl=" + String(level);
    if (ivs) {
        url += "&ivs="
            + String(ivs.atk).padStart(2, "0")
            + String(ivs.def).padStart(2, "0")
            + String(ivs.hp).padStart(2, "0");
    }

    window.history.pushState({}, "", url);

    return false;
}

/**
 * Loads a pokemon page.
 */
function LoadPokemon(clean_input, form = "def", mega = false,
        mega_y = false, level = null, ivs = null) {

    if (!finished_loading || loading_pogo_moves || loading_counters)
        return;

    // gets the pokemon id from the input and returns if it doesn't find it
    const pokemon_id = GetPokemonId(clean_input);
    if (pokemon_id == 0)
        return;

    // sets the page title
    const pokemon_name = jb_names[pokemon_id].name;
    document.title = "#" + pokemon_id + " " + pokemon_name
            + " - DialgaDex";

    // sets the default form
    if (form == "def")
        form = GetPokemonDefaultForm(pokemon_id);

    // sets the default level
    if (level == null) {
        level = settings_default_level;
        if (jb_pkm.find(e=>e.id == pokemon_id).class == undefined && settings_xl_budget)
            level = 50;
    }
    
    // sets level input value
    $("#input-lvl").val(level);

    // sets the default ivs
    if (ivs == null)
        ivs = { atk: 15, def: 15, hp: 15 };

    // sets ivs inputs values
    $("#input-atk").val(ivs.atk);
    $("#input-def").val(ivs.def);
    $("#input-hp").val(ivs.hp);

    // empties the search box
    $("#poke-search-box").val("");

    // empties the pokemon containers
    $("#main-container").empty();
    $("#previous-containers").empty();
    $("#next-containers").empty();
    $("#additional-containers").empty();

    const forms = GetPokemonForms(pokemon_id);
    const def_form = forms[0];

    // sets main pokemon container
    $("#main-container").append(GetPokemonContainer(pokemon_id,
            (form == def_form && !mega), def_form));

    // sets previous and next pokemon containers
    for (i = 1; i <= 2; i++) {
        const prev_pokemon_id = parseInt(pokemon_id) - i;
        if (prev_pokemon_id > 0) {
            $("#previous-containers").prepend(
                GetPokemonContainer(prev_pokemon_id, false,
                    GetPokemonDefaultForm(prev_pokemon_id)));
        }
        const next_pokemon_id = parseInt(pokemon_id) + i;
        if (next_pokemon_id <= jb_max_id) {
            $("#next-containers").append(
                GetPokemonContainer(next_pokemon_id, false,
                    GetPokemonDefaultForm(next_pokemon_id)));
        }
    }

    // sets additional pokemon containers

    let additional_cs = $("#additional-containers");

    const can_be_mega = jb_mega[pokemon_id];

    if (can_be_mega) {
        if (pokemon_id == 6 || pokemon_id == 150) { // charizard and mewtwo
            additional_cs.append(GetPokemonContainer(
                    pokemon_id, mega && !mega_y, "Normal", true, false));
            additional_cs.append(GetPokemonContainer(
                    pokemon_id, mega && mega_y, "Normal", true, true));
        } else {
            additional_cs.append(
                GetPokemonContainer(pokemon_id, mega, "Normal", true));
        }
    }

    const additional_forms = forms.slice(1);

    for (f of additional_forms) {
        additional_cs.append(
            GetPokemonContainer(pokemon_id, form == f, f));
    }

    // deals with additional containers overflow
    if (additional_cs.children().length > 6)
        additional_cs.addClass("additional-containers-overflow");
    else
        additional_cs.removeClass("additional-containers-overflow");

    // displays what should be displayed
    if ($("#strongest").css("display") != "none")
        $("#strongest").css("display", "none");
    if ($("#pokedex").css("display") == "none")
        $("#pokedex").css("display", "block");
    if ($("#pokemongo").css("display") == "none")
        $("#pokemongo").css("display", "initial");
    if ($("#counters").css("display") != "none")
        $("#counters").css("display", "none");
    if ($("#counters-popup").css("display") != "none")
        $("#counters-popup").css("display", "none");

    LoadPokemongo(pokemon_id, form, mega, mega_y, level, ivs);
}

/**
 * Gets the pokemon id from a clean input (lowercase alphanumeric).
 * The input could be the id itself or the pokemon name.
 * Returns 0 if it doesn't find it.
 */
function GetPokemonId(clean_input) {

    // checks for an id
    if (/^\d+$/.test(clean_input)) { // if input is an integer
        if (clean_input >= 1 && clean_input <= jb_max_id)
            return parseInt(clean_input);
    }

    // checks for a name
    let pokemon_id = 0;
    Object.keys(jb_names).forEach(function (key) {
        if (Clean(jb_names[key].name) == clean_input)
            pokemon_id = key;
    });

    // if still didn't find anything
    if (pokemon_id == 0) {

        // checks for stupid nidoran
        if (clean_input == "nidoranf")
            return 29;
        else if (clean_input == "nidoranm")
            return 32;
    }

    if (pokemon_id > jb_max_id)
        return 0;

    return parseInt(pokemon_id);
}

/**
 * Gets array of specific pokemon types. Takes into account form and whether
 * is mega.
 */
function GetPokemonTypesFromId(pokemon_id, form, mega, mega_y) {

    let jb_pkm_obj = jb_pkm.find(entry =>
            entry.id == pokemon_id && entry.form == form);
    return (jb_pkm_obj) ? GetPokemonTypes(jb_pkm_obj, mega, mega_y) : [];
}

/**
 * Gets array of specific pokemon types.
 */
function GetPokemonTypes(jb_pkm_obj, mega, mega_y) {

    types = [];

    if (mega_y) {
        if (jb_pkm_obj.mega && jb_pkm_obj.mega[1])
            types = jb_pkm_obj.mega[1].types;
    } else if (mega) {
        if (jb_pkm_obj.mega && jb_pkm_obj.mega[0])
            types = jb_pkm_obj.mega[0].types;
    } else {
        types = jb_pkm_obj.types;
    }

    return types;
}

/**
 * Gets a pokemon container div element set up with a specified pokemon.
 */
function GetPokemonContainer(pokemon_id, is_selected, form = "Normal",
        mega = false, mega_y = false) {

    const pokemon_name = jb_names[pokemon_id].name;
    const clean_name = Clean(pokemon_name);
    const img_src_name = GetPokemonImgSrcName(pokemon_id, clean_name, form,
            mega, mega_y);
    let img_src = GIFS_URL + img_src_name + ".gif";
    const can_be_mega_y = pokemon_id == 6 || pokemon_id == 150; 
    const primal = mega && (pokemon_id == 382 || pokemon_id == 383);
    const form_text = GetFormText(pokemon_id, form);

    // container div
    const pokemon_container_div = $("<div></div>");

    // form text p
    if (form_text.length > 0) {
        const form_text_div = $("<div class='pokemon-form'>"
                + "<p class='pokefont unselectable small-text'>"
                + form_text + "</p></div>");
        pokemon_container_div.append(form_text_div);
    }

    // shiny img
    const shiny_img =
        $("<div class=shiny-img-div><img src=imgs/shiny.png></img></div>");
    pokemon_container_div.append(shiny_img);

    // img container div
    let img_container_div = $("<div class=img-container></div>");
    if (is_selected)
        img_container_div.css("border", "1px solid var(--col-main)");
    img_container_div.append(
            $("<img class=loading src=imgs/loading.gif></img>"));
    img_container_div.append($("<img class=pokemon-img "
            + "onload ='HideLoading(this)' onerror='TryNextSrc(this)'"
            + " onclick='SwapShiny(this)' src="
            + img_src + "></img>"));
    pokemon_container_div.append(img_container_div);

    // pokemon name p
    const pokemon_name_p= $("<p class='pokemon-name pokefont unselectable'"
            + "onclick='LoadPokemonAndUpdateURL(" + pokemon_id + ", \""
            + form + "\", " + mega + ", " + mega_y + ")'>#" + pokemon_id
            + ((primal) ? (" Primal ") : ((mega) ? " Mega " : " "))
            + pokemon_name
            + ((mega && can_be_mega_y) ? ((mega_y) ? " Y " : " X ") : "")
            + "</p>");
    pokemon_container_div.append(pokemon_name_p);

    // pokemon types
    const types = GetPokemonTypesFromId(pokemon_id, form, mega, mega_y);
    const pokemon_types_div = $("<div class=pokemon-types></div>");
    for (type of types) {
        pokemon_types_div.append($("<img src=imgs/types/"
                + type.toLowerCase() + ".gif></img>"));
    }
    pokemon_container_div.append(pokemon_types_div);

    return pokemon_container_div;
}

/**
 * Loads one pokemon data for the Pokemon GO section.
 */
function LoadPokemongo(pokemon_id, form, mega, mega_y, level, ivs) {

    let jb_pkm_obj = jb_pkm.find(entry =>
            entry.id == pokemon_id && entry.form == form);
    let released = true && jb_pkm_obj;
    if (mega)
        released = released && jb_pkm_obj.mega;
    if (mega_y)
        released = released && jb_pkm_obj.mega.length == 2;

    // if this pokemon is not released in pokemon go yet...
    if (!released) {
        $("#not-released").css("display", "initial");
        $("#released").css("display", "none");
        if ($("#legend").css("display") != "none")
            $("#legend").css("display", "none");
        return;
    }

    // if this pokemon is released in pokemon go...

    $("#not-released").css("display", "none");
    $("#released").css("display", "initial");
    if ($("#legend").css("display") == "none")
        $("#legend").css("display", "initial");

    const stats = GetPokemonStats(jb_pkm_obj, mega, mega_y, level, ivs);
    let max_stats = null;
    if (ivs.atk != 15 || ivs.def != 15 || ivs.hp != 15)
        max_stats = GetPokemonStats(jb_pkm_obj, mega, mega_y, level);

    // sets global variables
    current_jb_pkm_obj = jb_pkm_obj;
    current_mega = mega;
    current_mega_y = mega_y;
    counters_loaded = false;

    LoadPokemongoBaseStats(stats);
    LoadPokemongoCP(stats);
    UpdatePokemongoCPText(level, ivs);
    LoadPokemongoEffectiveness(jb_pkm_obj, mega, mega_y);
    ResetPokemongoCounters(jb_pkm_obj);
    LoadPokemongoTable(jb_pkm_obj, mega, mega_y, stats, max_stats);
}

/**
 * Gets the Pokemon GO stats of a specific pokemon. If level or ivs aren't
 * specified, they default to the settings level and the maximum ivs.
 */
function GetPokemonStats(jb_pkm_obj, mega, mega_y, level = null, ivs = null) {

    if (!level) {
        level = settings_default_level;
        if (settings_xl_budget && !jb_pkm_obj.class)
            level = 50;
    }
    if (!ivs)
        ivs = { atk: 15, def: 15, hp: 15 };

    let stats;

    if (mega && mega_y) // mega y
        stats = jb_pkm_obj.mega[1].stats;
    else if (mega) // mega x or normal mega
        stats = jb_pkm_obj.mega[0].stats;
    else // any form non mega
        stats = jb_pkm_obj.stats;

    let cpm = GetCPMForLevel(level);

    stats.atk = (stats.baseAttack + ivs.atk) * cpm;
    stats.def = (stats.baseDefense + ivs.def) * cpm;
    stats.hp = (stats.baseStamina + ivs.hp) * cpm;

    return {...stats}; // returns by copy to prevent reassignment of reference
}

/**
 * Loads the section containing the base stats of the selected pokemon.
 * 
 * The bar indicator is based on the base stat number, with the ceiling being the
 * base stat value from the pokemon with the strongest value for that particular
 * base stat.
 */
function LoadPokemongoBaseStats(stats) {

    const user_agent = window.navigator.userAgent;
    const is_apple = user_agent.includes("Macintosh")
        || user_agent.includes("iPhone") || user_agent.includes("iPad")
        || user_agent.includes("iPod");

    const atk_ceil = 345; // current top atk pkm: Deoxys - 345
    const def_ceil = 396; // current top def pkm: Shuckle - 396
    const hp_ceil = 496; // current top hp pkm: Blissey - 496

    const atk = stats.baseAttack;
    const def = stats.baseDefense;
    const hp = stats.baseStamina;

    let atk_html = "atk <abbr class=ascii-bar title=" + atk + ">";
    let def_html = "def <abbr class=ascii-bar title=" + def + ">";
    let hp_html = "hp <abbr class=ascii-bar title=" + hp + ">";

    const gray_ch = (is_apple) ? "▒" : "▓";

    for (let i = 1; i <= 5; i++) {
        atk_html += (i * atk_ceil / 6 < atk)
            ? "█"  : ((i * atk_ceil / 6 - atk_ceil / 12 < atk)
                ? gray_ch : "░");
        def_html += (i * def_ceil / 6 < def)
            ? "█"  : ((i * def_ceil / 6 - def_ceil / 12 < def)
                ? gray_ch : "░");
        hp_html += (i * hp_ceil / 6 < hp)
            ? "█"  : ((i * hp_ceil / 6 - hp_ceil / 12 < hp)
                ? gray_ch : "░");
    }

    atk_html += "</abbr>";
    def_html += "</abbr>";
    hp_html += "</abbr>";

    $("#base-stat-atk").html(atk_html);
    $("#base-stat-def").html(def_html);
    $("#base-stat-hp").html(hp_html);

    if (is_apple) {
        $(".ascii-bar").addClass("monospace");
        $(".ascii-bar").css("font-size", "15px");
    }
}

/**
 * Loads the progress bar CP of the selected pokemon with its specific stats.
 */
function LoadPokemongoCP(stats) {

    let cp = Math.floor(stats.atk * Math.pow(stats.def, 0.5)
                * Math.pow(stats.hp, 0.5) / 10);
    if (cp < 10)
        cp = 10;

    let prgr_pct = cp * 100 / 5000;
    if (prgr_pct > 100)
        prgr_pct = 100;

    const width = 100 - prgr_pct;
    $(".prgr-val").css("width", width + "%");
    $("#max-cp").text("CP ");
    const bold_num = $("<b>" + cp + "</b>");
    $("#max-cp").append(bold_num);
}

/**
 * Updates the text for pokemon max cp to match the level and IVs being used to
 * calculate it.
 */
function UpdatePokemongoCPText(level, ivs) {

    const pct = Math.round(100 * (ivs.atk + ivs.def + ivs.hp) / 45);
    $("#cp-text").html("with IVs " + ivs.atk + "/" + ivs.def + "/" + ivs.hp
            + " (" + pct + "%) at level " + level
            + "<span id=rat-pct-vs-max></span>"
            + "<span id=sh-rat-pct-vs-max></span>");
}

/**
 * Loads table in the Pokemon GO section sorting the pokemon types according to
 * their effectiveness against the selected pokemon. Note that types that are
 * neutral towards the selected pokemon aren't displayed.
 */
function LoadPokemongoEffectiveness(jb_pkm_obj, mega, mega_y) {

    let types = jb_pkm_obj.types;
    if (mega) {
        if (mega_y)
            types = jb_pkm_obj.mega[1].types;
        else
            types = jb_pkm_obj.mega[0].types;
    }

    let effectiveness_0391 = [];
    let effectiveness_0625 = [];
    let effectiveness_160 = [];
    let effectiveness_256 = [];

    for (let attacker_type of POKEMON_TYPES) {
        const type_effect = POKEMON_TYPES_EFFECT.get(attacker_type);
        let mult = 1;
        for (let type of types) {
            if (type_effect[0].includes(type))
                mult *= 0.391;
            else if (type_effect[1].includes(type))
                mult *= 0.625;
            else if (type_effect[2].includes(type))
                mult *= 1.60;
        }
        if (Math.abs(mult - 0.391) < 0.001)
            effectiveness_0391.push(attacker_type);
        else if (Math.abs(mult - 0.625) < 0.001)
            effectiveness_0625.push(attacker_type);
        else if (Math.abs(mult - 1.60) < 0.001)
            effectiveness_160.push(attacker_type);
        else if (Math.abs(mult - 2.56) < 0.001)
            effectiveness_256.push(attacker_type);
    }

    $("#effectiveness-title").html("Types effectiveness against<br><b>"
            + jb_pkm_obj.name + "</b>");

    let effectiveness_0391_html = "";
    for (let type of effectiveness_0391) {
        effectiveness_0391_html += "<a class='type-text bg-" + type
                + "' onclick='LoadStrongestAndUpdateURL(\"" + type
                + "\")'>" + type + "</a> ";
    }
    $("#effectiveness-0391").html(effectiveness_0391_html);

    let effectiveness_0625_html = "";
    for (let type of effectiveness_0625) {
        effectiveness_0625_html += "<a class='type-text bg-" + type
                + "' onclick='LoadStrongestAndUpdateURL(\"" + type
                + "\")'>" + type + "</a> ";
    }
    $("#effectiveness-0625").html(effectiveness_0625_html);

    let effectiveness_160_html = "";
    for (let type of effectiveness_160) {
        effectiveness_160_html += "<a class='type-text bg-" + type
                + "' onclick='LoadStrongestAndUpdateURL(\"" + type
                + "\")'>" + type + "</a> ";
    }
    $("#effectiveness-160").html(effectiveness_160_html);

    let effectiveness_256_html = "";
    for (let type of effectiveness_256) {
        effectiveness_256_html += "<a class='type-text bg-" + type
                + "' onclick='LoadStrongestAndUpdateURL(\"" + type
                + "\")'>" + type + "</a> ";
    }
    $("#effectiveness-256").html(effectiveness_256_html);
}

/**
 * Resets the pokemon go counters section for the current selected pokemon.
 */
function ResetPokemongoCounters(enemy_jb_pkm_obj) {

    // sets proper counters title and disclaimer
    const verb = ($("#counters").css("display") == "none") ? "show" : "hide";
    $("#counters-button").html(verb + " <b>" + enemy_jb_pkm_obj.name + "</b>'s counters")
    $("#counters-disclaimer").html(
        "calculations take into account the counters effectiveness against "
        + enemy_jb_pkm_obj.name
        + "<br>and the counters resistance to the average of "
        + enemy_jb_pkm_obj.name + "'s movesets");
    
    // shows cell with loading image in the counters table
    $("#counters-tr").empty();
    let td = $("<td></td>");
    let img = $("<img class=loading src=imgs/loading.gif></img>");
    td.append(img);
    td.css("height", "125px");
    $("#counters-tr").append(td);
}

/**
 * Loads best counters of selected pokemon.
 * Searches asynchronously through all the pokemon in the game and calculates
 * the best counters taking into account their effectiveness against the selected
 * mon and their resistance to the average of the selected mon's movesets.
 */
function LoadPokemongoCounters(enemy_jb_pkm_obj, enemy_mega, enemy_mega_y) {

    const enemy_types = GetPokemonTypes(enemy_jb_pkm_obj, enemy_mega, enemy_mega_y);
    const enemy_effectiveness = GetTypesEffectivenessAgainstTypes(enemy_types);

    // gets checkboxes filters
    let search_unreleased =
        $("#counters input[value='unreleased']:checkbox").is(":checked");
    let search_mega =
        $("#counters input[value='mega']:checkbox").is(":checked");
    let search_shadow =
        $("#counters input[value='shadow']:checkbox").is(":checked");
    let search_legendary =
        $("#counters input[value='legendary']:checkbox").is(":checked");
    let search_elite =
        $("#counters input[value='elite']:checkbox").is(":checked");

    const num_counters = 6;
    const num_mega_counters = 5;

    // array of counters pokemon and movesets found so far
    let counters = [];
    let mega_counters = [];

    /**
     * Checks if any of the movesets of a specific pokemon is stronger than any
     * of the current counters. If it is, updates the counters arrays.
     * 
     * There is one array for regular pokemon and other for mega pokemon.
     *
     * The arrays are sorted every time so that it is always the weakest
     * pokemon in it that gets replaced.
     */
    function CheckIfStronger(jb_pkm_obj, mega, mega_y, shadow) {

        const movesets = GetPokemonStrongestMovesetsAgainstEnemy(jb_pkm_obj,
                mega, mega_y, shadow, search_elite, enemy_jb_pkm_obj,
                enemy_mega, enemy_mega_y, enemy_types, enemy_effectiveness);
        if (movesets.length == 0)
            return;

        for (let moveset of movesets) {

            let is_strong_enough = false;

            let not_full = ((mega)
                    ? mega_counters.length < num_mega_counters
                    : counters.length < num_counters);
            let weakest = ((mega) ? mega_counters[0] : counters[0]);

            if (not_full) { // if array isn't full...
                if (moveset.rat > 0)
                    is_strong_enough = true;
            } else { // if array is full...
                // if finds something better than worst in array...
                if (moveset.rat > weakest.rat)
                    is_strong_enough = true;
            }

            if (is_strong_enough) {

                // adds pokemon to array of counters
                const counter = {
                    rat: moveset.rat, id: jb_pkm_obj.id,
                    name: jb_pkm_obj.name, form: jb_pkm_obj.form,
                    mega: mega, mega_y: mega_y, shadow: shadow,
                    fm: moveset.fm, fm_is_elite: moveset.fm_is_elite,
                    fm_type: moveset.fm_type,
                    cm: moveset.cm, cm_is_elite: moveset.cm_is_elite,
                    cm_type: moveset.cm_type,
                    deaths: moveset.deaths
                };

                if (mega) {
                    if (mega_counters.length < num_mega_counters)
                        mega_counters.push(counter);
                    else
                        mega_counters[0] = counter;
                    // sorts array
                    mega_counters.sort(function compareFn(a , b) {
                        return ((a.rat > b.rat) || - (a.rat < b.rat));
                    });
                } else {
                    if (counters.length < num_counters)
                        counters.push(counter);
                    else
                        counters[0] = counter;
                    // sorts array
                    counters.sort(function compareFn(a , b) {
                        return ((a.rat > b.rat) || - (a.rat < b.rat));
                    });
                }
            }
        }
    }

    // searches for pokemon asynchronously in chunks - one chunk every frame

    // number of pokemon searched in each chunk
    const chunk_size = Math.ceil(jb_max_id / 10);

    /**
     * Searches one chunk of pokemon.
     * Receives the index of the chunk to search and the callback function
     * for when all chunks have been searched.
     */
    function SearchOneChunkOfPokemon(chunk_i, callback) {

        for (let id = chunk_i * chunk_size;
                id < (chunk_i + 1) * chunk_size && id <= jb_max_id; id++) {

            const forms = GetPokemonForms(id);
            const def_form = forms[0];

            let jb_pkm_obj = jb_pkm.find(entry =>
                    entry.id == id && entry.form == def_form);

            // checks whether pokemon should be skipped
            // (not released or legendary when not allowed)
            if (!jb_pkm_obj || !search_unreleased && !jb_pkm_obj.released
                    || !search_legendary && jb_pkm_obj.class) {
                continue;
            }

            const can_be_shadow = jb_pkm_obj.shadow;
            const can_be_mega = jb_pkm_obj.mega;

            // default form
            CheckIfStronger(jb_pkm_obj, false, false, false);

            // shadow (except not released when it shouldn't)
            if (search_shadow && can_be_shadow
                    && !(!search_unreleased && !jb_pkm_obj.shadow_released)) {
                CheckIfStronger(jb_pkm_obj, false, false, true);
            }

            // mega(s)
            if (search_mega && can_be_mega) {
                CheckIfStronger(jb_pkm_obj, true, false, false);
                if (id == 6 || id == 150) // charizard and mewtwo
                    CheckIfStronger(jb_pkm_obj, true, true, false);
            }

            // other forms
            for (let form_i = 1; form_i < forms.length; form_i++) {

                jb_pkm_obj = jb_pkm.find(entry =>
                        entry.id == id && entry.form == forms[form_i]);

                // checks whether pokemon should be skipped (form not released)
                if (!jb_pkm_obj || !search_unreleased && !jb_pkm_obj.released)
                    continue;

                CheckIfStronger(jb_pkm_obj, false, false, false);
                // other forms and shadow (except not released when it shouldn't)
                if (search_shadow && can_be_shadow
                        && !(!search_unreleased && !jb_pkm_obj.shadow_released)) {
                    CheckIfStronger(jb_pkm_obj, false, false, true);
                }
            }
        }

        // searches the next chunk of pokemon, if there is more
        chunk_i++;
        if (chunk_i * chunk_size <= jb_max_id) {
            setTimeout(function() { SearchOneChunkOfPokemon(chunk_i, callback); }, 0);
            return;
        } else {
            callback();
        }
    }

    loading_counters = true;
    // searches for the first chunk of pokemon
    setTimeout(function() {
        SearchOneChunkOfPokemon(0, function () {
            ProcessAndSetCountersFromArrays(counters, mega_counters);
            loading_counters = false;
        });
    }, 0);
}

/**
 * Gets array with an arbitrary number of a specific pokemon's strongest movesets
 * against a specific enemy pokemon.
 */
function GetPokemonStrongestMovesetsAgainstEnemy(jb_pkm_obj, mega, mega_y, shadow,
        search_elite, enemy_jb_pkm_obj, enemy_mega, enemy_mega_y,
        enemy_types, enemy_effectiveness) {

    const num_movesets = 6;
    let movesets = [];

    // checks whether this pokemon is actually released,
    // and if not, returns empty

    let released = true && jb_pkm_obj;
    if (mega)
        released = released && jb_pkm_obj.mega;
    if (mega_y)
        released = released && jb_pkm_obj.mega.length == 2;

    if (!released)
        return movesets;

    // gets the necessary data to make the rating calculations

    // subject data
    const types = GetPokemonTypes(jb_pkm_obj, mega, mega_y);
    const effectiveness = GetTypesEffectivenessAgainstTypes(types);
    const stats = GetPokemonStats(jb_pkm_obj, mega, mega_y);
    const atk = (shadow) ? (stats.atk * 6 / 5) : stats.atk;
    const def = (shadow) ? (stats.def * 5 / 6) : stats.def;
    const hp = stats.hp;
    const moves = GetPokemongoMoves(jb_pkm_obj);
    if (moves.length != 4)
        return movesets;
    const fms = moves[0];
    const cms = moves[1];
    const elite_fms = moves[2];
    const elite_cms = moves[3];
    const all_fms = fms.concat(elite_fms);
    const all_cms = cms.concat(elite_cms);

    // enemy data
    let avg_y = null;
    const enemy_stats = GetPokemonStats(enemy_jb_pkm_obj, enemy_mega, enemy_mega_y);
    const enemy_moves = GetPokemongoMoves(enemy_jb_pkm_obj);
    if (enemy_moves.length == 4) {
        const enemy_fms = enemy_moves[0];
        const enemy_cms = enemy_moves[1];
        const enemy_elite_fms = enemy_moves[2];
        const enemy_elite_cms = enemy_moves[3];
        const enemy_all_fms = enemy_fms.concat(enemy_elite_fms);
        const enemy_all_cms = enemy_cms.concat(enemy_elite_cms);
        avg_y = GetMovesetsAvgY(enemy_types, enemy_stats.atk,
                enemy_all_fms, enemy_all_cms, effectiveness, def);
    }

    // searches for the movesets

    for (fm of all_fms) {

        const fm_is_elite = elite_fms.includes(fm);

        if (!search_elite && fm_is_elite)
            continue;

        // gets the fast move object
        const fm_obj = jb_fm.find(entry => entry.name == fm);
        if (!fm_obj)
            continue;
        const fm_mult =
            GetEffectivenessMultOfType(enemy_effectiveness, fm_obj.type);

        for (cm of all_cms) {

            const cm_is_elite = elite_cms.includes(cm);

            if (!search_elite && cm_is_elite)
                continue;

            // gets the charged move object
            const cm_obj = jb_cm.find(entry => entry.name == cm);
            if (!cm_obj)
                continue;
            const cm_mult =
                GetEffectivenessMultOfType(enemy_effectiveness, cm_obj.type);

            // calculates the data
            const dps = GetDPS(types, atk, def, hp, fm_obj, cm_obj,
                fm_mult, cm_mult, enemy_stats.def, avg_y);
            const tdo = GetTDO(dps, hp, def, avg_y);
            // metrics from Reddit user u/Elastic_Space
            const rat = Math.pow(dps, 1-settings_metric_exp) * Math.pow(tdo, settings_metric_exp);

            // if the array of movesets isn't full
            // or the current moveset is stronger than the weakest in the array,
            // pushes the current moveset to the array
            if (movesets.length < num_movesets) {
                const moveset = {
                    rat: rat,
                    fm: fm, fm_is_elite: fm_is_elite, fm_type: fm_obj.type,
                    cm: cm, cm_is_elite: cm_is_elite, cm_type: cm_obj.type,
                    deaths: 300 * avg_y / hp
                };
                movesets.push(moveset);
                // sorts array
                movesets.sort(function compareFn(a , b) {
                    return ((a.rat > b.rat) || - (a.rat < b.rat));
                });
            } else if (rat > movesets[0].rat) {
                const moveset = {
                    rat: rat,
                    fm: fm, fm_is_elite: fm_is_elite, fm_type: fm_obj.type,
                    cm: cm, cm_is_elite: cm_is_elite, cm_type: cm_obj.type,
                    deaths: 300 * avg_y / hp
                };
                movesets[0] = moveset;
                // sorts array
                movesets.sort(function compareFn(a , b) {
                    return ((a.rat > b.rat) || - (a.rat < b.rat));
                });
            }
        }
    }

    return movesets;
}

/**
 * Gets the average y (dps) of all the movesets of a specific pokemon attacking
 * a specific enemy.
 */
function GetMovesetsAvgY(types, atk, fms, cms, enemy_effectiveness, enemy_def = null) {

    let avg_y = 0;
    let num_movesets = 0;

    for (let fm of fms) {

        // gets the fast move object
        const fm_obj = jb_fm.find(entry => entry.name == fm);
        if (!fm_obj)
            continue;
        const fm_mult = GetEffectivenessMultOfType(enemy_effectiveness, fm_obj.type);

        for (let cm of cms) {

            // gets the charged move object
            const cm_obj = jb_cm.find(entry => entry.name == cm);
            if (!cm_obj)
                continue;
            const cm_mult = GetEffectivenessMultOfType(enemy_effectiveness, cm_obj.type);

            avg_y += GetSpecificY(types, atk, fm_obj, cm_obj, fm_mult, cm_mult, enemy_def);
            num_movesets++;
        }
    }

    avg_y /= num_movesets;
    return avg_y;
}

/**
 * Sets up autocomplete for the Pokemon Search Box
 */
function InitializePokemonSearch() {
    const search_values = Object.values(jb_names).map(e => "#" + e.id + " " + e.name);

    const pokemonSearch = new autoComplete({
        selector: "#poke-search-box",
        data: {
            src: search_values,
            filter: (list) => {
                const inputValue = pokemonSearch.input.value.toLowerCase();
                const results = list.filter((item) => {
                    const itemValue = item.value.toLowerCase();
            
                    if (itemValue.startsWith(inputValue)) { // Searching "#"+...
                        return item.value;
                    }
                    if (itemValue.startsWith("#" + inputValue)) { // Searching number directly
                        return item.value;
                    }
                    const nameSearch = itemValue.match(/#\d+ (\w+)/)[1];
                    if (nameSearch && nameSearch.startsWith(inputValue)) { // Searching name directly
                        return item.value;
                    }
                });
            
                return results;
            },
        },
        resultsList: {
            id: "suggestions",
            maxResults: 10
        },
        resultItem: {
            highlight: true
        },
        events: {
            input: {
                focus() {
                    const inputValue = pokemonSearch.input.value;

                    if (inputValue.length) pokemonSearch.start();
                },
            },
        },
    });

    pokemonSearch.input.addEventListener("render", function(e) {
        if (pokemonSearch.cursor == -1) { pokemonSearch.goTo(0); }
    });
    pokemonSearch.input.addEventListener("selection", function(e) {
        const selID = e.detail.selection.value.match(/(#\d+ )\w+/)[1];
        LoadPokemonAndUpdateURL(Clean(selID));
    });
}


/**
 * Processes the counters in the 'counters' and 'mega_counters' arrays
 * and sets them in the page.
 * 
 * The arrays contain the counters sorted in ascending order.
 */
function ProcessAndSetCountersFromArrays(counters, mega_counters) {

    // reverses counters arrays to be in descending order
    counters.reverse();
    mega_counters.reverse();

    // simplifies counters arrays into maps where each pokemon species is a key
    let counters_s = new Map();
    for (let counter of counters) {
        if (!counters_s.has(counter.id))
            counters_s.set(counter.id, [])
        counters_s.get(counter.id).push(counter);
    }
    let mega_counters_s = new Map();
    for (let counter of mega_counters) {
        if (!mega_counters_s.has(counter.id))
            mega_counters_s.set(counter.id, [])
        mega_counters_s.get(counter.id).push(counter);
    }

    // converts simplified maps into one array containing arrays of counters
    // for each pokemon species
    const all_counters =
        Array.from(mega_counters_s.values()).concat(Array.from(counters_s.values()));

    // gets strongest rat
    const top_rat = ((mega_counters[0].rat > counters[0].rat)
            ? mega_counters[0].rat : counters[0].rat);

    // sets counters in the page

    $("#counters-tr").empty();

    for (let i = 0; i < all_counters.length; i++) { // for each counter...

        let counter_0 = all_counters[i][0];

        // sets counter's rating percentage span
        let rat_pcts_span = $("<span class='counter-rat-pct'></span>");
        for (let counter of all_counters[i]) {
            let rat_pct = 100 * counter.rat / top_rat;
            let rat_pct_a = $("<a></a>");
            rat_pct_a.html("<b>" + rat_pct.toFixed(0) + "%</b>"
                + ((counter.mega)?" (M)":"")
                + ((counter.shadow)?" (Sh)":"") + "<br>");
            if (has_touch_screen) {
                rat_pct_a.click(function() {
                    ShowCountersPopup(this, true, counter);
                });
            } else {
                rat_pct_a.mouseenter(function() {
                    ShowCountersPopup(this, true, counter);
                });
                rat_pct_a.mouseleave(function() {
                    ShowCountersPopup(this, false);
                });
                rat_pct_a.click(function() {
                    LoadPokemonAndUpdateURL(counter.id, counter.form,
                        counter.mega, counter.mega_y);
                    window.scrollTo(0, 0);
                });
            }
            rat_pcts_span.append(rat_pct_a);
        }

        // sets counter's image
        let img = $("<img onload='HideLoading(this)' onerror='TryNextSrc(this)'></img>");
        let img_src_name = GetPokemonImgSrcName(counter_0.id, Clean(counter_0.name),
                counter_0.form, counter_0.mega, counter_0.mega_y);
        let img_src = GIFS_URL + img_src_name + ".gif";
        img.attr("src", img_src);
        let td = $("<td></td>");

        // sets table cell and appends it to the row
        td.append(rat_pcts_span);
        td.append($("<img class=loading src=imgs/loading.gif></img>"));
        td.append(img);
        $("#counters-tr").append(td);
    }
}

/**
 * Shows or hides the popup of the counter whose rating percentage label is
 * currently being hovered.
 * 
 * Receives the object of the element being hovered, whether it should show or
 * hide the popup, and the counter object.
 */
function ShowCountersPopup(hover_element, show, counter = null) {

    if (show && counter) {

        // sets hover element's border for touch screens
        if (has_touch_screen) {
            let rat_pcts = $(".counter-rat-pct > a");
            for (rat_pct of rat_pcts)
                $(rat_pct).css("border", "none");
            $(hover_element).css("border", "1px solid var(--col-off)");
        }

        // sets the popup's position

        let pos = $(hover_element).offset();
        let w = $(hover_element).width();
        let h = $(hover_element).height();
        let x = pos.left + 0.5 * w - 100;
        let y = pos.top + 1.5 * h;

        $("#counters-popup").css("left", x);
        $("#counters-popup").css("top", y);

        // sets the popup's content

        const can_be_mega_y = counter.id == 6 || counter.id == 150; 
        const primal = counter.mega && (counter.id == 382 || counter.id == 383);
        const form_text = GetFormText(counter.id, counter.form);

        const name = "<b>"
            + ((primal) ? ("Primal ") : ((counter.mega) ? "Mega " : ""))
            + ((counter.shadow) ? "<span class=shadow-text>Shadow</span> " : "")
            + counter.name
            + ((counter.mega && can_be_mega_y) ? ((counter.mega_y) ? " Y" : " X") : "")
            + "</b></a>"
            + ((form_text.length > 0)
                ? " <span class=small-text>(" + form_text + ")</span>" 
                : "")

        $("#counters-popup").html("<span>" + name
            + "<br><span class='type-text bg-"
            + ((counter.fm == "Hidden Power") ? "any-type" : counter.fm_type) + "'>"
            + counter.fm + ((counter.fm_is_elite) ? "*" : "")
            + "</span> <span class='type-text bg-" + counter.cm_type + "'>"
            + counter.cm + ((counter.cm_is_elite) ? "*" : "")
            + "</span></span>");

        // sets popup's click callback for touch devices
        if (has_touch_screen) {
            $("#counters-popup").unbind("click");
            $("#counters-popup").click( function() {
                LoadPokemonAndUpdateURL(counter.id, counter.form,
                    counter.mega, counter.mega_y);
                window.scrollTo(0, 0);
            });
        }

        // shows the popup
        $("#counters-popup").css("display", "inline");

    } else {
        // hides the popup
        $("#counters-popup").css("display", "none");
    }
}

/**
 * Loads the table in the Pokemon Go section including information about
 * the possible move combinations and their ratings.
 * 
 * If the argument 'max_stats' is received, also calculates the average rating
 * percentage of the specific stats against the max stats (15/15/15 ivs)
 * of all movesets. This percentage is then displayed on the CP section.
 */
function LoadPokemongoTable(jb_pkm_obj, mega, mega_y, stats, max_stats = null) {

    // sets movesets title
    $("#movesets-title").html("<b>" + jb_pkm_obj.name + "'s movesets</b>");

    // whether can be shadow
    const can_be_shadow = jb_pkm_obj.shadow && !mega;

    // types
    const types = GetPokemonTypes(jb_pkm_obj, mega, mega_y);

    const atk = stats.atk;
    const def = stats.def;
    const hp = stats.hp;

    // shadow stats
    const atk_sh = atk * 6 / 5;
    const def_sh = def * 5 / 6;

    // removes previous table rows
    $("#pokemongo-table tbody tr").remove();

    const moves = GetPokemongoMoves(jb_pkm_obj);
    if (moves.length != 4)
        return;

    const fms = moves[0];
    const cms = moves[1];
    const elite_fms = moves[2];
    const elite_cms = moves[3];

    const all_fms = fms.concat(elite_fms);
    const all_cms = cms.concat(elite_cms);

    // variables used to calculate average rating percentages against max stats
    let rat_pcts_vs_max = 0;
    let rat_sh_pcts_vs_max = 0;
    let num_movesets = 0;

    // appends new table rows asynchronously (so that Mew loads fast)
    // each chunk of moves combinations with a specific fast move
    // is appended in a different frame

    /**
     * Appends all the rows containing a specific fast move.
     * Receives the index of the fast move and the callback function
     * for when all chunks have been appended as arguments.
     */
    function AppendFMChunk(fm_i, callback) {

        const fm = all_fms[fm_i];
        const fm_is_elite = elite_fms.includes(fm);

        // gets the fast move object
        const fm_obj = jb_fm.find(entry => entry.name == fm);
        if (!fm_obj) {
            fm_i++;
            if (fm_i < all_fms.length)
                setTimeout(function() {AppendFMChunk(fm_i, callback);}, 0);
            else
                callback();
            return;
        }

        const fm_type = fm_obj.type;

        for (cm of all_cms) {

            const cm_is_elite = elite_cms.includes(cm);

            // gets the charged move object
            const cm_obj = jb_cm.find(entry => entry.name == cm);
            if (!cm_obj)
                continue;

            const cm_type = cm_obj.type;

            // calculates the data

            const dps = GetDPS(types, atk, def, hp, fm_obj, cm_obj);
            const dps_sh = GetDPS(types, atk_sh, def_sh, hp,fm_obj,cm_obj);
            const tdo = GetTDO(dps, hp, def);
            const tdo_sh = GetTDO(dps_sh, hp, def_sh);
            // metrics from Reddit user u/Elastic_Space
            const rat = Math.pow(dps, 1-settings_metric_exp) * Math.pow(tdo, settings_metric_exp);
            const rat_sh = Math.pow(dps_sh, 1-settings_metric_exp) * Math.pow(tdo_sh, settings_metric_exp);

            // calculates average rating percentages against max stats
            if (max_stats) {
                const max_dps = GetDPS(types, max_stats.atk, max_stats.def,
                    max_stats.hp, fm_obj, cm_obj);
                const max_tdo = GetTDO(max_dps, max_stats.hp, max_stats.def);
                // metrics from Reddit user u/Elastic_Space
                const max_rat = Math.pow(dps, 1-settings_metric_exp) * Math.pow(tdo, settings_metric_exp);

                rat_pcts_vs_max += rat / max_rat;
                rat_sh_pcts_vs_max += rat_sh / max_rat;
            } else {
                rat_sh_pcts_vs_max += rat_sh / rat;
            }
            num_movesets++;

            // creates one row

            const tr = $("<tr></tr>");
            const td_fm = $("<td><span class='type-text bg-"
                    + ((fm == "Hidden Power") ? "any-type" : fm_type)
                    + "'>" + fm + ((fm_is_elite) ? "*" : "")
                    + "</span></td>");
            const td_cm = $("<td><span class='type-text bg-" + cm_type
                    + "'>" + cm + ((cm_is_elite) ? "*" : "")
                    + "</span></td>");
            const td_dps = $("<td>" + dps.toFixed(3) + "</td>");
            const td_dps_sh = $("<td>"
                    + ((can_be_shadow) ? dps_sh.toFixed(3) : "-")
                    + "</td>");
            const td_tdo = $("<td>" + tdo.toFixed(1) + "</td>");
            const td_tdo_sh = $("<td>"
                    + ((can_be_shadow) ? tdo_sh.toFixed(1) : "-")
                    + "</td>");
            const td_rat = $("<td>" + rat.toFixed(2) + "</td>");
            const td_rat_sh = $("<td>"
                    + ((can_be_shadow) ? rat_sh.toFixed(2) : "-")
                    + "</td>");

            tr.append(td_fm);
            tr.append(td_cm);
            tr.append(td_dps);
            tr.append(td_dps_sh);
            tr.append(td_tdo);
            tr.append(td_tdo_sh);
            tr.append(td_rat);
            tr.append(td_rat_sh);

            $("#pokemongo-table tbody").append(tr);
        }
        // if necessary, calculates average rating percentage of specific stats
        // against max stats of all movesets and displays it on the CP section
        if (max_stats) {
            let avg_rat_pct_vs_max = 100 * rat_pcts_vs_max / num_movesets;
            let pct_str = avg_rat_pct_vs_max.toFixed(2) + "%";
            if (isNaN(avg_rat_pct_vs_max))
                pct_str = "??";
            $("#rat-pct-vs-max").html(" → " + settings_metric + " " + pct_str);
        }

        // if can be shadow, calculates average rating percentage of shadow stats
        // against max stats of all movesets and displays it on the CP section
        if (can_be_shadow) {
            let avg_rat_sh_pct_vs_max = 100 * rat_sh_pcts_vs_max / num_movesets;
            let pct_str = avg_rat_sh_pct_vs_max.toFixed(2) + "%";
            if (isNaN(avg_rat_sh_pct_vs_max))
                pct_str = "??";
            $("#sh-rat-pct-vs-max").html("<br> → Shadow " + settings_metric
                    + " " + pct_str);
        }

        // appends the next fast move chunk, if there is more
        fm_i++;
        if (fm_i < all_fms.length)
            setTimeout(function() {AppendFMChunk(fm_i, callback);}, 0);
        else
            callback();
    }

    loading_pogo_moves = true;
    // appends the first fast move chunk
    AppendFMChunk(0, function() {
        SortPokemongoTable(6);
        loading_pogo_moves = false;
    });
}

/**
 * Gets array of four arrays. The specified Pokemon's fast moves, elite fast
 * moves, charged moves and elite charged moves.
 */
function GetPokemongoMoves(jb_pkm_obj) {

    if (!jb_pkm_obj.fm && !jb_pkm_obj.cm)
        return [];

    let fm = jb_pkm_obj.fm.slice();
    let elite_fm = [];
    if (jb_pkm_obj.elite_fm)
        elite_fm = jb_pkm_obj.elite_fm.slice();
    let cm = jb_pkm_obj.cm.slice();
    let elite_cm = [];
    if (jb_pkm_obj.elite_cm)
        elite_cm = jb_pkm_obj.elite_cm.slice();

    // checks for hidden power
    if (fm.includes("Hidden Power") || elite_fm.includes("Hidden Power")) {
        for (let type of POKEMON_TYPES) {
            if (!["Normal", "Fairy"].includes(type) && jb_pkm_obj.types.includes(type)) {
                if (fm.includes("Hidden Power"))
                    fm.push("Hidden Power " + type);
                if (elite_fm.includes("Hidden Power"))
                    elite_fm.push("Hidden Power " + type)
            }
        }
    }

    return [fm, cm, elite_fm, elite_cm];
}

/**
 * Gets the comprehensive DPS of a pokemon of some type(s) and with some
 * stats using a specific fast move and charged move.
 *
 * Formula credit to https://gamepress.gg .
 * https://gamepress.gg/pokemongo/damage-mechanics
 * https://gamepress.gg/pokemongo/how-calculate-comprehensive-dps
 * 
 * Can receive multipliers for the fast move and charged move, in
 * case of being aware of the effectiveness of the move against the enemy mon.
 * Also can receive the enemy defense stat and the y - enemy's DPS - if known.
 */
function GetDPS(types, atk, def, hp, fm_obj, cm_obj, fm_mult = 1, cm_mult = 1,
        enemy_def = null, y = null) {

    if (!fm_obj || !cm_obj)
        return 0;

    // misc variables
    if (!enemy_def)
        enemy_def = 160;
    const x = 0.5 * -cm_obj.energy_delta + 0.5 * fm_obj.energy_delta;
    if (!y)
        y = 900 / def;

    // fast move variables
    const fm_dmg_mult = fm_mult
        * ((types.includes(fm_obj.type) && fm_obj.name != "Hidden Power") ? 1.2 : 1);
    const fm_dmg = 0.5 * fm_obj.power * (atk / enemy_def) * fm_dmg_mult + 0.5;
    const fm_dps = fm_dmg / (GetDuration(fm_obj) / 1000);
    const fm_eps = fm_obj.energy_delta / (GetDuration(fm_obj) / 1000);

    // charged move variables
    const cm_dmg_mult = cm_mult * ((types.includes(cm_obj.type)) ? 1.2 : 1);
    const cm_dmg = 0.5 * cm_obj.power * (atk / enemy_def) * cm_dmg_mult + 0.5;
    const cm_dps = cm_dmg / (GetDuration(cm_obj) / 1000);
    let cm_eps = -cm_obj.energy_delta / (GetDuration(cm_obj) / 1000);
    // penalty to one-bar charged moves (they use more energy (cm_eps))
    if (cm_obj.energy_delta == -100) {
        const dws = cm_obj.damage_window_start / 1000; // dws in seconds
        cm_eps = (-cm_obj.energy_delta + 0.5 * fm_obj.energy_delta
                + 0.5 * y * dws) / (GetDuration(cm_obj) / 1000);
    }

    // simple cycle DPS
    const dps0 = (fm_dps * cm_eps + cm_dps * fm_eps) / (cm_eps + fm_eps);
    // comprehensive DPS
    let dps = dps0 + ((cm_dps - fm_dps) / (cm_eps + fm_eps))
            * (0.5 - x / hp) * y;

    // charged move is strictly better, and can be used indefinitely
    if (cm_dps > fm_dps && -cm_obj.energy_delta < y * GetDuration(cm_obj) / 1000 * 0.5) 
        dps = cm_dps;
    // fast move is strictly better
    if (fm_dps > dps)
        dps = fm_dps;

    return ((dps < 0) ? 0 : dps);
}

/* Rounds to nearest n */
function GetDuration(atk_obj) {
    if (settings_pve_turns) {
        let n = 500; // 0.5 seconds
        return Math.round(atk_obj.duration/n)*n;
    }
    return atk_obj.duration;
}

/**
 * In the GamePress formula, y is the DPS of the enemy.
 * Usually y equals 900 / def but there is a more sophisticated formula to
 * calculate it when the enemy is known.
 * 
 * This function gets y from a specified enemy.
 * 
 * Formula credit to https://gamepress.gg .
 * https://gamepress.gg/pokemongo/how-calculate-comprehensive-dps
 */
function GetSpecificY(types, atk, fm_obj, cm_obj, fm_mult = 1, cm_mult = 1,
        enemy_def = null) {

    if (!fm_obj || !cm_obj)
        return 0;

    // misc variables
    if (!enemy_def)
        enemy_def = 160;
    const x = 0.5 * -cm_obj.energy_delta + 0.5 * fm_obj.energy_delta;

    // fast move variables
    const fm_dmg_mult = fm_mult
        * ((types.includes(fm_obj.type) && fm_obj.name != "Hidden Power") ? 1.2 : 1);
    const fm_dmg = 0.5 * fm_obj.power * (atk / enemy_def) * fm_dmg_mult + 0.5;

    // charged move variables
    const cm_dmg_mult = cm_mult * ((types.includes(cm_obj.type)) ? 1.2 : 1);
    const cm_dmg = 0.5 * cm_obj.power * (atk / enemy_def) * cm_dmg_mult + 0.5;
    let lambda = 1;
    switch (cm_obj.energy_delta) {
        case -100:
            lambda = 3;
            break;
        case -50:
            lambda = 1.5;
            break;
        case -33:
            lambda = 1;
            break;
    }

    // this isn't part of the formula
    // this multiplier attempts to tweak the specified y
    // to match the default (900 / def)
    const y_mult = 200;

    // specific y
    const y = y_mult * (lambda * fm_dmg + cm_dmg)
        / (lambda * (GetDuration(fm_obj) + 2) + GetDuration(cm_obj) + 2);

    return ((y < 0) ? 0 : y);
}

/**
 * Gets the TDO of a pokemon using its DPS, HP, DEF and y if known.
 *
 * Formula credit to https://gamepress.gg .
 * https://gamepress.gg/pokemongo/how-calculate-comprehensive-dps
 */
function GetTDO(dps, hp, def, y = null) {

    if (!y)
        y = 900 / def;
    return (dps * (hp / y));
}

/**
 * Sorts the pokemon go moves combinations table rows according to the
 * values from a specific column.
 */
function SortPokemongoTable(column_i) {

    let table = $("#pokemongo-table")[0];

    // updates downside triangles
    let triangles = $(".th-triangle");
    for (triangle of triangles)
        triangle.remove();

    cells = table.tHead.rows[0].cells;
    for (let cell_i = 0; cell_i < cells.length; cell_i++) {
        let cell = $(cells[cell_i]);
        if (cell_i == column_i) {
            let triangle = $("<span class=th-triangle> ▾</span>");
            cell.append(triangle);
        } else if (cell.hasClass("sortable")) {
            let triangle = $("<span class=th-triangle> ▿</span>");
            cell.append(triangle);
        }
    }

    // sorts rows
    let rows_array = Array.from(table.tBodies[0].rows);
    rows_array = MergeSortPokemongoTable(rows_array, column_i);
    for (let i = 0; i < rows_array.length; i++)
        table.tBodies[0].append(rows_array[i]);
}

/**
 * Applies the merge sort algorithm to the pokemon go table rows.
 * Sorts according to the values from a specific column.
 */
function MergeSortPokemongoTable(rows, column_i) {

    if (rows.length <= 1)
        return rows;

    const n = (rows.length / 2);
    let a = MergeSortPokemongoTable(rows.slice(0, n), column_i);
    let b = MergeSortPokemongoTable(rows.slice(n), column_i);

    return MergeRows(a, b, column_i);
}

/**
 * Part of the merge sort algorithm for the pokemon go table rows.
 * Sorts and merges two arrays of rows according to the values
 * from a specific column. Returns the single resulting array.
 */
function MergeRows(a, b, column_i) {

    function GetRowValue(row) {
        return parseFloat(
                row.getElementsByTagName("TD")[column_i]
                .innerHTML.toLowerCase());
    }

    let c = [];

    while (a.length > 0 && b.length > 0) {
        if (GetRowValue(a[0]) >= GetRowValue(b[0])) {
            c.push(a[0]);
            a.shift();
        } else {
            c.push(b[0]);
            b.shift();
        }
    }

    while (a.length > 0) {
        c.push(a[0]);
        a.shift();
    }

    while (b.length > 0) {
        c.push(b[0]);
        b.shift();
    }

    return c;
}

/**
 * Receives the pokemon image that just loaded as an argument.
 * Hides the placeholder loading image and shows the loaded pokemon image.
 */
function HideLoading(element) {

    const loading = $(element).parent().children(".loading");
    loading.css("display", "none");
    $(element).css("display", "initial");
}

/**
 * When a pokemon image source couldn't be loaded, this function tries the 
 * next option.
 * Eventually it will just load the 'notfound' image and stop trying.
 */
function TryNextSrc(element) {

    const src = $(element).attr("src");

    if (src.includes(GIFS_URL)) {
        // loads pogo-256 image
        let next_src = src.replace(GIFS_URL, POGO_PNGS_URL);
        next_src = next_src.replace(".gif", ".png");
        $(element).attr("src", next_src);
        $(element).css("width", "140px");
        $(element).css("height", "140px");

    } else {
        // loads notfound image and stops trying (disables error callback)
        const next_src = "imgs/notfound.png";
        $(element).attr("src", next_src);
        $(element).css("width", "96px");
        $(element).css("height", "96px");
        $(element).css("cursor", "default");
        $(element).off("onerror");
    }
}

/**
 * Swaps the pokemon image for its shiny form.
 */
function SwapShiny(element) {

    const pokemon_container = $(element).parent().parent();
    const shiny_img =
        pokemon_container.children(".shiny-img-div").children("img");

    let src = $(element).attr("src");

    if (src.includes(GIFS_URL)) {
        src = src.replace(GIFS_URL, SHINY_GIFS_URL);
        shiny_img.css("display", "initial");

    } else if (src.includes(SHINY_GIFS_URL)) {
        src = src.replace(SHINY_GIFS_URL, GIFS_URL);
        shiny_img.css("display", "none");

    } else if (src.includes(POGO_PNGS_URL)) {
        src = src.replace(POGO_PNGS_URL, SHINY_POGO_PNGS_URL);
        shiny_img.css("display", "initial");

    } else if (src.includes(SHINY_POGO_PNGS_URL)) {
        src = src.replace(SHINY_POGO_PNGS_URL, POGO_PNGS_URL);
        shiny_img.css("display", "none");
    }

    $(element).attr("src", src);
}

/**
 * Callback function for when pokemon stats are updated (level or/and IVs).
 * Reloads the pokemon page and the url with the new specified stats.
 */
function UpdatePokemonStatsAndURL() {

    const params = new URLSearchParams(location.search);

    // if url has pokemon params...
    if (params.has("p")) {

        const pkm = params.get("p");

        let form = "def";
        if (params.has("f"))
            form = params.get("f");

        let mega = false;
        if (params.has("m"))
            mega = true;

        let mega_y = false;
        if (params.has("y"))
            mega_y = true;

        let level = Number($("#input-lvl").val());

        let ivs = {};
        ivs.atk = parseInt($("#input-atk").val());
        ivs.def = parseInt($("#input-def").val());
        ivs.hp = parseInt($("#input-hp").val());

        LoadPokemonAndUpdateURL(pkm, form, mega, mega_y, level, ivs);
    }
}

/**
 * Callback function for when the 'show counters' or 'hide counters' button is
 * clicked.
 * It either shows or hides the counters, depending on whether they are visible.
 * 
 * It also loads the counters if they haven't been loaded for the current
 * selected pokemon yet.
 */
function ShowCounters() {

    $("#counters-popup").css("display", "none");

    const html = $("#counters-button").html();

    if ($("#counters").css("display") == "none") {
        $("#counters").css("display", "initial");
        $("#counters-button").html(html.replace("show ", "hide "));
    } else {
        $("#counters").css("display", "none");
        $("#counters-button").html(html.replace("hide ", "show "));
    }

    // if counters haven't been loaded for the current pokemon, loads them
    if (!counters_loaded) {
        counters_loaded = true;
        LoadPokemongoCounters(current_jb_pkm_obj, current_mega, current_mega_y);
    }
}

/**
 * Calls the 'LoadStrongest' function and updates the url accordingly.
 */
function LoadStrongestAndUpdateURL(type = "Any") {

    if (!finished_loading)
        return false;

    LoadStrongest(type);

    let url = "?strongest&t=" + type;
    if ($("#chk-versus").prop("checked")) url += '&v';

    window.history.pushState({}, "", url);
}

/**
 * Loads the list of the strongest pokemon of a specific type in pokemon go.
 * The type can be 'each', 'any' or an actual type.
 */
function LoadStrongest(type = "Any") {

    if (!finished_loading)
        return;

    // displays what should be displayed 
    if ($("#pokemongo").css("display") != "none")
        $("#pokemongo").css("display", "none");
    if ($("#pokedex").css("display") != "none")
        $("#pokedex").css("display", "none");
    if ($("#strongest").css("display") == "none")
        $("#strongest").css("display", "initial");
    if ($("#legend").css("display") == "none")
        $("#legend").css("display", "initial");

    // Only enable suboptimal filters if we're searching a specific type (not "Each")
    if (type == null)
        $("#chk-suboptimal, #chk-grouped").prop("disabled", true);
    else 
        $("#chk-suboptimal, #chk-mixed").prop("disabled", false);

    // sets links
    let strongest_link_any = $("#strongest-links > ul:first() > li:nth-child(1)");
    let strongest_link_each = $("#strongest-links > ul:first() > li:nth-child(2)");
    strongest_link_any.removeClass("strongest-link-selected");
    strongest_link_each.removeClass("strongest-link-selected");
    if (type == "Any")
        strongest_link_any.addClass("strongest-link-selected");
    else if (type == "Each")
        strongest_link_each.addClass("strongest-link-selected");
    let links_types = $("#strongest-links-types");
    links_types.empty();

    let ndx = 0;
    for (const t of POKEMON_TYPES) {
        links_types.append("<li><a class='type-text bg-" + t
                + ((t == type) ? " strongest-link-selected" : "")
                + "' onclick='LoadStrongestAndUpdateURL(\"" + t
                + "\")'>" + t + "</a></li>");
        if ((ndx+1) % 6 == 0) { //every 6th type
            links_types.append("<li class='line-break'><li>");
        }
        ndx++;
    }

    // Handle logic for "versus"
    const versus_chk = $("#strongest input[value='versus']:checkbox");
    if (type == "Any" || type == "Each") { // disabled if not a specific type
        versus_chk.prop("checked", false);
        versus_chk.prop("disabled", true);
    }
    else {
        versus_chk.prop("disabled", false);
    }
    let search_versus = versus_chk.is(":checked");

    // sets titles
    let title = "Strongest Pokémon of " + type + " type";
    document.title = title + " - DialgaDex"; // page title
    $("#strongest-type-title").text(type);

    // removes previous table rows
    $("#strongest-table tbody tr").remove();

    // gets checkboxes filters
    let search_unreleased =
        $("#strongest input[value='unreleased']:checkbox").is(":checked");
    let search_mega =
        $("#strongest input[value='mega']:checkbox").is(":checked");
    let search_shadow =
        $("#strongest input[value='shadow']:checkbox").is(":checked");
    let search_legendary =
        $("#strongest input[value='legendary']:checkbox").is(":checked");
    let search_elite =
        $("#strongest input[value='elite']:checkbox").is(":checked");
    let search_suboptimal =
        $("#strongest input[value='suboptimal']:checkbox").is(":checked");
    let search_mixed =
        $("#strongest input[value='mixed']:checkbox").is(":checked");

    if (type != "Each") {
        SetTableOfStrongestOfOneType(search_unreleased, search_mega,
                search_shadow, search_legendary, search_elite, 
                search_suboptimal, search_mixed, type, search_versus);
    } else {
        SetTableOfStrongestOfEachType(search_unreleased, search_mega,
                search_shadow, search_legendary, search_elite, search_mixed);
    }
}

/**
 * Searches the strongest pokemon of each type and sets the strongest
 * pokemon table with the result.
 */
function SetTableOfStrongestOfEachType(search_unreleased, search_mega,
        search_shadow, search_legendary, search_elite, search_mixed) {

    // map of strongest pokemon and moveset found so far for each type
    let str_pokemons = new Map();

    /**
     * Checks if the any of the strongest movesets of a specific pokemon
     * is stronger than any of the current strongest pokemon of each type.
     * If it is, updates the strongest pokemon map.
     */
    function CheckIfStronger(jb_pkm_obj, mega, mega_y, shadow) {

        const types_movesets = GetPokemonStrongestMovesets(jb_pkm_obj,
                mega, mega_y, shadow, search_elite, 1, null, search_mixed);

        for (const type of POKEMON_TYPES) {

            // checks that pokemon has a moveset of this type
            if (!types_movesets.has(type))
                continue;

            const moveset = types_movesets.get(type)[0];
            let is_stronger = false;

            if (!str_pokemons.has(type)) { // if no strong pkm yet...

                if (moveset.rat > 0)
                    is_stronger = true;

            } else { // if some strong pkm already...

                // if finds something better than worst in array...
                if (moveset.rat > str_pokemons.get(type).rat)
                    is_stronger = true;
            }

            if (is_stronger) {

                // adds pokemon to array of strongest
                const str_pokemon = {
                    rat: moveset.rat, id: jb_pkm_obj.id,
                    name: jb_pkm_obj.name, form: jb_pkm_obj.form,
                    mega: mega, mega_y: mega_y, shadow: shadow, class: jb_pkm_obj.class,
                    fm: moveset.fm, fm_is_elite: moveset.fm_is_elite, fm_type: moveset.fm_type,
                    cm: moveset.cm, cm_is_elite: moveset.cm_is_elite, cm_type: moveset.cm_type
                };
                str_pokemons.set(type, str_pokemon);
            }
        }
    }

    // searches for pokemons...

    for (let id = 1; id <= jb_max_id; id++) {

        const forms = GetPokemonForms(id);
        const def_form = forms[0];

        let jb_pkm_obj = jb_pkm.find(entry =>
                entry.id == id && entry.form == def_form);

        // checks whether pokemon should be skipped
        // (not released or legendary when not allowed)
        if (!jb_pkm_obj || !search_unreleased && !jb_pkm_obj.released
                || !search_legendary && jb_pkm_obj.class) {
            continue;
        }

        const can_be_shadow = jb_pkm_obj.shadow;
        const can_be_mega = jb_pkm_obj.mega;

        // default form
        CheckIfStronger(jb_pkm_obj, false, false, false);

        // shadow (except not released when it shouldn't)
        if (search_shadow && can_be_shadow
                && !(!search_unreleased && !jb_pkm_obj.shadow_released)) {
            CheckIfStronger(jb_pkm_obj, false, false, true);
        }

        // mega(s)
        if (search_mega && can_be_mega) {
            CheckIfStronger(jb_pkm_obj, true, false, false);
            if (id == 6 || id == 150) // charizard and mewtwo
                CheckIfStronger(jb_pkm_obj, true, true, false);
        }

        // other forms
        for (let form_i = 1; form_i < forms.length; form_i++) {

            jb_pkm_obj = jb_pkm.find(entry =>
                    entry.id == id && entry.form == forms[form_i]);

            // checks whether pokemon should be skipped (form not released)
            if (!jb_pkm_obj || !search_unreleased && !jb_pkm_obj.released)
                continue;

            CheckIfStronger(jb_pkm_obj, false, false, false);
            // other forms and shadow (except not released when it shouldn't)
            if (search_shadow && can_be_shadow
                    && !(!search_unreleased && !jb_pkm_obj.shadow_released)) {
                CheckIfStronger(jb_pkm_obj, false, false, true);
            }
        }
    }

    // converts map into array
    let str_pokemons_array = [];
    for (const type of POKEMON_TYPES) {
        if (str_pokemons.has(type))
            str_pokemons_array.push(str_pokemons.get(type));
    }

    // sets table from array
    SetStrongestTableFromArray(str_pokemons_array);
}

/**
 * Searches the strongest pokemon of a specific type and sets the strongest
 * pokemon table with the result.
 * 
 * The number of rows in the table is set to match the table with one
 * pokemon of each type, therefore, there are as many rows as pkm types.
 */
function SetTableOfStrongestOfOneType(search_unreleased, search_mega,
        search_shadow, search_legendary, search_elite, 
        search_suboptimal, search_mixed, type = null, versus = false) {

    // over-create list, then filter down later
    const num_rows = 200; //settings_strongest_count;

    // array of strongest pokemon and moveset found so far
    let str_pokemons = [];

    /**
     * Checks if the strongest moveset of a specific pokemon and type is
     * stronger than any of the current strongest pokemons. If it is,
     * updates the strongest pokemons array.
     *
     * The array is sorted every time so that it is always the weakest
     * pokemon in it that gets replaced.
     */
    function CheckIfStronger(jb_pkm_obj, mega, mega_y, shadow) {

        // Consider max 5 best movesets per pokemon
        let moveset_count = (search_suboptimal) ? 5 : 1; 
        const types_movesets = GetPokemonStrongestMovesets(jb_pkm_obj,
                mega, mega_y, shadow, search_elite, moveset_count, type, search_mixed, versus);
        
        if (!types_movesets.has(type))
            return;
        const movesets = types_movesets.get(type);

        for (let moveset of movesets) {
            let is_strong_enough = false;

            if (str_pokemons.length < num_rows) { // if array isn't full...

                if (moveset.rat > 0)
                    is_strong_enough = true;

            } else { // if array isn't empty...

                // if finds something better than worst in array...
                if (moveset.rat > str_pokemons[0].rat)
                    is_strong_enough = true;

            }

            if (is_strong_enough) {

                // adds pokemon to array of strongest
                const str_pokemon = {
                    rat: moveset.rat, id: jb_pkm_obj.id,
                    name: jb_pkm_obj.name, form: jb_pkm_obj.form,
                    mega: mega, mega_y: mega_y, shadow: shadow, class: jb_pkm_obj.class,
                    fm: moveset.fm, fm_is_elite: moveset.fm_is_elite, fm_type: moveset.fm_type,
                    cm: moveset.cm, cm_is_elite: moveset.cm_is_elite, cm_type: moveset.cm_type
                };

                if (str_pokemons.length < num_rows)
                    str_pokemons.push(str_pokemon);
                else
                    str_pokemons[0] = str_pokemon;


                // sorts array
                str_pokemons.sort(function compareFn(a , b) {
                    return ((a.rat > b.rat) || - (a.rat < b.rat));
                });
            }
        }
    }

    // searches for pokemons...

    for (let id = 1; id <= jb_max_id; id++) {

        const forms = GetPokemonForms(id);
        const def_form = forms[0];

        let jb_pkm_obj = jb_pkm.find(entry =>
                entry.id == id && entry.form == def_form);

        // checks whether pokemon should be skipped
        // (not released or legendary when not allowed)
        if (!jb_pkm_obj || !search_unreleased && !jb_pkm_obj.released
                || !search_legendary && jb_pkm_obj.class) {
            continue;
        }

        const can_be_shadow = jb_pkm_obj.shadow;
        const can_be_mega = jb_pkm_obj.mega;

        // default form
        CheckIfStronger(jb_pkm_obj, false, false, false);

        // shadow (except not released when it shouldn't)
        if (search_shadow && can_be_shadow
                && !(!search_unreleased && !jb_pkm_obj.shadow_released)) {
            CheckIfStronger(jb_pkm_obj, false, false, true);
        }

        // mega(s)
        if (search_mega && can_be_mega) {
            CheckIfStronger(jb_pkm_obj, true, false, false);
            if (id == 6 || id == 150) // charizard and mewtwo
                CheckIfStronger(jb_pkm_obj, true, true, false);
        }

        // other forms
        for (let form_i = 1; form_i < forms.length; form_i++) {

            jb_pkm_obj = jb_pkm.find(entry =>
                    entry.id == id && entry.form == forms[form_i]);

            // checks whether pokemon should be skipped (form not released)
            if (!jb_pkm_obj || !search_unreleased && !jb_pkm_obj.released)
                continue;

            CheckIfStronger(jb_pkm_obj, false, false, false);
            // other forms and shadow (except not released when it shouldn't)
            if (search_shadow && can_be_shadow
                    && !(!search_unreleased && !jb_pkm_obj.shadow_released)) {
                CheckIfStronger(jb_pkm_obj, false, false, true);
            }
        }
    }

    // reverses strongest pokemon array
    str_pokemons.reverse();

    const display_grouped =
        $("#strongest input[value='grouped']:checkbox").is(":checked") && search_suboptimal;
    
    let top_compare;
    const best_mon = str_pokemons[0].rat;
    
    switch (settings_compare) {
        case "top":
            top_compare = best_mon;
            break;
        case "budget":
            try {
                top_compare = str_pokemons.find(e => e.class == undefined && !e.shadow && !e.mega).rat;
            } catch (err) {
                top_compare = str_pokemons[str_pokemons.length-1].rat; // budget must be even lower
            }
            break;
        case "ESpace":
            try {
                top_compare = str_pokemons.find(e => !(e.class !== undefined && e.shadow) && 
                                                    !e.mega && !e.mega_y && 
                                                    !(e.name == 'Rayquaza' && e.cm == 'Dragon Ascent') &&
                                                    !(e.name == 'Necrozma' && e.form != 'Normal')
                                                ).rat;
            } catch (err) {
                top_compare = str_pokemons[str_pokemons.length-1].rat; // budget must be even lower
            }
            break;
    }

    // re-order array based on the optimal movesets of each pokemon
    if (display_grouped) {
        str_pokemons.length = Math.min(str_pokemons.length, settings_strongest_count); //truncate to top movesets early

        let str_pokemons_optimal = new Map(); // map of top movesets per mon
        let rat_order = 0;

        for (let str_pok of str_pokemons) {
            const pok_uniq_id = str_pok.id + "-" + str_pok.form + "-" + str_pok.mega + "-" + str_pok.mega_y + "-" + str_pok.shadow;
            if (!str_pokemons_optimal.has(pok_uniq_id)) {
                // array was already sorted, so first instance of mon is strongest
                str_pokemons_optimal.set(pok_uniq_id, [rat_order, str_pok.rat]);
                str_pok.grouped_rat = rat_order;
                str_pok.pct = 100 * str_pok.rat / top_compare;
                str_pok.pct_display = str_pok.pct;
                rat_order++;
            }
            // map all instances of this mon to the same "grouped" ranking
            const gp_compare = str_pokemons_optimal.get(pok_uniq_id);
            str_pok.grouped_rat = gp_compare[0];
            str_pok.pct = 100 * str_pok.rat / gp_compare[1];
            str_pok.pct_display = str_pok.pct;
        }

        // re-sort by grouped ranking, then individual moveset rank
        str_pokemons.sort((a,b) => a.grouped_rat - b.grouped_rat || b.rat - a.rat);
    }
    else { // determine tiers
        for (let str_pok of str_pokemons) {
            str_pok.pct = 100.0 * str_pok.rat / top_compare;
            str_pok.pct_display = str_pok.pct * (top_compare / best_mon);
        }
        BuildTiers(str_pokemons, top_compare);
    
        str_pokemons.length = Math.min(str_pokemons.length, settings_strongest_count); // truncate late so all movesets could be evaluated
    }

    // sets table from array
    SetStrongestTableFromArray(str_pokemons, str_pokemons.length, display_grouped, true, true, true, (best_mon / top_compare));
}

/**
 * Modifies str_pokemons to include a "tier" attribute
 * Can rely on each entry in str_pokemons having "rat" attribute (current metric rating)
 *    and "pct" attribute (rating vs comparison mon aka [this.rat/top_compare])
 * 
 * Tier-making methods can optionally use the top_compare parameter as a benchmark
 */
function BuildTiers(str_pokemons, top_compare) {
    const best_mon = str_pokemons[0].rat;

    // Compare to benchmark, building tiers based on ratio (str_pok.pct)
    if (settings_tiermethod == "broad" || settings_tiermethod == "ESpace") {
        let S_breakpoint = 100.0;
        let S_tier_size = 20.0;
        let letter_tier_size = 10.0;
        if (settings_tiermethod == "ESpace") { // slightly tweak tier sizes and breakpoints
            S_breakpoint = 105.0;
            S_tier_size = 10.0;
            letter_tier_size = 5.0;
        }

        for (let str_pok of str_pokemons) {
            if (str_pok.pct >= S_breakpoint + 0.00001) { //S+
                const num_S = Math.floor((str_pok.pct - S_breakpoint + 0.00001)/S_tier_size)+1;
                if (num_S > 3 && str_pok.name == "Rayquaza" && str_pok.mega) 
                    str_pok.tier = "MRay";
                else if (num_S >= 3)
                    str_pok.tier = "SSS";
                else 
                    str_pok.tier = "S".repeat(num_S);
            }
            else {
                let tier_cnt = Math.floor((S_breakpoint + 0.00001 - str_pok.pct)/letter_tier_size);
                if (settings_tiermethod == "ESpace" && tier_cnt >=1) // Shift to an "A" breakpoint of 95.0
                    tier_cnt--;
                if (tier_cnt >= 4) // Everything past D -> F
                    tier_cnt = 5;
                str_pok.tier = String.fromCharCode("A".charCodeAt(0) + tier_cnt);
            }
        }
    }
    // Compare to benchmark, generally trying to set the benchmark into "A" tier within reason
    // Using Jenks Natural Breaks to compute reasonable tier breaks
    // (Minimize internal tier variance, while maximizing variance between tiers)
    else if (settings_tiermethod == "jenks") {
        const n = Math.min(100, str_pokemons.length); // only consider top 100

        let tier_breaks = jenks_wrapper(str_pokemons.map(e => e.rat).slice(0, n), 5); // truncate to only those above breakpoint
        let compare_tier = tier_breaks.findIndex(e => e < top_compare);
        if (compare_tier == -1) compare_tier = 5; //not found
        if (compare_tier >= 2) { // need more tiers
            tier_breaks = jenks_wrapper(str_pokemons.map(e => e.rat).slice(0, n), 5 + compare_tier); // truncate to only those above breakpoint
            //compare_tier = tier_breaks.findIndex(e => e < top_compare);
        }

        let this_tier_idx = 0;
        let this_tier = (compare_tier >= 2 ? 1 - compare_tier : 0); // if necessary, shift tiers down to make "top_compare" mon A-tier
        for (let str_pok of str_pokemons) {
            if (str_pok.rat <= tier_breaks[this_tier_idx]) {
                this_tier_idx++;
                this_tier++;
            }
            
            if (this_tier <= 0) {
                if (str_pok.rat == best_mon && str_pok.name == "Rayquaza" && str_pok.mega)
                    str_pok.tier = "MRay";
                else
                    str_pok.tier = "S".repeat(1 - this_tier);
            }
            else {
                str_pok.tier = String.fromCharCode("A".charCodeAt(0) + this_tier + (this_tier == 5 ? 0 : -1));
            }
        }
    }
    // Hand-tuned tier listing based on overall, objective evaluation of the Pokemon
    // This is compared to the generalist "Any" ranking and tuned using the Jenks method
    // Helps reveal situations where a Pokemon, despite being good *within its limited type context*
    //   is actually suboptimal overall due to that type's inherent weakness
    //   (e.g. Poison/Bug/Fairy tend to have very weak options and are often poor counters)
    // Basic philosophy is that an "S" tier mon should actually be GOOD, not just better than
    //   its counterparts
    else if (settings_tiermethod == "absolute") {
        for (let str_pok of str_pokemons) {
            const rescale = $("#settings input[value='rescale']:checkbox").is(":checked");
            let check_rat = str_pok.rat;
            if ((!rescale || (settings_metric == 'DPS' || settings_metric == 'TDO')) 
                && (versus || (type != 'Any' && search_mixed))) {
                check_rat /= 1.6;
            }
            switch (settings_metric) {
                case 'DPS':
                    if (check_rat >= 20.0) str_pok.tier = 'SSS';
                    else if (check_rat >= 19.5) str_pok.tier = 'SS';
                    else if (check_rat >= 19.0) str_pok.tier = 'S';
                    else if (check_rat >= 18.5) str_pok.tier = 'A';
                    else if (check_rat >= 17.5) str_pok.tier = 'B';
                    else if (check_rat >= 17.0) str_pok.tier = 'C';
                    else if (check_rat >= 16.0) str_pok.tier = 'D';
                    else str_pok.tier = 'F';
                    break;
                case 'TDO':
                    if (check_rat >= 750) str_pok.tier = 'SSS';
                    else if (check_rat >= 700) str_pok.tier = 'SS';
                    else if (check_rat >= 650) str_pok.tier = 'S';
                    else if (check_rat >= 600) str_pok.tier = 'A';
                    else if (check_rat >= 550) str_pok.tier = 'B';
                    else if (check_rat >= 500) str_pok.tier = 'C';
                    else if (check_rat >= 450) str_pok.tier = 'D';
                    else str_pok.tier = 'F';
                    break;
                case 'ER':
                    if (check_rat >= 57.0) str_pok.tier = 'SSS';
                    else if (check_rat >= 53.5) str_pok.tier = 'SS';
                    else if (check_rat >= 49.0) str_pok.tier = 'S';
                    else if (check_rat >= 45.0) str_pok.tier = 'A';
                    else if (check_rat >= 42.5) str_pok.tier = 'B';
                    else if (check_rat >= 41.0) str_pok.tier = 'C';
                    else if (check_rat >= 39.0) str_pok.tier = 'D';
                    else str_pok.tier = 'F';
                    break;
                case 'EER':
                    if (check_rat >= 50.0) str_pok.tier = 'SSS';
                    else if (check_rat >= 47.0) str_pok.tier = 'SS';
                    else if (check_rat >= 43.0) str_pok.tier = 'S';
                    else if (check_rat >= 40.0) str_pok.tier = 'A';
                    else if (check_rat >= 37.5) str_pok.tier = 'B';
                    else if (check_rat >= 36.0) str_pok.tier = 'C';
                    else if (check_rat >= 34.5) str_pok.tier = 'D';
                    else str_pok.tier = 'F';
                    break;
                case 'TER':
                    if (check_rat >= 37.0) str_pok.tier = 'SSS';
                    else if (check_rat >= 35.0) str_pok.tier = 'SS';
                    else if (check_rat >= 34.0) str_pok.tier = 'S';
                    else if (check_rat >= 32.0) str_pok.tier = 'A';
                    else if (check_rat >= 31.0) str_pok.tier = 'B';
                    else if (check_rat >= 30.0) str_pok.tier = 'C';
                    else if (check_rat >= 29.0) str_pok.tier = 'D';
                    else str_pok.tier = 'F';
                    break;
            }

            if (str_pok.rat == best_mon && str_pok.name == "Rayquaza" && str_pok.mega)
                str_pok.tier = "MRay";
        }
    }
}

/**
 * Gets map of a specific pokemon's strongest movesets for each type.
 * 
 * If the 'search_type' param is specified, only tries to find movesets
 * of that type.
 * 
 * However, if 'search_different_type' is true, all other types are allowed but
 * their rating is calculated as if they are not very effective but the selected
 * type is neutral.
 */
function GetPokemonStrongestMovesets(jb_pkm_obj, mega, mega_y, shadow,
        search_elite, moveset_count, search_type = null, search_mixed = false, versus = false) {

    let types_movesets = new Map();

    // checks whether this pokemon is actually released,
    // and if not, returns empty

    let released = true && jb_pkm_obj;
    if (mega)
        released = released && jb_pkm_obj.mega;
    if (mega_y)
        released = released && jb_pkm_obj.mega.length == 2;

    if (!released)
        return types_movesets;

    // gets the necessary data to make the rating calculations

    const types = GetPokemonTypes(jb_pkm_obj, mega, mega_y);

    const stats = GetPokemonStats(jb_pkm_obj, mega, mega_y);
    const atk = (shadow) ? (stats.atk * 6 / 5) : stats.atk;
    const def = (shadow) ? (stats.def * 5 / 6) : stats.def;
    const hp = stats.hp;

    const moves = GetPokemongoMoves(jb_pkm_obj);
    if (moves.length != 4)
        return types_movesets;

    const fms = moves[0];
    const cms = moves[1];
    const elite_fms = moves[2];
    const elite_cms = moves[3];

    const all_fms = fms.concat(elite_fms);
    const all_cms = cms.concat(elite_cms);

    let atk_mult_map;
    if (versus) {
        atk_mult_map = GetTypesEffectivenessAgainstTypes([search_type]);
    }
    const rescale = $("#settings input[value='rescale']:checkbox").is(":checked");

    // searches for the moveset

    for (fm of all_fms) {

        const fm_is_elite = elite_fms.includes(fm);

        if (!search_elite && fm_is_elite)
            continue;

        // gets the fast move object
        const fm_obj = jb_fm.find(entry => entry.name == fm);
        if (!fm_obj || fm_obj.name == "Hidden Power")
            continue;

        // checks that fm type matches the type searched
        // if search type isn't specified, any type goes
        // if checking "versus", any type goes
        if (search_type && search_type != "Any" && !versus &&
            fm_obj.type != search_type && !search_mixed)
            continue;

        for (cm of all_cms) {

            const cm_is_elite = elite_cms.includes(cm);

            if (!search_elite && cm_is_elite)
                continue;

            // gets the charged move object
            const cm_obj = jb_cm.find(entry => entry.name == cm);
            if (!cm_obj)
                continue;

            // checks that cm type matches the type searched
            // if search type isn't specified, any type goes
            // if checking "versus", any type goes
            if (search_type && search_type != "Any" && !versus && 
                cm_obj.type != search_type && !search_mixed)
                continue;

            // ensure at least one type matches if mixing
            if (search_type && search_type != "Any" && !versus &&
                search_mixed && fm_obj.type != search_type && cm_obj.type != search_type)
                continue;

            // checks that both moves types are equal (unless mixing)
            if (fm_obj.type != cm_obj.type && !search_mixed)
                continue;

            // determine what move types we're ranking
            let moves_types;
            if (search_type)
                moves_types = [search_type]
            else if (fm_obj.type == cm_obj.type)
                moves_types = [fm_obj.type]
            else
                moves_types = [fm_obj.type, cm_obj.type]

            // calculates the data
            for (let mt of moves_types) {
                let dps;
                let tdo;

                // use appropriate multipliers if searching "versus"
                if (versus) {
                    let fm_mult = GetEffectivenessMultOfType(atk_mult_map, fm_obj.type);
                    let cm_mult = GetEffectivenessMultOfType(atk_mult_map, cm_obj.type);

                    let def_types = jb_pkm_obj.types;
                    if (mega) {
                        def_types = jb_pkm_obj.mega[0].types;
                    }
                    if (mega_y) {
                        def_types = jb_pkm_obj.mega[1].types;
                    }
                    const def_mult_map = GetTypesEffectivenessAgainstTypes(def_types);
                    const defense_mult = 1; //GetEffectivenessMultOfType(def_mult_map, search_type);

                    const y_est = 900/def*defense_mult;
                    dps = GetDPS(types, atk, def, hp, 
                        fm_obj, cm_obj,
                        fm_mult, cm_mult, null, y_est);
                    tdo = GetTDO(dps, hp, def, y_est);

                    if (rescale && settings_metric != 'DPS' && settings_metric != 'TDO') {
                        dps /= 1.6;
                        tdo /= 1.6; // have to ALSO remove the extra scalar on the dps used in the TDO calc
                    }
                }
                else if (search_mixed && search_type != "Any") { // mixed movesets scale based on search type (super-effective mult)
                    dps = GetDPS(types, atk, def, hp, 
                        fm_obj, cm_obj,
                        (fm_obj.type == mt) ? 1.60 : 1,
                        (cm_obj.type == mt) ? 1.60 : 1);

                    if (rescale && settings_metric != 'DPS' && settings_metric != 'TDO')
                        dps /= 1.6;
                    tdo = GetTDO(dps, hp, def);
                }
                // non-mixed or "anything-goes" searches use traditional dps
                else {
                    dps = GetDPS(types, atk, def, hp, 
                        fm_obj, cm_obj);
                    tdo = GetTDO(dps, hp, def);
                }
                
                // metrics from Reddit user u/Elastic_Space
                const rat = Math.pow(dps, 1-settings_metric_exp) * Math.pow(tdo, settings_metric_exp);

                // summary of this moveset and its rating
                const cur_moveset = {
                    rat: rat, 
                    fm: fm, fm_is_elite: fm_is_elite, fm_type: fm_obj.type,
                    cm: cm, cm_is_elite: cm_is_elite, cm_type: cm_obj.type,
                };

                // build array of all valid movesets
                if (!types_movesets.has(mt)) {
                    types_movesets.set(mt, [cur_moveset]);
                }
                else {
                    types_movesets.get(mt).push(cur_moveset);
                }
            }
        }
    }

    let combined_movesets = [];

    for (let t of types_movesets.keys()) {
        t_movesets = types_movesets.get(t);

        // add all movesets to "Any" array
        combined_movesets = combined_movesets.concat(t_movesets); 

        t_movesets.sort((a,b) => b.rat - a.rat); 
        
        // truncate to top N found movesets
        t_movesets.length = Math.min(t_movesets.length, moveset_count);
    }

    // apply same logic to our "combination" array
    combined_movesets.sort((a,b) => b.rat - a.rat); 
    combined_movesets.length = Math.min(combined_movesets.length, moveset_count);    
    types_movesets.set("Any", combined_movesets);

    return types_movesets;
}

/**
 * Gets a specific pokemon's strongest moveset.
 */
function GetPokemonStrongestMoveset(jb_pkm_obj, mega, mega_y, shadow,
        search_elite, search_different_type) {

    let moveset = {};

    // checks whether this pokemon is actually released,
    // and if not, returns empty

    let released = true && jb_pkm_obj;
    if (mega)
        released = released && jb_pkm_obj.mega;
    if (mega_y)
        released = released && jb_pkm_obj.mega.length == 2;

    if (!released)
        return moveset;

    // gets the necessary data to make the rating calculations

    const types = GetPokemonTypes(jb_pkm_obj, mega, mega_y);

    const stats = GetPokemonStats(jb_pkm_obj, mega, mega_y);
    const atk = (shadow) ? (stats.atk * 6 / 5) : stats.atk;
    const def = (shadow) ? (stats.def * 5 / 6) : stats.def;
    const hp = stats.hp;

    const moves = GetPokemongoMoves(jb_pkm_obj);
    if (moves.length != 4)
        return moveset;

    const fms = moves[0];
    const cms = moves[1];
    const elite_fms = moves[2];
    const elite_cms = moves[3];

    const all_fms = fms.concat(elite_fms);
    const all_cms = cms.concat(elite_cms);

    // searches for the moveset

    for (fm of all_fms) {

        const fm_is_elite = elite_fms.includes(fm);

        if (!search_elite && fm_is_elite)
            continue;

        // gets the fast move object
        const fm_obj = jb_fm.find(entry => entry.name == fm);
        if (!fm_obj || fm_obj.name == "Hidden Power")
            continue;

        for (cm of all_cms) {

            const cm_is_elite = elite_cms.includes(cm);

            if (!search_elite && cm_is_elite)
                continue;

            // gets the charged move object
            const cm_obj = jb_cm.find(entry => entry.name == cm);
            if (!cm_obj)
                continue;

            // checks that both moves types are equal
            // (if diff types are allowed, they don't need to be equal)
            if (!search_different_type && fm_obj.type != cm_obj.type)
                continue;

            // calculates the data

            const dps = GetDPS(types, atk, def, hp, fm_obj, cm_obj);
            const tdo = GetTDO(dps, hp, def);
            // metrics from Reddit user u/Elastic_Space
            const rat = Math.pow(dps, 1-settings_metric_exp) * Math.pow(tdo, settings_metric_exp);

            // checks whether this moveset is stronger than current strongest,
            // if it is, overrides the previous strongest
            if (!moveset.rat || rat > moveset.rat) {
                moveset = {
                    rat: rat,
                    fm: fm, fm_type: fm_obj.type, fm_is_elite: fm_is_elite,
                    cm: cm, cm_type: cm_obj.type, cm_is_elite: cm_is_elite
                };
            }
        }
    }

    return moveset;
}

/**
 * Adds rows to the strongest pokemon table according to an array of
 * pokemon. The 'ranks' array fills the leftmost column of the table,
 * if nothing is sent, is filled with ordered numbers #1, #2, etc.
 *
 * If a number of rows is specified and there aren't enough pokemon, fills 
 * the remaining rows with "-". If the number of rows isn't specified,
 * there will be as many rows as pokemon in the array.
 */
function SetStrongestTableFromArray(str_pokemons, num_rows = null, 
    display_grouped = false, display_numbered = false, highlight_suboptimal = false, show_pct = false, best_pct = 1.0) {

    if (!num_rows)
        num_rows = str_pokemons.length;

    const encountered_mons = new Set();
    let cur_tier_td = null;
    let cur_tier_i = 0;

    for (let row_i = 0; row_i < num_rows; row_i++) {

        if (row_i < str_pokemons.length) {

            const p = str_pokemons[row_i];

            const name = p.name;
            const coords = GetPokemonIconCoords(p.id, p.form, p.mega, p.mega_y);
            const can_be_mega_y = p.id == 6 || p.id == 150; 
            const primal = p.mega && (p.id == 382 || p.id == 383);
            const form_text = GetFormText(p.id, p.form).replace(/\s+Forme?/,"");
            const legendary = p.class !== undefined;

            const tr = $("<tr></tr>");
            if (display_grouped) 
                tr.addClass("grouped");

            // re-style any rows for mons we've seen before 
            if (highlight_suboptimal) {
                const pok_uniq_id = p.id + "-" + p.form + "-" + p.mega + "-" + p.mega_y + "-" + p.shadow;
                if (encountered_mons.has(pok_uniq_id)) {
                    tr.addClass("suboptimal");
                }
                else {
                    encountered_mons.add(pok_uniq_id);
                }
            }

            const td_tier = $("<td></td>");
            if (!display_grouped && show_pct) {
                if (!cur_tier_td || p.tier != cur_tier_td.text()) {
                    td_tier.text(p.tier);
                    td_tier.addClass("tier-label");
                    td_tier.addClass("tier-" + p.tier);
                    if (cur_tier_td) cur_tier_td.prop("rowspan", row_i - cur_tier_i);
                    cur_tier_td = td_tier;
                    cur_tier_i = row_i;
                }
                else {
                    if (cur_tier_td && row_i == num_rows-1) cur_tier_td.prop("rowspan", row_i - cur_tier_i + 1);
                    td_tier.css("display", "none");
                }
            } 

            const td_rank = "<td>"
                + ((display_numbered) 
                    ? (((display_grouped) 
                        ? p.grouped_rat : row_i) + 1) : "")
                +"</td>";
            const td_name = "<td class='td-poke-name'>"
                + "<a class='a-poke-name' onclick='LoadPokemonAndUpdateURL(" + p.id
                + ",\"" + p.form + "\"," + p.mega + "," + p.mega_y + ")'>"
                + "<span class=pokemon-icon style='background-image:url("
                + ICONS_URL + ");background-position:" + coords.x + "px "
                + coords.y + "px'></span>"
                + " <span class='strongest-name'>"
                + ((primal) ? ("Primal ") : ((p.mega) ? "Mega " : ""))
                + ((p.shadow)
                    ? "<span class=shadow-text>Shadow</span> " : "")
                + name
                + ((p.mega && can_be_mega_y)
                    ? ((p.mega_y) ? " Y" : " X") : "")
                + ((!legendary && settings_xl_budget) ? "<sup class='xl'>XL</sup>" : "")
                +"</span>"
                + ((form_text.length > 0)
                    ? "<span class=poke-form-name> (" + form_text + ")</span>" 
                    : "")
                + "</a></td>";
            const td_fm =
                "<td><span class='type-text bg-"
                + ((p.fm == "Hidden Power") ? "any-type" : p.fm_type) + "'>"
                + p.fm + ((p.fm_is_elite) ? "*" : "") + "</span></td>";
            const td_cm =
                "<td><span class='type-text bg-" + p.cm_type + "'>"
                + p.cm + ((p.cm_is_elite) ? "*" : "") + "</span></td>";
            const td_rat = "<td>" + settings_metric + " <b>"
                + p.rat.toFixed(2) + "</b></td>";
            const td_pct = ((show_pct) ? "<td>" 
                + "<div class='bar-bg' style='width: calc(" + (100 / best_pct) + "% - 10px);'>"
                + "<div class='bar-fg" + ((Math.abs(p.pct - 100) < 0.000001) ? " bar-compare" : "") + "' style='width: " + p.pct + "%;'>"
                + "<span class='bar-txt'>"
                + p.pct.toFixed(1) + "%</td>"
                + "</span></div></div>" : "");

            tr.append(td_tier);
            tr.append(td_rank);
            tr.append(td_name);
            tr.append(td_fm);
            tr.append(td_cm);
            tr.append(td_rat);
            tr.append(td_pct);

            $("#strongest-table tbody").append(tr);

        } else {

            const empty_row =
                "<tr><td>-</td><td>-</td><td>-</td><td>-</td></tr>"
            $("#strongest-table tbody").append(empty_row);
        }
    }
}

/**
 * Makes string clean, all lowercases and only alphanumeric characters.
 */
function Clean(string) {

    return string.toLowerCase().replace(/\W/g, "");
}
