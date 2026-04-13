let str_pokemons = [], type_tiers, tier_stops;

let ROW_HEIGHT = 30; // fixed height in CSS
const MIN_ROW_BUFFER_SIZE = 10;
let curIndices = {
    row: [0, 0]
};

let display_numbered = true, show_pct = true, highlight_suboptimal = true;

/**
 * Bind event handlers for a rankings table
 */
function BindRankings() {
    // Moveset count
    $("#chk-suboptimal").change(function() {
        const isChecked = $('#chk-suboptimal').is(":checked");
        $("#chk-grouped").prop("disabled", !isChecked);
        ShowHideSearchStringIcon(!isChecked);
    });

    // Enemy type
    $("#chk-versus").change(function() {
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.has('t') ? urlParams.get('t') : "Any";
        LoadStrongestAndUpdateURL(type, $(this).prop("checked"));
    });

    // Refresh list when any options change
    $("#strongest").on("change", "#filter-settings :checkbox", function() {
        if ($("#strongest").is(":visible")) {
            CheckURLAndAct();
        }
        else if ($("#counters").is(":visible")) {
            ResetPokedexCounters();
            LoadPokedexCounters();
        }
    });

    // Update types based on selector
    $("#strongest-links-types").on("type-change", function (event) {
        LoadStrongestAndUpdateURL(event.detail.type);
    });

    document.getElementById("strongest-links-types").setHrefs((type) => `/?strongest&t=${type}`);

    SetupScroll();
}

/**
 *  Enable/Disable Search String dialog button based on current settings
 */ 
function ShowHideSearchStringIcon(visible) {
    $('#search-string-icon').css('display', (visible ? '' : 'none'));
}

/**
 * Loads the list of the strongest pokemon of a specific type in pokemon go.
 * The type can be 'each', 'any' or an actual type.
 */
async function LoadStrongest(type = "Any", versus) {
    // displays what should be displayed 
    await LoadPage("strongest");

    // Move filters for display
    MoveFilterPopup("#strongest-filters");

    // Only enable suboptimal filters if we're searching a specific type (not "Each")
    if (type == null || type == "Each")
        $("#chk-suboptimal").prop("disabled", true);
    else 
        $("#chk-suboptimal").prop("disabled", false);

    // Handle logic for "versus"
    const versus_chk = $("#strongest input[value='versus']:checkbox");
    versus_chk.prop("checked", versus);
    if (type == "Any" || type == "Each") { // disabled if not a specific type
        versus_chk.prop("checked", false);
        versus_chk.prop("disabled", true);
    }
    else {
        versus_chk.prop("disabled", false);
    }

    // sets titles
    let titleKey = "meta.rankings.title";
    if (type == "Each") titleKey = "meta.rankings.title-each";
    else if (versus) titleKey = "meta.rankings.title-versus";

    document.title = FormatTranslation(titleKey, {
        type: GetTranslation("pokedata.types." + type, type)
    });

    if (type == "Any") {
        $("#strongest-type-title").attr("data-i18n", "strongest.any.type-text");
        $("#strongest-type-helper").attr("data-i18n", "strongest.any.helper-text");
        $("#strongest-title").attr("data-i18n-reorder", "strongest.any.»order");
    }
    else if (type == "Each") {
        $("#strongest-type-title").attr("data-i18n", "strongest.each.type-text");
        $("#strongest-type-helper").attr("data-i18n", "strongest.each.helper-text");
        $("#strongest-title").attr("data-i18n-reorder", "strongest.each.»order");
    }
    else {
        $("#strongest-type-title").attr("data-i18n", "pokedata.types."+type);
        $("#strongest-type-helper").attr("data-i18n", "strongest.types.helper-text");
        $("#strongest-title").attr("data-i18n-reorder", "strongest.types.»order");
    }

    TranslateElement("#strongest");

    // sets description
    $('meta[name=description]').attr('content', 
        FormatTranslation("meta.rankings.description", {
            type: (type == "Any" || type == "Each" ? "" : GetTranslation("pokedata.types." + type, type)),
            versus: (versus ? FormatTranslation("meta.rankings.title-versus", {type: GetTranslation("pokedata.types." + type, type)}) : "")
        }));

    // removes previous table rows
    $("#strongest-table tbody tr").remove();

    const search_params = GetSearchParms(type, versus);
    search_params.real_damage = false;

    if (type == "Each") {
        str_pokemons = await GetStrongestOfEachType(search_params);
        tier_stops = [];
        let i=0;
        for (const t of POKEMON_TYPES) {
            tier_stops.push({
                tier: t,
                type: t,
                start: i,
                stop: i+1
            });
            i++;
        }

        display_numbered = false;
        show_pct = false;
        highlight_suboptimal = false;
    } else {
        str_pokemons = await GetStrongestOfOneType(search_params);

        display_numbered = true;
        show_pct = true;
        highlight_suboptimal = true;

        ProcessAndGroup(str_pokemons, type);

        if (IsDefaultSearchParams(search_params))
            SetTypeTier(type, str_pokemons);

        RecalcViewport(null,0);
    }

    // Display relevant footnotes
    //$("#footnote-elite").css('display', search_params.elite ? 'block' : 'none');
    $("#footnote-typed-ranking").css('display', type != "Any" && !settings_type_affinity ? 'block' : 'none');
    $("#footnote-affinity-ranking").css('display', type != "Each" && settings_type_affinity ? 'block' : 'none');
    $("#footnote-versus").css('display', search_params.versus ? 'block' : 'none');

    // Update Icon
    ShowHideSearchStringIcon(type != "Each");

    // Prevent Link
    return false;
}


