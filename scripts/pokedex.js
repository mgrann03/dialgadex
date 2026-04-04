let atk_dist, def_dist, hp_dist, cp_dist;

/**
 * Loads a Pokémon page.
 */
function LoadPokedex(pokedex_mon) {

    if (!finished_loading || loading_pogo_moves || loading_counters)
        return;

    if (!pokedex_mon || pokedex_mon.pokemon_id == 0) {
        LoadPokedexAndUpdateURL(GetPokeDexMon(1, "Normal", null, null));
        return;
    }

    // sets the page title
    const pokemon_name = jb_names[pokedex_mon.pokemon_id];
    document.title = "#" + pokedex_mon.pokemon_id + " " + pokemon_name
            + " - DialgaDex";

    // sets description
    $('meta[name=description]').attr('content', 
        "Best movesets, base stats, and raid counters for " + pokemon_name + 
        " in Pokémon Go.");

    // sets level input value
    $("#input-lvl").val(pokedex_mon.level);

    // sets ivs inputs values
    $("#input-atk").val(pokedex_mon.ivs.atk);
    $("#input-def").val(pokedex_mon.ivs.def);
    $("#input-hp").val(pokedex_mon.ivs.hp);

    // empties the search box
    $("#poke-search-box").val("");

    // empties the pokemon containers
    $("#main-container").empty();
    $("#previous-containers").empty();
    $("#next-containers").empty();
    $("#additional-containers").empty();

    const forms = GetPokemonForms(pokedex_mon.pokemon_id);
    const def_form = forms[0];
    
    window.scrollTo(0,0);

    // sets main pokemon container
    $("#main-container").append(GetPokemonContainer(pokedex_mon.pokemon_id,
            (pokedex_mon.form == def_form), def_form));

    // sets previous and next pokemon containers
    for (i = 1; i <= 2; i++) {
        const prev_pokemon_id = parseInt(pokedex_mon.pokemon_id) - i;
        if (prev_pokemon_id > 0) {
            $("#previous-containers").prepend(
                GetPokemonContainer(prev_pokemon_id, false,
                    GetPokemonDefaultForm(prev_pokemon_id)));
        }
        const next_pokemon_id = parseInt(pokedex_mon.pokemon_id) + i;
        if (next_pokemon_id <= jb_max_id) {
            $("#next-containers").append(
                GetPokemonContainer(next_pokemon_id, false,
                    GetPokemonDefaultForm(next_pokemon_id)));
        }
    }

    // sets additional pokemon containers

    let additional_cs = $("#additional-containers");
    const additional_forms = forms.slice(1);

    for (f of additional_forms) {
        additional_cs.append(
            GetPokemonContainer(pokedex_mon.pokemon_id, pokedex_mon.form == f, f));
    }

    // Will Scroll
    if (additional_cs.get(0).scrollWidth > additional_cs.get(0).clientWidth) {
        additional_cs.prepend("<div class='scroll-portal scroll-portal-left'></div>");
        additional_cs.append("<div class='scroll-portal scroll-portal-right'></div>");

        $(".container-selected").get(0).scrollIntoView({block: "end", inline: "center"});
    }

    // displays what should be displayed
    LoadPage("pokedex-page");

    LoadPokedexData(pokedex_mon);

    // Prevent Link
    return false;
}


/**
 * Calls the 'LoadPokemon' function and updates the url to match the
 * pokemon being loaded.
 */
function LoadPokedexAndUpdateURL(pokedex_mon) {

    if (!finished_loading || loading_pogo_moves || loading_counters)
        return false;

    LoadPokedex(pokedex_mon);
    UpdatePokedexURL(pokedex_mon);

    // Prevent Link
    return false;
}

/**
 * Updates the url to match the pokemon being loaded
 */
function UpdatePokedexURL(pokedex_mon) {
    let url = "?p=" + pokedex_mon.pokemon_id;

    if (pokedex_mon.form != "def")
        url += "&f=" + pokedex_mon.form;
    if (pokedex_mon.level)
        url += "&lvl=" + String(pokedex_mon.level);
    if (pokedex_mon.ivs) {
        url += "&ivs="
            + String(pokedex_mon.ivs.atk).padStart(2, "0")
            + String(pokedex_mon.ivs.def).padStart(2, "0")
            + String(pokedex_mon.ivs.hp).padStart(2, "0");
    }

    window.history.pushState({}, "", url);
}

/**
 * Loads one pokemon data for the Pokemon GO section.
 */
