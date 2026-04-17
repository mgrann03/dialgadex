/**
 * Gets the Pokemon GO stats of a specific pokemon. If level or ivs aren't
 * specified, they default to the settings level and the maximum ivs.
 */
function GetPokemonStats(pkm_obj, level = null, ivs = null) {

    if (!level) {
        level = settings_default_level[0];
    }
    if (!ivs)
        ivs = { atk: 15, def: 15, hp: 15 };

    let stats = pkm_obj.stats;

    let cpm = GetCPMForLevel(level);

    stats.atk = (stats.baseAttack + ivs.atk) * cpm;
    stats.def = (stats.baseDefense + ivs.def) * cpm;
    stats.hp = (stats.baseStamina + ivs.hp) * cpm;

    return {...stats}; // returns by copy to prevent reassignment of reference
}

/**
 * Gets the Pokemon GO stats of a specific raid boss, using the correct CPM
 * and HP value.
 */
function GetRaidStats(pkm_obj, tier = null) {

    if (!tier) {
        if (pkm_obj.raid_tier)
            tier = pkm_obj.raid_tier;
        else {
            tier = 3;
            if (pkm_obj.class)
                tier = 5;
            if (pkm_obj.form == "Mega" || pkm_obj.form == "MegaY" || pkm_obj.form == "MegaZ")
                tier = 4;
            if (pkm_obj.class && pkm_obj.form == "Mega")
                tier = 6;
        }
    }
    
    const ivs = { atk: 15, def: 15, hp: 15 };
    const cpm = [,0.6,0.67,0.73,0.79,0.79,0.79,1.0,0.79][tier];

    let stats = {...pkm_obj.stats};
    
    stats.atk = (stats.baseAttack + ivs.atk) * Math.fround(cpm);
    stats.def = (stats.baseDefense + ivs.def) * Math.fround(cpm);
    stats.hp = [,600,,3600,9000,15000,22500,20000,25000][tier];

    return stats; // returns by copy to prevent reassignment of reference
}

/**
 * Gets the Pokemon GO CP, based on effective stats.
 */
function GetPokemonCP(stats) {
    let cp = Math.floor(stats.atk * Math.pow(stats.def, 0.5)
                * Math.pow(stats.hp, 0.5) / 10);
    if (cp < 10)
        cp = 10;

    return cp;
}

/**
 * Gets array of six arrays. The specified Pokemon's 
 * fast moves, elite fast moves, 
 * charged moves, elite charged moves,
 * pure-only charged moves, and shadow-only charged moves.
 */
function GetPokemonMoves(pkm_obj, hidden_power_filter = "Type-Match") {
    if (!pkm_obj.fm && !pkm_obj.cm)
        return [];

    let fm = pkm_obj.fm.slice();
    let elite_fm = [];
    if (pkm_obj.elite_fm)
        elite_fm = pkm_obj.elite_fm.slice();
    let cm = pkm_obj.cm.slice();
    let elite_cm = [];
    if (pkm_obj.elite_cm)
        elite_cm = pkm_obj.elite_cm.slice();

    // checks for hidden power
    if (fm.includes("Hidden Power") || elite_fm.includes("Hidden Power")) {
        for (let t of GetHiddenPowerTypes(hidden_power_filter, pkm_obj)) {
            if (fm.includes("Hidden Power"))
                fm.push("Hidden Power " + t);
            if (elite_fm.includes("Hidden Power"))
                elite_fm.push("Hidden Power " + t)
        }
    }

    let shadow_only_cm = [];
    let pure_only_cm = [];
    if (pkm_obj.shadow) {
        //shadow_only_cm.push('Frustration'); // Ignore Frustration because BAD
        pure_only_cm.push('Return');
    }
    else if (pkm_obj.form == "Mega" || pkm_obj.form == "MegaY" || pkm_obj.form == "MegaZ") { // Check Return for purified megas
        const def_form = GetPokemonForms(pkm_obj.id)[0];
        const def_pkm_obj = jb_pkm.find(e => e.id == pkm_obj.id && e.form == def_form);

        if (def_pkm_obj.shadow)
            pure_only_cm.push('Return');
    }

    // Add moves to Apex Forms
    if (pkm_obj.form == "S") {
        if (pkm_obj.id == 249) { // Apex Lugia
            shadow_only_cm.push('Aeroblast Plus');
            pure_only_cm.push('Aeroblast Plus Plus');
        }
        if (pkm_obj.id == 250) { // Apex Ho-Oh
            shadow_only_cm.push('Sacred Fire Plus');
            pure_only_cm.push('Sacred Fire Plus Plus');
        }
    }

    // Add moves if in customizations
    if (Array.isArray(pkm_obj.fm_add)) {
        for (const f of pkm_obj.fm_add) 
            elite_fm.push(f);
    }
    if (Array.isArray(pkm_obj.cm_add)) {
        for (const c of pkm_obj.cm_add) 
            elite_cm.push(c);
    }
    
    // Remove moves if in customizations
    if (Array.isArray(pkm_obj.fm_rem)) {
        fm = fm.filter(f=>!pkm_obj.fm_rem.includes(f));
        elite_fm = elite_fm.filter(f=>!pkm_obj.fm_rem.includes(f));
    }
    if (Array.isArray(pkm_obj.cm_rem)) {
        cm = cm.filter(c=>!pkm_obj.cm_rem.includes(c));
        elite_cm = elite_cm.filter(c=>!pkm_obj.cm_rem.includes(c));
    }

    return [fm, cm, elite_fm, elite_cm, pure_only_cm, shadow_only_cm];
}

