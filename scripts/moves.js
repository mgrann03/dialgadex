let top_move_users, all_move_data;

let cur_sort = {
    move_data: [], 
    move_type: "Any",
    move_kind: "Fast", 
    sort_by: "", 
    reverse: false
};

/**
 * Bind event handlers for a move data table
 */
function BindMoveData() {
    $("#chk-move-kind").on("change", function() {
        LoadMovesAndUpdateURL(cur_sort.move_type)
    });

    // Update types based on selector
    $("#move-type-links-bytype").on("type-change", function (event) {
        LoadMovesAndUpdateURL(event.detail.type);
    });
}

/**
 * Loads the list of the moves of a specific type in pokemon go.
 * The type can be 'any' or an actual type.
 */
async function LoadMoves(type = "Any", kind) {
    cur_sort.move_type = type;

    // displays what should be displayed 
    await LoadPage("move-data");

    // Handle logic for "kind"
    if (kind === undefined) 
        kind = ($("#chk-move-kind").prop("checked") ? "Charged" : "Fast"); // preserve move-kind param
    $("#chk-move-kind").prop("checked", kind == "Charged");
    cur_sort.move_kind = kind; 

    document.getElementById("move-type-links-bytype").setHrefs((type) => {
        return`/?moves=` + kind + `&t=${type}`
    });

    // sets titles
    document.title = FormatTranslation("meta.moves.title", {
        type: (cur_sort.move_type == "Any" ? "" : GetTranslation("pokedata.types." + cur_sort.move_type, cur_sort.move_type)),
        kind: GetTranslation("terms." + cur_sort.move_kind.toLowerCase() + "-plural")
    });
    $("#move-type-title").text(cur_sort.move_type == "Any" ? "" : GetTranslation("pokedata.types." + cur_sort.move_type));
    $("#move-type-helper").text(cur_sort.move_type == "Any" ? "" : GetTranslation("moves.type-helper"));

    // sets description
    $('meta[name=description]').attr('content', 
        FormatTranslation("meta.moves.description", {
            type: (type == "Any" ? "" : GetTranslation("pokedata.types." + type, type)),
            kind: GetTranslation("terms." + cur_sort.move_kind.toLowerCase() + "-plural")
        }));

    BuildMoveUserMap();
    cur_sort.move_data = GetMoveData(cur_sort.move_type, cur_sort.move_kind);
    SetMoveTable(cur_sort);

    // Prevent link
    return false;
}

/**
 * Calls the 'LoadMoves' function and updates the url accordingly.
 */
function LoadMovesAndUpdateURL(type = "Any", move_kind) {
    if (!move_kind) {
        move_kind = $("#chk-move-kind").prop("checked") ? "charged" : "fast";
    }
    else {
        $("#chk-move-kind").prop("checked", (move_kind.toLowerCase() == "charged"));
    }
    // override cur_sort back to move_kind default
    cur_sort.sort_by = undefined;

    let url = "?moves=" + move_kind + "&t=" + type;

    UpdateURL(url);

    return LoadMoves(type);
}

/**
 * Updates the move data table with a new sort order
 */
function MoveSort(sort_by) {
    if (cur_sort.sort_by == sort_by)
        cur_sort.reverse = !cur_sort.reverse;
    else
        cur_sort.reverse = false;
    
    cur_sort.sort_by = sort_by;
    SetMoveTable(cur_sort);
}

/**
 * Adds rows to the move data table according to an input array.
 * Also sets the appropriate headers depending on what kind of move is displayed.
 */
function GetMoveData(type = "Any", move_kind = "Fast") {
    if (all_move_data) {
        return all_move_data.filter(e=>(e.type==type||type=="Any")
            &&e.kind==move_kind);
    }

    all_move_data = [];
    all_move_data = all_move_data.concat(
        jb_cm.filter(e=>
            e.power < 1000
            &&!e.name.includes("Blastoise")
            &&!['Leech Life', 'Crush Claw', 'Wrap Pink', 'Wrap Green'].includes(e.name))
        .map(e=> ({...e, kind: "Charged"})));
    all_move_data = all_move_data.concat(
        jb_fm.filter(e=>
            e.name!="Hidden Power")
        .map(e=> ({...e, kind: "Fast"})));
        
    all_move_data.sort((a,b)=>(a.name.localeCompare(b.name, currentLocale)));
    //all_move_data.sort((a,b)=>(a.type.localeCompare(b.type)));
        
    all_move_data = all_move_data.map(e=>({
        id: e.id,
        name: e.name,
        display_name: TranslatedMoveName(e.id, e.type),
        kind: e.kind,
        type: e.type,
        power: e.power,
        energy: Math.abs(e.energy_delta),
        duration: e.duration / 1000,
        pps: e.power / e.duration * 1000,
        eps: Math.abs(e.energy_delta) / e.duration * 1000,
        ppe: (e.energy_delta != 0) ? 
            e.power / Math.abs(e.energy_delta) : 
            0,
        p2pes: (e.energy_delta != 0) ? 
            e.power * e.power / (Math.abs(e.energy_delta) * e.duration / 1000) :
            0,
        peps2: Math.abs(e.energy_delta) * e.power / e.duration * 1000 / e.duration * 1000,
    }));

    return all_move_data.filter(e=>(e.type==type||type=="Any")
        &&e.kind==move_kind);
}