function LoadPokedexData(pokedex_mon) {
    let pkm_obj = jb_pkm.find(entry =>
            entry.id == pokedex_mon.pokemon_id && entry.form == pokedex_mon.form);
    let released = true && pkm_obj;

    // if this pokemon is not released in pokemon go yet...
    if (!released) {
        $("#not-released").css("display", "revert");
        $("#released").css("display", "none");
        //if ($("#footer").css("display") != "none")
        //    $("#footer").css("display", "none");
        return;
    }

    // if this pokemon is released in pokemon go...

    $("#not-released").css("display", "none");
    $("#released").css("display", "revert");
    //if ($("#footer").css("display") == "none")
    //    $("#footer").css("display", "revert");

    // sets global variables
    current_pkm_obj = pkm_obj;

    UpdateStats(pkm_obj, pokedex_mon);
    LoadPokedexEffectiveness(pkm_obj);
    ResetPokedexCounters();
    LoadPokedexCounters();
}

/**
 * Returns an object representing the Pokemon being requested via URL params
 */
function GetPokeDexMon(pokemon_id, form = "def", level = null, ivs = null) {
    if (pokemon_id == 0)
        return;
    
    // sets the default form
    if (form == "def")
        form = GetPokemonDefaultForm(pokemon_id);

    // sets the default level
    if (level == null) {
        level = settings_default_level[0];
        const poke_obj = jb_pkm.find(e=>e.id == pokemon_id);
        if (poke_obj !== undefined && poke_obj.class == undefined && settings_xl_budget)
            level = 50;
    }

    // sets the default ivs
    if (ivs == null)
        ivs = { atk: 15, def: 15, hp: 15 };

    return {
        pokemon_id: pokemon_id,
        form: form,
        level: level,
        ivs: ivs
    };
}

/**
 * Draws stat bars to specified elements
 */
function DrawStats(statArr, elemIDs) {
    elemIDs.forEach((id, index)=> {
        $(id).html(statArr[index]);
    });
}

/**
 * Loads the section containing the base stats of the selected pokemon.
 * 
 * The bar indicator is based on the base stat number, as compared to a Gaussian
 * distribution for all high-stat mons.
 */
function GetPokedexBaseStatBars(stats) {
    GetStatDistributions();

    return [
        GetBarHTML(Clamp(CalcZScore(stats.baseAttack, atk_dist), -3, 3) + 3, stats.baseAttack, 6, 6),
        GetBarHTML(Clamp(CalcZScore(stats.baseDefense, def_dist), -3, 3) + 3, stats.baseDefense, 6, 6),
        GetBarHTML(Clamp(CalcZScore(stats.baseStamina, hp_dist), -3, 3) + 3, stats.baseStamina, 6, 6)
    ];
}

/**
 * Loads the section containing the effective stats of the selected pokemon.
 */
function GetPokedexStatBars(stats) {
    GetStatDistributions();

    const cp = GetPokemonCP(stats);
    const cp_zscore = Clamp(CalcZScore(cp, cp_dist), -2.8, 3);
    let cp_tier;
    if (cp_zscore >= 1)
        cp_tier = "S".repeat(Math.floor(cp_zscore));
    else
        cp_tier = String.fromCharCode("A".charCodeAt(0) - Math.floor(cp_zscore));    

    return [
        GetBarHTML(Clamp(CalcZScore(stats.atk, atk_dist), -2.8, 3) + 3, stats.atk.toFixed(1), 6, 6),
        GetBarHTML(Clamp(CalcZScore(stats.def, def_dist), -2.8, 3) + 3, stats.def.toFixed(1), 6, 6),
        GetBarHTML(Clamp(CalcZScore(stats.hp, hp_dist), -2.8, 3) + 3, toFixedTrunc(stats.hp, 1), 6, 6),
        GetBarHTML(cp_zscore + 3, cp + " CP", 6, 6, "tier-" + cp_tier)
    ];
}

/**
 * Get un-rounded (floored) version of float truncated to a level of precision
 */
function toFixedTrunc(num, fixed) {
    var re = new RegExp('^-?\\d+(?:\.\\d{0,' + (fixed || -1) + '})?');
    return num.toString().match(re)[0];
}

/**
 * Recalculates stats and movesets (for the stat calculator)
 */
function UpdateStats(pkm_obj, pokedex_mon) {
    const stats = GetPokemonStats(pkm_obj, pokedex_mon.level, pokedex_mon.ivs);
    const max_stats = GetPokemonStats(pkm_obj, pokedex_mon.level);
    const max_stats_50 = GetPokemonStats(pkm_obj, 50);

    DrawStats(GetPokedexBaseStatBars(stats), 
        ["#base-stat-atk", "#base-stat-def", "#base-stat-hp"]);
    DrawStats(GetPokedexStatBars(max_stats_50), 
        ["#max-stat-atk", "#max-stat-def", "#max-stat-hp", "#max-cp"]);
    DrawStats(GetPokedexStatBars(max_stats), 
        ["#hundo-stat-atk", "#hundo-stat-def", "#hundo-stat-hp", "#hundo-cp"]);
    DrawStats(GetPokedexStatBars(stats), 
        ["#eff-stat-atk", "#eff-stat-def", "#eff-stat-hp", "#eff-cp"]);
    $("#eff-iv-compare").html(
        FormatDecimal(100*(pokedex_mon.ivs.atk+pokedex_mon.ivs.def+pokedex_mon.ivs.hp)/45, 3, 2)
        + "% of Perfect IVs");
    $("#eff-stat-compare").html(
        FormatDecimal(100*(stats.atk*stats.def*stats.hp)/(max_stats.atk*max_stats.def*max_stats.hp), 3, 2)
        + "% of Perfect Stat Product");
    if (pokedex_mon.ivs.atk!=15||pokedex_mon.ivs.def!=15||pokedex_mon.ivs.hp!=15) {
        $("[data-vis-nonhundo]").css("display", "revert");
    }
    else {
        $("[data-vis-nonhundo]").css("display", "none");
    }
    
    LoadPokedexMoveTable(pkm_obj, stats, max_stats);
}