/**
 * Returns boolean for whether the pokemon can learn a specific move
 */
function PokemonCanLearn(pkm_obj, move_name) {
    const moves = GetPokemonMoves(pkm_obj);

    return moves.some(e=>e.includes(move_name));
}


/**
 * Builds a unique string based on a pokemon for uses like hashing.
 * 
 * Expects either a member of jb_pkm or a moveset entry returned from 
 * a "Strongest Movesets" function.
 * 
 * If unique_shadow is false, shadows will hash to the same as their pure form.
 */
function GetUniqueIdentifier(pkm_obj, 
        unique_shadow = true, unique_level = true, 
        unique_moves = false, elite_moves_only = false) {
    return pkm_obj.id + 
        "-" + pkm_obj.form + 
        (unique_shadow ? "-" + pkm_obj.shadow : "") + 
        (unique_level ? "-" + (pkm_obj.level !== undefined ? pkm_obj.level : settings_default_level[0]) : "") + 
        (unique_moves ? "-" + (pkm_obj.fm_is_elite || !elite_moves_only ? pkm_obj.fm : "null") 
            + "-" + (pkm_obj.cm_is_elite || !elite_moves_only ? pkm_obj.cm : "null") : "");
}

/**
 * Converts a UniqueIdentifier back to the original pkm_obj
 */
function ParseUniqueIdentifier(uniq_id, 
    unique_shadow = true, unique_level = true, unique_moves = false) {
    const fields = uniq_id.split("-").values(); // get iterator

    let pkm_obj = {};
    pkm_obj.id = parseInt(fields.next().value);
    pkm_obj.form = fields.next().value;
    if (unique_shadow)
        pkm_obj.shadow = (fields.next().value === "true");
    if (unique_level)
        pkm_obj.level = parseInt(fields.next().value);
    if (unique_moves) {
        pkm_obj.fm = fields.next().value;
        pkm_obj.cm = fields.next().value;
    }

    const base_pkm_obj = jb_pkm.find(e=>e.id==pkm_obj.id&&e.form==pkm_obj.form);
    pkm_obj.name = base_pkm_obj.name;
    pkm_obj.released = base_pkm_obj.released;
    pkm_obj.stats = {...base_pkm_obj.stats};
    pkm_obj.types = base_pkm_obj.types.slice();
    
    return pkm_obj;
}


/**
* Gets the pokemon id from a url parameter.
* The input could be the id itself or the pokemon name.
* Returns 0 if it doesn't find it.
*/
function GetPokemonId(in_str) {
    // checks for an id
    if (/^\d+$/.test(in_str)) { // if input is an integer
        if (in_str >= 1 && in_str <= jb_max_id)
            return parseInt(in_str);
    }

    const clean_input = CleanPokeName(in_str);

    // checks for a name
    let pokemon_id = GetAllSpeciesNames().findIndex(e=>CleanPokeName(e) == clean_input);

    if (pokemon_id > jb_max_id || pokemon_id < 1)
        return 0;

    return parseInt(pokemon_id);
}

/**
 * Gets a pokemon container div element set up with a specified pokemon.
 */
