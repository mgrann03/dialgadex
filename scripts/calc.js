// magic numbers for incoming damage calc

// estimated incoming average DPS (usually ~900)
// Note: type affinity calcs yield values ~1480 and ~12000
let estimated_y_numerator = 1340; 
// estimated incoming charged move power (basically atk*move power*modifiers, w/o def)
const estimated_cm_power = 11670;



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
    enemy_def = 180, enemy_y = null, real_damage = false) {

    if (!fm_obj || !cm_obj)
        return 0;

    if (!enemy_y)
        enemy_y = {y_num: null, cm_num: null}

    if (!enemy_def)
        enemy_def = 180;
    const y = (enemy_y.y_num ? enemy_y.y_num : estimated_y_numerator) / def;
    const in_cm_dmg = (enemy_y.cm_num ? enemy_y.cm_num : estimated_cm_power) / def;

    let tof = hp / y;

    let x = 0.5 * -cm_obj.energy_delta + 0.5 * fm_obj.energy_delta;
    if (settings_newdps) {
        // Assume waste of all energy from 1 incoming CM
        x = x + 0.5 * in_cm_dmg; 
    }

    // fast move variables
    const fm_dmg_mult = fm_mult
        * ((types.includes(fm_obj.type) && fm_obj.name != "Hidden Power") ? Math.fround(1.2) : 1);
    const fm_dmg = CalcDamage(atk, enemy_def, ProcessPower(fm_obj), fm_dmg_mult, real_damage);
    const fm_dps = fm_dmg / ProcessDuration(fm_obj.duration);
    const fm_eps = fm_obj.energy_delta / ProcessDuration(fm_obj.duration);

    const f_to_c_ratio = (tof * -cm_obj.energy_delta + ProcessDuration(cm_obj.duration) * (x - 0.5 * hp)) / 
        (tof * fm_obj.energy_delta - ProcessDuration(fm_obj.duration) * (x - 0.5 * hp));
    const pp_boost = GetPartyBoost(f_to_c_ratio);

    // charged move variables
    const cm_dmg_mult = cm_mult * ((types.includes(cm_obj.type)) ? Math.fround(1.2) : 1);
    const cm_dmg = CalcDamage(atk, enemy_def, ProcessPower(cm_obj), cm_dmg_mult, real_damage);
    const cm_dps = cm_dmg / ProcessDuration(cm_obj.duration);
    const cm_dps_adj = cm_dps * (1 + pp_boost);
    let cm_eps = -cm_obj.energy_delta / ProcessDuration(cm_obj.duration);
    // penalty to one-bar charged moves in old raid system (they use more energy (cm_eps))
    if (cm_obj.energy_delta == -100) {
        const dws = (settings_pve_turns ? 0 : cm_obj.damage_window_start / 1000); // dws in seconds
        cm_eps = (-cm_obj.energy_delta + 0.5 * fm_obj.energy_delta
            + 0.5 * y * dws) / ProcessDuration(cm_obj.duration);
    }

    // fast move is strictly better
    if (fm_dps > cm_dps)
        return fm_dps;

    // simple cycle DPS
    const dps0 = (fm_dps * cm_eps + cm_dps_adj * fm_eps) / (cm_eps + fm_eps);
    // comprehensive DPS
    let dps = dps0 + ((cm_dps_adj - fm_dps) / (cm_eps + fm_eps))
            * (0.5 - x / hp) * y;

    // charged move is strictly better, and can be used indefinitely
    // (don't allow party power)
    /* Temporarily disable because unrealistic 
     * (usually triggered w/ such high incoming y that charged moves aren't even used)
    if (cm_dps > dps && -cm_obj.energy_delta < y * ProcessDuration(cm_obj.duration) * 0.5) 
        dps = cm_dps;
    */

    return (fm_dps > dps ? fm_dps 
        : (dps > 0 ? dps 
            : 0));
}

/**
 * Gets the TDO of a pokemon using its DPS, HP, DEF and y if known.
 *
 * Formula credit to https://gamepress.gg .
 * https://gamepress.gg/pokemongo/how-calculate-comprehensive-dps
 */
