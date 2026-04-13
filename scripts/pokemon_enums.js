/**
 * Author: Javi Bonafonte
 */

// set of pokemon types constant
const POKEMON_TYPES = new Set();
POKEMON_TYPES.add("Normal");        POKEMON_TYPES.add("Fire");
POKEMON_TYPES.add("Water");         POKEMON_TYPES.add("Grass");
POKEMON_TYPES.add("Electric");      POKEMON_TYPES.add("Ice");
POKEMON_TYPES.add("Fighting");      POKEMON_TYPES.add("Poison");
POKEMON_TYPES.add("Ground");        POKEMON_TYPES.add("Flying");
POKEMON_TYPES.add("Psychic");       POKEMON_TYPES.add("Bug");
POKEMON_TYPES.add("Rock");          POKEMON_TYPES.add("Ghost");
POKEMON_TYPES.add("Dragon");        POKEMON_TYPES.add("Dark");
POKEMON_TYPES.add("Steel");         POKEMON_TYPES.add("Fairy");

// types effectiveness map - 0.391 -> 0.625 -> 1.60
// note: if it isn't in this map, its effectiveness is 1x
const POKEMON_TYPES_EFFECT = new Map();
POKEMON_TYPES_EFFECT.set("Normal", [
        ["Ghost"],
        ["Rock", "Steel"],
        []
    ]);
POKEMON_TYPES_EFFECT.set("Fire", [
        [],
        ["Dragon", "Fire", "Rock", "Water"],
        ["Bug", "Grass", "Ice", "Steel"]
    ]);
POKEMON_TYPES_EFFECT.set("Water", [
        [],
        ["Dragon", "Grass", "Water"],
        ["Fire", "Ground", "Rock"]
    ]);
POKEMON_TYPES_EFFECT.set("Grass", [
        [],
        ["Bug", "Dragon", "Fire", "Flying", "Grass", "Poison", "Steel"],
        ["Ground", "Rock", "Water"]
    ]);
POKEMON_TYPES_EFFECT.set("Electric", [
        ["Ground"],
        ["Dragon", "Electric", "Grass"],
        ["Flying", "Water"]
    ]);
POKEMON_TYPES_EFFECT.set("Ice", [
        [],
        ["Fire", "Ice", "Steel", "Water"],
        ["Dragon", "Flying", "Grass", "Ground"]
    ]);
POKEMON_TYPES_EFFECT.set("Fighting", [
        ["Ghost"],
        ["Bug", "Fairy", "Flying", "Poison", "Psychic"],
        ["Dark", "Ice", "Normal", "Rock", "Steel"]
    ]);
POKEMON_TYPES_EFFECT.set("Poison", [
        ["Steel"],
        ["Ghost", "Ground", "Poison", "Rock"],
        ["Fairy", "Grass"]
    ]);
POKEMON_TYPES_EFFECT.set("Ground", [
        ["Flying"],
        ["Bug", "Grass"],
        ["Electric", "Fire", "Poison", "Rock", "Steel"]
    ]);
POKEMON_TYPES_EFFECT.set("Flying", [
        [],
        ["Electric", "Rock", "Steel"],
        ["Bug", "Fighting", "Grass"]
    ]);
POKEMON_TYPES_EFFECT.set("Psychic", [
        ["Dark"],
        ["Psychic", "Steel"],
        ["Fighting", "Poison"]
    ]);
POKEMON_TYPES_EFFECT.set("Bug", [
        [],
        ["Fairy", "Fighting", "Fire", "Flying", "Ghost", "Poison", "Steel"],
        ["Dark", "Grass", "Psychic"]
    ]);
POKEMON_TYPES_EFFECT.set("Rock", [
        [],
        ["Fighting", "Ground", "Steel"],
        ["Bug", "Fire", "Flying", "Ice"]
    ]);
POKEMON_TYPES_EFFECT.set("Ghost", [
        ["Normal"],
        ["Dark"],
        ["Ghost", "Psychic"]
    ]);
POKEMON_TYPES_EFFECT.set("Dragon", [
        ["Fairy"],
        ["Steel"],
        ["Dragon"]
    ]);
POKEMON_TYPES_EFFECT.set("Dark", [
        [],
        ["Dark", "Fairy", "Fighting"],
        ["Ghost", "Psychic"]
    ]);
POKEMON_TYPES_EFFECT.set("Steel", [
        [],
        ["Electric", "Fire", "Steel", "Water"],
        ["Fairy", "Ice", "Rock"]
    ]);
POKEMON_TYPES_EFFECT.set("Fairy", [
        [],
        ["Fire", "Poison", "Steel"],
        ["Dark", "Dragon", "Fighting"]
    ]);

/**
 * Gets map of the effectiveness of all the pokemon types against the one or two
 * types sent as a parameter.
 * The keys of the map are the attacking types and the values are multiplier "floats".
 */
function GetTypesEffectivenessAgainstTypes(types) {
    let effectiveness = new Map();

    for (let attack_type of POKEMON_TYPES) {
        effectiveness.set(attack_type, GetEffectivenessMultAgainst(attack_type, types));
    }

    return effectiveness;
}

/**
 * Gets a map of effectiveness of all types, where everything is neutral except
 * the one chosen type, which is super effective.
 */