function GetPokemonContainer(pokemon_id, is_selected, form = "Normal") {

    const poke_obj = jb_pkm.find(e => e.id == pokemon_id && e.form == form);

    let pokemon_name;
    let can_be_shadow = false;
    if (poke_obj) {
        pokemon_name = TranslatedSpeciesName(pokemon_id, poke_obj.name);
        can_be_shadow = poke_obj.shadow;
    }
    else {
        pokemon_name = TranslatedSpeciesName(pokemon_id);
    }
    
    const img_src_name = GetPokemonImgSrcName(pokemon_id, form);
    let img_src = JB_URL + GIFS_PATH + img_src_name + ".gif";
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
        $("<div class=shiny-img-div><img src=imgs/shiny.png alt=''></img></div>");
    pokemon_container_div.append(shiny_img);

    // img container div
    let img_container_div = $("<div class=img-container></div>");
    if (is_selected)
        img_container_div.addClass('container-selected');
    img_container_div.append(
            $("<img class=loading src=imgs/loading.gif alt='Loading wheel'></img>"));
    img_container_div.append($("<img class=pokemon-img "
            + "onload ='HideLoading(this)' onerror='TryNextSrc(this)'"
            + " onclick='SwapShiny(this)' src='"
            + img_src + "' alt='"
            + pokemon_name + (form_text.length > 0 ? " " + form_text : "") + "'></img>"));
    pokemon_container_div.append(img_container_div);

    // pokemon name p
    const pokemon_name_p= $(`<a href='/?p=${pokemon_id}&f=${form}' class='pokemon-name pokefont unselectable'">#${pokemon_id} ${pokemon_name}</a>`);
    pokemon_name_p.on("click", function(e) {
        e.preventDefault();
        LoadPokedexAndUpdateURL(GetPokeDexMon(pokemon_id, form));
    });

    if (is_selected && poke_obj && form != "Mega" && form != "MegaY" && form != "MegaZ") {
        const shadow_icon = $("<img src='imgs/flame.svg' class='shadow-icon filter-" + (can_be_shadow ? 'shadow' : 'noshadow') + 
            "' alt='" + (can_be_shadow ? 'Purple flame representing the shadow form is released' : 'Dark purple flame representing the shadow form is not yet released') + "'></img>");
        shadow_icon.on('click', function(e) { 
            shadow_icon.removeClass("filter-" + (poke_obj.shadow ? 'shadow' : 'noshadow'));
            shadow_icon.addClass("filter-" + (poke_obj.shadow ? 'noshadow' : 'shadow'));
            shadow_icon.attr("alt", (poke_obj.shadow ? 'Purple flame representing the shadow form is released' : 'Dark purple flame representing the shadow form is not yet released'))
            poke_obj.shadow = !poke_obj.shadow;
            ClearTypeTiers();
            UpdatePokemonStatsAndURL();
            e.preventDefault();
        })
        pokemon_name_p.append(shadow_icon);
    }
    pokemon_container_div.append(pokemon_name_p);

    // pokemon types
    const types = poke_obj !== undefined ? poke_obj.types : [];
    const pokemon_types_div = $("<div class=pokemon-types></div>");
    for (type of types) {
        pokemon_types_div.append(GetTypeLinkImg(type));
    }
    pokemon_container_div.append(pokemon_types_div);

    return pokemon_container_div;
}

/**
 * Makes string clean, all lowercases and only alphanumeric characters.
 */
function CleanPokeName(string) {

    return string.toLowerCase().replace(/\W/g, "");
}

/**
 * Loops through all pokemon, finding those that match 'search_params' and
 * calling a helper function for all matches.
 * 
 * 'f_process_pokemon' hs signature function(pkm_obj, is_shadow, search_params)
 */
async function SearchAll(search_params, f_process_pokemon) {
    for (let id = 1; id <= jb_max_id; id++) {
        await tryYieldToMain();
        const forms = GetPokemonForms(id);
        const def_form = forms[0];

        let pkm_obj = jb_pkm.find(entry =>
            entry.id == id && entry.form == def_form);

        // checks whether pokemon should be skipped
        // (not released or legendary when not allowed)
        if (!pkm_obj || (!search_params.unreleased && !pkm_obj.released)
            || (!search_params.legendary && pkm_obj.class)) {
            continue;
        }

        for (let level of settings_default_level) {
            if (pkm_obj.class == undefined && settings_xl_budget)
                level = 50;

            // default form
            await f_process_pokemon(pkm_obj, false, level, search_params);

            // shadow (except not released when it shouldn't)
            if (search_params.shadow && pkm_obj.shadow) {
                await f_process_pokemon(pkm_obj, true, level, search_params);
            }

            // other forms
            for (let form_i = 1; form_i < forms.length; form_i++) {

                pkm_obj = jb_pkm.find(entry =>
                    entry.id == id && entry.form == forms[form_i]);

                // checks whether pokemon should be skipped (form not released or unwanted)
                if (!pkm_obj || (!search_params.unreleased && !pkm_obj.released)
                    || (!search_params.mega && (pkm_obj.form == "Mega" || pkm_obj.form == "MegaY" || pkm_obj.form == "MegaZ")))
                    continue;

                await f_process_pokemon(pkm_obj, false, level, search_params);
                // other forms and shadow (except not released when it shouldn't)
                if (search_params.shadow && pkm_obj.shadow) {
                    await f_process_pokemon(pkm_obj, true, level, search_params);
                }
            }
        }
    }

}

/**
 * Take a pokemon object and convert it into an enemy that can be calc'd against
 */
function GetEnemyParams(enemy_pkm_obj) {
    return {
        moves: GetPokemonMoves(enemy_pkm_obj, "Raid Boss"),
        types: enemy_pkm_obj.types,
        weakness: GetTypesEffectivenessAgainstTypes(enemy_pkm_obj.types),
        stats: GetRaidStats(enemy_pkm_obj)
    };
}

/**
* Find relevant raid bosses (tier 4+) based on type matchup
*/
function GetRaidBosses(has_type = null, weak_to_type = null) {
    let raid_bosses = [];
    for (const pkm_obj of jb_pkm) {
        if (!pkm_obj.raid_tier || pkm_obj.raid_tier < 4) // Not a high-tier boss
            continue;

        if (has_type) { // Find Pokemon with this type
            if (!pkm_obj.types.includes(has_type))
                continue;
        }
        if (weak_to_type) { // Find Pokemon weak to this type
            if (GetEffectivenessMultAgainst(weak_to_type, pkm_obj.types) <= 1.01) // Not exactly 1.0 because effective*resisted>1
                continue;
        }

        raid_bosses.push(pkm_obj);
    }

    return raid_bosses
}

