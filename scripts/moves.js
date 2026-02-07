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
    // Enemy type
    $("#chk-move-kind").change(function() {
        const urlParams = new URLSearchParams(window.location.search);
        
        urlParams.set('moves', this.checked ? "charged" : "fast");
        cur_sort.sort_by = (this.checked ? "p2pes" : "peps2");
        
        window.history.pushState({}, "", "?" + urlParams.toString().replace(/=(?=&|$)/gm, ''));
        
        CheckURLAndAct();
    });
    
    // Move Editor
    $("#move-edit-icon").click(function() {
        OpenMoveEditor();
    });
    $("#move-edit").on("close", function(e) {
        if (e.target === e.currentTarget) {// only apply to this, not children
            $("#overlay").removeClass("active");

            if (made_edits) {
                ClearTypeTiers();
                ClearMoveUserMap();
                ClearMoveData();

                CheckURLAndAct();
                made_edits = false;
            }
        }
    });

    $("#move-edit-type").change(function() {
        $("#move-edit-type").attr("class", "type-text bg-"+$("#move-edit-type").val());
    });
    $("#move-edit-kind").change(function(e) {
        if ($("#move-edit-kind").prop("checked")) { // Charged
            $("#move-edit-energygroup").css("display", "none");
            $("#move-edit-energybar").css("display", "");

            $("#move-edit-energybar").html("");
            let energy = parseInt($("#move-edit-energy").val());
            if (isNaN(energy)) energy = -50;
            switch (energy) {
                case 33:
                case -33:
                    $("#move-edit-energy").val(-33);
                    $("#move-edit-energybar").append("<div class='bar-fg'>&nbsp;</div>");
                    $("#move-edit-energybar").append("<div class='bar-fg'>&nbsp;</div>");
                    $("#move-edit-energybar").append("<div class='bar-fg'>&nbsp;</div>");
                    break;
                default:
                case 50:
                case -50:
                    $("#move-edit-energy").val(-50);
                    $("#move-edit-energybar").append("<div class='bar-fg'>&nbsp;</div>");
                    $("#move-edit-energybar").append("<div class='bar-fg'>&nbsp;</div>");
                    break;
                case 100:
                case -100:
                    $("#move-edit-energy").val(-100);
                    $("#move-edit-energybar").append("<div class='bar-fg'>&nbsp;</div>");
                    break;
            }

            $("#move-edit-power").val(Math.max(10,Math.min(Math.round(parseInt($("#move-edit-power").val())/5)*5, 300)));
            $("#move-edit-power").attr("min", 10);
            $("#move-edit-power").attr("max", 300);
            $("#move-edit-power").attr("step", 5);
        }
        else { // Fast
            $("#move-edit-energygroup").css("display", "");
            $("#move-edit-energybar").css("display", "none");
            if ($("#move-edit-energy").val()<0)
                $("#move-edit-energy").val(10);
            
            $("#move-edit-power").attr("min", 0);
            $("#move-edit-power").attr("max", 50);
            $("#move-edit-power").attr("step", 1);
        }
    });
    $("#move-edit-energybar").click(function (e) {
        // Cycle through bars
        let energy = parseInt($("#move-edit-energy").val());
        if (isNaN(energy)) energy = -50;
        switch (energy) {
            case -33:
                $("#move-edit-energy").val(-100);
                break;
            case -50:
                $("#move-edit-energy").val(-33);
                break;
            case -100:
            default:
                $("#move-edit-energy").val(-50);
                break;
        }
        $("#move-edit-kind").trigger("change"); // update bar display
    });
    $("label[for=move-edit-kind]").on("focus", function(e) { e.preventDefault(); });
    $("label[for=move-edit-kind]").on("keydown", function(e) { 
        if (e.keyCode == 32) {
            $("#move-edit-kind").click();
            e.preventDefault();
        }
    });
    $("#any-search-box").on("input", function(e) {
        UpdateMoveEditor($("#any-search-box").val(), false);
    });
    $("#move-edit-clear").click(function() {
        UpdateMoveEditor();
    });
    $("#move-edit-apply").click(function() {
        if (ValidateMove()) {
            AddEditMove();
            
            $("#move-edit-apply").attr("value", $("#move-edit-apply").attr("value") + "ed!");
            setTimeout(()=>{ UpdateMoveEditor() }, 1000);
        }
    });
    $("#move-edit-delete").click(function() {
        DeleteMove($("#any-search-box").val());
        UpdateMoveEditor();
    });

    let repeat_chain = 0, repeat_interval = 600;
    $("#move-edit input.minus").on("mousedown", function (e) {
        const numField = $("#" + e.currentTarget.dataset.id);

        function updFunc(rChain) {
            if (repeat_chain != rChain) return;

            let v = parseFloat(numField.val());
            if (isNaN(v)) v = 0;
            const s = parseFloat(numField.attr("step"));
            const n = parseFloat(numField.attr("min"));
            const x = parseFloat(numField.attr("max"));
            numField.val(Math.max(n, Math.min(v - s, x)));

            if (repeat_interval > 100) repeat_interval = repeat_interval * 0.75;
            setTimeout(()=>{updFunc(rChain)}, repeat_interval);
        };
        repeat_chain = repeat_chain + 1;
        repeat_interval = 600;
        updFunc(repeat_chain);
    });
    $("#move-edit input.plus").on("mousedown", function (e) {
        const numField = $("#" + e.currentTarget.dataset.id);
        
        function updFunc(rChain) {
            if (repeat_chain != rChain) return;

            let v = parseFloat(numField.val());
            if (isNaN(v)) v = 0;
            const s = parseFloat(numField.attr("step"));
            const n = parseFloat(numField.attr("min"));
            const x = parseFloat(numField.attr("max"));
            numField.val(Math.max(n, Math.min(v + s, x)));

            if (repeat_interval > 100) repeat_interval = repeat_interval * 0.75;
            setTimeout(()=>{updFunc(rChain)}, repeat_interval);
        };
        repeat_chain = repeat_chain + 1;
        repeat_interval = 600;
        updFunc(repeat_chain);
    });
    $("#move-edit input.minus, #move-edit input.plus").on("mouseup", function () {
        repeat_chain = repeat_chain + 1;
        repeat_interval = 600;
    });
}