/**
 * Calls the 'LoadStrongest' function and updates the url accordingly.
 */
function LoadStrongestAndUpdateURL(type = "Any", versus = null) {
    if (versus !== null)
        versus = !!versus;

    let url = "?strongest&t=" + type;
    if ($("#chk-versus").prop("checked") && type != "Any" && type != "Each") 
        url += '&v';

    UpdateURL(url);
    
    LoadStrongest(type, versus);
}

/**
 * Find the "baseline" mon to compare against for tier-making
 */
function GetComparisonMon(str_pokemons, type = null) {
    if (!Array.isArray(str_pokemons) || str_pokemons.length == 0) return 0;

    let top_compare;
    const best_mon = str_pokemons[0].rat;
    
    switch (settings_compare) {
        case "top":
            top_compare = best_mon;
            break;
        case "budget":
            try {
                top_compare = str_pokemons.find(e => e.class == undefined && 
                                                    !e.shadow && 
                                                    e.form != "Mega" && e.form != "MegaY" && e.form != "MegaZ" &&
                                                    (e.fm_type == type || e.cm_type == type || 
                                                    type == "Any" || type == "Each" || !type)
                                                ).rat;
            } catch (err) {
                top_compare = str_pokemons[str_pokemons.length-1].rat; // budget must be even lower
            }
            break;
        case "ESpace":
            try {
                top_compare = str_pokemons.find(e => !(e.class !== undefined && e.shadow) && 
                                                    e.form != "Mega" && e.form != "MegaY" && e.form != "MegaZ" &&
                                                    !(e.name == 'Rayquaza' && e.cm == 'Dragon Ascent') &&
                                                    !(e.name == 'Necrozma' && e.form != 'Normal') &&
                                                    !(e.name == 'Kyurem' && e.form != 'Normal') &&
                                                    !(e.name == 'Zacian' && e.form == 'Crowned_sword') &&
                                                    !(e.name == 'Zamazenta' && e.form == 'Crowned_shield') &&
                                                    e.name != "Mew" && e.name != "Celebi" && e.name != "Jirachi" &&
                                                    e.name != "Victini" && e.name != "Keldeo" && e.name != "Meloetta" &&
                                                    e.name != "Shaymin" && e.name != "Diancie" && e.name != "Zarude" &&
                                                    e.name != "Marshadow" &&
                                                    ((e.fm_type == type && e.cm_type == type) || 
                                                    (type == "Normal" && (e.fm_type == "Normal" || (e.cm_type == "Normal" && e.cm != "Return"))) ||
                                                    type == "Any" || type == "Each" || !type)
                                                ).rat;
            } catch (err) {
                top_compare = str_pokemons[str_pokemons.length-1].rat; // budget must be even lower
            }
            break;
    }

    return top_compare;
}