/**
 * Some utils functions for working with arrays of sets
 */
function GetUnique(arr) { 
	return Array.from((new Set(arr)).values()); 
}
function UnionAllSets(sets_arr) {
	return sets_arr.reduce((accumulator, this_set)=>accumulator.union(this_set), new Set());
}
function IntersectAllSets(sets_arr) {
	return sets_arr.reduce((accumulator, this_set)=>accumulator.intersection(this_set), sets_arr[0]);
}
function SetEquals(set1, set2) {
	return set1.size === set2.size && Array.from(set1).every(x => set2.has(x));
}
function MapByID(arr) { 
	return arr.reduce((acc, x) => {
        if (!acc.has(x.id)) 
            acc.set(x.id, {all: [], elite: []});
        
        acc.get(x.id).all.push(x);
        
        if (x.fm_is_elite||x.cm_is_elite)
            acc.get(x.id).elite.push(x);
        return acc;
    }, new Map()); 
}

/**
 * Take a list of pokemon (e.g. from rankings) and translate it into a reasonable, 
 * semi-optimized search string
 */
function GetSearchString(pkm_arr, 
        check_movesets = false, check_elite_only = true) {
    let str = "";
    
    // Allow all applicable mons by id
    str = str + GetUnique(pkm_arr.map(e=>e.id)).join(",");

    // Shadow forms
    const has_shadow_forms = pkm_arr.some(e=>e.shadow);
    if (has_shadow_forms) {
        str = str + "&" + GetUnique(pkm_arr.filter(e=>!e.shadow).map(e=>e.id)).join(",") + "," + GetTranslation("pokemon.terms.shadow", "shadow");
    }
    else {
        str = str + "&!" + GetTranslation("pokemon.terms.shadow", "shadow");
    }

    // Pure only (never shadow)
    const pure_only = (new Set(pkm_arr.filter(e=>!e.shadow&&jb_pkm.find(p=>p.id==e.id&&p.form==e.form).shadow).map(e=>e.id))).difference(new Set(pkm_arr.filter(e=>e.shadow).map(e=>e.id)));
    if (pure_only.size > 0) {
        for (const p_id of pure_only) {
            str = str + "&!" + p_id + ",!" + GetTranslation("pokemon.terms.shadow", "shadow");
        }
    }

    // Mega forms
    const has_mega_forms = pkm_arr.some(e=>e.form=="Mega"||e.form=="MegaY"||e.form=="MegaZ");
    if (has_mega_forms) {
        str = str + "&" + GetUnique(pkm_arr.filter(e=>e.form!="Mega"&&e.form!="MegaY"&&e.form!="MegaZ").map(e=>e.id)).join(",") + "," + GetTranslation("pokemon.terms.mega", "mega") + "-";
    }
    /* Disabled - If we set filters to remove megas, still include the base pokemon
    else {
        str = str + "&!mega1-"
    }*/

    // Pure forms
    //const has_pure_forms = pkm_arr.some(e=>!(e.shadow||e.form=="Mega"||e.form=="MegaY"||e.form=="MegaZ"));
    if (has_shadow_forms && has_mega_forms) {
        str = str + "&" + GetUnique(pkm_arr.filter(e=>e.form!="Mega"&&e.form!="MegaY"&&e.form!="MegaZ"&&!e.shadow).map(e=>e.id)).join(",") 
            + "," + GetTranslation("pokemon.terms.shadow", "shadow") + "," + GetTranslation("pokemon.terms.mega", "mega") + "-";
    }

    // Alternate (non-Mega) forms
    const has_alt_forms = GetUnique(pkm_arr.filter(e=>GetPokemonForms(e.id).filter(e=>e!="Mega"&&e!="MegaY"&&e!="MegaZ").length > 1).map(e=>e.id));
    for (let pkm_id of has_alt_forms) {
        const all_possible_forms = new Set(GetPokemonForms(pkm_id).filter(f=>f!="Mega"&&f!="MegaY"&&f!="MegaZ"&&jb_pkm.find(p=>p.id==pkm_id&&p.form==f)));
        const filtered_in_forms = new Set(pkm_arr.filter(e=>e.id==pkm_id).map(e=>e.form).filter(e=>e!="Mega"&&e!="MegaY"&&e!="MegaZ"));

        // Check if we need to try filtering down more specifically than by id
        if (filtered_in_forms.size < all_possible_forms.size && filtered_in_forms.size > 0) {
            // Only regional filtering is needed
            /* Remove regional-based filtering until Niantic fixes the broken keywords
                if (all_possible_forms.difference(new Set(["Normal","Hisuian","Galarian","Alola","Paldea"])).size == 0) {
                    str = str + "&!" + pkm_id + "," + Array.from(filtered_in_forms.keys()).map(e=>GetRegionalFormName(pkm_id, e)).join(",");
                }
            */ 

            // Instead of complicated set logic, just do Darmanitan manually
            // because it's the only real exception not already handled above by "unique" typing per form
            if (pkm_id == 555) {
                str = str + "&" + GetDarmanitanFilters(filtered_in_forms);
                continue;
            }

            // Differentiate Mewtwo based on costume
            // Might have to revisit this when megas get released???
            if (pkm_id == 150) {
                str = str + "&!150,";
                if (filtered_in_forms.has('A'))
                    str = str + GetTranslation("search-string.costume", "costume");
                else 
                    str = str + "!" + GetTranslation("search-string.costume", "costume");
                continue;
            }

            // Differentiate Apex forms based on "research"
            // Technically has a Ho-Oh research issue, but it's not huge
            if (pkm_id == 249 || pkm_id == 250) {
                str = str + "&!" + pkm_id + ",";
                if (filtered_in_forms.has('S'))
                    str = str + GetTranslation("search-string.research", "research")
                else 
                    str = str + "!" + GetTranslation("search-string.research", "research");
                continue;
            }


            // Try type-based filtering
            const all_type_combos = Array.from(all_possible_forms.keys()).map(e=>new Set(jb_pkm.find(f=>f.id==pkm_id&&f.form==e).types));
            const filtered_in_type_combos = Array.from(filtered_in_forms.keys()).map(e=>new Set(jb_pkm.find(f=>f.id==pkm_id&&f.form==e).types));
            //const filtered_in_types = UnionAllSets(filtered_in_type_combos);

            const all_shared_types = IntersectAllSets(all_type_combos); // Types that are common to every form
            if (all_type_combos.every(tc=>SetEquals(all_shared_types, tc))) // If all forms have identical typing, we can't use this filtering
                continue;

            // Types unique to every form we want
            const filtered_in_unshared_types = filtered_in_type_combos.map(e=>e.difference(all_shared_types)); // Unshared types among desired forms
            if (filtered_in_unshared_types.every(e=>e.size >= 1 && all_type_combos.reduce((acc, tc)=>(acc + (tc.has([...e][0]) ? 1 : 0)), 0) == 1)) { // Every desired form has an unshared type that is unique to them
                str = str + "&!" + pkm_id;
                for (const tc of filtered_in_unshared_types) {
                    str = str + "," + [...tc][0];
                }
                continue;
            }

            // Types unique to every form we want
            const filtered_out_forms = all_possible_forms.difference(filtered_in_forms); // Forms that we don't want
            const filtered_out_type_combos = Array.from(filtered_out_forms.keys()).map(e=>new Set(jb_pkm.find(f=>f.id==pkm_id&&f.form==e).types));
            const filtered_out_unshared_types = filtered_out_type_combos.map(e=>e.difference(all_shared_types)); // Unshared types among undesired forms
            if (filtered_out_unshared_types.every(e=>e.size >= 1 && all_type_combos.reduce((acc, tc)=>(acc + (tc.has([...e][0]) ? 1 : 0)), 0) == 1)) { // Every undesired form has an unshared type that is unique to them
                for (const tc of filtered_out_unshared_types) {
                    str = str + "&!" + pkm_id + ",!" + [...tc][0];
                }
                continue;
            }

            /*
            // Types common to every form we want
            const shared_types_among_filtered_in = IntersectAllSets(filtered_in_type_combos);
            const shared_filtered_in_unshared_types = shared_types_among_filtered_in.difference(all_shared_types); // Ignore types that every possible form has anyway (because that doesn't filter anything)
            for (const t of shared_filtered_in_unshared_types) {
                str = str + "&!" + pkm_id + "," + t; // Either a different Pokemon, or you have the required type(s)
            }

            // Types common to every form we don't want
            const filtered_out_forms = all_possible_forms.difference(filtered_in_forms); // Forms that we don't want
            const filtered_out_type_combos = Array.from(filtered_out_forms.keys()).map(e=>new Set(jb_pkm.find(f=>f.id==pkm_id&&f.form==e).types));
            const filtered_out_type_combos_still_included = filtered_out_type_combos.filter(s=>s.isSupersetOf(shared_filtered_in_unshared_types)); // Types held by forms we want to filter out
            const filtered_out_types = UnionAllSets(filtered_out_type_combos_still_included).difference(filtered_in_types); // Types held by forms we want to filter out, and not by forms we want to keep in
            for (const t of filtered_out_types) {
                str = str + "&!" + pkm_id + ",!" + t;
            }
            */
        }
    }

    if (check_movesets) {
        const mons_by_id = MapByID(pkm_arr); // All mon map
        
        for (const p of pkm_arr) {
            const all_ps = mons_by_id.get(p.id);
            if (check_elite_only && all_ps.all.length != all_ps.elite.length) continue; // skip if some would accidentally be filtered out

            if (all_ps.all.length > 1) { // Multiple filtered in, allow ALL moves
                let fms = GetUnique(all_ps.all.filter(e=>e.fm_is_elite||!check_elite_only).map(e=>e.fm));
                if (fms.some(f=>f.startsWith("Hidden Power"))) {
                    str = str + GetHiddenPowerSearch(p.id, fms);
                    fms = fms.filter(f=>!f.startsWith("Hidden Power"));
                    fms.push("Hidden Power"); // add in "typeless" HP to be used in normal string gen
                }
                if (fms.length > 0)
                    str = str + "&!" + p.id;
                for (const fm of fms) {
                    str = str + ",@" + SanitizeMoveNameSearch(fm);
                }

                const cms = GetUnique(all_ps.all.filter(e=>e.cm_is_elite||!check_elite_only).map(e=>e.cm));
                if (cms.length > 0)
                    str = str + "&!" + p.id;
                for (const cm of cms) {
                    str = str + ",@" + SanitizeMoveNameSearch(cm);
                }

                str = str + FixAllMoveTranslationCollisions(all_ps.all,cms);

                all_ps.all.length = 0; // Prevent duplicating when we encounter the other forms
            }
            else if (all_ps.all.length == 1) { // Force exactly this moveset
                if (p.fm_is_elite||!check_elite_only)
                    str = str + "&!" + p.id + ",@" + SanitizeMoveNameSearch(p.fm);
                if (p.cm_is_elite||!check_elite_only)
                    str = str + "&!" + p.id + ",@" + SanitizeMoveNameSearch(p.cm); 

                str = str + FixAllMoveTranslationCollisions([p],[p.cm]);
            }
            // else length == 0, which means we've seen it before
        }
    }
    /*
    // Suboptimal movesets exist
    if ((GetUnique(pkm_arr.map(e=>GetUniqueIdentifier(e, true)))).length < pkm_arr.length) {
        for (let pkm of pkm_arr) {

        }
    }
    */
    /*
    for (let pkm_id of GetUnique(pkm_arr.map(e=>e.id))) {
        let all_pkm_matches = pkm_arr.filter(e=>pkm_id==e.id);
        str = str + "&!" + pkm_id + "," + GetUnique(all_pkm_matches.map(e=>"@"+e.fm)).join(",");
        str = str + "&!" + pkm_id + "," + GetUnique(all_pkm_matches.map(e=>"@"+e.cm)).join(",");
    }
    */
    return str;
}