/**
 * Loads the list of the moves of a specific type in pokemon go.
 * The type can be 'any' or an actual type.
 */
async function LoadMoves(type = "Any") {
    cur_sort.move_type = type;

    // displays what should be displayed 
    await LoadPage("move-data");
    
    // sets selected link
    $("#move-type-links li").removeClass("selected");
    if (type == "Any")
        $("#any-type-move-link").addClass("selected");
    else 
        $("#move-type-links li:has(a.bg-"+type+")").addClass("selected");

    // Handle logic for "versus"
    const move_kind_chk = $("#chk-move-kind");
    cur_sort.move_kind = move_kind_chk.prop("checked") ? "Charged" : "Fast";

    // sets titles
    let title = (cur_sort.move_type == "Any" ? "" : cur_sort.move_type + "-type ") + 
        cur_sort.move_kind + " Moves";
    document.title = title + " - DialgaDex"; // page title
    $("#move-type-title").text(cur_sort.move_type == "Any" ? "" : cur_sort.move_type + "-type");

    // sets description
    $('meta[name=description]').attr('content', 
        "All the hidden move data attributes for " + 
        (type == "Any" ? "" : type + " ") + cur_sort.move_kind + 
        " moves in Pokémon Go. " + 
        "Includes metrics which evaluate how effective each move is.");

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

    window.history.pushState({}, "", url);

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
        
    all_move_data.sort((a,b)=>(a.name.localeCompare(b.name)));
    //all_move_data.sort((a,b)=>(a.type.localeCompare(b.type)));
        
    all_move_data = all_move_data.map(e=>({
        name: e.name,
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
        sort_info.move_data.sort((a,b)=>(a.name.localeCompare(b.name)));
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
        
        const td_move_name ="<td" + (sort_info.sort_by=="name" ? " class='selected'" : "") + ">" + 
                "<span class='type-text bg-" +
                ((md.name == "Hidden Power") ? "any-type" : md.type) + "'" +
                " onclick=\"OpenMoveEditor('" + md.name + "')\">" +
                md.name +
            "</span></td>";

        const td_power = MoveDataTD(FormatDecimal(md.power,3,0), 
            sort_info.sort_by=="power");
        const td_energy = (sort_info.move_kind == "Charged") ? 
            EnergyTD(md.energy) :
            MoveDataTD(FormatDecimal(md.energy,2,0), sort_info.sort_by=="energy");
        const td_duration = MoveDataTD(md.duration.toFixed(1) + "s", 
            sort_info.sort_by=="duration");
        const td_pps = MoveDataTD(FormatDecimal(md.pps,3,2), 
            sort_info.sort_by=="pps");
        
        tr.append(td_move_name);
        tr.append(td_power);
        tr.append(td_energy);
        tr.append(td_duration);
        tr.append(td_pps);

        if (sort_info.move_kind == "Charged") {
            $("#move-ppe").css("display", "");
            tr.append(MoveDataTD(
                md.ppe.toLocaleString("en", { maximumFractionDigits: 2 }),
                sort_info.sort_by=="ppe"));
            $("#move-p2pes").css("display", "");
            tr.append(MoveDataTD(FormatDecimal(md.p2pes,3,2), 
                sort_info.sort_by=="p2pes"));

            $("#move-peps2").css("display", "none");
            $("#move-eps").css("display", "none");
        }
        else { // "Fast"
            $("#move-ppe").css("display", "none");
            $("#move-p2pes").css("display", "none");
            
            $("#move-eps").css("display", "");
            tr.append(MoveDataTD(FormatDecimal(md.eps,2,2), 
                sort_info.sort_by=="eps"));
            $("#move-peps2").css("display", "");
            tr.append(MoveDataTD(FormatDecimal(md.peps2,3,2), 
                sort_info.sort_by=="peps2"));
        }

        const td_users = $("<td></td>")
        const users = top_move_users.get(md.name);
        if (users) {
            //users.sort((a,b)=>b.stats.baseAttack-a.stats.baseAttack);
            for (let i=Math.min(users.length,MAX_USERS)-1; i>=0; i--) {
                const coords = GetPokemonIconCoords(users[i].id, users[i].form);
                td_users.append("<a class=pokemon-icon href='/?p=" + users[i].id + "&f=" + users[i].form
                        + "' onclick='return LoadPokedexAndUpdateURL(GetPokeDexMon(" + users[i].id
                            + ",\"" + users[i].form + "\"))' " 
                        + "style='background-image:url("
                            + ICONS_URL + ");background-position:" + coords.x + "px "
                            + coords.y + "px'></a>");
            }
        }
        tr.append(td_users);
        
        $("#move-data-table tbody").append(tr);
    }
}


/**
 * Updates the dialog to reflect the current stats for a move 
 * (or the window for adding a new move, by default)
 */
function UpdateMoveEditor(move_name, clear_fields = true) {
    let move_obj, move_kind = "fm";
    move_obj = jb_fm.find(e=>e.name==move_name);
    if (!move_obj) {
        move_obj = jb_cm.find(e=>e.name==move_name);
        move_kind = "cm";
    }

    // Editing existing move
    if (move_obj) {
        $("#move-edit-title").text("Edit Move Data");
        
        $("#any-search-box").val(move_obj.name);
        $("#move-edit-type").val(move_obj.type);
        $("#move-edit-type").trigger("change");

        $("#move-edit-power").val(move_obj.power);
        $("#move-edit-energy").val(move_obj.energy_delta);
        $("#move-edit-duration").val(ProcessDuration(move_obj.duration));
        
        $("#move-edit-kind").prop("checked", move_kind == "cm");
        $("#move-edit-kind").trigger("change");

        $("#move-edit-apply").val("Edit");
        if (move_obj.custom)
            $("#move-edit-delete").removeAttr("hidden");
        else 
            $("#move-edit-delete").attr("hidden", true)
    }
    else {
        $("#move-edit-title").text("Add New Move");
        
        if (clear_fields) {
            $("#any-search-box").val("");
            $("#move-edit-type").val("Normal");
            $("#move-edit-kind").prop("checked", false);
            $("#move-edit-power").val(10);
            $("#move-edit-energy").val(10);
            $("#move-edit-duration").val(1.0);

            $("#move-edit-type").trigger("change");
            $("#move-edit-kind").trigger("change");
        }
        
        $("#move-edit-apply").val("Add");
        $("#move-edit-delete").attr("hidden", true)
    }
    

    LoadMoveInputs();
}


let made_edits = false;
/**
 * Opens the dialog to the specified move (including showing the dialog)
 */
function OpenMoveEditor(move_name) {
    $("#overlay").addClass("active");

    UpdateMoveEditor(move_name);
    $("#move-edit").get(0).show();

    made_edits = false;
}

let move_searchs_loaded = false;
/**
 * Sets up all autocomplete searches for moves
 */
function LoadMoveInputs() {
    if (!move_searchs_loaded) {
        InitMoveInput("fm", function (e) {AddPokemonMove(current_pkm_obj, e.detail.selection.value, "fm");});
        InitMoveInput("cm", function (e) {AddPokemonMove(current_pkm_obj, e.detail.selection.value, "cm");});
        InitMoveInput("any", function (e) {UpdateMoveEditor(e.detail.selection.value);});
        move_searchs_loaded = true;
    }
}

/**
 * Reads the move data editor fields into a move_obj
 */
function GetMoveEditorMove() {
    return { 
        name: $("#any-search-box").val(),
        type: $("#move-edit-type").val(),
        power: $("#move-edit-power").val(),
        energy_delta: $("#move-edit-energy").val(),
        duration: $("#move-edit-duration").val() * 1000,
        custom: true
    };
}

/**
 * Checks the state of the move data editor to ensure everything is valid
 */
function ValidateMove() {
    const dest_move_obj = GetMoveEditorMove();
    const move_kind = $("#move-edit-kind").prop("checked") ? "cm" : "fm";

    let valid = true;
    $("#move-edit input").removeClass("invalid");

    if (typeof dest_move_obj.name !== "string" || dest_move_obj.name == "") {
        $("#any-search-box").addClass("invalid");
        valid = false;
    }

    if (!POKEMON_TYPES.has(dest_move_obj.type)) {
        $("#move-edit-type").addClass("invalid");
        valid = false;
    }

    if (dest_move_obj.power < 0 || dest_move_obj.power > 300) {
        $("#move-edit-power").addClass("invalid");
        valid = false;
    }

    if (move_kind == "cm" && !(dest_move_obj.energy_delta == -33 ||
            dest_move_obj.energy_delta == -50 ||
            dest_move_obj.energy_delta == -100)) {
        $("#move-edit-energy").addClass("invalid");
        valid = false;
    }    
    if (move_kind == "fm" && (dest_move_obj.energy_delta < 0 ||
            dest_move_obj.energy_delta > 100)) {
        $("#move-edit-energy").addClass("invalid");
        valid = false;
    }

    if (dest_move_obj.duration < 500 || dest_move_obj.duration > 5000) {
        $("#move-edit-duration").addClass("invalid");
        valid = false;
    }

    return valid;
}

/**
 * Modifies move data according to user-defined edits
 * per the current state of the dialog
 */
function AddEditMove() {
    const dest_move_obj = GetMoveEditorMove();

    let move_obj, move_kind = $("#move-edit-kind").prop("checked") ? "cm" : "fm";

    if (move_kind == "fm") move_obj = jb_fm.find(e=>e.name==dest_move_obj.name);
    else move_obj = jb_cm.find(e=>e.name==dest_move_obj.name);
        
    if (move_obj) { // Editing
        move_obj.type = dest_move_obj.type;
        move_obj.power = dest_move_obj.power;
        move_obj.energy_delta = dest_move_obj.energy_delta;
        move_obj.duration = dest_move_obj.duration;
    }
    else { // Adding
        if (move_kind == "fm") 
            jb_fm.push(dest_move_obj);
        else 
            jb_cm.push(dest_move_obj);
    }

    made_edits = true;
}

/**
 * Removes move data for current move in dialog
 */
function DeleteMove(move_name) {
    jb_fm = jb_fm.filter(e=>e.name != move_name);
    jb_cm = jb_cm.filter(e=>e.name != move_name);

    made_edits = true;
}

/**
 * Returns a copy of the move array based on the input moveKind
 */
function GetMovesOfKind(moveKind = "any") {
    let moveList = [];
    if (moveKind == "fm" || moveKind == "any")
        jb_fm.forEach(e => moveList.push(e.name));
    if (moveKind == "cm" || moveKind == "any")
        jb_cm.forEach(e => moveList.push(e.name));
    moveList = moveList.sort();

    return moveList;
}

/**
 * Creates and displays a dropdown field to easily choose a move.
 * 
 * onSelect() function defines how to react when an item is picked.
 */
function InitMoveInput(moveKind, onSelect) {
    const moveSearch = new autoComplete({
        selector: "#" + moveKind + "-search-box",
        data: {
            src: () => { return GetMovesOfKind(moveKind) },
            filter: (list) => {
                const inputValue = moveSearch.input.value.toLowerCase();
                return list.sort((a, b) => {
                    if (a.value.toLowerCase().startsWith(inputValue)) 
                        return b.value.toLowerCase().startsWith(inputValue) ? a.value.localeCompare(b.value) : -1;
                    else if (b.value.toLowerCase().startsWith(inputValue))
                        return 1;

                    return a.value.localeCompare(b.value);
                });
            }
        },
        resultsList: {
            class: "suggestions move-suggestions",
            maxResults: 5
        },
        resultItem: {
            highlight: true,
            element: (item, data) => {
                let type = 'any-type';
                let move = jb_fm.find(e => e.name == data.value);
                if (!move) move = jb_cm.find(e => e.name == data.value);
                if (move) type = move.type;

                const moveTag = $('<span></span>');
                moveTag.html($(item).html());
                $(item).html('');
                moveTag.addClass('type-text');
                moveTag.addClass('bg-' + type);
                $(item).append(moveTag);
                $(item).addClass('move-search-result');
            }
        },
        events: {
            input: {
                focus() {
                    const inputValue = moveSearch.input.value;

                    if (inputValue.length) moveSearch.start();
                },
            },
        },
    })
    $(moveSearch.wrapper).addClass("move-input-popup");
    moveSearch.input.addEventListener("render", function(e) {
        if (moveSearch.cursor == -1) { moveSearch.goTo(0); }
    });
    moveSearch.input.addEventListener("selection", onSelect);
}

/**
 * Format a decimal value with spaces in the left-padding and rounding-off fractional parts
 * (Aligns the decimal point for the whole column)
 */
function FormatDecimal(val, minIntDigits, maxFracDigits) {
    if (val==0)
        return "&#8199;".repeat(minIntDigits-1) + "0";

    return "&#8199;".repeat(Math.max(0, minIntDigits - Math.floor(Math.max(0,Math.log10(val)) + 1)))
        + val.toLocaleString("en", { maximumFractionDigits: maxFracDigits });
}