/**
 * Group pokemon if needed, with ratings relative to best moveset.
 * Else build tiers and calculate ratings relative to a baseline.
 */
function ProcessAndGroup(str_pokemons, type) {
    if (!Array.isArray(str_pokemons) || str_pokemons.length == 0) return;

    const display_grouped = $("#chk-grouped").is(":checked") && $("#chk-suboptimal").is(":checked");
        
    const top_compare = GetComparisonMon(str_pokemons, 
        $("#chk-versus").is(":checked") ? null : type);

    // re-order array based on the optimal movesets of each pokemon
    if (display_grouped) {
        let str_pokemons_optimal = new Map(); // map of top movesets per mon
        let rat_order = 0;
        tier_stops = [];

        for (let str_pok of str_pokemons) {
            const pok_uniq_id = GetUniqueIdentifier(str_pok);
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
        best_mon = str_pokemons[0].rat;

        for (let str_pok of str_pokemons) {
            str_pok.pct = 100.0 * str_pok.rat / top_compare;
            str_pok.pct_display = str_pok.pct * (top_compare / best_mon);
        }
        BuildTiers(str_pokemons, top_compare, type);
    }
}


/**
 * Modifies str_pokemons to include a "tier" attribute
 * Can rely on each entry in str_pokemons having "rat" attribute (current metric rating)
 *    and "pct" attribute (rating vs comparison mon aka [this.rat/top_compare])
 * 
 * Tier-making methods can optionally use the top_compare parameter as a benchmark
 */
function BuildTiers(str_pokemons, top_compare, type) {
    const best_mon = str_pokemons[0].rat;

    tier_stops = [];
    let last_stop = -1, cur_tier = "";

    // Compare to benchmark, building tiers based on ratio (str_pok.pct)
    if (settings_tiermethod == "broad" || settings_tiermethod == "ESpace") {
        let S_breakpoint = 100.0;
        let S_tier_size = 20.0;
        let letter_tier_size = 10.0;
        if (settings_tiermethod == "ESpace") { // slightly tweak tier sizes and breakpoints
            S_breakpoint = 105.0;
            S_tier_size = 10.0;
            letter_tier_size = 10.0;
        }

        for (let [i, str_pok] of str_pokemons.entries()) {
            if (str_pok.pct >= S_breakpoint + 0.00001) { //S+
                const num_S = Math.floor((str_pok.pct - S_breakpoint + 0.00001)/S_tier_size)+1;
                if (num_S > 3 && str_pok.name == "Mega Rayquaza") 
                    str_pok.tier = "MRay";
                else if (num_S >= 3)
                    str_pok.tier = "SSS";
                else 
                    str_pok.tier = "S".repeat(num_S);
            }
            else {
                let tier_cnt = Math.floor((S_breakpoint + 0.00001 - str_pok.pct)/letter_tier_size);
                //if (settings_tiermethod == "ESpace" && tier_cnt >=1) // Shift to an "A" breakpoint of 85.0
                //    tier_cnt--;
                if (tier_cnt >= 4) // Everything past D -> F
                    tier_cnt = 5;
                str_pok.tier = String.fromCharCode("A".charCodeAt(0) + tier_cnt);
            }

            if (str_pok.tier != cur_tier) {
                if (cur_tier.length)
                    tier_stops.push({
                        tier: cur_tier,
                        start: last_stop,
                        stop: i
                    });
                cur_tier = str_pok.tier;
                last_stop = i;
            }
        }
    }
    // Compare to benchmark, generally trying to set the benchmark into "A" tier within reason
    // Using Jenks Natural Breaks to compute reasonable tier breaks
    // (Minimize internal tier variance, while maximizing variance between tiers)
    else if (settings_tiermethod == "jenks") {
        let n = str_pokemons.findIndex(e => e.rat <= top_compare * 0.5) - 1; // consider everything up to 50% of comparison mon
        if (n<0)
            n = str_pokemons.length;
        if (n>250) // Cap at top 250
            n = 250;

        let tier_breaks = jenks_wrapper(str_pokemons.map(e => e.rat).slice(0, n), 5); // truncate to only those above breakpoint
        let compare_tier = tier_breaks.findIndex(e => e < top_compare);

        let extra_tiers = Math.max(compare_tier, Math.floor((best_mon - top_compare)/top_compare/0.1));
        if (str_pokemons[0].name == "Mega Rayquaza")
            extra_tiers++;
        if (extra_tiers >= 2) { // need more tiers
            if (compare_tier != -1)
                n = str_pokemons.findIndex(e => e.rat <= tier_breaks[Math.min(compare_tier+2,4)]);
            if (str_pokemons[n].rat > top_compare * 0.75) // force at least consider up to 75% of comparison mon
                n = str_pokemons.findIndex(e => e.rat <= top_compare * 0.75);
            if (n<0)
                n = str_pokemons.length;
            tier_breaks = jenks_wrapper(str_pokemons.map(e => e.rat).slice(0, n), 5 + extra_tiers); // truncate to only those above breakpoint
            compare_tier = tier_breaks.findIndex(e => e < top_compare);
        }

        let this_tier_idx = 0;
        let this_tier = (compare_tier >= 2 ? 1 - compare_tier : 0); // if necessary, shift tiers down to make "top_compare" mon A-tier
        for (let [i, str_pok] of str_pokemons.entries()) {
            if (str_pok.rat <= tier_breaks[this_tier_idx]) {
                this_tier_idx++;
                this_tier++;
            }
            
            if (this_tier <= 0) {
                if (this_tier_idx == 0 && str_pokemons[0].name == "Mega Rayquaza" && 
                        str_pok.name == "Mega Rayquaza") {
                    str_pok.tier = "MRay";
                }
                else {
                    let num_s = 1 - this_tier;
                    if (str_pok.rat > 1.15 * tier_breaks[this_tier_idx])
                        num_s += Math.floor((str_pok.rat - tier_breaks[this_tier_idx])/tier_breaks[this_tier_idx]/0.15);
                    if (num_s > 5)
                        num_s = 5;
                    str_pok.tier = "S".repeat(num_s);
                }
            }
            else {
                str_pok.tier = String.fromCharCode("A".charCodeAt(0) + this_tier + (this_tier >= 5 ? 5-this_tier : -1));
            }

            if (str_pok.tier != cur_tier) {
                if (cur_tier.length)
                    tier_stops.push({
                        tier: cur_tier,
                        start: last_stop,
                        stop: i
                    });
                cur_tier = str_pok.tier;
                last_stop = i;
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
        for (let [i, str_pok] of str_pokemons.entries()) {
            let check_rat = str_pok.rat;
            if (type != 'Any') check_rat /= 1.6;

            /* Disable rescale
            const rescale = $("#filter-settings input[value='rescale']:checkbox").is(":checked");
            if ((!rescale || (settings_metric == 'DPS' || settings_metric == 'TDO')) 
                && (search_params.versus || (search_params.type != 'Any' && search_params.mixed))) {
                check_rat /= 1.6;
            }*/

            switch (settings_metric) {
                case 'DPS':
                    if (check_rat >= 21.0) str_pok.tier = 'SSS';
                    else if (check_rat >= 19.0) str_pok.tier = 'SS';
                    else if (check_rat >= 18.0) str_pok.tier = 'S';
                    else if (check_rat >= 17.5) str_pok.tier = 'A';
                    else if (check_rat >= 16.5) str_pok.tier = 'B';
                    else if (check_rat >= 15.5) str_pok.tier = 'C';
                    else if (check_rat >= 15.0) str_pok.tier = 'D';
                    else str_pok.tier = 'F';
                    break;
                case 'TDO':
                    if (check_rat >= 500) str_pok.tier = 'SSS';
                    else if (check_rat >= 450) str_pok.tier = 'SS';
                    else if (check_rat >= 400) str_pok.tier = 'S';
                    else if (check_rat >= 375) str_pok.tier = 'A';
                    else if (check_rat >= 360) str_pok.tier = 'B';
                    else if (check_rat >= 340) str_pok.tier = 'C';
                    else if (check_rat >= 315) str_pok.tier = 'D';
                    else str_pok.tier = 'F';
                    break;
                /*case 'ER':
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
                    break;*/
                case 'eDPS':
                    if (check_rat >= 19.0) str_pok.tier = 'SSS';
                    else if (check_rat >= 17.0) str_pok.tier = 'SS';
                    else if (check_rat >= 16.5) str_pok.tier = 'S';
                    else if (check_rat >= 15.5) str_pok.tier = 'A';
                    else if (check_rat >= 14.75) str_pok.tier = 'B';
                    else if (check_rat >= 14.0) str_pok.tier = 'C';
                    else if (check_rat >= 13.5) str_pok.tier = 'D';
                    else str_pok.tier = 'F';
                    break;
            }

            if (str_pok.rat == best_mon && str_pok.name == "Mega Rayquaza")
                str_pok.tier = "MRay";

            if (str_pok.tier != cur_tier) {
                if (cur_tier.length)
                    tier_stops.push({
                        tier: cur_tier,
                        start: last_stop,
                        stop: i
                    });
                cur_tier = str_pok.tier;
                last_stop = i;
            }
        }
    }

    if (cur_tier.length && !tier_stops.find(t=>t.tier==cur_tier)) {
        tier_stops.push({
            tier: cur_tier,
            start: last_stop,
            stop: str_pokemons.length
        });
    }
}

/**
 * 
 */
function SetupScroll() {
    const container = $("#strongest-scroller");

    // Main scroll listener to add or remove rows/cols as needed
    // Throttle to prevent heavy recalculation triggering too often
    container.on('scroll', throttle(RecalcViewport,100));

    // Also recalc everything if the table resizes
    new ResizeObserver((entries,observer)=>RecalcViewport()).observe(container[0]);
}

// Reset matrix as if starting from scratch
function ClearViewport() {
    curIndices = {
        row: [0, 0],
        visibleRow: [0, 0]
    };
    
    $('#strongest-table tbody').html(`<tr style="height: 0px" id="pad"><td id="tier-label-container"></td></tr>
        <tr style="height: 0px" id="pad-btm"></tr>`);
}

// Calculate all indices for rendering
function GetIndices(scrollTop = null) {
    //ROW_HEIGHT = window.getComputedStyle(document.documentElement).getPropertyValue('--ranking-row-height');
    if (window.matchMedia('(max-device-width: 400px)').matches)
        ROW_HEIGHT = 45;
    else if (window.matchMedia('(max-device-width: 600px)').matches)
        ROW_HEIGHT = 50;
    else if (window.matchMedia('(max-device-width: 900px)').matches)
        ROW_HEIGHT = 60;
    else
        ROW_HEIGHT = 30;

    const container = $("#strongest-scroller");
    
    // Desired row buffer
    const containerHeight = container.height();
    if (!scrollTop)
        scrollTop = container.scrollTop();

    const topVisibleRow = scrollTop / ROW_HEIGHT;
    const topRow = Math.floor(topVisibleRow);
    const visibleRowCount = containerHeight / ROW_HEIGHT;
    let ROW_BUFFER_SIZE = Math.max(Math.ceil(visibleRowCount), MIN_ROW_BUFFER_SIZE);
    const startRow = Math.max(0, topRow - ROW_BUFFER_SIZE);
    const bufferRowCount = 2*ROW_BUFFER_SIZE;
    const bottomVisibleRow = topVisibleRow + visibleRowCount;
    const endRow = Math.min(str_pokemons.length, startRow+Math.ceil(visibleRowCount)+bufferRowCount);
    
    // New target indices
    const indices = {
        row: [startRow, endRow],
        visibleRow: [topVisibleRow, bottomVisibleRow]
    };

    return indices;
}

// Determine desired buffer indices and recalc DOM to match
function RecalcViewport(event, scrollTop = null) {
    // Always ensure padding rows exist - if not, redraw everything
    const tr_pad = $("#pad");
    const tr_padbtm = $("#pad-btm");
    if (tr_pad.length == 0 || tr_padbtm.length == 0)
        ClearViewport(); 


    // New target indices
    let indices = GetIndices(scrollTop);

    do {
        // Make DOM changes to match new desired indices
        RenderTable(indices);
        curIndices = indices;
        
        // Refresh indices (container may have resized)
        indices = GetIndices(scrollTop);
    }
    while (curIndices.row[0] != indices.row[0] ||
        curIndices.row[1] != indices.row[1] ||
        curIndices.visibleRow[0] != indices.visibleRow[0] ||
        curIndices.visibleRow[1] != indices.visibleRow[1]);

    RenderLabels(indices);
};

// Manipulate DOM to make sure it matches the desired buffer indices
function RenderTable(indices) {
    const tbody = $('#strongest-table tbody');
    const tr_pad = $("#pad");
    const tr_padbtm = $("#pad-btm");

    tr_pad.css("height", indices.row[0] * ROW_HEIGHT + "px");
    tr_padbtm.css("height", (str_pokemons.length - indices.row[1]) * ROW_HEIGHT + "px");
    
    // Remove from bottom (scroll up)
    for (let i=Math.max(indices.row[1],curIndices.row[0]); i<curIndices.row[1]; i++) {
        tbody.children().eq(-2).remove();
    }
    // Remove from top (scroll down)
    for (let i=curIndices.row[0]; i<indices.row[0]&&i<curIndices.row[1]; i++) {
        tbody.children().eq(1).remove();
    }

    // Add on top (scroll up) (reverse order)
    for (let i=Math.min(curIndices.row[0],indices.row[1])-1; i>=indices.row[0]; i--) {
        tr_pad.after(GetRankingRow(i));
    }
    // Add on bottom (scroll down)
    for (let i=Math.max(curIndices.row[1],indices.row[0]); i<indices.row[1]; i++) {
        tr_padbtm.before(GetRankingRow(i));
    }
}

// Recreate and position all labels that are currently visible
function RenderLabels(indices) {
    $("#tier-label-container").empty();

    if (!tier_stops) return;

    let min_len = 3;

    for (const tier of tier_stops) {
        if (min_len < tier.tier.length) min_len = tier.tier.length;

        let startRow = tier.start, endRow = tier.stop;
        if (startRow > indices.visibleRow[1] || endRow < indices.visibleRow[0])
            continue;

        if (startRow < indices.visibleRow[0]) startRow = indices.visibleRow[0];
        if (endRow > indices.visibleRow[1]) endRow = indices.visibleRow[1];

        let label = $(`<div class="tier-label floating-label">${tier.tier}</div>`);
        if (tier.tier == "MRay") 
            label.addClass("tier-MRay");
        if (tier.type)
            label.addClass("bg-"+tier.type);

        label.css("top", ((endRow + startRow - 1) / 2 * ROW_HEIGHT) + "px");
        $("#tier-label-container").append(label);
    }

    $("#tier-label-container").css("min-width", (min_len+1) + "ch");
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
function SetRankingTable(str_pokemons, num_rows = null) {
    if (!num_rows || num_rows > str_pokemons.length)
        num_rows = str_pokemons.length;

    for (let row_i = 0; row_i < num_rows; row_i++) {
        $("#strongest-table tbody").append(GetRankingRow(row_i));
    }
}

/**
 * Builds and returns a ranking row representing the item at str_pokemons[row_i]
 * to be added to the #strongest-table
 */
function GetRankingRow(row_i) {
    const display_grouped = $("#chk-grouped").is(":checked") && $("#chk-suboptimal").is(":checked");
    const best_pct = str_pokemons[0].pct;

    if (row_i < str_pokemons.length) {
        const p = str_pokemons[row_i];

        const name = p.name;
        const coords = GetPokemonIconCoords(p.id, p.form);
        const form_text = GetFormText(p.id, p.form).replace(/\s+Forme?/,"");
        const legendary = p.class !== undefined;

        const tr = $("<tr></tr>");

        if (display_grouped) 
            tr.addClass("grouped");

        if (row_i % 2)
            tr.addClass("odd");
        else 
            tr.addClass("even");

        // re-style any rows for mons we've seen before 
        if (highlight_suboptimal) {
            const pok_uniq_id = GetUniqueIdentifier(p);
            if (str_pokemons.findIndex(e=>GetUniqueIdentifier(e)==pok_uniq_id) < row_i) {
                tr.addClass("suboptimal");
            }
        }

        const td_tier = $("<td></td>");
        if (!display_grouped && show_pct) {
            td_tier.addClass("tier-label");
            td_tier.addClass("tier-" + p.tier);
        } 

        const td_rank = "<td>" //(!display_numbered ? " style='width: 0; max-width: 0'>" : ">")
            + ((display_numbered) 
                ? (((display_grouped) 
                    ? p.grouped_rat : row_i) + 1) : "")
            +"</td>";
        const td_name = $("<td class='td-poke-name'></td>")
        const a_name = $(`<a class='a-poke-name' href='/?p=${p.id}&f=${p.form}'</a>`);
        a_name.on("click", function(e) {
            e.preventDefault();
            LoadPokedexAndUpdateURL(GetPokeDexMon(p.id, p.form));
        });
        a_name.html("<span class=pokemon-icon style='background-image:url("
            + ICONS_URL + ");background-position:" + coords.x + "px "
            + coords.y + "px'></span>"
            + " <span class='strongest-name'>"
            + ((p.shadow)
                ? "<span class=shadow-text>" + GetTranslation("terms.shadow", "Shadow") + "</span> " : "")
            + name
            + ((p.level == 50) ? "<sup class='xl'>XL</sup>" : "")
            +"</span>"
            + ((form_text.length > 0)
                ? "<span class=poke-form-name> (" + form_text + ")</span>" 
                : ""));
        td_name.append(a_name);

        const td_fm = $("<td></td>");
        td_fm.append(GetMoveLink(p.fm, p.fm_type, p.fm_is_elite));
        const td_cm = $("<td></td>");
        td_cm.append(GetMoveLink(p.cm, p.cm_type, p.cm_is_elite));
        const td_rat = "<td>" + GetTranslation("terms."+settings_metric, settings_metric) + " <b>"
            + FormatDecimal(p.rat,2,2,2) + "</b></td>";
        const td_pct = ((show_pct && p.pct) ? "<td>" + GetBarHTML(p.pct, FormatDecimal(p.pct,3,1,1) + "%", 100, best_pct, ((Math.abs(p.pct - 100) < 0.000001) ? "contrast" : "")) + "</td>" : "");

        //if (!show_pct || !display_numbered)
        //    td_name.css("width", "45%");

        tr.append(td_tier);
        tr.append(td_rank);
        tr.append(td_name);
        tr.append(td_fm);
        tr.append(td_cm);
        tr.append(td_rat);
        tr.append(td_pct);

        return tr;

    } else {
        return $("<tr><td>-</td><td>-</td><td>-</td><td>-</td></tr>");
    }
}

/**
 * Look up a pokemon's tier ranking for a specific type
 */
async function GetTypeTier(type, pkm_obj) {
    if (!POKEMON_TYPES.has(type)) return {pure: "F", shadow: "F"};
    await BuildTypeTier(type);

    let tiers = {
        pure: type_tiers[type][GetUniqueIdentifier({
            id: pkm_obj.id, 
            form: pkm_obj.form,
            shadow: false
        }, true, false)] ?? "F"
    };
    if (pkm_obj.shadow) {
        tiers.shadow = type_tiers[type][GetUniqueIdentifier({
            id: pkm_obj.id, 
            form: pkm_obj.form,
            shadow: true
        }, true, false)] ?? "F";
    }

    return tiers;
}

/**
 * If not already built, create a lookup for tier rankings of mons' typed movesets
 */
async function BuildTypeTier(type) {
    if (type_tiers && type_tiers[type]) return; // Already built
    
    let search_params = {
        ...GetDefaultSearchParams(),
        type
    };

    let strongest = await GetStrongestOfOneType(search_params);
    ProcessAndGroup(strongest, type);
    SetTypeTier(type, strongest);
}

/**
 * Takes a ranking list of mons (with tier info) and caches it for later lookup
 */
function SetTypeTier(type, strongest_list) {
    if (!type_tiers) type_tiers = {};
    if (type_tiers[type]) return; // should always be the same, so don't re-write

    type_tiers[type] = Object.fromEntries(
        strongest_list.map(e=>[GetUniqueIdentifier(e, true, false), e.tier])
    );
}

/**
 * Reset type tiers (e.g. if a changed setting would alter how tiers are made)
 */
function ClearTypeTiers() {
    type_tiers = undefined;
}

/**
 * Converts a tier string label to an integer for sorting
 * 
 * Could be done "cleaner" programmatically, but this switch lookup will be faster
 */
function TierToInt(tierLabel) {
    if (!tierLabel) return 0;

    switch (tierLabel) {
        case "MRay": 
            return 1000;
        case "A":
            return 5;
        case "B":
            return 4;
        case "C":
            return 3;
        case "D":
            return 2;
        case "F":
            return 1;
        default: // Some form of "S"
            return 100 + tierLabel.length;
    }
}

/**
 * Create a "Progress" bar scaled to some absolute best 
 */
function GetBarHTML(val, val_txt, full_val, max_val, add_classes) {
    return "<div class='bar-bg' style='width: calc(" + (full_val/max_val * 100) + "% - 10px);'>"
        + "<div class='bar-fg" + (!!add_classes ? " " + add_classes : "") + "' style='width: " + (val/full_val * 100) + "%;'>"
        + "<span class='bar-txt'>"
        + val_txt
        + "</span></div></div>";
}


// Allow func to execute no more than once every "timeFrame" milliseconds
function throttle(func, timeFrame) {
    let lastTime = 0, deferTimer;
    return function (...args) {
        let now = new Date();
        if (now < lastTime + timeFrame) {
            clearTimeout(deferTimer);
            deferTimer = setTimeout(()=>{
                func(...args);
                lastTime = now;
            }, timeFrame);
        }
        else {
            func(...args);
            lastTime = now;
        }
    };
}

/**
 * Builds a formatted anchor element to link back to a type ranking list
 */
function GetTypeLink(type, versus) {
    const anchor = $(`<a class='type-text bg-${type}' href='/?strongest&t=${type}${(versus ? "&v" : "")}'>${GetTranslation("pokedata.types."+type)}</a>`);
    anchor.on("click", function (e) {
        e.preventDefault();
        LoadStrongestAndUpdateURL(type, versus);
    });

    return anchor;
}

/**
 * Builds a formatted anchor element to link back to a type ranking list
 */
function GetTypeLinkImg(type, versus) {
    const anchor = $(`<a href='/?strongest&t=${type}${(versus ? "&v" : "")}'></a>`);
    anchor.on("click", function (e) {
        e.preventDefault();
        LoadStrongestAndUpdateURL(type, versus);
    });
    const img = $(`<img src='/imgs/types/${type.toLowerCase()}.gif' alt=${type}></img>`);
    anchor.append(img);

    return anchor;
}