/**
 * Take a search string and return all movesets and pokemon that match
 * Uses CNF like Pokemon Go search function
 * 
 * Supports {id}, @{move}, {type}, "shadow" keyword, ! negation
 * Treats any keyword beginning with "mega" as filtering to mega forms
 *     (in game this could be something like "mega1-" or "megaevolve" to find
 *     candidates that can become the desired mega form)
 */
function RunSearchString(str, check_movesets = true) {
    let pkm_arr = [];

    const check_unreleased = $("#filter-settings input[value='unreleased']:checkbox").is(":checked");
    
    // Run first check to pre-filter jb_pkm (prevents generating pointless movesets)
    const search_space = ApplySearchString(str, jb_pkm, true);

    // Build up all possible mons and movesets
    for (let pkm of search_space) {
        if (check_movesets && !(pkm.fm && pkm.cm)) continue;
        if (!check_unreleased && !pkm.released) continue;

        const moves = GetPokemonMoves(pkm, "All");
        let fms = [{name: null, elite: false}], cms = [{name: null, elite: false}];
        if (check_movesets) {
            moves[0].forEach(fm=>fms.push({name: fm, elite: false}));
            moves[1].forEach(cm=>cms.push({name: cm, elite: false}));
            moves[2].forEach(elite_fm=>fms.push({name: elite_fm, elite: true}));
            moves[3].forEach(elite_cm=>cms.push({name: elite_cm, elite: true}));
            moves[4].forEach(elite_cm=>cms.push({name: elite_cm, elite: true, pure_only: true}));
            moves[5].forEach(elite_cm=>cms.push({name: elite_cm, elite: true, shadow_only: true}));
        }

        for (let fm of fms) {
            for (let cm of cms) {
                if (!cm.shadow_only) {
                    pkm_arr.push({
                        id: pkm.id,
                        name: pkm.name,
                        form: pkm.form,
                        shadow: false,
                        fm: fm.name,
                        fm_is_elite: fm.elite,
                        cm: cm.name,
                        cm_is_elite: cm.elite,
                        types: pkm.types
                    });
                }

                // List Shadow as a separate mon
                if (pkm.shadow && !cm.pure_only) {
                    pkm_arr.push({
                        id: pkm.id,
                        name: "Shadow " + pkm.name,
                        form: pkm.form,
                        shadow: true,
                        fm: fm.name,
                        fm_is_elite: fm.elite,
                        cm: cm.name,
                        cm_is_elite: cm.elite,
                        types: pkm.types
                    });
                }
            }
        }
    }

    return ApplySearchString(str, pkm_arr);
}

