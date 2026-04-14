let currentLocale = 'en';
let translationMap;

const availableLocales = ['en', 'es', 'fr'];
/**
 * Checks whether the input locale is currently supported.
 */
function IsSupportedLocale(checkLocale) {
    return availableLocales.includes(checkLocale);
}

/**
 * Select preferred language from URL params or from browser preference.
 */
function SelectLocale() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // User gave us a preference
    if (urlParams.has("lang")) {
        if (IsSupportedLocale(urlParams.get("lang"))) { // acceptable preference
            return urlParams.get("lang");
        }
        if (IsSupportedLocale(urlParams.get("lang").substring(0,2))) { // shortcode is acceptable (2 chars)
            const newLocale = urlParams.get("lang").substring(0,2);
            urlParams.set("lang", newLocale);
            history.replaceState(null, null, "?" + urlParams.toString().replace(/=(?=&|$)/gm, ''));

            return newLocale;
        }
    }

    // Check preferred languages in browser instead
    for (let lang of navigator.languages) {
        if (IsSupportedLocale(lang)) { // acceptable preference
            return lang;
        }
        if (IsSupportedLocale(lang.substring(0,2))) { // shortcode is acceptable (2 chars)
            return lang.substring(0,2);
        }
    }

    // Fall back to English
    return 'en';
}

/**
 * Load locale in preparation for translation
 */
async function InitializeLocalization() {
    const oldLocale = currentLocale;
    const newLocale = SelectLocale();

    try {
        translationMap = await FetchJSON("/locales/" + newLocale + ".json", "/locales/en.json", 
            () => {
                currentLocale = newLocale;
            },
            () => {
                console.warn("Unsupported language or translation map unable to load. Falling back to English.")
                currentLocale = 'en';
            });
        translationMap.pokedata = await FetchJSON("/locales/pokedata/" + currentLocale + ".json", "/locales/pokedata/en.json", 
            () => {},
            () => {
                console.warn("Unsupported language or pokedata map unable to load. Falling back to English.")
                currentLocale = 'en';
            });
        
        if (currentLocale != oldLocale)
            TranslateEverything();
        
        document.documentElement.lang = currentLocale;
    }
    catch (err) {
        console.error("No translation context found");
        translationMap = null;
    }
}

/**
 * Look up key in the translation map and return the associated value
 * 
 * Supports chaining keys in the map, for better logical grouping of related strings.
 * Eg "page.element.subelement" to access into a map structured like
 *     {
 *         page: {
 *             element: {
 *                 subelement: "Translation"
 *             }
 *         }
 *     }
 */
function GetTranslation(key, fallback) {
    if (!fallback && fallback !== "") fallback = "Localization Failure";

    if (!translationMap) return fallback;
    
    const ret = (key.split('.').reduce((a,b) => {return (a[b] ?? fallback)}, translationMap));

    return (typeof ret === 'string') ? ret : fallback;
} 

/**
 * Get a translated template string, replacing {key} placeholders with values.
 * Example: FormatTranslation("meta.rankings-title", {type: "Fire"})
 *   with template "Best {type}-type Attackers - DialgaDex"
 */
function FormatTranslation(key, params = {}, fallback = "") {
    let template = GetTranslation(key, fallback);
    for (const [k, v] of Object.entries(params)) {
        template = template.replaceAll(`{${k}}`, v);
    }
    return template;
}

/**
 * Scan DOM for translatable elements and perform updates to live document
 */
function TranslateEverything() {
    TranslateElement($('body'));
}

/**
 * Scan descendants for translatable elements and perform updates to live document
 */
function TranslateElement(element) {
    $(element).find('[data-i18n]').each(function() { // Text translation
        const tagName = $(this).prop("tagName");
        const transKey = $(this).attr('data-i18n');

        switch (tagName) {
            case "IMG":
                // TODO: Also translate to a localized image?
                $(this).prop("alt", GetTranslation(transKey, $(this).prop("alt")));
                break;
            case "INPUT":
                $(this).val(GetTranslation(transKey, $(this).val()));
                break;
            default:
                const translation = GetTranslation(transKey, $(this).text())
                if (translation[0] == '§') { // Interpret as markdown and replace as HTML instead
                    $(this).html(MarkdownToHTML(translation.slice(1)));
                }
                else {
                    $(this).text(translation);
                }
        }
    });

    $(element).find('[data-i18n-reorder]').each(function() { // Locale-specific reorder of elements
        const orderKey = $(this).attr('data-i18n-reorder');
        const orderArr = (orderKey.split('.').reduce((a,b) => {return a[b]}, translationMap));

        for (const selector of orderArr) {
            $(this).append($(this).find(selector), " ");
        }
    });
}