function GetTypesEffectivenessSingleBoost(type) {
    let effectiveness = new Map();

    for (let attacker_type of POKEMON_TYPES) {
        if (attacker_type == type)
            effectiveness.set(attacker_type, Math.fround(1.60));
        else 
            effectiveness.set(attacker_type, 1);
    }

    return effectiveness;
}

/**
 * Gets a map of effectiveness of all types, where everything has the same multiplier 
 */
function GetConstantEffectiveness(mult) {
    let effectiveness = new Map();

    for (let attacker_type of POKEMON_TYPES) {
        effectiveness.set(attacker_type, mult);
    }

    return effectiveness;
}

/**
 * Gets the multiplier value of a single type against a specific map of
 * types effectiveness.
 */
function GetEffectivenessMultOfType(effectiveness, type) {
    return effectiveness.get(type);
}

/**
 * Gets the multiplier value of a single type against a specific combination
 * of enemy types (without calculating the whole effectiveness map)
 */
function GetEffectivenessMultAgainst(attack_type, enemy_types) {
    const type_effect = POKEMON_TYPES_EFFECT.get(attack_type);
    let mult = 1;
    for (let type of enemy_types) {
        if (type_effect[0].includes(type))
            mult *= 0.390625;
        else if (type_effect[1].includes(type))
            mult *= 0.625;
        else if (type_effect[2].includes(type))
            mult *= Math.fround(1.60); // not exact, make it float
    }

    return mult;
}

/**
 * Gets a filtered list of Hidden-Power eligible types based on the scenario
 */
function GetHiddenPowerTypes(hidden_power_filter = "Type-Match", pkm_obj = null) {
    switch (hidden_power_filter) {
        case "None":
            return [];
        case "Raid Boss":
            return ["Fighting"];
        case "Type-Match":
            if (pkm_obj && pkm_obj.types) {
                return pkm_obj.types.filter(t=>t!="Fairy"&&t!="Normal");
            }
        case "All":
        default:
            return Array.from(POKEMON_TYPES).filter(t=>t!="Fairy"&&t!="Normal");
    }
}

const CPM_Map = new Map();
const CPM = [ // From Game Master
    0,
    0.094,
    0.16639787,
    0.21573247,
    0.25572005,
    0.29024988,
    0.3210876,
    0.34921268,
    0.3752356,
    0.39956728,
    0.4225,
    0.44310755,
    0.4627984,
    0.48168495,
    0.49985844,
    0.51739395,
    0.5343543,
    0.5507927,
    0.5667545,
    0.5822789,
    0.5974,
    0.6121573,
    0.6265671,
    0.64065295,
    0.65443563,
    0.667934,
    0.6811649,
    0.69414365,
    0.7068842,
    0.7193991,
    0.7317,
    0.7377695,
    0.74378943,
    0.74976104,
    0.7556855,
    0.76156384,
    0.76739717,
    0.7731865,
    0.77893275,
    0.784637,
    0.7903,
    0.7953,
    0.8003,
    0.8053,
    0.8103,
    0.8153,
    0.8203,
    0.8253,
    0.8303,
    0.8353,
    0.8403,
    0.8453,
    0.8503,
    0.8553,
    0.8603,
    0.8653
];
/**
 * Gets the CP multiplier for a specific level.
 */
function GetCPMForLevel(level) {
    // Return cached
    if (CPM_Map.has(level))
        return CPM_Map.get(level);

    // Check out of range
    if (level < 1 || level >= CPM.length)
        return 0;

    // Return value from Game Master
    if (Number.isInteger(level) && level >= 1 && level < CPM.length) {
        CPM_Map.set(level, Math.fround(CPM[level])); // force to float
        return CPM_Map.get(level);
    }
    
    // Return calculated half-level (even if floating part isn't 0.5)
    const cpmPrev = GetCPMForLevel(Math.floor(level));
    const cpmNext = GetCPMForLevel(Math.ceil(level));
    return Math.sqrt((cpmPrev**2 + cpmNext**2)/2);
}

/**
 * Gets array of strings of a specific pokemon forms.
 */