/**
 * Filters an input pkm_arr based on the provided search string
 */
function ApplySearchString(str, pkm_arr, id_filter_only = false) {
    // Break into AND'd clauses and progressively filter down by each
    for (let clause of str.split(/[&|]/)) {
        pkm_arr = pkm_arr.filter(p => {
            let clause_val = false;
            let fm_obj = null, cm_obj = null;

            // Break into OR'd tokens and return true as soon as we pass any of them
            for (let tok of clause.split(/[,;:]/)) {
                let invert = false;
                if (tok[0]=="!") {
                    invert = true; // negation, to be XOR'd with the token's filter criteria
                    tok = tok.slice(1);
                }
                
                if (!isNaN(tok)) // id
                    clause_val = clause_val || ((p.id==tok) ^ invert);
                else if (id_filter_only) {
                    return true;
                }

                if (tok=="shadow") // shadow
                    clause_val = clause_val || (p.shadow ^ invert);
                if (tok.slice(0,4)=="mega") // mega/primal
                    clause_val = clause_val || ((p.form=="Mega"||p.form=="MegaY"||p.form=="MegaZ") ^ invert);
                if (tok[0]=="@") { // has attack
                    let check_fm = true, check_cm = true;
                    let fm_phrase_val = false, cm_phrase_val = false;
                    let move_name = tok.slice(1);

                    if (Array.isArray(p.fm) || Array.isArray(p.cm)) // passthrough (pre-filtering)
                        return true;
                    
                    if (move_name[0] == '1') { // only check fm
                        check_cm = false;
                        move_name = move_name.slice(1);
                    }
                    else if (move_name[0] == '2' || move_name[0] == '3') { // only check cm
                        check_fm = false;
                        move_name = move_name.slice(1);
                    }
                    
                    if (check_fm && !!p.fm) {
                        fm_obj = fm_obj ?? jb_fm.find(f=>f.name==p.fm);
                        fm_phrase_val = (p.fm.substring(0,move_name.length)==move_name) || (fm_obj.type==move_name);
                    }
                    if (check_cm && !!p.cm) {
                        cm_obj = cm_obj ?? jb_cm.find(c=>c.name==p.cm);
                        cm_phrase_val = (p.cm.substring(0,move_name.length)==move_name) || (cm_obj.type==move_name);
                    }

                    clause_val = clause_val || ((fm_phrase_val || cm_phrase_val) ^ invert);
                }
                if (POKEMON_TYPES.has(tok)) { // type
                    clause_val = clause_val || (p.types.includes(tok) ^ invert);
                }
                if (tok=="costume") { // costume form
                    // Might need to make this more robust depending on if it breaks anything outside of Mewtwo
                    clause_val = clause_val || ((p.id==150&&p.form=="A") ^ invert);
                }
                if (tok=="research") { // research reward
                    // Might need to make this more robust depending on if it breaks anything outside of Ho-Oh/Lugia
                    clause_val = clause_val || (((p.id==249||p.id==250)&&p.form=="S") ^ invert);
                }

                if (clause_val) return clause_val;
            }

            return false;
        });
    }

    return pkm_arr;
}