function GetTDO(dps, hp, def, enemy_y) {
    const y = (enemy_y && enemy_y.y_num ? enemy_y.y_num : estimated_y_numerator) / def;

    let tof = hp / y;

    return (dps * tof);
}

/* Returns % extra damage on charged move from party power 
* Clamped between +0-100%
*/
function GetPartyBoost(f_to_c_ratio) {
    if (settings_party_size == 1) return 0;

    let f_moves_per_boost;

    switch (settings_party_size) {
        case 2:
            f_moves_per_boost = 18;
        break;
        case 3:
            f_moves_per_boost = 9;
        break;
        case 4:
            f_moves_per_boost = 6;
        break;
    }

    return Math.max(0, Math.min(f_to_c_ratio / f_moves_per_boost, 1));
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
* 
* More tweaks: 
* Use altered timings between moves
* Better estimate of ratio between charged and fast moves
*/
function GetSpecificY(types, atk, fm_obj, cm_obj, 
    total_incoming_dps = 50) {

    if (!fm_obj || !cm_obj)
        return 0;

    const CHARGED_MOVE_CHANCE = 0.3;
    const ENERGY_PER_HP = 0.5;
    const FM_DELAY = 1.75; // Random between 1.5 and 2.0
    const CM_DELAY = 0.5;

    // fast move variables
    const fm_stab = (types.includes(fm_obj.type) && fm_obj.name != "Hidden Power") ? Math.fround(1.2) : 1;
    const fm_num = 0.5 * ProcessPower(fm_obj) * fm_stab * atk;
    let fm_dur = ProcessDuration(fm_obj.duration);

    // charged move variables
    const cm_stab = (types.includes(cm_obj.type)) ? Math.fround(1.2) : 1;
    const cm_num = 0.5 * ProcessPower(cm_obj) * cm_stab * atk;
    let cm_dur = ProcessDuration(cm_obj.duration);

    let fms_per_cm = 1;
    if (settings_newdps) {
        const eps_for_damage = ENERGY_PER_HP * total_incoming_dps;
        fm_dur = fm_dur + FM_DELAY;
        cm_dur = cm_dur + CM_DELAY;

        fms_per_cm = (-cm_obj.energy_delta - eps_for_damage * cm_dur) /
            (fm_obj.energy_delta + eps_for_damage * fm_dur);
        if (fms_per_cm < 0) fms_per_cm = 0;
        fms_per_cm = fms_per_cm + (1 / CHARGED_MOVE_CHANCE) - 1;
    }
    else {
        switch (cm_obj.energy_delta) {
            case -100:
                fms_per_cm = 3;
                break;
            case -50:
                fms_per_cm = 1.5;
                break;
            case -33:
                fms_per_cm = 1;
                break;
        }

        fms_per_cm = fms_per_cm * 0.5; // used to be 'y_mult'
        fm_dur += 2;
        cm_dur += 2;
    }

    const cycle_dur = fms_per_cm * fm_dur + cm_dur;

    // specific y
    const type_ys = {"Any": {
        y_num: (fms_per_cm * fm_num + cm_num) / cycle_dur,
        cm_num: cm_num
    }};

    if (fm_obj.type == cm_obj.type) {
        type_ys[fm_obj.type] = type_ys["Any"];
    }
    else {
        type_ys[fm_obj.type] = {
            y_num: (fms_per_cm * fm_num) / cycle_dur,
            cm_num: 0
        };
        type_ys[cm_obj.type] = {
            y_num: cm_num / cycle_dur,
            cm_num: cm_num
        }
    }

    return type_ys;
}

/**
* 
*/
function GetTypeAffinity(type, versus = false) {
    // Get list of bosses
    let raid_bosses;
    if (type=="Any")
        raid_bosses = GetRaidBosses();
    else if (versus)
        raid_bosses = GetRaidBosses(null, type);
    else 
        raid_bosses = GetRaidBosses(type, null);

    if (raid_bosses.length == 0) // e.g. when looking for things weak to "Normal"
        raid_bosses = GetRaidBosses();

    // Initialize to 0s
    const avg_effectiveness = new Map();
    const avg_ys = {};
    const avg_stats = {atk: 0, def: 0, hp: 0};
    for (const t of POKEMON_TYPES) {
        avg_effectiveness.set(t, 0);
        avg_ys[t] = {y_num: 0, cm_num: 0};
    }
    avg_ys["Any"] = {y_num: 0, cm_num: 0};
    avg_ys["None"] = {y_num: 0, cm_num: 0};

    // Sum across bosses
    for (const boss of raid_bosses) {
        const effectiveness = GetTypesEffectivenessAgainstTypes(boss.types);
        for (const t of POKEMON_TYPES) {
            avg_effectiveness.set(t, avg_effectiveness.get(t) + GetEffectivenessMultOfType(effectiveness, t));
        }

        const stats = GetRaidStats(boss);
        avg_stats.atk += stats.atk;
        avg_stats.def += stats.def;
        avg_stats.hp += stats.hp;

        const moves = GetPokemonMoves(boss, "Raid Boss");
        const win_dps = stats.hp / (boss.raid_tier >= 4 ? 300 : 180);

        const boss_ys = GetMovesetYs(boss.types, stats.atk, moves[0], moves[1], win_dps);
        const boss_avg_y = GetAvgY(boss_ys);

        for (const t of Object.keys(boss_avg_y)) {
            avg_ys[t].y_num += boss_avg_y[t].y_num;
            avg_ys[t].cm_num += boss_avg_y[t].cm_num;
        }
    }

    // Divide by total
    for (const t of POKEMON_TYPES) {
        avg_effectiveness.set(t, avg_effectiveness.get(t) / raid_bosses.length);
    }
    for (const t of Object.keys(avg_ys)) {
        avg_ys[t].y_num /= raid_bosses.length;
        avg_ys[t].cm_num /= raid_bosses.length;
    }
    avg_stats.atk /= raid_bosses.length;
    avg_stats.def /= raid_bosses.length;
    avg_stats.hp /= raid_bosses.length;

    return {
        weakness: avg_effectiveness,
        enemy_ys: [avg_ys],
        stats: avg_stats
    };
}

/**
* Processes the duration of fast moves and charged moves.
* The input is in milliseconds and the output is in seconds.
* The output differs according to 'settings_raid_system'.
* 
* https://www.reddit.com/r/TheSilphRoad/comments/1f4wqw8/analysis_everything_you_thought_you_knew_about/
*/
function ProcessDuration(duration) {

    if (settings_pve_turns)
        return (Math.round((duration / 1000) * 2) / 2);
    return (duration / 1000);
}


/**
 * Processes the power of fast moves and charged moves.
 * Any move with a calculated modifier above ~10% gets a power adjustment
 * to compensate for their speed buff.
 * The output differs according to 'settings_raid_system'.
 * 
 * https://www.reddit.com/r/TheSilphRoad/comments/1fkrjxx/analysis_dynamax_raid_mechanics_even_more_move/
 */
function ProcessPower(move_obj) {

    if (settings_pve_turns) {
        const newDuration = ProcessDuration(move_obj.duration);
        const modifier = (newDuration - move_obj.duration / 1000) / newDuration;
        if (Math.abs(modifier) >= 0.199)
            return move_obj.power * (1 + modifier);
    }
    
    return move_obj.power;
}

/**
 * Mirrors the damage formula. Can do exact calculation using rounded = true, or
 * approximation with bias for general metrics.
 * 
 * https://gamepress.gg/pokemongo/damage-mechanics
 */
function CalcDamage(atk, def, power, modifiers, rounded = false) {
    if (rounded)
        return Math.floor(Math.fround(0.5 * power * (atk / def) * modifiers)) + 1;
    
    return 0.5 * power * (atk / def) * modifiers + 0.5;
}


/**
 * Gets array with an arbitrary number of a specific pokemon's strongest movesets
 * against a specific enemy pokemon.
 *
 * 'enemy_params' contains moves, types, weakness (defensive mults),  
 *      stats, and enemy_ys[]
*/
function GetStrongestAgainstSpecificEnemy(pkm_obj, shadow, level,
    enemy_params, search_params) {

    const num_movesets = search_params.suboptimal ? 50 : 1;
    let movesets = [];

    // gets the necessary data to make the rating calculations

    // subject data
    const types = pkm_obj.types;
    const effectiveness = GetTypesEffectivenessAgainstTypes(types);
    const stats = GetPokemonStats(pkm_obj, level);
    stats.hp = Math.floor(stats.hp);
    const atk = (shadow) ? (stats.atk * Math.fround(1.2)) : stats.atk;
    const def = (shadow) ? (stats.def * Math.fround(0.8333333)) : stats.def;
    const hp = stats.hp;
    const moves = GetPokemonMoves(pkm_obj, "All");
    if (moves.length != 6)
        return movesets;
    const fms = moves[0];
    const cms = moves[1];
    const elite_fms = moves[2];
    let elite_cms = moves[3];
    const pure_only_cms = moves[4];
    const shadow_only_cms = moves[5];
    if (shadow === true) elite_cms = elite_cms.concat(shadow_only_cms);
    else if (shadow === false) elite_cms = elite_cms.concat(pure_only_cms);
    const all_fms = fms.concat(elite_fms);
    const all_cms = cms.concat(elite_cms);

    // enemy data
    //let avg_y = null;
    let enemy_moveset_ys = enemy_params.enemy_ys;
    const enemy_types = enemy_params.types;
    const enemy_effectiveness = enemy_params.weakness;
    const enemy_stats = enemy_params.stats;
    const enemy_def = enemy_stats ? enemy_stats.def : null;
    const enemy_moves = enemy_params.moves;
    if ((!enemy_moveset_ys || enemy_moveset_ys.length == 0)
            && enemy_moves && enemy_moves.length == 6
            && enemy_stats) {
        const enemy_fms = enemy_moves[0];
        const enemy_cms = enemy_moves[1];
        const enemy_elite_fms = []; //enemy_moves[2]; enemies don't use elite moves
        const enemy_elite_cms = []; //enemy_moves[3];
        const enemy_all_fms = enemy_fms.concat(enemy_elite_fms);
        const enemy_all_cms = enemy_cms.concat(enemy_elite_cms);
        const incoming_dps = enemy_params.win_dps ?? 50;
        enemy_moveset_ys = GetMovesetYs(enemy_types, enemy_stats.atk, enemy_all_fms, enemy_all_cms, incoming_dps);
        //avg_y = GetAvgY(enemy_moveset_ys);
    }

    // searches for the movesets
    for (fm of all_fms) {

        const fm_is_elite = elite_fms.includes(fm);

        if (!search_params.elite && fm_is_elite)
            continue;

        // gets the fast move object
        const fm_obj = jb_fm.find(entry => entry.name == fm);
        if (!fm_obj)
            continue;

        // checks that fm type matches the type searched
        // if search type isn't specified, any type goes
        // if checking "versus", any type goes
        if (search_params.type && search_params.type != "Any" && !search_params.versus &&
            fm_obj.type != search_params.type && !search_params.mixed)
            continue;

        const fm_mult =
            GetEffectivenessMultOfType(enemy_effectiveness, fm_obj.type);

        for (cm of all_cms) {

            const cm_is_elite = elite_cms.includes(cm);

            if (!search_params.elite && cm_is_elite)
                continue;

            // gets the charged move object
            const cm_obj = jb_cm.find(entry => entry.name == cm);
            if (!cm_obj)
                continue;

            // checks that cm type matches the type searched
            // if search type isn't specified, any type goes
            // if checking "versus", any type goes
            if (search_params.type && search_params.type != "Any" && !search_params.versus && 
                cm_obj.type != search_params.type && !search_params.mixed)
                continue;

            // ensure at least one type matches if mixing
            // or that off-types are allowed
            if (search_params.type && search_params.type != "Any" && !search_params.versus && !search_params.offtype &&
                search_params.mixed && fm_obj.type != search_params.type && cm_obj.type != search_params.type)
                continue;

            // checks that both moves types are equal (unless mixing)
            if (fm_obj.type != cm_obj.type && !search_params.mixed)
                continue;
            
            const cm_mult =
                GetEffectivenessMultOfType(enemy_effectiveness, cm_obj.type);
            
            let all_ratings = [];
            for (enemy_y of enemy_moveset_ys) {
                const y = AvgYAgainst(enemy_y, effectiveness);

                // calculates the data
                const dps = GetDPS(types, atk, def, hp, fm_obj, cm_obj,
                    fm_mult, cm_mult, enemy_def, y, search_params.real_damage);
                const tdo = GetTDO(dps, hp, def, y);
                // metrics from Reddit user u/Elastic_Space
                const rat = GetMetric(dps, tdo, pkm_obj, enemy_params);
                all_ratings.push({rat: rat, dps: dps, tdo: tdo});
            }

            let avg_rating = {rat: 0, dps: 0, tdo: 0};
            all_ratings.forEach(r => {
                avg_rating.rat += r.rat;
                avg_rating.dps += r.dps;
                avg_rating.tdo += r.tdo;
            });
            if (all_ratings.length > 0) {
                avg_rating.rat /= all_ratings.length;
                avg_rating.dps /= all_ratings.length;
                avg_rating.tdo /= all_ratings.length;
            }
            const moveset = {
                rat: avg_rating.rat, dps: avg_rating.dps, tdo: avg_rating.tdo,
                all_rat: all_ratings,
                fm: fm, fm_is_elite: fm_is_elite, fm_type: fm_obj.type,
                cm: cm, cm_is_elite: cm_is_elite, cm_type: cm_obj.type
            };
            // if the array of movesets isn't full
            // or the current moveset is stronger than the weakest in the array,
            // pushes the current moveset to the array
            if (movesets.length < num_movesets) {
                movesets.push(moveset);
                // sorts array
                //movesets.sort(function compareFn(a , b) {
                //    return ((a.rat > b.rat) || - (a.rat < b.rat));
                //});
            } else if (avg_rating.rat > movesets[0].rat) {
                movesets[0] = moveset;
                // sorts array
                movesets.sort(function compareFn(a , b) {
                    return ((a.rat > b.rat) || - (a.rat < b.rat));
                });
            }
        }
    }

    // sorts array
    movesets.sort(function compareFn(a , b) {
        return ((a.rat > b.rat) || - (a.rat < b.rat));
    });
    return movesets;
}

/**
* Gets the average of all the moveset ys
*/
function GetAvgY(all_ys) {
    // Sum all the ys
    const avg_ys = all_ys.reduce((acc, this_y) => {
        for (const type of Object.keys(this_y)) {
            if (!(type in acc))
                acc[type] = {y_num: 0, cm_num: 0};

            acc[type].y_num = acc[type].y_num + this_y[type].y_num;
            acc[type].cm_num = acc[type].cm_num + this_y[type].cm_num;
        }

        return acc;
    }, {});
    
    // Divide to calculate avgs
    Object.keys(avg_ys).forEach(type=>{
        avg_ys[type].y_num /= all_ys.length;
        avg_ys[type].cm_num /= all_ys.length;
    });

    return avg_ys;
}

/**
* Gets the y_num of all the movesets of a specific pokemon attacking
* a specific enemy.
*/
function GetMovesetYs(types, atk, fms, cms, total_incoming_dps = 50) {
    let all_ys = [];

    for (let fm of fms) {
        // gets the fast move object
        const fm_obj = jb_fm.find(entry => entry.name == fm);
        if (!fm_obj)
            continue;

        for (let cm of cms) {
            // gets the charged move object
            const cm_obj = jb_cm.find(entry => entry.name == cm);
            if (!cm_obj)
                continue;

            all_ys.push(GetSpecificY(types, atk, fm_obj, cm_obj, total_incoming_dps));
        }
    }

    return all_ys;
}

/**
 * Searches the strongest pokemon of each type and returns the strongest
 * pokemon per type.
 */
function GetStrongestOfEachType(search_params) {
    // map of strongest pokemon and moveset found so far for each type
    let str_pokemons = new Map();

    // build a basic enemy to "sim" against
    let enemy_params;

    for (const type of POKEMON_TYPES) {
        search_params.type = type; // Find strongest movesets regardless of type
        if (settings_type_affinity) {
            enemy_params = GetTypeAffinity(search_params.type, true);
        }
        else {
            enemy_params = {
                weakness: GetTypesEffectivenessSingleBoost(search_params.type),
                enemy_ys: [{"Any": {y_num: null, cm_num: null} }], // use defaults
                stats: {atk: null, def: 180, hp: 1000000000} // Use huge HP to approach "theoretical" eDPS
            };
        }

        const str_pok = GetStrongestVersus(enemy_params, search_params, 1)[0];
        str_pokemons.set(type, str_pok);
    }

    // converts map into array
    let str_pokemons_array = [];
    for (const type of POKEMON_TYPES) {
        if (str_pokemons.has(type))
            str_pokemons_array.push(str_pokemons.get(type));
    }
    return str_pokemons_array;
}

/**
 * Searches the strongest pokemon of one type and returns the strongest
 * pokemon of that type.
 */
function GetStrongestOfOneType(search_params) {

    // build a basic enemy to "sim" against
    let enemy_params;
    if (settings_type_affinity) {
        enemy_params = GetTypeAffinity(search_params.type, !search_params.versus);
        UpdateAffinityTooltip(enemy_params);
    }
    else {
        enemy_params = {
            weakness: (search_params.versus ? 
                GetTypesEffectivenessAgainstTypes([search_params.type]) : 
                GetTypesEffectivenessSingleBoost(search_params.type)),
            enemy_ys: [{"Any": {y_num: null, cm_num: null} }], // use defaults
            stats: {atk: null, def: 180, hp: 1000000000} // Use huge HP to approach "theoretical" eDPS
        };
    }

    // array of strongest pokemon and moveset found so far
    let str_pokemons = GetStrongestVersus(enemy_params, search_params);

    // reverses strongest pokemon array
    str_pokemons.reverse();

    return str_pokemons;
}

/**
 * Find all strongest counters to this pokemon, filtering based on params
 */
function GetStrongestVersus(enemy_params, search_params, num_counters = 100000) {
    const counters = [];

    /**
     * Checks if any of the movesets of a specific pokemon is stronger than any
     * of the current counters. If it is, updates the counters arrays.
     */
    function UpdateIfStronger(pkm_obj, shadow, level, search_params) {
        const movesets = GetStrongestAgainstSpecificEnemy(pkm_obj, shadow, level, enemy_params, search_params);
        if (movesets.length == 0)
            return;

        for (let moveset of movesets) {

            let is_strong_enough = false;

            let not_full = counters.length < num_counters;
            let weakest = counters[0];

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
                    rat: moveset.rat, dps: moveset.dps, tdo: moveset.tdo,
                    all_rat: moveset.all_rat,
                    id: pkm_obj.id,
                    name: pkm_obj.name, form: pkm_obj.form,
                    shadow: shadow, class: pkm_obj.class,
                    level: level,
                    fm: moveset.fm, fm_is_elite: moveset.fm_is_elite,
                    fm_type: moveset.fm_type,
                    cm: moveset.cm, cm_is_elite: moveset.cm_is_elite,
                    cm_type: moveset.cm_type
                };

                
                if (counters.length < num_counters)
                    counters.push(counter);
                else {
                    counters[0] = counter;
                    // sorts array
                    counters.sort(function compareFn(a , b) {
                        return ((a.rat > b.rat) || - (a.rat < b.rat));
                    });
                }
            }
        }
    }

    SearchAll(search_params, UpdateIfStronger);

    // sorts array
    counters.sort(function compareFn(a , b) {
        return ((a.rat > b.rat) || - (a.rat < b.rat));
    });
    return counters;
}