const MAX_USERS = 3;
/**
 * Creates a lookup map for later use, containing the Top [MAX_USERS] pokemon
 * who learn each move (sorted by attack stat)
 */
function BuildMoveUserMap(force_reload = false) {
    if (top_move_users && !force_reload) return; // Build only once
    top_move_users = new Map();

    for (const pkm of jb_pkm) {
        if (!pkm.released) continue;

        let moves = GetPokemonMoves(pkm, "Type-Match");
        moves = moves.reduce((agg,e)=>agg.concat(e),[]);

        for (const m of moves) {
            if (top_move_users.has(m)) {
                let cur_top = top_move_users.get(m);
                
                if (cur_top.length < MAX_USERS ||
                        GetAdjustedAttStat(pkm, m) > GetAdjustedAttStat(cur_top[0], m)) {
                    cur_top.push(pkm);
                    cur_top.sort((a,b)=>GetAdjustedAttStat(a,m)-GetAdjustedAttStat(b,m));
                    if (cur_top.length > MAX_USERS) {
                        cur_top.shift();
                    }
                }
            }
            else {
                top_move_users.set(m, [pkm]);
            }
        }
    }
}
/**
 * Clear move user cache (can rebuild later as needed)
 */
function ClearMoveUserMap() {
    top_move_users = null;
}
/**
 * Clear move data cache (can rebuild later as needed)
 */
function ClearMoveData() {
    all_move_data = null;
}

/** 
 * Helper function to get an "effective" attack stat for sorting and finding
 * the Pokemon best able to utilize a move.
 * 
 * +20% if a shadow form exists
 * +100% if type matches (should be +20% for STAB, but this really emphasizes the most typical use)
 */
function GetAdjustedAttStat(pkm_obj, move_name) {
    let move_obj = jb_fm.find(e=>e.name==move_name);
    if (!move_obj) move_obj = jb_cm.find(e=>e.name==move_name);

    return pkm_obj.stats.baseAttack * 
        (pkm_obj.shadow ? 1.2 : 1) *
        (pkm_obj.types.includes(move_obj.type) ? 2 : 1); // STAB is 1.2, but really incentivize it here
}

// Small Factory function for making TDs, to replace some repetition
function MoveDataTD(innerHTML, is_selected) {
    return `<td ${(is_selected ? " class='selected'" : "")}>${innerHTML}</td>`;
}

// Small Factory function for making bars for charged move energy
function EnergyTD(energy) {
    let innerHTML = "<td>" 
        + "<div class='bar-bg' style='width: calc(100% - 15px); margin: 0'>";
    for (let i=0; i<(energy==0 ? 1 : Math.round(100/energy)); i++) {
        innerHTML += 
            "<div class='bar-fg' style='width: calc("+ energy + "% - 4px); margin: 2px; border-radius: 4px'>"
                + (i == 0 ? "<span class='bar-txt'>" + energy + "</span>" : "&nbsp;")
            + "</div>";
    }
    innerHTML += "</div></td>";

    return innerHTML;
}

/**
 * Adds rows to the move data table according to an input array.
 * Also sets the appropriate headers depending on what kind of move is displayed.
 */