/**
 * Get the name of this Pokemon species, by id
 */
function TranslatedSpeciesName(id, fallback) {
    let trans = GetTranslation("pokedata.species."+id, fallback);

    if (fallback) {
        if (fallback.startsWith("Mega "))
            trans = GetTranslation("terms.mega") + " " + trans;
        if (fallback.startsWith("Primal "))
            trans = GetTranslation("terms.primal") + " " + trans;
        if (fallback.startsWith("Shadow "))
            trans = GetTranslation("terms.shadow") + " " + trans;
        
        if (fallback.endsWith(" X"))
            trans = trans + " X";
        if (fallback.endsWith(" Y"))
            trans = trans + " Y";
        if (fallback.endsWith(" Z"))
            trans = trans + " Z";
    }
    
    return trans;
}

/**
 * Get the name of this Pokemon species IN ENGLISH, by id
 * Used for lookups into base data (GM JSON, graphics)
 */
function UntranslatedSpeciesName(id) {
    return jb_names[id];
}

/**
 * Get the names of every Pokemon species from our map
 */
function GetAllSpeciesNames() {
    return translationMap.pokedata.species.slice();
}

/**
 * Get the localized version of this Pokemon form, by key (from GM usually)
 */
function TranslatedFormName(form_key) {
    return GetTranslation("pokedata.forms."+form_key, "");
}

/**
 * Get the localized version of this attack, by id
 * 
 * If "type" is supplied for Hidden Power, append it
 * 
 * If type=None for typed moves, strip type down to base name
 * Else shift to appropriate type, if it exists
 */
function TranslatedMoveName(id, type) {
    let trans = GetTranslation("pokedata.moves."+id, "");

    // Add appropriate Hidden Power type
    if (id == 281 && type) {
        switch (type) {
            case "None":
            case "Normal":
            case "Fairy":
                return trans;
        }
        trans = trans + " " + GetTranslation("pokedata.types."+type, type);
    }

    // Strip Weather Balls
    if ([292, 293, 294, 295, 352].includes(id)) {
        switch (type) {
            case "None":
                return GetTranslation("pokedata.special_moves.Weather Ball", trans);
            case "Fire":
                return GetTranslation("pokedata.moves.292", trans);
            case "Ice":
                return GetTranslation("pokedata.moves.293", trans);
            case "Rock":
                return GetTranslation("pokedata.moves.294", trans);
            case "Water":
                return GetTranslation("pokedata.moves.295", trans);
            case "Normal":
                return GetTranslation("pokedata.moves.352", trans);
        }
    }

    // Strip Aura Wheels
    if (406 <= id && id <= 407) {
        switch (type) {
            case "None":
                return GetTranslation("pokedata.special_moves.Aura Sphere", trans);
            case "Electric":
                return GetTranslation("pokedata.moves.406", trans);
            case "Dark":
                return GetTranslation("pokedata.moves.407", trans);
        }
    }

    // Strip Techno Blast
    if (336 <= id && id <= 340) {
        switch (type) {
            case "None":
                return GetTranslation("pokedata.special_moves.Techno Blast", trans);
            case "Normal": // Normal
                return GetTranslation("pokedata.moves.336", trans);
            case "Fire": // Burn
                return GetTranslation("pokedata.moves.337", trans);
            case "Ice": // Chill
                return GetTranslation("pokedata.moves.338", trans);
            case "Water": // Water
                return GetTranslation("pokedata.moves.339", trans);
            case "Electric": // Shock
                return GetTranslation("pokedata.moves.340", trans);
        }
    }

    return trans;
}

/**
 * Get the localized version of this move type
 */
function TranslatedTypeName(type) {
    return GetTranslation("pokedata.types."+type, type);
}

/**
 * Persist move translation by saving it in our map
 */
function AddMoveNameToLocale(id, name) {
    //TODO: Persist this data past a locale swap
    translationMap.pokedata.moves[id] = name;
}


/**
 * Minimal markdown implementation to implement a few formatting options as HTML tags
 */
function MarkdownToHTML(str) {
    let html = str;

    // **Bold**
    html = html.replace(/(\*\*|__)(.+?)\1/gm, '<strong>$2</strong>');
    // *Italics*
    html = html.replace(/(\*|_)(.+?)\1/gm, '<em>$2</em>');
    // Super^Script^
    html = html.replace(/\^(.+?)\^/gm, '<sup>$1</sup>');
    // New Line
    html = html.replace("\n", '<br>');

    return html;
}