/**
 * Loads table in the Pokemon GO section sorting the pokemon types according to
 * their effectiveness against the selected pokemon. Note that types that are
 * neutral towards the selected pokemon aren't displayed.
 */
function LoadPokedexEffectiveness(pkm_obj) {
    const types = pkm_obj.types;
    const full_effectiveness = GetTypesEffectivenessAgainstTypes(types);

    let effectiveness_0244 = [];
    let effectiveness_0391 = [];
    let effectiveness_0625 = [];
    let effectiveness_160 = [];
    let effectiveness_256 = [];

    for (let attacker_type of POKEMON_TYPES) {
        let mult = GetEffectivenessMultOfType(full_effectiveness, attacker_type);

        if (Math.abs(mult - 0.244) < 0.001)
            effectiveness_0244.push(attacker_type);
        else if (Math.abs(mult - 0.391) < 0.001)
            effectiveness_0391.push(attacker_type);
        else if (Math.abs(mult - 0.625) < 0.001)
            effectiveness_0625.push(attacker_type);
        else if (Math.abs(mult - 1.60) < 0.001)
            effectiveness_160.push(attacker_type);
        else if (Math.abs(mult - 2.56) < 0.001)
            effectiveness_256.push(attacker_type);
    }

    //$("#effectiveness-title").html("Type effectiveness against <b>" + pkm_obj.name + "</b>");

    let effectiveness_0244_html = "";
    for (let type of effectiveness_0244) {
        effectiveness_0244_html += "<a class='type-text bg-" + type
                + "' href='/?strongest&t=" + type
                + "' onclick='return LoadStrongestAndUpdateURL(\"" + type
                + "\", false)'>" + type + "</a> ";
    }
    $("#effectiveness-0244").html(effectiveness_0244_html);
        

    let effectiveness_0391_html = "";
    for (let type of effectiveness_0391) {
        effectiveness_0391_html += "<a class='type-text bg-" + type
                + "' href='/?strongest&t=" + type
                + "' onclick='return LoadStrongestAndUpdateURL(\"" + type
                + "\", false)'>" + type + "</a> ";
    }
    $("#effectiveness-0391").html(effectiveness_0391_html);

    let effectiveness_0625_html = "";
    for (let type of effectiveness_0625) {
        effectiveness_0625_html += "<a class='type-text bg-" + type
                + "' href='/?strongest&t=" + type
                + "' onclick='return LoadStrongestAndUpdateURL(\"" + type
                + "\", false)'>" + type + "</a> ";
    }
    $("#effectiveness-0625").html(effectiveness_0625_html);

    let effectiveness_160_html = "";
    for (let type of effectiveness_160) {
        effectiveness_160_html += "<a class='type-text bg-" + type
                + "' href='/?strongest&t=" + type
                + "' onclick='return LoadStrongestAndUpdateURL(\"" + type
                + "\", false)'>" + type + "</a> ";
    }
    $("#effectiveness-160").html(effectiveness_160_html);

    let effectiveness_256_html = "";
    for (let type of effectiveness_256) {
        effectiveness_256_html += "<a class='type-text bg-" + type
                + "' href='/?strongest&t=" + type
                + "' onclick='return LoadStrongestAndUpdateURL(\"" + type
                + "\", false)'>" + type + "</a> ";
    }
    $("#effectiveness-256").html(effectiveness_256_html);
}


/**
 * Resets the pokemon go counters section for the current selected pokemon.
 */
function ResetPokedexCounters() {    
    // shows cell with loading image in the counters table
    $("#counters-grid").empty();
    let div = $("<div id='counters-loading'></div>");
    let img = $("<img class=loading src=imgs/loading.gif alt='Loading wheel'></img>");
    div.append(img);
    div.css("height", "125px");
    div.css("grid-column", "1 / 11")
    div.css("margin", "0 auto");
    $("#counters-grid").append(div);

    counters_loaded = false;
}


