const JB_URL = "https://raw.githubusercontent.com/mgrann03/pokemon-resources/main/";
const CDN_URL = "https://cdn.statically.io/gh/mgrann03/pokemon-resources/main/";
const GIFS_PATH = "graphics/ani/";
const SHINY_GIFS_PATH = "graphics/ani-shiny/";
const POGO_PNGS_PATH = "graphics/pogo-256/"
const SHINY_POGO_PNGS_PATH = "graphics/pogo-shiny-256/"
const ICONS_URL = CDN_URL + "graphics/pokemonicons-sheet.png";

const LOADING_MAX_VAL = 5; // max number of files that need to be loaded
let loading_val = 0; // number of files loaded so far

// jb json objects
let jb_names, jb_pkm, jb_max_id, jb_fm, jb_cm, jb_spec, jb_unpatch;

/**
 * Load JSONs from resource repo
 */
async function LoadJSONData() {
    let jsonLoadReqs = [];
    
    jsonLoadReqs.push(FetchJSONPokeData("pogo_pkm_names.json",
        function(response) { 
            jb_names = response; 
            IncreaseLoadingVal();
        })
    );
    jsonLoadReqs.push(FetchJSONPokeData("pogo_pkm.min.json",
        function(response) {
            jb_pkm = response;
            jb_max_id = jb_pkm.at(-1).id;

            // Only use active forms
            jb_pkm = jb_pkm.filter((item) => {
                return GetPokemonForms(item.id).includes(item.form);
            });
            IncreaseLoadingVal();
        })
    );
    jsonLoadReqs.push(FetchJSONPokeData("pogo_fm.json",
        function(response) { 
            jb_fm = response; 
            jb_fm.find(e => e.name=="Hidden Power").type = "None"; // Make non-specific Hidden Power typeless
            IncreaseLoadingVal();
        })
    );
    jsonLoadReqs.push(FetchJSONPokeData("pogo_cm.json",
        function(response) { 
            jb_cm = response; 
            jb_cm.forEach(cm => {
                cm.name = cm.name.replaceAll(" Plus", "+");
            });
            IncreaseLoadingVal();
        })
    );
    jsonLoadReqs.push(FetchJSONPokeData("pogo_pkm_manual_announced.json",
        function(response) { 
            jb_spec = response;
            IncreaseLoadingVal();
        })
    );

    try {
        await Promise.all(jsonLoadReqs);
        $("#loading-bar").css("display", "none");
        
        if (settings_speculative) {
            PatchSpeculative(settings_speculative);
        }

        return true;
    }
    catch (err) {
        console.error("Fatal error in JSON data load.");
        return false;
    }
}

/**
 * Fetch JSON from a URL, with automatic fallback to CDN on failure. Additionally calls a function
 * with the returned JSON for processing or other steps.
 */
async function FetchJSON(URL, fallbackURL, onSuccess, onFallback, onFailure) {
    let json;

    try { // check direct URL
        const response = await fetch(URL);
        if (!response.ok) throw new Error(`Primary failed: ${response.status}`);
        json = await response.json();
        if (onSuccess) onSuccess(json);
    } catch (primaryError) {
        console.warn("Primary fetch failed, trying fallback...", primaryError.message);
        
        try { // fallback to CDN URL
            const fallbackResponse = await fetch(fallbackURL);
            if (!fallbackResponse.ok) throw new Error(`Fallback failed: ${fallbackResponse.status}`);
            json = await fallbackResponse.json();
            if (onFallback) onFallback(json);
        } catch (fallbackError) {
            console.error("Critical Error: Both primary and fallback failed.");
            if (onFailure) onFailure(fallbackError);
            throw fallbackError;
        }
    }

    // Success path
    return json;
}

/**
 * Automatically builds URL and fallback for pokemon-resources data loads
 */
async function FetchJSONPokeData(path, onSuccess) {
    return FetchJSON(JB_URL + path, CDN_URL + path, onSuccess, onSuccess);
}

/**
 * Increases value that represents number of files loaded so far
 * and updates its html loading bar on the page.
 */
function IncreaseLoadingVal() {
    loading_val++;
    let pct = 100 * loading_val / LOADING_MAX_VAL;
    $("#loading-bar").css("width", pct + "%");
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