function SetMoveTable(sort_info) {
    // sort as specified
    if (!sort_info.sort_by || sort_info.move_data[0][sort_info.sort_by] == undefined) 
        sort_info.sort_by = (sort_info.move_kind == "Charged" ? "p2pes" : "peps2");

    if (sort_info.sort_by == "name") // sort as string
        sort_info.move_data.sort((a,b)=>(a.display_name.localeCompare(b.display_name, currentLocale)));
    else
        sort_info.move_data.sort((a,b)=>(b[sort_info.sort_by]-a[sort_info.sort_by]));

    if (sort_info.reverse)
        sort_info.move_data.reverse();

    // update header based on sort order
    let triangles = $("#move-data-table .th-triangle");
    for (triangle of triangles)
        triangle.remove();
    $("#move-"+sort_info.sort_by).append("<span class=th-triangle>" + (sort_info.reverse ? "▴" : "▾") + "</span>");

    // removes previous table rows
    $("#move-data-table tbody tr").remove();

    for (const [i, md] of sort_info.move_data.entries()) {
        const tr = $("<tr></tr>");
        tr.addClass((i%2 ? "odd" : "even"));
        
        const td_move_name = $("<td></td>");
        if (sort_info.sort_by == "name")
            td_move_name.addClass("selected");
        const span_move_name = $(`<span class='type-text'>${md.display_name}</span>`);
        span_move_name.addClass("bg-" + ((md.name == "Hidden Power") ? "any-type" : md.type));
        span_move_name.on("click", function() { OpenMoveEditor(md.name) });
        td_move_name.append(span_move_name);

        const td_power = MoveDataTD(FormatDecimal(md.power,3,0,0), 
            sort_info.sort_by=="power");
        const td_energy = (sort_info.move_kind == "Charged") ? 
            EnergyTD(md.energy) :
            MoveDataTD(FormatDecimal(md.energy,2,0,0), sort_info.sort_by=="energy");
        const td_duration = MoveDataTD(FormatDecimal(md.duration,1,1,1) + "s", 
            sort_info.sort_by=="duration");
        const td_pps = MoveDataTD(FormatDecimal(md.pps,3,0,2), 
            sort_info.sort_by=="pps");
        
        tr.append(td_move_name);
        tr.append(td_power);
        tr.append(td_energy);
        tr.append(td_duration);
        tr.append(td_pps);

        if (sort_info.move_kind == "Charged") {
            $("#move-ppe").css("display", "");
            tr.append(MoveDataTD(FormatDecimal(md.ppe,3,0,2),
                sort_info.sort_by=="ppe"));
            $("#move-p2pes").css("display", "");
            tr.append(MoveDataTD(FormatDecimal(md.p2pes,3,0,2), 
                sort_info.sort_by=="p2pes"));

            $("#move-peps2").css("display", "none");
            $("#move-eps").css("display", "none");
        }
        else { // "Fast"
            $("#move-ppe").css("display", "none");
            $("#move-p2pes").css("display", "none");
            
            $("#move-eps").css("display", "");
            tr.append(MoveDataTD(FormatDecimal(md.eps,2,0,2), 
                sort_info.sort_by=="eps"));
            $("#move-peps2").css("display", "");
            tr.append(MoveDataTD(FormatDecimal(md.peps2,3,0,2), 
                sort_info.sort_by=="peps2"));
        }

        const td_users = $("<td></td>")
        const users = top_move_users.get(md.name);
        if (users) {
            //users.sort((a,b)=>b.stats.baseAttack-a.stats.baseAttack);
            for (let i=Math.min(users.length,MAX_USERS)-1; i>=0; i--) {
                const coords = GetPokemonIconCoords(users[i].id, users[i].form);

                const mon_link = $("<a class='pokemon-icon'></a>");
                mon_link.attr("href", "/?p=" + users[i].id + "&f=" + users[i].form);
                mon_link.css("background-image", `url(${ICONS_URL})`);
                mon_link.css("background-position", coords.x + "px " + coords.y + "px");
                mon_link.on("click", function(e) {
                    e.preventDefault();
                    LoadPokedexAndUpdateURL(GetPokeDexMon(users[i].id, users[i].form));
                });

                td_users.append(mon_link);
            }
        }
        tr.append(td_users);
        
        $("#move-data-table tbody").append(tr);
    }
}

/**
 * Returns a copy of the move array based on the input moveKind
 */
function GetMovesOfKind(moveKind = "any") {
    let moveList = [];
    if (moveKind == "fm" || moveKind == "any")
        jb_fm.forEach(e => moveList.push({...e, display_name: TranslatedMoveName(e.id, e.type)}));
    if (moveKind == "cm" || moveKind == "any")
        jb_cm.forEach(e => moveList.push({...e, display_name: TranslatedMoveName(e.id, e.type)}));
    moveList = moveList.sort((a,b)=>(a.display_name.localeCompare(b.display_name, currentLocale)));;

    return moveList;
}