/**
 * Compares an input list of Pokemon (as would be sent to GetSearchString)
 * against an output list of matched Pokemon (as would be returned from RunSearchString)
 * 
 * Validates whether this a perfect mapping. Returns any possible issues with the string.
 */
function ValidateSearchString(input_arr, output_arr, 
        check_movesets = true, check_elite_only = true) {
    const all_inputs_uniq = new Set(input_arr.map(e=>GetUniqueIdentifier(e, true, false, check_movesets, check_elite_only)));

    if (check_elite_only)
        output_arr = output_arr.filter(o=>input_arr.some(
            i=>i.id==o.id //&&i.form==o.form
            &&(i.fm==o.fm||(o.fm===null&&!i.fm_is_elite))
            &&(i.cm==o.cm||(o.cm===null&&!i.cm_is_elite))));
    
    const all_outputs_uniq = new Set(output_arr.map(e=>GetUniqueIdentifier(e, true, false, check_movesets, check_elite_only)));

    return {
        not_found: all_inputs_uniq.difference(all_outputs_uniq),
        not_wanted: all_outputs_uniq.difference(all_inputs_uniq)
    };
}

/**
 * Returns a hand-crafted search string to handle all possible combinations of filtering in
 * Darmanitan forms (due to their strange overlapping types) 
 */
