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
        
        if (newLocale != 'en')
            TranslateEverything();
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
    if (!fallback) fallback = "Localization Failure";

    if (!translationMap) return fallback;
    
    const ret = (key.split('.').reduce((a,b) => {return (a[b] ?? fallback)}, translationMap));

    return (typeof ret === 'string') ? ret : fallback;
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
    $(element).find('[data-i18n]').each(function() {
        $(this).text(GetTranslation($(this).attr('data-i18n'), $(this).text()));
    });
}