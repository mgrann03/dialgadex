const JB_URL = "https://raw.githubusercontent.com/mgrann03/pokemon-resources/main/";
const CDN_URL = "https://cdn.statically.io/gh/mgrann03/pokemon-resources/main/";
const GIFS_PATH = "graphics/ani/";
const SHINY_GIFS_PATH = "graphics/ani-shiny/";
const POGO_PNGS_PATH = "graphics/pogo-256/"
const SHINY_POGO_PNGS_PATH = "graphics/pogo-shiny-256/"
const ICONS_URL = CDN_URL + "graphics/pokemonicons-sheet.png";

const LOADING_MAX_VAL = 5; // max number of files that need to be loaded
let loading_val = 0; // number of files loaded so far
let finished_loading = false; // whether page finished loading all files

// jb json objects
let jb_names, jb_pkm, jb_max_id, jb_fm, jb_cm, jb_spec, jb_unpatch;

/**
 * Load JSONs from resource repo
 */
function LoadJSONData() {
    // jb
    HttpGetAsync("pogo_pkm_names.json",
        function(response) { 
            jb_names = JSON.parse(response); 
            IncreaseLoadingVal();
        });
    //HttpGetAsync(JB_URL + "mega_pokemon.json",
    //    function(response) { jb_mega = JSON.parse(response); });
    HttpGetAsync("pogo_pkm.min.json",
        function(response) {
            jb_pkm = JSON.parse(response);
            jb_max_id = jb_pkm.at(-1).id;

            // Only use active forms
            jb_pkm = jb_pkm.filter((item) => {
                return GetPokemonForms(item.id).includes(item.form);
            });
            IncreaseLoadingVal();
        });
    HttpGetAsync("pogo_fm.json",
        function(response) { 
            jb_fm = JSON.parse(response); 
            jb_fm.find(e => e.name=="Hidden Power").type = "None"; // Make non-specific Hidden Power typeless
            IncreaseLoadingVal();
        });
    HttpGetAsync("pogo_cm.json",
        function(response) { 
            jb_cm = JSON.parse(response); 
            jb_cm.forEach(cm => {
                cm.name = cm.name.replaceAll(" Plus", "+");
            });
            IncreaseLoadingVal();
        });
    HttpGetAsync("pogo_pkm_manual_announced.json",
        function(response) { 
            jb_spec = JSON.parse(response);
            IncreaseLoadingVal();
        });
}

/**
 * Asynchronous HTTP GET request to a specific path and with a specific
 * callback function.
 */
function HttpGetAsync(path, callback) {
    let xml_http = new XMLHttpRequest();
    xml_http.onreadystatechange = function() { 
        if (xml_http.readyState === XMLHttpRequest.DONE) {
            if ((xml_http.status === 0 || (xml_http.status >= 200 && xml_http.status < 400))
                    && xml_http.response !== "") {
                callback(xml_http.response);
            }
            else { // Github failed; fallback to CDN
                let xml_http_fallback = new XMLHttpRequest();
                xml_http_fallback.onreadystatechange = function() { 
                    if (xml_http_fallback.readyState === XMLHttpRequest.DONE) {
                        if ((xml_http_fallback.status === 0 || (xml_http_fallback.status >= 200 && xml_http_fallback.status < 400))
                                && xml_http_fallback.response !== "") {
                            callback(xml_http_fallback.response);
                        }
                        else {
                            // Handle even the fallback failing?
                        }
                    }
                }
                xml_http_fallback.open("GET", CDN_URL + path, true); 
                xml_http_fallback.send(null);
            }
        }
    }
    xml_http.open("GET", JB_URL + path, true); // true for asynchronous 
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

        if (settings_speculative) {
            PatchSpeculative(settings_speculative);
        }

        CheckURLAndAct();

        InitializePokemonSearch();
    }
}

/**
 * Removes duplicate objects (matching JSON strings)
 */