/**
 * Give the effective DPS when accounting for relobbying after every 6 deaths
 */
function GetEDPS(dps, tdo, pkm_obj = null, enemy_params = null) {
    const RESPAWN_TIME = 1;
    const REJOIN_TIME = settings_relobbytime;
    const RAID_PARTY_SIZE = (pkm_obj.form == "Mega" || pkm_obj.form == "MegaY" || pkm_obj.form == "MegaZ" ) ? settings_team_size_mega : settings_team_size_normal;
    const hp = (enemy_params && enemy_params.stats && enemy_params.stats.hp) ? enemy_params.stats.hp : 1000000000;

    const tof = tdo/dps;
    const lives = hp / tdo; // total number of attacker-lives needed to kill raid boss
    const deaths = Math.ceil(lives)-1; // total number of deaths experienced
    const relobbies = Math.floor(deaths / RAID_PARTY_SIZE); // total relobby penalties incurred (1 relobby per certain # of deaths)
    const ttw = (lives * tof + (deaths-relobbies) * RESPAWN_TIME + REJOIN_TIME * relobbies); // total battle time (time spent attacking + time spent relobbying)

    // naive formula
    //const edps = (RAID_PARTY_SIZE * tdo) / (RAID_PARTY_SIZE * tof + REJOIN_TIME);
    
    return hp / ttw;
}