/**
 * Loads best counters of selected pokemon.
 * Searches asynchronously through all the pokemon in the game and calculates
 * the best counters taking into account their effectiveness against the selected
 * mon and their resistance to the average of the selected mon's movesets.
 */
function LoadPokedexCounters() {
    // Move filters for display
    MoveFilterPopup("#counters-filters");
    
    const moves = GetPokemonMoves(current_pkm_obj, "Type-Match");
    if (moves.length != 6)
        return;

    // array of counters pokemon and movesets found so far
    if (moves[0].length > 0 && moves[1].length > 0) { // has non-elite moves
        let search_params = GetSearchParms("Any", false);
        search_params.real_damage = true;
        
        if (moves[0].length * moves[1].length <= 40) { // Is not Mew
            let counters = GetStrongestVersus(GetEnemyParams(current_pkm_obj), search_params);
            ProcessAndSetCountersFromArray(counters);
            counters_loaded = true;
        }
        else {
            $("#counters-loading").empty();
            let load_button = $("<input type='button' value='Click to Load' />");
            load_button.click(function (e) {
                let counters = GetStrongestVersus(GetEnemyParams(current_pkm_obj), search_params);
                ProcessAndSetCountersFromArray(counters);
                counters_loaded = true;
            });
            $("#counters-loading").append(load_button);
        }
        
        $("#counters").css("display", "revert");
    }
    else { // Smeargle, invalid bosses
        $("#counters-loading").empty();
        $("#counters").css("display", "none");
    }
}


/**
 * Processes the counters in the 'counters' array and sets them in the page.
 * Maximum 'max_counters' unique pokemon are displayed.
 * Maximum 'max_per_counter' movesets are displayed for each pokemon, but
 * movesets past the 'extra_moveset_cutoff' (ratio to top counter) are hidden.
 * 
 * The array contains the counters sorted in ascending order.
 */