function GetPokemonForms(pokemon_id) {

    switch (pokemon_id) {
        case 6: // Charizard
            return ["Normal", "Mega", "MegaY"];
        case 359: // Absol
        case 445: // Garchomp
        case 448: // Lucario
            return [ "Normal", "Mega", "MegaZ"];
        case 150: // Mewtwo
            return ["Normal", "Mega", "MegaY", "A"];
        case 3: // Venusaur
        case 9: // Blastoise
        case 15: // Beedrill
        case 18: // Pidgeot
        case 36: // Clefable
        case 65: // Alakazam
        case 71: // Victreebel
        case 94: // Gengar
        case 115: // Kangaskhan
        case 121: // Starmie
        case 127: // Pinsir
        case 130: // Gyarados
        case 142: // Aerodactyl
        case 149: // Dragonite
        case 154: // Meganium
        case 160: // Feraligatr
        case 181: // Ampharos
        case 208: // Steelix
        case 212: // Scizor
        case 214: // Heracross
        case 229: // Houndoom
        case 248: // Tyranitar
        case 254: // Sceptile
        case 257: // Blaziken
        case 260: // Swampert
        case 277: // Skarmory
        case 282: // Gardevoir
        case 302: // Sableye
        case 303: // Mawile
        case 306: // Aggron
        case 308: // Medicham
        case 310: // Manectric
        case 319: // Sharpedo
        case 323: // Camerupt
        case 334: // Altaria
        case 354: // Banette
        case 358: // Chimecho
        case 362: // Glalie
        case 373: // Salamence
        case 376: // Metagross
        case 380: // Latias
        case 381: // Latios
        case 382: // Kyogre
        case 383: // Groudon
        case 384: // Rayquaza
        case 398: // Staraptor
        case 428: // Lopunny
        case 460: // Abomasnow
        case 475: // Gallade
        case 478: // Froslass
        case 485: // Heatran
        case 491: // Darkrai
        case 500: // Emboar
        case 530: // Excadrill
        case 531: // Audino
        case 545: // Scolipede
        case 560: // Scrafty
        case 604: // Eelektross
        case 609: // Chandelure
        case 623: // Golurk
        case 652: // Chesnaught
        case 655: // Delphox
        case 658: // Greninja
        case 687: // Malamar
        case 689: // Barbaracle
        case 691: // Dragalge
        case 701: // Hawlucha
        case 719: // Diancie
        case 740: // Crabominable
        case 768: // Golisopod
        case 780: // Drampa
        case 801: // Magearna
        case 807: // Zeraora
        case 870: // Falinks
        case 952: // Scovillain
        case 970: // Glimmora
        case 998: // Baxcalibur
            return ["Normal", "Mega"]
        case 80: // Slowbro
            return [ "Normal", "Galarian", "Mega" ];
        case 26: // Raichu
            return ["Normal", "Alola", "Mega", "MegaY"];
        case 668: // Pyroar
        case 678: // Meowstic
            return [ "Normal", "Female", "Mega" ];
        case 670: // Floette
            return [ "Red", "Yellow", "Orange", "Blue", "White", "Mega" ];
        case 718: // Zygarde
            return [ "Fifty_percent", "Ten_percent", "Complete", "Mega" ];

        case 19: // Rattata
        case 20: // Raticate
        case 26: // Raichu
        case 27: // Sandshrew
        case 28: // Sandslash
        case 37: // Vulpix
        case 38: // Ninetales
        case 50: // Diglett
        case 51: // Dugtrio
        case 53: // Persian
        case 74: // Geodude
        case 75: // Graveler
        case 76: // Golem
        case 88: // Grimer
        case 89: // Muk
        case 103: // Exeggutor
        case 105: // Marowak
            return [ "Normal", "Alola" ];
        case 77: // Ponyta
        case 78: // Rapidash
        case 79: // Slowpoke
        case 83: // Farfetch'd
        case 110: // Weezing
        case 122: // Mr. Mime
        case 144: // Articuno
        case 145: // Zapdos
        case 146: // Moltres
        case 199: // Slowking
        case 222: // Corsola
        case 263: // Zigzagoon
        case 264: // Linoone
        case 554: // Darumaka
        case 562: // Yamask
        case 618: // Stunfisk
            return [ "Normal", "Galarian" ];
        case 52: // Meowth
            return [ "Normal", "Alola", "Galarian" ];
        case 58: // Growlithe
        case 59: // Arcanine
        case 100: // Voltorb
        case 101: // Electrode
        case 157: // Typhlosion
        case 211: // Qwillfish
        case 215: // Sneasel
        case 503: // Samurott
        case 549: // Lilligat
        case 570: // Zorua
        case 571: // Zoroark
        case 628: // Braviary
        case 705: // Sliggoo
        case 706: // Goodra
        case 713: // Avalugg
        case 724: // Decidueye
            return [ "Normal", "Hisuian" ];
        case 194: // Wooper
            return ["Normal", "Paldea"];
        case 128: // Tauros
            return ["Normal", "Paldea_combat", "Paldea_aqua", "Paldea_blaze"];
        case 25: // Pikachu
            return ["Normal", "Flying_01", "Doctor", "Horizons", "Pop_star", "Rock_star", "Vs_2019" ];
        case 201: // Unown
            return ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
                "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y",
                "Z", "Exclamation_point", "Question_mark"];
        case 249: // Lugia
        case 250: // Ho-Oh
            return ["Normal", "S"];
        case 351: // Castform
            return [ "Normal", "Sunny", "Rainy", "Snowy" ];
        case 386: // Deoxys
            return [ "Normal", "Attack", "Defense", "Speed" ];
        case 412: // Burmy
        case 413: // Wormadam
            return [ "Plant", "Sandy", "Trash" ];
        case 421: // Cherrim
            return [ "Overcast", "Sunny" ];
        case 422: // Shellos
        case 423: // Gastrodon
            return [ "West_sea", "East_sea" ];
        case 479: // Rotom
            return [ "Normal", "Heat", "Wash", "Frost", "Fan", "Mow" ]
        case 483: // Dialga
        case 484: // Palkia
            return [ "Normal", "Origin" ];
        case 487: // Giratina
            return [ "Altered", "Origin" ];
        case 492: // Shaymin
            return [ "Land", "Sky" ];
        case 493: // Arceus
            return [ "Normal", "Fire", "Water", "Grass", "Electric", "Ice",
                "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
                "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy" ];
        case 550: // Basculin
            return [ "Red_striped", "Blue_striped", "White_striped" ];
        case 555: // Darmanitan
            return [ "Standard", "Zen",
                "Galarian_standard", "Galarian_zen" ];
        case 585: // Deerling
        case 586: // Sawsbuck
            return [ "Spring", "Summer", "Autumn", "Winter" ];
        case 592: // Frillish
        case 593: // Jellicent
            return [ "Normal", "Female" ];
        case 641: // Tornadus
        case 642: // Thundurus
        case 645: // Landorus
        case 905: // Enamorus
            return [ "Incarnate", "Therian" ];
        case 646: // Kyurem
            return [ "Normal", "White", "Black" ];
        case 647: // Keldeo
            return [ "Ordinary", "Resolute" ];
        case 648: // Meloetta
            return [ "Aria", "Pirouette" ];
        case 649: // Genesect
            return [ "Normal", "Shock", "Burn", "Chill", "Douse" ];
        //case 664: // Scatterbug
        //case 665: // Spewpa
        case 666: // Vivillon
            return [ "Meadow", "Archipelago", "Continental", "Elegant",
                "Fancy", "Garden", "High_plains", "Icy_snow", "Jungle",
                "Marine", "Modern", "Monsoon", "Ocean", "Poke_ball",
                "Polar", "River", "Sandstorm", "Savanna", "Sun", "Tundra" ];
        case 669: // Flabebe
        case 671: // Florges
            return [ "Red", "Yellow", "Orange", "Blue", "White" ];
        case 676: // Furfrou
            return [ "Natural", "Heart", "Star", "Diamond", "Debutante",
                "Matron", "Dandy", "La_reine", "Kabuki", "Pharaoh" ];
        case 681: // Aegislash
            return [ "Normal", "Blade" ];
        case 710: // Pumpkaboo
        case 711: // Gourgeist
            return [ "Average", "Small", "Large", "Super" ];
        case 720: // Hoopa
            return [ "Confined", "Unbound" ];
        case 741: // Oricorio
            return [ "Baile", "Pompom", "Pau", "Sensu" ];
        case 745: // Lycanroc
            return [ "Midday", "Midnight", "Dusk" ];
        case 746: // Wishiwashi
            return [ "Solo", "School" ];
        case 773: // Silvally
            return [ "Normal", "Fire", "Water", "Grass", "Electric", "Ice",
                "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
                "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy" ];
        //case 774: // Minior
            //return [ "Red" ]; // TODO not added to pokmeon go yet
        case 778: // Mimikyu
            return [ "Disguised", "Busted" ];
        case 800: // Necrozma
            return [ "Normal", "Dawn_wings", "Dusk_mane", "Ultra" ];
        case 849: // Toxtricity
            return [ "Amped", "Low_key" ];
        case 854: // Sinistea
        case 855: // Polteageist
            return [ "Phony", "Antique" ];
        case 875: // Eiscue
            return [ "Ice", "Noice" ];
        case 876: // Indeedee
            return [ "Male", "Female" ];
        case 877: // Morpeko
            return [ "Full_belly", "Hangry" ];
        case 888: // Zacian
            return [ "Hero" , "Crowned_sword" ];
        case 889: // Zamazenta
            return [ "Hero" , "Crowned_shield" ];
        case 890: // Eternatus
            return [ "Normal", "Eternamax" ];
        case 892: // Urshifu
            return [ "Single_strike", "Rapid_strike" ];
        case 898: // Calyrex
            return [ "Normal", "Ice_rider", "Shadow_rider" ];
        case 902: // Basculegion
            return [ "Normal", "Female" ];
        case 916: // Oinkologne
            return [ "Normal", "Female" ];
        case 925: // Maushold
            return [ "Family_of_four", "Family_of_three" ]
        case 964: // Palafin
            return [ "Zero", "Hero" ]
        case 978: // Tatsugiri
            return [ "Curly", "Droopy", "Stretchy", "Mega" ]
        case 982: // Dudunsparce
            return [ "Two", "Three" ]
        case 1012: // Poltchageist
            return [ "Counterfeit", "Artisan" ];
        case 1013: // Sinistcha
            return [ "Unremarkable", "Masterpiece" ];
        default:
            return [ "Normal" ];
    }
}

