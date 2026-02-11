/**
 * Binds behavior of all popups
 */
function BindDialogs() {
    BindMoveEditor();
    BindMoveSetEditor();
    BindSearchStringDialog();
}



/**
 * Binds behavior of move editor popup
 */
function BindMoveEditor() {
    $(document).on("click", "#move-edit-icon", function() {
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
            
            $("#move-edit-apply").attr("value", GetTranslation("moves.editor."+editor_action+".confirm"));
            $("#move-edit-apply").prop("disabled", true);
            setTimeout(()=>{ 
                UpdateMoveEditor();
                $("#move-edit-apply").prop("disabled", false);
            }, 1000);
        }
    });
    $("#move-edit-delete").click(function() {
        DeleteMove($("#any-search-box").val());

        $("#move-edit-delete").attr("value", GetTranslation("moves.editor.delete.confirm"));
        $("#move-edit-delete").prop("disabled", true);
        setTimeout(()=>{ 
            UpdateMoveEditor();
            $("#move-edit-delete").prop("disabled", false);
         }, 1000);
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

let made_edits = false;
let editor_action = "";
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
        editor_action = "edit";
        $("#move-edit-title").text(GetTranslation("moves.editor.edit.title"));
        
        $("#any-search-box").val(move_obj.name);
        $("#move-edit-type").val(move_obj.type);
        $("#move-edit-type").trigger("change");

        $("#move-edit-power").val(move_obj.power);
        $("#move-edit-energy").val(move_obj.energy_delta);
        $("#move-edit-duration").val(ProcessDuration(move_obj.duration));
        
        $("#move-edit-kind").prop("checked", move_kind == "cm");
        $("#move-edit-kind").trigger("change");

        $("#move-edit-apply").val(GetTranslation("moves.editor.edit.action"));
        if (move_obj.custom)
            $("#move-edit-delete").removeAttr("hidden");
        else 
            $("#move-edit-delete").attr("hidden", true)
    }
    else {
        editor_action = "add";
        $("#move-edit-title").text(GetTranslation("moves.editor.add.title"));
        
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
        
        $("#move-edit-apply").val(GetTranslation("moves.editor.add.action"));
        $("#move-edit-delete").attr("hidden", true)
    }
    

    LoadMoveInputs();
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
 * Builds a formatted span element to open the move editor
 */
function GetMoveLink(move_name, move_type, is_elite) {
    if (move_type === undefined) {
        let move_obj = jb_fm.find(e=>e.name==move_name);
        if (!move_obj) move_obj = jb_cm.find(e=>e.name==move_name);
        move_type = move_obj.type;
    }
    if (move_type == "None") 
        move_type = "any-type"; // Hidden Power

    const span = $("<span class='type-text'></a>");
    span.addClass("bg-" + move_type);
    span.text(move_name + (is_elite ? "*" : ""));
    span.on("click", function (e) {
        e.preventDefault();
        OpenMoveEditor(move_name);
    });

    return span;
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
 * Binds behavior of moveset editor popup
 */
function BindMoveSetEditor() {
    $(document).on("click", "#moveset-edit-icon", function() {
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
            
            $("#overlay").removeClass("active");
        }
    });
}





/**
 * Bind event handlers for the search string generator popup
 */
function BindSearchStringDialog() {
    function UpdateSearchString() {
        const minTier = $('[name="min-tier"]:checked').val();

        let pkm_arr;
        if (minTier == "S") {
            pkm_arr = str_pokemons.filter(e=>e.tier[0]=="S"||e.tier=="MRay");
        }
        else {
            pkm_arr = str_pokemons.filter(e=>e.tier.charCodeAt(0)<=minTier.charCodeAt(0)||
                e.tier[0]=="S"||e.tier=="MRay");
        }

        const check_movesets = $("#chk-include-movesets").prop("checked");
        const check_elite_only = $('#chk-elite-movesets').prop("checked") && check_movesets;

        const search_str = GetSearchString(pkm_arr, check_movesets, check_elite_only)
        $("#search-string-result").text(search_str);

        const result_arr = RunSearchString(search_str, check_movesets, check_elite_only);
        const result_compare = ValidateSearchString(pkm_arr, result_arr, check_movesets, check_elite_only);

        $("#search-string-issues, #search-string-excluded-col, #search-string-included-col, #string-length-issue").css("display", "none");
        if (result_compare.not_found.size > 0) { 
            $("#search-string-issues, #search-string-excluded-col").css("display", "block");
            $("#search-string-excluded").empty();

            for (const missed_mon of result_compare.not_found) {
                let pkm_obj = ParseUniqueIdentifier(missed_mon, true, false, check_movesets);
                GetMonSearchIssue($("#search-string-excluded"), pkm_obj);
            }
        }
        
        if (result_compare.not_wanted.size > 0) {
            $("#search-string-issues, #search-string-included-col").css("display", "block");
            $("#search-string-included").empty();
            for (const included_mon of result_compare.not_wanted) {
                let pkm_obj = ParseUniqueIdentifier(included_mon, true, false, check_movesets);
                let base_pkm_obj = pkm_arr.find(e=>e.id==pkm_obj.id&&e.form==pkm_obj.form&&e.shadow==pkm_obj.shadow);
                if (base_pkm_obj) { // move issue
                    let fm_issue = null, cm_issue = null;
                    if (check_elite_only && base_pkm_obj.fm_is_elite && pkm_obj.fm == "null") {
                        fm_issue = {
                            issue: "missing",
                            move: base_pkm_obj.fm
                        };
                    }
                    if (!fm_issue && (base_pkm_obj.fm_is_elite || !check_elite_only) && pkm_obj.fm != base_pkm_obj.fm && pkm_obj.fm != "null") {
                        fm_issue = {
                            issue: "incorrect",
                            move: pkm_obj.fm
                        };
                    }
                    if (check_elite_only && base_pkm_obj.cm_is_elite && pkm_obj.cm == "null") {
                        cm_issue = {
                            issue: "missing",
                            move: base_pkm_obj.cm
                        };
                    }
                    if (!cm_issue && (base_pkm_obj.cm_is_elite || !check_elite_only) && pkm_obj.cm != base_pkm_obj.cm && pkm_obj.cm != "null") {
                        cm_issue = {
                            issue: "incorrect",
                            move: pkm_obj.cm
                        };
                    }
                    
                    if (fm_issue || cm_issue)
                        GetMonSearchIssue($("#search-string-included"), pkm_obj, false, false, fm_issue, cm_issue);
                }
                else { 
                    base_pkm_obj = pkm_arr.find(e=>e.id==pkm_obj.id&&e.form==pkm_obj.form&&e.shadow!=pkm_obj.shadow);
                    if (base_pkm_obj) { // shadow issue
                        GetMonSearchIssue($("#search-string-included"), pkm_obj, false, true, null, null);
                    }
                    else {
                        GetMonSearchIssue($("#search-string-included"), pkm_obj, true, false, null, null);
                    }
                }
            }
        }

        if (search_str.length > 5000)
            $("#search-string-issues, #string-length-issue").css("display", "block");
    }

    // Dialog Open/Close
    $(document).on("click", "#search-string-icon", function() {
        $("#overlay").addClass("active");

        UpdateSearchString();
        $("#search-string-popup").get(0).show();
    });
    $("#search-string-popup").on("close", function(e) {
        if (e.target === e.currentTarget) {// only apply to this, not children
            $("#overlay").removeClass("active");
        }
    });

    // Copy to Clipboard
    $("#search-string-copy").click(async function (e) {
        try {
            await navigator.clipboard.writeText($("#search-string-result").text());
            $("#search-string-copy").attr("value", "Copied!");
            setTimeout(()=>{$("#search-string-copy").attr("value", "Copy")}, 1000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    });

    // Settings
    $('[name="min-tier"], #chk-include-movesets, #chk-elite-movesets').change(UpdateSearchString);
    $('#chk-include-movesets').change(function (e) {
        if ($('#chk-include-movesets').prop("checked")) {
            $('#chk-elite-movesets').removeAttr("disabled");
        }
        else {
            $('#chk-elite-movesets').prop("disabled", true);
        }
    });
}


/**
 * Constructs Div element representing a pkm_obj
 * 
 * TODO: Probably can generalize this and use it for search results, table results
 */
function GetMonSearchIssue(parent, pkm_obj, form_issue = false, shadow_issue = false, fm_issue = null, cm_issue = null) {
    const coords = GetPokemonIconCoords(pkm_obj.id, pkm_obj.form);
    let form_text = GetFormText(pkm_obj.id, pkm_obj.form).replace(/\s+Forme?/,"");
    if (form_text == "" && form_issue) form_text = pkm_obj.form;

    const leftside = $("<div></div>");
    leftside.append("<span class=pokemon-icon style='background-image:url("
        + ICONS_URL + ");background-position:" + coords.x + "px "
        + coords.y + "px'></span>");
    leftside.append(" <span class='strongest-name'>"
        + ((pkm_obj.shadow)
            ? "<span class=shadow-text>Shadow</span> " : "")
        + pkm_obj.name
        +"</span>");
    
    if (form_text.length > 0 && !form_issue)
        leftside.append(`<span class='poke-form-name'> (${form_text})</span>`);

    parent.append(leftside);

    const rightside = $("<div></div>");
    if (form_text.length > 0 && form_issue)
        rightside.append(`<span class='poke-form-name issue-highlight'> (${form_text})</span>`);
    if (shadow_issue)
        rightside.append(`<span class='poke-form-name issue-highlight'> (${pkm_obj.shadow ? '' : 'Not '}Shadow)</span>`);

    if (fm_issue) {
        const fm_obj = jb_fm.find(e=>e.name == fm_issue.move);
        if (fm_issue.issue == "missing") 
            rightside.append("<span class='issue-highlight'>Missing: </span>");
        rightside.append(`<span class="type-text bg-${fm_obj.type}">${fm_issue.move}</span>`);
    }
    if (cm_issue) {
        const cm_obj = jb_cm.find(e=>e.name == cm_issue.move);
        if (cm_issue.issue == "missing") 
            rightside.append("<span class='issue-highlight'>Missing: </span>");
        rightside.append(`<span class="type-text bg-${cm_obj.type}">${cm_issue.move}</span>`);
    }
    parent.append(rightside);
}