function GetMetric(dps, tdo, pkm_obj = null, enemy_params = null) {
    switch (settings_metric) {
        case "eDPS":
            return GetEDPS(dps, tdo, pkm_obj, enemy_params);
        default:
            // metrics from Reddit user u/Elastic_Space
            return Math.pow(dps, 1-settings_metric_exp) * Math.pow(tdo, settings_metric_exp);
    }
}

/**
 * Apply a type-separated enemy_y across a target's weakness multipliers
 */
function AvgYAgainst(enemy_y, effectiveness) {
    let y = {
        y_num: 0,
        cm_num: 0
    };
    for (const t of Object.keys(enemy_y)) {
        if (t == "Any") continue;
        let mult = GetEffectivenessMultOfType(effectiveness, t);
        if (isNaN(mult)) mult = 1;
        y.y_num += enemy_y[t].y_num * mult;
        y.cm_num += enemy_y[t].cm_num * mult;
    }

    return y;
}

// Calculate attributes of the array according to Gaussian distribution
function CalcDistribution(arr) {
    let dist = {};

    arr = arr.filter(e=>!isNaN(e));

    dist.n = arr.length;
    dist.mean = CalcMean(arr);
    const all_sses = arr.map(v=>(v-dist.mean)**2);
    dist.variance = CalcMean(all_sses);
    dist.std = Math.sqrt(dist.variance);
    //dist.max = arr.reduce((a,b)=>Math.max(a,b), 0);

    return dist;
}

// Average all numbers in array
function CalcMean(arr) {
    return (arr.reduce((a,b)=>a+b, 0)) / arr.length;
}

// Find relative location of entry according to the Gaussian distribution
function CalcZScore(value, dist) {
    return (value-dist.mean)/dist.std;
}

// Force num to be inside the specified range
function Clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

/**
 * Format a decimal value with spaces in the left-padding and rounding-off fractional parts
 * (Aligns the decimal point for the whole column)
 */
function FormatDecimal(val, minIntDigits, minFracDigits, maxFracDigits) {
    if (val==0)
        return "&#8199;".repeat(minIntDigits-1) + "0";

    return "&#8199;".repeat(Math.max(0, minIntDigits - Math.floor(Math.max(0,Math.log10(val)) + 1)))
        + val.toLocaleString(currentLocale, { minimumFractionDigits: minFracDigits, maximumFractionDigits: maxFracDigits });
}