/**
 * Gets string of a specific pokemon default form.
 */
function GetPokemonDefaultForm(pokemon_id) {

    return GetPokemonForms(pokemon_id)[0];
}

/**
 * Gets a specific pokemon's name used for its image source url.
 * The name varies depending on the pokemon's form and whether it's a mega.
 */
function GetPokemonImgSrcName(pokemon_id, form) {
    let poke_name = CleanPokeName(UntranslatedSpeciesName(pokemon_id));

    // checks for stupid nidoran
    if (pokemon_id == 29)
        poke_name = "nidoranf";
    else if (pokemon_id == 32)
        poke_name = "nidoranm";

    let img_src_name = poke_name;

    if (form != "Normal") {
        if (form == "Mega" && (pokemon_id == 382 || pokemon_id == 383))
            form = "Primal";
        if (form == "Mega" && (pokemon_id == 6 || pokemon_id == 26 || pokemon_id == 150))
            form = "MegaX";

        img_src_name += "-";
        img_src_name += form.toLowerCase().replace(/_/g, "");
    }

    return img_src_name;
}

/**
 * Gets a specific form display text.
 */
function GetFormText(pokemon_id, form) {

    if (pokemon_id == 493) { // Arceus
        return TranslatedFormName(form+"-type");
    }
    if (pokemon_id == 773) { // Silvally
        return TranslatedFormName("Type_"+form);
    }

    if (pokemon_id == 201) { // Unown letters
        switch (form) {
            case "Exclamation_point":
                return "!";
            case "Question_mark":
                return "?";
        }
        
        return form;
    }

    if (pokemon_id == 555) { // Darmanitan
        switch (form) {
            //case "Standard":
            //    return "Standard Mode";
            case "Zen":
                return TranslatedFormName("Zen");
            case "Galarian_standard":
                return TranslatedFormName("Galarian");
            case "Galarian_zen":
                return TranslatedFormName("Galarian") + TranslatedFormName("Zen");
        }

        return "";
    }
    
    if (pokemon_id == 649) { // Genesect
        return TranslatedFormName(form+"_drive");
    }

    if (pokemon_id == 666) { // Vivillon
        return TranslatedFormName(form+"_pattern");
    }

    if (pokemon_id == 669 || pokemon_id == 670 || pokemon_id == 671) { // Flabebe/Floette/Florges
        return TranslatedFormName(form+"_flower");
    }

    if (pokemon_id == 676) { // Furfrou
        if (form == "Natural")
            return TranslatedFormName("Natural");
        
        return TranslatedFormName(form+"_trim");
    }

    if (pokemon_id == 774) // TODO Minior not handled yet
        return "";

    if (pokemon_id == 875) { // Eiscue
        return TranslatedFormName(form+"_face");
    }

    switch (form) {
        case "Normal":
            switch (pokemon_id) {
                case 351: // Castform
                    return TranslatedFormName("Castform_normal");
                case 386: // Deoxys
                    return TranslatedFormName("Normal");
                case 592: // Frillish
                case 593: // Jellicent
                case 678: // Meowstic
                case 668: // Pyroar
                case 902: // Basculegion
                case 916: // Oinkologne
                    return TranslatedFormName("Male");
                case 681: // Aegislash
                    return TranslatedFormName("Shield");
                //case 890: // Eternatus
                //    return "Eternatus";
            }
            return "";
        case "Sunny":
            if (pokemon_id == 421) // Cherrim
                return TranslatedFormName("Sunshine");
            else // Castform
                return TranslatedFormName("Sunny");
        case "White":
            return TranslatedFormName("White_kyurem");
        case "Black":
            return TranslatedFormName("Black_kyurem");
        case "Hero":
            switch (pokemon_id) {
                case 888: // Zacian
                case 889: // Zamazenta
                    return TranslatedFormName("Hero_of_many_battles");
                case 964: // Palafin
                    return TranslatedFormName("Hero");
            }
            break;
    }

    return TranslatedFormName(form);
}