function DeDuplicate(arr, keyGen = JSON.stringify) {
    let seen = new Set();
    
    return arr.filter((item) => {
        let k = keyGen(item);
        return seen.has(k) ? false : seen.add(k);
    });
}


/**
 * Receives the pokemon image that just loaded as an argument.
 * Hides the placeholder loading image and shows the loaded pokemon image.
 */
function HideLoading(element) {

    const loading = $(element).parent().children(".loading");
    loading.css("display", "none");
    $(element).css("display", "inherit");
}

/**
 * When a pokemon image source couldn't be loaded, this function tries the 
 * next option.
 * Eventually it will just load the 'notfound' image and stop trying.
 * 
 * JB/GIF -> CDN/GIF -> JB/PNG -> CDN/PNG
 */
function TryNextSrc(element) {

    const src = $(element).attr("src");

    if (src.includes(JB_URL)) {
        let next_src = src.replace(JB_URL, CDN_URL);
        $(element).attr("src", next_src);
    } 
    else if (src.includes(GIFS_PATH)) {
        // loads pogo-256 image
        let next_src = src.replace(GIFS_PATH, POGO_PNGS_PATH);
        next_src = next_src.replace(CDN_URL, JB_URL);
        next_src = next_src.replace(".gif", ".png");
        $(element).attr("src", next_src);
        $(element).css("width", "140px");
        $(element).css("height", "140px");

    } 
    else {
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

    if (src.includes(GIFS_PATH)) {
        src = src.replace(GIFS_PATH, SHINY_GIFS_PATH);
        shiny_img.css("display", "revert");

    } else if (src.includes(SHINY_GIFS_PATH)) {
        src = src.replace(SHINY_GIFS_PATH, GIFS_PATH);
        shiny_img.css("display", "none");

    } else if (src.includes(POGO_PNGS_PATH)) {
        src = src.replace(POGO_PNGS_PATH, SHINY_POGO_PNGS_PATH);
        shiny_img.css("display", "revert");

    } else if (src.includes(SHINY_POGO_PNGS_PATH)) {
        src = src.replace(SHINY_POGO_PNGS_PATH, POGO_PNGS_PATH);
        shiny_img.css("display", "none");
    }

    $(element).attr("src", src);
}

/**
 * Modifies jb_pkm either direction (applying or un-applying patches)
 */
function PatchSpeculative(useUpcoming) {
    if (useUpcoming && jb_spec) {
        jb_unpatch = [];

        for (const patch of jb_spec) {
            let pkm_obj = jb_pkm.find(e=>e.id==patch.id&&e.form==patch.form);
            if (!pkm_obj) {
                jb_pkm.push(patch);

                jb_unpatch.push({
                    id: patch.id,
                    name: patch.name,
                    form: patch.form,
                    delete: true
                });
                continue;
            }

            let unpatch_obj = {
                id: pkm_obj.id,
                name: pkm_obj.name,
                form: pkm_obj.form
            };

            for (const k of Object.keys(patch)) {
                if (!["id", "name", "form"].includes(k)) {
                    unpatch_obj[k] = pkm_obj[k];
                    pkm_obj[k] = patch[k];
                }
            }

            jb_unpatch.push(unpatch_obj);
        }
    }
    else if (!useUpcoming && jb_unpatch) {
        for (const unpatch of jb_unpatch) {
            const pkm_obj = jb_pkm.find(e=>e.id==unpatch.id&&e.form==unpatch.form);
            if (!pkm_obj)
                continue;

            if (unpatch.delete) {
                jb_pkm.splice(jb_pkm.findIndex(e=>e.id==unpatch.id&&e.form==unpatch.form), 1);
                continue;
            }
            
            for (const k of Object.keys(unpatch)) {
                if (!["id", "name", "form"].includes(k)) {
                    pkm_obj[k] = unpatch[k];
                }
            }
        }
    }
}