function GetDarmanitanFilters(filtered_in_forms) {
    const form_bitstring = 
        (filtered_in_forms.has("Galarian_zen") ? 8 : 0) +       // X: Fire/Ice
        (filtered_in_forms.has("Zen") ? 4 : 0) +                // Z: Fire/Psychic
        (filtered_in_forms.has("Galarian_standard") ? 2 : 0) +  // G: Ice
        (filtered_in_forms.has("Standard") ? 1 : 0)             // S: Fire

    const t_fire = TranslatedTypeName("Fire");
    const t_ice = TranslatedTypeName("Ice");
    const t_psychic = TranslatedTypeName("Psychic");

    return ([
        [],                                     // 0: 
        ['!'+t_ice,'!'+t_psychic],              // 1: S
        ['!'+t_fire],                           // 2: G
        ['!'+t_psychic,'!'+t_ice+',!'+t_fire],  // 3: SG
        [t_psychic],                            // 4: Z
        ['!'+t_ice],                            // 5: ZS
        [t_psychic+',!'+t_fire],                // 6: ZG
        ['!'+t_ice+',!'+t_fire],                // 7: ZSG (!X)
        [t_ice,t_fire],                         // 8: X
        [t_fire,'!'+t_psychic],                 // 9: XS
        [t_ice],                                // 10: XG
        ['!'+t_psychic],                        // 11: XSG (!Z)
        [t_fire,t_psychic+','+t_ice],           // 12: XZ
        [t_fire],                               // 13: XZS (!G)
        [t_psychic+','+t_ice],                  // 14: XZG (!S)
        ['555'],                                // 15: XZSG
    ][form_bitstring]).map(filt=>'!555,'+filt).join("&");
}

/* Handle special cases for weird move names */
function SanitizeMoveNameSearch(move_name) {
    let move_obj = jb_fm.find(e=>e.name==move_name);
    if (!move_obj) move_obj = jb_cm.find(e=>e.name==move_name);

    const transName = TranslatedMoveName(move_obj.id, "None"); // Sanitize to "untyped" base names as they appear in-game

    if (move_name == "Psychic") {
        if (currentLocale == "en" || currentLocale == "es") // technically also hindi, portuguese, turkish
            return transName.slice(0, -1); // cutting off last char stops us matching by type
    }
    if (move_name == "Fly") {
        if (currentLocale == "fr") // technically also indonesian
            return transName.slice(0, -1); // cutting off last char stops us matching by type
    }


    return transName;
}

/**
 * Handle special cases for overlapping move names
 * (incl_pkm should only have a single, shared "id" and merely be different forms)
 */
function FixMoveTranslationCollision(incl_pkm, all_incl_cms, incl_cm, excl_cm, excl_cm_id) {
    // Only if we want incl_cm and don't want excl_cm
    if (!all_incl_cms.includes(incl_cm) || all_incl_cms.includes(excl_cm)) return "";
    // Only if a desired form actually learns excl_cm
    if (!incl_pkm.some(p=>{
        const pkm_obj = jb_pkm.find(e=>e.id==p.id&&e.form==p.form);
        return PokemonCanLearn(pkm_obj, excl_cm);
    })) return "";

    return "&!" + incl_pkm[0].id + ",!@" + TranslatedMoveName(excl_cm_id);
}


const knownCollisions = [
    {locale: "en", incl_cm: "Psychic", excl_cm: "Psychic Fangs", excl_cm_id: 353},

    // These locales are not supported yet
    //{locale: "hi", incl_cm: "Psychic", excl_cm: "Psychic Fangs", excl_cm_id: 353},
    //{locale: "tr", incl_cm: "Psychic", excl_cm: "Psychic Fangs", excl_cm_id: 353},

    // These collisions don't actually exist in the game
    /*{locale: "fr", incl_cm: "Fly", excl_cm: "Disarming Voice", excl_cm_id: 84},
    {locale: "fr", incl_cm: "Fly", excl_cm: "Mirror Coat", excl_cm_id: 276},
    {locale: "fr", incl_cm: "Fly", excl_cm: "Magma Storm", excl_cm_id: 386},
    {locale: "fr", incl_cm: "Fly", excl_cm: "High Jump Kick", excl_cm_id: 408},
    {locale: "fr", incl_cm: "Fly", excl_cm: "Thunder Cage", excl_cm_id: 472},*/
]
/**
 * Handle all special cases for overlapping move names
 */
function FixAllMoveTranslationCollisions(incl_pkm, all_incl_cms) {
    let str = "";

    for (const collision of knownCollisions) {
        if (collision.locale == currentLocale) {
            str = str + FixMoveTranslationCollision(incl_pkm, all_incl_cms, 
                collision.incl_cm, collision.excl_cm, collision.excl_cm_id);
        }
    }

    return str;
}

/* Handle special case for typed Hidden Power */
function GetHiddenPowerSearch(pkm_id, all_fms) {
    let hp_types = new Set();
    let non_hp_types = new Set();

    for (const f of all_fms) {
        const move_obj = jb_fm.find(e=>e.name==f);
        const type_name = TranslatedTypeName(move_obj.type);

        if (f.startsWith("Hidden Power"))
            hp_types.add(type_name); 
        else if (f !== "Hidden Power") // skip typeless
            non_hp_types.add(type_name);
    }

    let hp_only_types = hp_types.difference(non_hp_types);

    let str = '&!' + pkm_id + ",!@" + TranslatedMoveName(281); // Hidden Power ID
    for (const t of hp_only_types) {
        str = str + ",@1" + t;
    }

    return str;
}

let lastYieldTime = performance.now();

async function tryYieldToMain(threshold = 16) {
    if (performance.now() - lastYieldTime > threshold) {
        await new Promise(resolve => setTimeout(resolve, 0));
        lastYieldTime = performance.now();
    }
}