/**
 * Gets the x and y coordinates for a specific pokemon in the pokemon icons
 * spritesheet.
 * TODO:
 * - polteageist, mimikyu, urshifu
 */
function GetPokemonIconCoords(pokemon_id, form) {

    const NUM_COLS = 12, W = 40, H = 30;

    let offsetID = pokemon_id;
    // offset reference: https://github.com/smogon/sprites/blob/master/ps-pokemon.sheet.mjs

    if (form == "Mega" || form == "MegaY") {
        const megaOffset = 1320;
        const megaLookup = [
            3, // Venusaur
            6, // Charizard X
            6, // Charizard Y
            9, // Blastoise
            15, // Beedrill
            18, // Pidgeot
            65, // Alakazam
            80, // Slowbro
            94, // Gengar
            115, // Kangaskhan
            127, // Pinsir
            130, // Gyarados
            142, // Aerodactyl
            150, // Mewtwo X
            150, // Mewtwo Y
            181, // Ampharos
            208, // Steelix
            212, // Scizor
            214, // Heracross
            229, // Houndoom
            248, // Tyranitar
            254, // Sceptile
            257, // Blaziken
            260, // Swampert
            282, // Gardevoir
            302, // Sableye
            303, // Mawile
            306, // Aggron
            308, // Medicham
            310, // Manectric
            319, // Sharpedo
            323, // Camerupt
            334, // Altaria
            354, // Banette
            359, // Absol
            362, // Glalie
            373, // Salamence
            376, // Metagross
            380, // Latias
            381, // Latios
            382, // Kyogre
            383, // Groudon
            384, // Rayquaza
            428, // Lopunny
            445, // Garchomp
            448, // Lucario
            460, // Abomasnow
            475, // Gallade
            531, // Audino
            719, // Diancie
        ];

        if (megaLookup.includes(pokemon_id)) { // new Megas without sprites use base form
            offsetID = megaOffset + megaLookup.indexOf(pokemon_id);
            if (form == "MegaY") offsetID += 1;
        }
        else {
            const megaZAOffset = 1404;
            const megaZALookup = [
                36, // Clefable
                71, // Victreebel
                121, // Starmie
                149, // Dragonite
                154, // Meganium
                160, // Feraligatr
                227, // Skarmory
                478, // Froslass
                500, // Emboar
                530, // Excadrill
                545, // Scolipede
                560, // Scrafty
                604, // Eelektross
                609, // Chandelure
                652, // Chesnaught
                655, // Delphox
                658, // Greninja
                668, // Pyroar
                670, // Floette
                687, // Malamar
                689, // Barbaracle
                691, // Dragalge
                701, // Hawlucha
                718, // Zygarde
                780, // Drampa
                870, // Falinks
                26, // Raichu X
                26, // Raichu Y
                358, // Chimecho
                359, // Absol Z
                398, // Staraptor
                445, // Garchomp Z
                448, // Lucario Z
                485, // Heatran
                491, // Darkrai
                623, // Golurk
                478, // Froslass
                740, // Crabominable
                768, // Golisopod
                801, // Magearna
                    801, // Magearna (Original Color)
                807, // Zeraora
                952, // Scovillain
                970, // Glimmora
                978, // Tatsugiri (Curly)
                    978, // Tatsugiri (Droopy)
                    978, // Tatsugiri (Stretchy)
                998, // Baxcalibur
            ];

            if (megaZALookup.includes(pokemon_id)) { // new Megas without sprites use base form
                offsetID = megaZAOffset + megaZALookup.indexOf(pokemon_id);
                if (form == "MegaY") offsetID += 1;
            }
        }
    }
    else if (form == "MegaZ") {
        switch (pokemon_id) {
            case 359:
                offsetID = 1433;
                break;
            case 445:
                offsetID = 1435;
                break;
            case 448:
                offsetID = 1436;
                break;
        }
    }
    else if (form == "Alola") {
        const alolaOffset = 1151;
        const alolaLookup = [
            19, // Rattata
            20, // Raticate
            26, // Raichu
            27, // Sandshrew
            28, // Sandslash
            37, // Vulpix
            38, // Ninetales
            50, // Diglett
            51, // Dugtrio
            52, // Meowth
            53, // Persian
            74, // Geodude
            75, // Graveler
            76, // Golem
            88, // Grimer
            89, // Muk
            103, // Exeggutor
            105, // Marowak
        ];

        offsetID = alolaOffset + alolaLookup.indexOf(pokemon_id);
    }
    else if (form == "Galarian") {
        const galarOffset = 1198;
        const galarLookup = [
            52, // Meowth
            77, // Ponyta
            78, // Rapidash
            83, // Farfetch'd
            110, // Weezing
            122, // Mr. Mime
            222, // Corsola
            263, // Zigzagoon
            264, // Linoone
            554, // Darumaka
            555, // Darmanitan
            555, // Darmanitan Zen
            562, // Yamask
            618, // Stunfisk
            null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, // 16 more
            79, // Slowpoke
            80, // Slowbro
            null, // Zarude Dada
            null, // Pikachu World
            144, // Articuno
            145, // Zapdos
            146, // Moltres
            199, // Slowking
        ];

        offsetID = galarOffset + galarLookup.indexOf(pokemon_id);
    } 
    else if (form == "Hisuian") {
        const hisuiOffset = 1238;
        const hisuiLookup = [
            58, // Growlithe
            59, // Arcanine
            100, // Voltorb
            101, // Electrode
            157, // Typhlosion
            211, // Qwilfish
            215, // Sneasel
            503, // Samurott
            549, // Lilligant
            570, // Zorua
            571, // Zoroark
            628, // Braviary
            705, // Sliggoo
            706, // Goodra
            713, // Avalugg
            724, // Decidueye
        ];

        offsetID = hisuiOffset + hisuiLookup.indexOf(pokemon_id);
    } 
    else if (pokemon_id == 25) { // Pikachu
        const pikachuOffset = 1034;
        const pikachuLookup = [ 
            , // Belle
            "Vs_2019", // Libre
            "Doctor", // PhD
            "Pop_star",
            "Rock_star",
            , // Cosplay
        ];

        offsetID = pokemon_id;
        if (pikachuLookup.includes(form)) offsetID = pikachuOffset + pikachuLookup.indexOf(form);
    }
    else if (pokemon_id == 201) { // Unown
        const unownOffset = 1040;

        if (form == "A") offsetID = pokemon_id;
        else if (form == "Exclamation_point") offsetID = unownOffset;
        else if (form == "Question_mark") offsetID = unownOffset + 1;
        else offsetID = unownOffset + (form.charCodeAt(0) - "A".charCodeAt(0) + 1);
    }
    else if (pokemon_id == 351) { // Castform
        const castformOffset = 1067;
        const castformLookup = ['Rainy','Snowy','Sunny'];

        if (form == "Normal") offsetID = pokemon_id;
        else offsetID = castformOffset + castformLookup.indexOf(form);
    }
    else if (pokemon_id == 386) { // Deoxys
        const deoxysOffset = 1070;
        const deoxysLookup = ['Attack','Defense','Speed'];

        if (form == "Normal") offsetID = pokemon_id;
        else offsetID = deoxysOffset + deoxysLookup.indexOf(form);
    }
    else if (pokemon_id == 412 || pokemon_id == 413) { // Burmy/Wormadam
        const burmyOffset = 1073;
        const burmyLookup = ['Sandy','Trash'];

        if (form == "Normal" || form == "Plant") offsetID = pokemon_id;
        else offsetID = burmyOffset + burmyLookup.indexOf(form) 
            + (pokemon_id == 413 ? burmyLookup.length : 0);
    }
    else if (pokemon_id == 421 && form == "Sunny" ) offsetID = 1077; // Cherrim
    else if (form == "East_sea") {
        if (pokemon_id == 422) offsetID = 1078; // Shellos
        else if (pokemon_id == 423) offsetID = 1079; // Gastrodon
    } 
    else if (pokemon_id == 479) { // Rotom
        const rotomOffset = 1080;
        const rotomLookup = ['Fan','Frost','Heat','Mow','Wash'];

        if (form == "Normal") offsetID = pokemon_id;
        else offsetID = rotomOffset + rotomLookup.indexOf(form);
    } 
    else if (form == "Origin") {
        if (pokemon_id == 483) offsetID = 1269; // Dialga
        else if (pokemon_id == 484) offsetID = 1270; // Palkia
        else if (pokemon_id == 487) offsetID = 1085; // Giratina
    } 
    else if (pokemon_id == 492 && form == "Sky") offsetID = 1086; // Shaymin
    else if (pokemon_id == 550) { // Basculin
        if (form == "Normal" || form == "Red_striped") offsetID = pokemon_id;
        else if (form == "Blue_striped") offsetID = 1088;
        else if (form == "White_striped") offsetID = 1271;
    } 
    else if (pokemon_id == 555) { // Darmanitan 
        if (form == "Normal") offsetID = pokemon_id;
        else if (form == "Zen") offsetID = 1089;
        else if (form == "Galarian_standard") offsetID = 1208;
        else if (form == "Galarian_zen") offsetID = 1209;
    }
    else if (pokemon_id == 585 || pokemon_id == 586) { // Deerling/Sawsbuck
        const deerlingOffset = 1090;
        const deerlingLookup = ['Autumn','Summer','Winter'];

        if (form == "Normal" || form == "Spring") offsetID = pokemon_id;
        else offsetID = deerlingOffset + deerlingLookup.indexOf(form) 
            + (pokemon_id == 586 ? deerlingLookup.length : 0);
    }
    else if (form == "Female") {
        if (pokemon_id == 592) offsetID = 1096; // Frillish
        else if (pokemon_id == 593) offsetID = 1097; // Jellicent
        else if (pokemon_id == 668) offsetID = 1124; // Pyroar
        else if (pokemon_id == 678) offsetID = 1147; // Meowstic
        else if (pokemon_id == 876) offsetID = 1224; // Meowstic
        else if (pokemon_id == 916) offsetID = 1260; // Oinkologne
        // Basculegion
    }
    else if (form == "Therian") {
        if (pokemon_id == 641) offsetID = 1098; // Tornadus
        else if (pokemon_id == 642) offsetID = 1099; // Thundurus
        else if (pokemon_id == 645) offsetID = 1100; // Landorus
        else if (pokemon_id == 905) offsetID = 1255; // Enamorus
    } 
    else if (pokemon_id == 646) { // Kyurem
        const kyuremOffset = 1101;
        const kyuremLookup = ['Black','White'];

        if (form == "Normal") offsetID = pokemon_id;
        else offsetID = kyuremOffset + kyuremLookup.indexOf(form);
    }
    else if (pokemon_id == 647 && form == "Resolute") offsetID = 1103; // Keldeo
    else if (pokemon_id == 648 && form == "Pirouette") offsetID = 1104 // Meloetta
    else if (pokemon_id == 666) { // Vivillon
        const vivillonOffset = 1105;
        const vivillonLookup = ['Archipelago','Continental','Elegant','Fancy','Garden','High_plains','Icy_snow','Jungle','Marine','Modern','Monsoon','Ocean','Pokeball','Polar','River','Sandstorm','Savanna','Sun','Tundra'];

        if (form == "Normal" || form == "Meadow") offsetID = pokemon_id;
        else offsetID = vivillonOffset + vivillonLookup.indexOf(form);
    } 
    else if (pokemon_id == 669 || pokemon_id == 670 || pokemon_id == 671) { // Flabebe/Floette/Florges
        const flabebeOffset = 1125;
        const florgesOffset = 1134;
        const flabebeLookup = ['Blue','Orange','White','Yellow'];
        const floetteOffset = 1129;
        const floetteLookup = ['Blue','Eternal','Orange','White','Yellow'];

        if (form == "Normal" || form == "Red") offsetID = pokemon_id;
        else if (pokemon_id == 669) offsetID = flabebeOffset + flabebeLookup.indexOf(form);
        else if (pokemon_id == 670) offsetID = floetteOffset + floetteLookup.indexOf(form);
        else if (pokemon_id == 671) offsetID = florgesOffset + flabebeLookup.indexOf(form);
    }
    else if (pokemon_id == 676) { // Furfrou
        const furfrouOffset = 1138;
        const furfrouLookup = ['Dandy','Debutante','Diamond','Heart','Kabuki','La_reine','Matron','Pharaoh','Star'];

        if (form == "Normal" || form == "Natural") offsetID = pokemon_id;
        else offsetID = furfrouOffset + furfrouLookup.indexOf(form);
    } 
    else if (pokemon_id == 681 && form == "Blade") offsetID = 1148; // Aegislash Blade
    // Xerneas Neutral
    else if (pokemon_id == 720 && form == "Unbound") offsetID = 1150; // Hoopa
    // Ash Greninja
    else if (pokemon_id == 718) { // Zygarde
        const zygardeOffset = 1170;
        const zygardeLookup = ['Ten_percent','Complete'];

        if (form == "Normal" || form == "Fifty_percent") offsetID = pokemon_id;
        else offsetID = zygardeOffset + zygardeLookup.indexOf(form);
    }
    else if (pokemon_id == 741) { // Oricorio
        const oricorioOffset = 1172;
        const oricorioLookup = ['Pompom','Pau','Sensu'];

        if (form == "Normal" || form == "Baile") offsetID = pokemon_id;
        else offsetID = oricorioOffset + oricorioLookup.indexOf(form);
    }
    else if (pokemon_id == 745) { // Lycanroc
        if (form == 'Normal' || form == 'Midday') offsetID = pokemon_id;
        else if (form == 'Midnight') offsetID = 1175;
        else if (form == 'Dusk') offsetID = 1192;
    }
    else if (pokemon_id == 746 && form == "School") offsetID = 1176 // Wishiwashi
    // Minior
    else if (pokemon_id == 800) { // Necrozma
        const necrozmaOffset = 1193;
        const necrozmaLookup = ['Dusk_mane','Dawn_wings','Ultra'];

        if (form == "Normal") offsetID = pokemon_id;
        else offsetID = necrozmaOffset + necrozmaLookup.indexOf(form);
    }
    else if (pokemon_id == 849 && form == "Low_key") offsetID = 1214; // Toxtricity
    // Alcremie
    else if (pokemon_id == 875 && form == "Noice") offsetID = 1223; // Eiscue
    else if (pokemon_id == 877 && form == "Hangry") offsetID = 1225; // Morpeko
    else if (pokemon_id == 888 && form == "Crowned_sword") offsetID = 1226 // Zacian
    else if (pokemon_id == 889 && form == "Crowned_shield") offsetID = 1227 // Zamazenta
    // Zarude Dada
    else if (pokemon_id == 898) { // Calyrex
        const calyrexOffset = 1236;
        const calyrexLookup = ['Ice_rider','Shadow_rider'];

        if (form == "Normal") offsetID = pokemon_id;
        else offsetID = calyrexOffset + calyrexLookup.indexOf(form);
    }
    else if (pokemon_id == 128) { // Tauros
        const taurosOffset = 1256;
        const taurosLookup = ['Paldea_combat','Paldea_blaze','Paldea_aqua'];

        if (form == "Normal") offsetID = pokemon_id;
        else offsetID = taurosOffset + taurosLookup.indexOf(form);
    }
    else if (pokemon_id == 194 && form == "Paldea") offsetID = 1259 // Wooper
    else if (pokemon_id == 964 && form == "Hero") offsetID = 1261 // Palafin
    else if (pokemon_id == 925 && form == "Family_of_four") offsetID = 1262 // Maushold
    else if (pokemon_id == 978) { // Tatsugiri
        const tatsugiriOffset = 1263;
        const tatsugiriLookup = ['Droopy','Stretchy'];

        if (form == "Curly") offsetID = pokemon_id;
        else offsetID = tatsugiriOffset + tatsugiriLookup.indexOf(form);
    }
    // Squawkabilly
    // Ursaloon Blood Moon
    // Ogerpon
    // Terapagos
    else if (pokemon_id == 493 || pokemon_id == 773) { // Arceus/Silvally
        const arceusOffset = 1278;
        const arceusLookup = ['Bug','Dark','Dragon','Electric','Fairy','Fighting','Fire','Flying','Ghost','Grass','Ground','Ice','Poison','Psychic','Rock','Steel','Water'];
        const silvallyOffset = 1299;

        if (form == "Normal") offsetID = pokemon_id;
        else if (pokemon_id == 493) offsetID = arceusOffset + arceusLookup.indexOf(form);
        else if (pokemon_id == 773) offsetID = silvallyOffset + arceusLookup.indexOf(form);
    } 
    else if (pokemon_id == 649) { // Genesect
        const genesectOffset = 1295;
        const genesectLookup = ['Douse','Shock','Burn','Chill'];

        if (form == "Normal") offsetID = pokemon_id;
        else offsetID = genesectOffset + genesectLookup.indexOf(form);
    }

    const col = offsetID % NUM_COLS;
    const row = Math.floor(offsetID / NUM_COLS);
    return {x: col * -W, y: row * -H};
}

/**
 * Maps the "Normal" form for a regional variant into its origin region
 * and renames -ian forms to match the region name
 */
function GetRegionalFormName(pkm_id, form_name) {
    switch (form_name) {
        case "Normal":
            if (pkm_id <= 151) return "Kanto";
            if (pkm_id <= 251) return "Johto";
            if (pkm_id <= 386) return "Hoenn";
            if (pkm_id <= 493) return "Sinnoh";
            if (pkm_id <= 649) return "Unova";
            if (pkm_id <= 721) return "Kalos";
            if (pkm_id <= 809) return "Alola";
            if (pkm_id <= 898) return "Galar";
            if (pkm_id <= 905) return "Hisui";
            return "Paldea";
        case "Hisuian":
            return "Hisui";
        case "Galarian":
            return "Galar";
        default: // Alola, Paldea
            return form_name
    }
}
