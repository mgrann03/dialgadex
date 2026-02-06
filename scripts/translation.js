let currentLocale = 'en';
let translationMap;

const availableLocales = ['en'];
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
    }
    catch (err) {
        console.error("No translation context found");
        translationMap = null;
    }
}

/**
 * Look up key in the translation map and return the associated value
 */
function GetTranslation(key, fallback) {
    if (!translationMap) {
        return (fallback) ?? "Localization Failure";
    }
    
    if (key in translationMap)
        return translationMap[key];

    return (fallback) ?? "Localization Failure";
} 