function ProcessAndSetCountersFromArray(counters, 
    max_counters = 10, max_per_counter = 3, extra_moveset_cutoff = 0.7) {

    // reverses counters arrays to be in descending order
    counters.reverse();

    // simplifies counters arrays into maps where each pokemon species is a key
    let counters_s = new Map();
    for (let counter of counters) {
        const pok_uniq_id = GetUniqueIdentifier(counter, false, false);

        if (!counters_s.has(pok_uniq_id))
            counters_s.set(pok_uniq_id, [])
        counters_s.get(pok_uniq_id).push(counter);
    }

    // converts simplified maps into one array containing arrays of counters
    // for each pokemon species
    const all_counters = Array.from(counters_s.values()).slice(0, max_counters);

    // gets strongest rat
    const top_compare = GetComparisonMon(counters);

    // sets counters in the page

    $("#counters-grid").empty();

    for (let i = 0; i < all_counters.length; i++) { // for each counter...

        let counter_0 = all_counters[i][0];

        // sets counter's rating percentage span
        const table_ratings = $("<table></table>");
        for (let j = 0; j < all_counters[i].length && j < max_per_counter; j++) {
            let counter = all_counters[i][j];

            let rat_pct = 100 * counter.rat / top_compare;

            if (j > 0 && rat_pct < extra_moveset_cutoff * 100)
                continue;

            const rat_pct_td = $("<td></td>");
            rat_pct_td.append("<b>" + rat_pct.toFixed(0) + "</b><span style='font-size: 0.9em'>%</span>");

            const rat_info_td = $("<td class=counters-rat-info></td>");
            rat_info_td.html(((counter.mega)?"&nbsp;(M)":"")
                + ((counter.shadow)?"&nbsp;(Sh)":""));
            if (rat_info_td.html() == "") rat_info_td.css("width", "25%");
            
            const rat_tr = $("<tr class=counters-rat-row></tr>");
            rat_tr.append(rat_pct_td);
            rat_tr.append(rat_info_td);

            if (Math.abs(rat_pct - 100) < 0.000001) {
                rat_tr.addClass("contrast");
            }

            if (HasTouchScreen()) {
                rat_tr.click(function() {
                    ShowCountersPopup(this, true, counter);
                });
            } else {
                rat_tr.mouseenter(function() {
                    ShowCountersPopup(this, true, counter);
                });
                rat_tr.mouseleave(function() {
                    ShowCountersPopup(this, false);
                });
                rat_tr.click(function() {
                    LoadPokedexAndUpdateURL(GetPokeDexMon(counter.id, counter.form));
                    window.scrollTo(0, 0);
                });
            }
            table_ratings.append(rat_tr);
        }

        // sets counter's image
        let img = $("<img onload='HideLoading(this)' onerror='TryNextSrc(this)'></img>");
        let img_src_name = GetPokemonImgSrcName(counter_0.id, counter_0.form);
        let img_src = JB_URL + GIFS_PATH + img_src_name + ".gif";
        img.attr("src", img_src);

        let form_name = GetFormText(counter_0.id, counter_0.form);
        img.attr("alt", counter_0.name + (form_name.length > 0 ? " " + form_name : ""));
        const div = $("<div></div>");

        const div_align_baseline = $("<div class='align-base'></div>");
        div_align_baseline.append("<div class='fill-space'></div>");
        const div_img_wrapper = $("<div></div");
        div_img_wrapper.append($("<img class=loading src=imgs/loading.gif alt='Loading wheel'></img>"));
        div_img_wrapper.append(img);
        div_align_baseline.append(div_img_wrapper);

        const div_align_ratings = $("<div class='counter-ratings'></div>");
        div_align_ratings.append(table_ratings);

        // sets table cell and appends it to the row
        div.append(div_align_ratings);
        div.append(div_align_baseline);
        $("#counters-grid").append(div);
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
        if (HasTouchScreen()) {
            $(".counters-rat-row").removeClass("rat-selected");
            $(hover_element).addClass("rat-selected");
        }

        // sets the popup's position

        let pos = $(hover_element).offset();
        let w = $(hover_element).width();
        let h = $(hover_element).height();
        let x = pos.left + 0.5 * w;
        let y = pos.top + h;

        $("#counters-popup").css("left", x);
        $("#counters-popup").css("top", y);

        // sets the popup's content

        const form_text = GetFormText(counter.id, counter.form);

        const name = "<p class='counter-name'>"
            + ((counter.shadow) ? "<span class=shadow-text>Shadow</span> " : "")
            + counter.name
            + ((form_text.length > 0)
                ? " <span class=small-text>(" + form_text + ")</span>" : "")
            + "</p>"

        $("#counters-popup").html(name
            + "<p class='counter-metric'>" + settings_metric + " " + counter.rat.toFixed(2) + "</p>"
            + "<p class='counter-types'><span class='type-text bg-"
                + ((counter.fm == "Hidden Power") ? "any-type" : counter.fm_type) + "'>"
                + counter.fm + ((counter.fm_is_elite) ? "*" : "")
            + "</span> "
            + "<span class='type-text bg-" + counter.cm_type + "'>"
                + counter.cm + ((counter.cm_is_elite) ? "*" : "") 
            + "</span></p>");

        // sets popup's click callback for touch devices
        if (HasTouchScreen()) {
            $("#counters-popup").unbind("click");
            $("#counters-popup").click( function() {
                $("#counters-popup").css("display", "none");
                LoadPokedexAndUpdateURL(GetPokeDexMon(counter.id, counter.form));
                window.scrollTo(0, 0);
            });
        }

        // shows the popup
        $("#counters-popup").css("display", "inline");

    } else {
        $(".counters-rat-row").removeClass("rat-selected");
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
function LoadPokedexMoveTable(pkm_obj, stats, max_stats = null) {

    // sets movesets title
    //$("#movesets-title").html("<b>" + pkm_obj.name + "'s movesets</b>");

    // whether can be shadow
    const can_be_shadow = pkm_obj.shadow;

    // types
    const types = pkm_obj.types;

    const atk = stats.atk;
    const def = stats.def;
    const hp = Math.floor(stats.hp);
    if (max_stats && max_stats.hp) max_stats.hp = Math.floor(max_stats.hp);

    // cache attack tiers
    const attackTiers = {};

    // shadow stats
    const atk_sh = atk * Math.fround(1.2); // 6/5, from GM
    const def_sh = def * Math.fround(0.8333333); // 5/6, from GM

    // removes previous table rows
    $("#pokedex-move-table tbody tr").remove();

    const moves = GetPokemonMoves(pkm_obj, "Type-Match");
    if (moves.length != 6)
        return;

    const fms = moves[0];
    const cms = moves[1];
    const elite_fms = moves[2];
    const elite_cms = moves[3];
    const pure_only_cms = moves[4];
    const shadow_only_cms = moves[5];

    const all_fms = fms.concat(elite_fms);
    let all_cms = cms.concat(elite_cms).concat(pure_only_cms)
    if (can_be_shadow) all_cms = all_cms.concat(shadow_only_cms);

    // variables used to calculate average rating percentages against max stats
    let rat_pcts_vs_max = 0;
    let rat_sh_pcts_vs_max = 0;
    let num_movesets = 0;

    let fm_mult = 1, cm_mult = 1, enemy_def = 180, y = estimated_y_numerator;
    let enemy_params = {};

    if (settings_type_affinity) {
        enemy_params = GetTypeAffinity("Any");
        enemy_def = enemy_params.stats.def;
        
        const effectiveness = GetTypesEffectivenessAgainstTypes(types);
        y = AvgYAgainst(enemy_params.enemy_ys[0], effectiveness);
    }

    /**
     * Lookup the tier ranking for this mon for the given type (only once each)
     */
    function GetPokemonTypeTier(type) {
        if (!!attackTiers[type]) {
            return;
        }
        
        attackTiers[type] = GetTypeTier(type, pkm_obj);
    }

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
        GetPokemonTypeTier(fm_type);
        if (fm_obj.name == "Hidden Power") {
            for (let t of POKEMON_TYPES) {
                if (!["Normal", "Fairy"].includes(t)) {
                    GetPokemonTypeTier(t);
                }
            }
        }
        if (settings_type_affinity) fm_mult = GetEffectivenessMultOfType(enemy_params.weakness, fm_obj.type);

        for (let cm of all_cms) {

            const cm_is_elite = elite_cms.includes(cm);

            // gets the charged move object
            const cm_obj = jb_cm.find(entry => entry.name == cm);
            if (!cm_obj)
                continue;

            const cm_type = cm_obj.type;
            GetPokemonTypeTier(cm_type);

            if (settings_type_affinity) cm_mult = GetEffectivenessMultOfType(enemy_params.weakness, cm_obj.type);

            // calculates the data

            const dps = GetDPS(types, atk, def, hp, fm_obj, cm_obj,
                    fm_mult, cm_mult, enemy_def, y);
            const dps_sh = GetDPS(types, atk_sh, def_sh, hp, fm_obj, cm_obj,
                    fm_mult, cm_mult, enemy_def, y);
            const tdo = GetTDO(dps, hp, def, y);
            const tdo_sh = GetTDO(dps_sh, hp, def_sh, y);
            const rat = GetMetric(dps, tdo, pkm_obj, enemy_params);
            const rat_sh = GetMetric(dps_sh, tdo_sh, pkm_obj, enemy_params);

            // calculates average rating percentages against max stats
            if (max_stats) {
                const max_dps = GetDPS(types, max_stats.atk, max_stats.def, max_stats.hp, fm_obj, cm_obj,
                     fm_mult, cm_mult, enemy_def, y);
                const max_tdo = GetTDO(max_dps, max_stats.hp, max_stats.def, y);
                const max_rat = GetMetric(max_dps, max_tdo, pkm_obj, enemy_params);

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
                + "' onclick=\"OpenMoveEditor('" + fm + "')\">"
                + fm + ((fm_is_elite) ? "*" : "")
                + "</span></td>");
            const td_cm = $("<td><span class='type-text bg-" + cm_type
                + "' onclick=\"OpenMoveEditor('" + cm + "')\">"
                + cm + ((cm_is_elite) ? "*" : "")
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

            if (shadow_only_cms.includes(cm)) {
                td_dps.text("-");
                td_tdo.text("-");
                td_rat.text("-");
            }
            else if (pure_only_cms.includes(cm)) {
                td_dps_sh.text("-");
                td_tdo_sh.text("-");
                td_rat_sh.text("-");
            }

            tr.append(td_fm);
            tr.append(td_cm);
            tr.append(td_dps);
            tr.append(td_dps_sh);
            tr.append(td_tdo);
            tr.append(td_tdo_sh);
            tr.append(td_rat);
            tr.append(td_rat_sh);

            $("#pokedex-move-table tbody").append(tr);
        }
        // if necessary, calculates average rating percentage of specific stats
        // against max stats of all movesets and displays it on the CP section
        if (max_stats) {
            let avg_rat_pct_vs_max = 100 * rat_pcts_vs_max / num_movesets;
            let pct_str = FormatDecimal(avg_rat_pct_vs_max, 3, 2) + "%";
            if (isNaN(avg_rat_pct_vs_max))
                pct_str = "??";
            $("#rat-pct-vs-max").html(pct_str + " of Perfect " + settings_metric);
        }

        // if can be shadow, calculates average rating percentage of shadow stats
        // against max stats of all movesets and displays it on the CP section
        if (can_be_shadow) {
            let avg_rat_sh_pct_vs_max = 100 * rat_sh_pcts_vs_max / num_movesets;
            let pct_str = FormatDecimal(avg_rat_sh_pct_vs_max, 3, 2) + "%";
            if (isNaN(avg_rat_sh_pct_vs_max))
                pct_str = "??";
            $("#sh-rat-pct-vs-max").css("display", "");
            $("#sh-rat-pct-vs-max").html(pct_str + " of Perfect " + settings_metric + " when Shadow");
        }
        else {
            $("#sh-rat-pct-vs-max").css("display", "none");
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
        SortPokedexTable(6, 7);
        BuildTypeTiers(attackTiers);
        loading_pogo_moves = false;
    });
}

/**
 * Builds the tier ranking elements based on the lookups
 */
function BuildTypeTiers(attackTiers) {
    const types = Object.entries(attackTiers)
        .filter(e=>e[1].pure!="F"||(e[1].shadow&&e[1].shadow!="F"))
        .map(e=>e[0])
        .sort((a, b) => 
            TierToInt(attackTiers[b].pure)-TierToInt(attackTiers[a].pure) ||
            TierToInt(attackTiers[b].shadow)-TierToInt(attackTiers[a].shadow)
        )

    if (types.length > 0) {
        $("#attack-tiers").css("display", "");
        $("#attack-tier-results .dex-layout-content").empty();
        $("#attack-tier-results-shadow .dex-layout-content").empty();
        $("#attack-tier-shadow-header").css("display", "none");
        $("#attack-tier-results-shadow").css("display", "none");
        $("#attack-tier-results").css("flex-basis", "100%");
        $("#attack-tier-results").addClass("rounded-bottom");

        for (let type of types) {
            const attackTier = attackTiers[type];

            if (attackTier.pure != "F")
                $("#dex-tier-"+(attackTier.pure == "MRay" ? "S" : attackTier.pure[0])).append(BuildTypeTierLabel(type));
            if (attackTier.shadow && attackTier.shadow != "F") {
                $("#dex-tier-"+(attackTier.shadow == "MRay" ? "S" : attackTier.shadow[0])+"-shadow").append(BuildTypeTierLabel(type));
                $("#attack-tier-shadow-header").css("display", "");
                $("#attack-tier-results-shadow").css("display", "");
                $("#attack-tier-results").css("flex-basis", "50%");
                $("#attack-tier-results").removeClass("rounded-bottom");
            }
        }
    }
    else {
        $("#attack-tiers").css("display", "none");
    }
}

/**
 * Builds the tier icon for a type-tier
 */
function BuildTypeTierLabel(type) {
    return $(`<a class='type-text bg-${type}' 
        href='/?strongest&t=${type}'
        onclick='return LoadStrongestAndUpdateURL("${type}", false)'>${type}</a>`);
}

/**
 * Sorts the pokemon go moves combinations table rows according to the
 * values from a specific column.
 */
function SortPokedexTable(column_i, sec_column_j) {
    let table = $("#pokedex-move-table")[0];

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
    rows_array = MergeSortPokedexTable(rows_array, column_i, sec_column_j);
    for (let i = 0; i < rows_array.length; i++) {
        if (i % 2) 
            rows_array[i].className = "even";
        else 
            rows_array[i].className = "odd";
        table.tBodies[0].append(rows_array[i]);
    }
}

/**
 * Applies the merge sort algorithm to the pokemon go table rows.
 * Sorts according to the values from a specific column.
 */
function MergeSortPokedexTable(rows, column_i, sec_column_j) {

    if (rows.length <= 1)
        return rows;

    const n = (rows.length / 2);
    let a = MergeSortPokedexTable(rows.slice(0, n), column_i, sec_column_j);
    let b = MergeSortPokedexTable(rows.slice(n), column_i, sec_column_j);

    return MergeRows(a, b, column_i, sec_column_j);
}

/**
 * Part of the merge sort algorithm for the pokemon go table rows.
 * Sorts and merges two arrays of rows according to the values
 * from a specific column. Returns the single resulting array.
 */
function MergeRows(a, b, column_i, sec_column_j) {

    function GetRowValue(row) {
        const col_i_val = parseFloat(
                row.getElementsByTagName("TD")[column_i]
                .innerHTML.toLowerCase());
        if (!isNaN(col_i_val)) return col_i_val;
        
        return parseFloat(
            row.getElementsByTagName("TD")[sec_column_j]
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
 * Parse all parts of the URL related to a Pokedex page entry
 * Returns object representing the pokemon to be loaded
 */
function ParsePokedexURL(params) {
    const pkm = params.get("p");

    let form = "def";
    if (params.has("f"))
        form = params.get("f");
    if (params.has("m"))
        form = "Mega";
    if (params.has("y"))
        form = "MegaY";
    if (params.has("z"))
        form = "MegaZ";

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
    return GetPokeDexMon(GetPokemonId(pkm), form, level, ivs);
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
        if (params.has("m"))
            form = "Mega";
        if (params.has("y"))
            form = "MegaY";

        let level = Number($("#input-lvl").val());

        let ivs = {};
        ivs.atk = parseInt($("#input-atk").val());
        ivs.def = parseInt($("#input-def").val());
        ivs.hp = parseInt($("#input-hp").val());

        const pokedex_mon = GetPokeDexMon(GetPokemonId(pkm), form, level, ivs);
        const pkm_obj = jb_pkm.find(entry =>
                entry.id == pokedex_mon.pokemon_id && entry.form == pokedex_mon.form);
        UpdateStats(pkm_obj, pokedex_mon);
        UpdatePokedexURL(pokedex_mon);
    }
}

/**
 * Bind event handlers for a Pokedex page
 */
function BindPokeDex() {
    // Custom IVs
    $("#stats-form").submit(function(e) {
        UpdatePokemonStatsAndURL();
        return false;
    });
    $("#stats-reset").click(function(e) {
        $("#input-lvl").val(settings_default_level[0]);
        $("#input-atk").val(15);
        $("#input-def").val(15);
        $("#input-hp").val(15);
        UpdatePokemonStatsAndURL();
        return false;
    });

    // Options for Counters
    $("#counters :checkbox").change(function() {
        if (current_pkm_obj) {
            ResetPokedexCounters();
            LoadPokedexCounters();
        }
    });

    // Moveset Editor
    $("#moveset-edit-icon").click(function() {
        $("#overlay").addClass("active");

        UpdateMovesetEditor();
        $("#moveset-edit").get(0).show();
    });
    $("#move-reset").click(function() {
        delete current_pkm_obj.fm_add;
        delete current_pkm_obj.cm_add;
        delete current_pkm_obj.fm_rem;
        delete current_pkm_obj.cm_rem;
        UpdateMovesetEditor();
    });
    $("#moveset-edit").on("close", function(e) {
        if (e.target === e.currentTarget) {// only apply to this, not children
            ClearTypeTiers();
            ClearMoveUserMap();
            UpdatePokemonStatsAndURL();
            ResetPokedexCounters();
            LoadPokedexCounters();
            
            $("#overlay").removeClass("active");
        }
    });
}

/**
 * Updates the dialog to reflect the current state of a Pokemon's learnsets
 */
function UpdateMovesetEditor() {
    $("#fm-select").empty();
    $("#cm-select").empty();
    
    $("#fm-search-box").val("");
    $("#cm-search-box").val("");

    function GetEditableMove(move_name, move_type, is_elite) {
        const move_obj = (move_type == "fm" ? jb_fm : jb_cm).find(e=>e.name==move_name);
        if (!move_obj) return;

        const li = $("<li class='move-select-move'><span class='type-text bg-"+(move_obj.name=="Hidden Power" ? "any-type" : move_obj.type)+"'>"
            +move_name+(is_elite ? "*" : "")+"</span></li>");
        const img = $("<img class='absolute-right delete-icon' src='imgs/delete.svg' alt='Delete Button' />");
        img.click(function(e) {
            // default move; add to _rem
            if (current_pkm_obj[move_type].includes(move_name)) {
                if (!Array.isArray(current_pkm_obj[move_type + "_rem"]))
                    current_pkm_obj[move_type + "_rem"] = [];
                current_pkm_obj[move_type + "_rem"].push(move_name);
            }
            // custom move; remove from _add
            else if (Array.isArray(current_pkm_obj[move_type + "_add"])) {
                const ndx = current_pkm_obj[move_type + "_add"].indexOf(move_name);
                if (ndx > -1) {
                    current_pkm_obj[move_type + "_add"].splice(ndx, 1);
                }
            }

            UpdateMovesetEditor();
        });
        li.append(img);
        return li;
    }

    const moves = GetPokemonMoves(current_pkm_obj, "None");

    for (const fm of moves[0]) {
        $("#fm-select").append(GetEditableMove(fm, "fm", false));
    }
    for (const cm of moves[1]) {
        $("#cm-select").append(GetEditableMove(cm, "cm", false));
    }
    for (const fm of moves[2]) {
        $("#fm-select").append(GetEditableMove(fm, "fm", true));
    }
    for (const cm of moves[3]) {
        $("#cm-select").append(GetEditableMove(cm, "cm", true));
    }

    LoadMoveInputs();
}

/**
 * Add a move to a Pokemon and refresh dialog
 */
function AddPokemonMove(pkm_obj, move_name, moveType) {
    if (move_name == "")
        return;

    if (moveType == "fm" || (moveType == "any" && jb_fm.map(e => e.name).includes(move_name))) {
        if (!pkm_obj.fm_add) 
            pkm_obj.fm_add = [];
        pkm_obj.fm_add.push(move_name);
        UpdateMovesetEditor();
    }
    else if (moveType == "cm" || (moveType == "any" && jb_cm.map(e => e.name).includes(move_name))) {
        if (!pkm_obj.cm_add) 
            pkm_obj.cm_add = [];
        pkm_obj.cm_add.push(move_name);
        UpdateMovesetEditor();
    }
}

/**
 * Calculate and store the distribution params for each stat
 */
function GetStatDistributions() {
    if (!!atk_dist && !!def_dist && !!hp_dist && !!cp_dist)
        return;

    atk_dist = CalcDistribution((jb_pkm.map(e=>e.stats.baseAttack)));
    def_dist = CalcDistribution((jb_pkm.map(e=>e.stats.baseDefense)));
    hp_dist = CalcDistribution((jb_pkm.map(e=>e.stats.baseStamina)));
    cp_dist = CalcDistribution((jb_pkm.map(e=>GetPokemonCP(GetPokemonStats(e, 50)))));
}