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
 * The keys of the map are the possible effectiveness (0.391, 0.624, 1, 1.60, 2.56)
 * and the values are arrays with the types matching such effectiveness.
 */
function GetTypesEffectivenessAgainstTypes(types) {

    let effectiveness = new Map();
    effectiveness.set(0.391, []);
    effectiveness.set(0.625, []);
    effectiveness.set(1, []);
    effectiveness.set(1.60, []);
    effectiveness.set(2.56, []);

    for (let attacker_type of POKEMON_TYPES) {
        const type_effect = POKEMON_TYPES_EFFECT.get(attacker_type);
        let mult = 1;
        for (let type of types) {
            if (type_effect[0].includes(type))
                mult *= 0.391;
            else if (type_effect[1].includes(type))
                mult *= 0.625;
            else if (type_effect[2].includes(type))
                mult *= 1.60;
        }
        if (Math.abs(mult - 0.391) < 0.001)
            effectiveness.get(0.391).push(attacker_type);
        else if (Math.abs(mult - 0.625) < 0.001)
            effectiveness.get(0.625).push(attacker_type);
        else if (Math.abs(mult - 1.60) < 0.001)
            effectiveness.get(1.60).push(attacker_type);
        else if (Math.abs(mult - 2.56) < 0.001)
            effectiveness.get(2.56).push(attacker_type);
        else
            effectiveness.get(1).push(attacker_type);
    }

    return effectiveness;
}

/**
 * Gets the multiplier value of a single type against a specific map of
 * types effectiveness.
 */
function GetEffectivenessMultOfType(effectiveness, type) {

    if (effectiveness.get(0.391).includes(type))
        return 0.391;
    else if (effectiveness.get(0.625).includes(type))
        return 0.625;
    else if (effectiveness.get(1.60).includes(type))
        return 1.60;
    else if (effectiveness.get(2.56).includes(type))
        return 2.56;
    else
        return 1;
}

/**
 * Gets the CP multiplier for a specific level.
 */
function GetCPMForLevel(level) {

    switch (level) {
        case 1:
            return 0.094;
        case 1.5:
            return 0.1351374318;
        case 2:
            return 0.16639787;
        case 2.5:
            return 0.192650919;
        case 3:
            return 0.21573247;
        case 3.5:
            return 0.2365726613;
        case 4:
            return 0.25572005;
        case 4.5:
            return 0.2735303812;
        case 5:
            return 0.29024988;
        case 5.5:
            return 0.3060573775;
        case 6:
            return 0.3210876;
        case 6.5:
            return 0.3354450362;
        case 7:
            return 0.34921268;
        case 7.5:
            return 0.3624577511;
        case 8:
            return 0.3752356;
        case 8.5:
            return 0.387592416;
        case 9:
            return 0.39956728;
        case 9.5:
            return 0.4111935514;
        case 10:
            return 0.4225;
        case 10.5:
            return 0.4329264091;
        case 11:
            return 0.44310755;
        case 11.5:
            return 0.4530599591;
        case 12:
            return 0.4627984;
        case 12.5:
            return 0.472336093;
        case 13:
            return 0.48168495;
        case 13.5:
            return 0.4908558003;
        case 14:
            return 0.49985844;
        case 14.5:
            return 0.508701765;
        case 15:
            return 0.51739395;
        case 15.5:
            return 0.5259425113;
        case 16:
            return 0.5343543;
        case 16.5:
            return 0.5426357375;
        case 17:
            return 0.5507927;
        case 17.5:
            return 0.5588305862;
        case 18:
            return 0.5667545;
        case 18.5:
            return 0.5745691333;
        case 19:
            return 0.5822789;
        case 19.5:
            return 0.5898879072;
        case 20:
            return 0.5974;
        case 20.5:
            return 0.6048236651;
        case 21:
            return 0.6121573;
        case 21.5:
            return 0.6194041216;
        case 22:
            return 0.6265671;
        case 22.5:
            return 0.6336491432;
        case 23:
            return 0.64065295;
        case 23.5:
            return 0.6475809666;
        case 24:
            return 0.65443563;
        case 24.5:
            return 0.6612192524;
        case 25:
            return 0.667934;
        case 25.5:
            return 0.6745818959;
        case 26:
            return 0.6811649;
        case 26.5:
            return 0.6876849038;
        case 27:
            return 0.69414365;
        case 27.5:
            return 0.70054287;
        case 28:
            return 0.7068842;
        case 28.5:
            return 0.7131691091;
        case 29:
            return 0.7193991;
        case 29.5:
            return 0.7255756136;
        case 30:
            return 0.7317;
        case 30.5:
            return 0.7347410093;
        case 31:
            return 0.7377695;
        case 31.5:
            return 0.7407855938;
        case 32:
            return 0.74378943;
        case 32.5:
            return 0.7467812109;
        case 33:
            return 0.74976104;
        case 33.5:
            return 0.7527290867;
        case 34:
            return 0.7556855;
        case 34.5:
            return 0.7586303683;
        case 35:
            return 0.76156384;
        case 35.5:
            return 0.7644860647;
        case 36:
            return 0.76739717;
        case 36.5:
            return 0.7702972656;
        case 37:
            return 0.7731865;
        case 37.5:
            return 0.7760649616;
        case 38:
            return 0.77893275;
        case 38.5:
            return 0.7817900548;
        case 39:
            return 0.784637;
        case 39.5:
            return 0.7874736075;
        case 40:
            return 0.7903;
        case 40.5:
            return 0.792803968;
        case 41:
            return 0.79530001;
        case 41.5:
            return 0.797800015;
        case 42:
            return 0.8003;
        case 42.5:
            return 0.802799995;
        case 43:
            return 0.8053;
        case 43.5:
            return 0.8078;
        case 44:
            return 0.81029999;
        case 44.5:
            return 0.812799985;
        case 45:
            return 0.81529999;
        case 45.5:
            return 0.81779999;
        case 46:
            return 0.82029999;
        case 46.5:
            return 0.82279999;
        case 47:
            return 0.82529999;
        case 47.5:
            return 0.82779999;
        case 48:
            return 0.83029999;
        case 48.5:
            return 0.83279999;
        case 49:
            return 0.83529999;
        case 49.5:
            return 0.83779999;
        case 50:
            return 0.84029999;
        case 50.5:
            return 0.84279999;
        case 51:
            return 0.84529999;
        default: // should not happen...
            return 0;
    }
}

/**
 * Gets array of strings of a specific pokemon forms.
 */
function GetPokemonForms(pokemon_id) {

    switch (pokemon_id) {
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
        case 80: // Slowbro
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
        case 668: // Pyroar
            return [ "Normal", "Female" ];
        case 669: // Flabebe
        case 670: // Floette
        case 671: // Florges
            return [ "Red", "Yellow", "Orange", "Blue", "White" ];
        case 676: // Furfrou
            return [ "Natural", "Heart", "Star", "Diamond", "Debutante",
                "Matron", "Dandy", "La_reine", "Kabuki", "Pharaoh" ];
        case 678: // Meowstic
            return [ "Normal", "Female" ];
        case 710: // Pumpkaboo
        case 711: // Gourgeist
            return [ "Average", "Small", "Large", "Super" ];
        case 718: // Zygarde
            return [ "Fifty_percent", "Ten_percent", "Complete" ];
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
            return [ "Normal", "Dawn_wings", "Dusk_mane" ];
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
function GetPokemonImgSrcName(pokemon_id, clean_name, form, mega, mega_y) {

    // checks for stupid nidoran
    if (pokemon_id == 29)
        clean_name = "nidoranf";
    else if (pokemon_id == 32)
        clean_name = "nidoranm";

    let img_src_name = clean_name;

    if (form != "Normal") {
        img_src_name += "-";
        img_src_name += form.toLowerCase().replace(/_/g, "");
    }

    if (mega) {
        if (pokemon_id == 382 || pokemon_id == 383) // Kyogre or Groudon
            img_src_name += "-primal";
        else
            img_src_name += "-mega";
    }
    const can_be_mega_y = pokemon_id == 6 || pokemon_id == 150; 
    if (mega && can_be_mega_y)
        img_src_name += ((mega_y) ? "y" : "x");

    return img_src_name;
}

/**
 * Gets a specific form display text.
 */
function GetFormText(pokemon_id, form) {

    if (pokemon_id == 493 || pokemon_id == 773 // Arceus or Silvally
            || pokemon_id == 201 && form != "Exclamation_point" && form != "Question_mark") { // Unown letters
        return form;
    }

    if (pokemon_id == 774) // TODO Minior not handled yet
        return "";

    switch (form) {
        case "Normal":
            switch (pokemon_id) {
                case 351: // Castform
                    return "Normal Form";
                case 386: // Deoxys
                    return "Normal Forme";
                case 479: // Rotom
                    return "Rotom";
                case 592: // Frillish
                case 593: // Jellicent
                case 678: // Meowstic
                case 668: // Pyroar
                case 902: // Basculegion
                case 916: // Oinkologne
                    return "Male";
                case 646: // Kyurem
                    return "Kyurem";
                case 649: // Genesect
                    return "Normal";
                case 890: // Eternatus
                    return "Eternatus";
            }
            break;
        case "Alola":
            return "Alolan Form";
        case "Paldea":
            return "Paldean Form";
        case "Exclamation_point":
            return "!";
        case "Question_mark":
            return "?";
        case "Plant":
        case "Sandy":
        case "Trash":
            return form + " Cloak";
        case "Galarian":
        case "Hisuian":
        case "Rainy":
        case "Snowy":
        case "Overcast":
        case "Spring":
        case "Autumn":
        case "Winter":
        case "Summer":
        case "Ordinary":
        case "Resolute":
        case "Natural":
        case "Midday":
        case "Midnight":
        case "Dusk":
        case "Solo":
        case "School":
        case "Disguised":
        case "Busted":
        case "Amped":
        case "Phony":
        case "Antique":
            return form + " Form";
        case "Sunny":
            if (pokemon_id == 421) // Cherrim
                return "Sunshine Form";
            else
                return "Sunny Form";
        case "West_sea":
            return "West Sea";
        case "East_sea":
            return "East Sea";
        case "Heat":
        case "Wash":
        case "Frost":
        case "Fan":
        case "Mow":
            return form + " Rotom";
        case "Attack":
        case "Defense":
        case "Speed":
        case "Altered":
        case "Origin":
        case "Land":
        case "Sky":
        case "Incarnate":
        case "Therian":
        case "Aria":
        case "Pirouette":
            return form + " Forme";
        case "White":
            switch (pokemon_id) {
                case 646: // Kyurem
                    return "White Kyurem";
                case 669: // Flabebe
                case 670: // Floette
                case 671: // Florges
                    return "White Flower";
            }
            break;
        case "Black":
            return "Black Kyurem";
        case "Shock":
        case "Burn":
        case "Chill":
        case "Douse":
            return form + " Drive";
        case "Red_striped":
            return "Red-Striped Form";
        case "Blue_striped":
            return "Blue-Striped Form";
        case "White_striped":
            return "White-Striped Form";
        case "Standard":
            return "Standard Mode";
        case "Zen":
            return "Zen Mode";
        case "Galarian_standard":
            return "Galarian Standard Mode";
        case "Galarian_zen":
            return "Galarian Zen Mode";
        case "Archipelago":
        case "Continental":
        case "Elegant":
        case "Fancy":
        case "Garden":
        case "Jungle":
        case "Marine":
        case "Meadow":
        case "Modern":
        case "Monsoon":
        case "Ocean":
        case "Polar":
        case "River":
        case "Sandstorm":
        case "Savanna":
        case "Sun":
        case "Tundra":
            return form + " Pattern";
        case "High_plains":
            return "High Plains Pattern";
        case "Icy_snow":
            return "Icy Snow Pattern";
        case "Poke_ball":
            return "Poké Ball Pattern";
        case "Red":
        case "Yellow":
        case "Orange":
        case "Blue":
            return form + " Flower";
        case "Heart":
        case "Star":
        case "Diamond":
        case "Debutante":
        case "Matron":
        case "Dandy":
        case "Kabuki":
        case "Pharaoh":
            return form + " Trim";
        case "La_reine":
            return "La Reine Trim";
        case "Average":
        case "Small":
        case "Large":
        case "Super":
            return form + " Size";
        case "Fifty_percent":
            return "50% Forme";
        case "Ten_percent":
            return "10% Forme";
        case "Complete":
            return "Complete Forme";
        case "Confined":
        case "Unbound":
            return "Hoopa " + form;
        case "Baile":
            return "Baile Style";
        case "Pompom":
            return "Pom-Pom Style";
        case "Pau":
            return "Pa'u Style";
        case "Sensu":
            return "Sensu Style";
        case "Dawn_wings":
            return "Dawn Wings";
        case "Dusk_mane":
            return "Dusk Mane";
        case "Low_key":
            return "Low Key Form";
        case "Ice":
        case "Noice":
            return form + " Face";
        case "Male":
        case "Female":
            return form;
        case "Full_belly":
            return "Full Belly Mode";
        case "Hangry":
            return "Hangry Mode";
        case "Hero":
            switch (pokemon_id) {
                case 888: // Zacian
                case 889: // Zamazenta
                    return "Hero of Many Battles";
                case 964: // Palafin
                    return "Hero";
            }
            break;
        case "Zero":
            return "Zero";
        case "Crowned_sword":
            return "Crowned Sword";
        case "Crowned_shield":
            return "Crowned Shield";
        case "Eternamax":
            return "Eternamax Eternatus";
        case "Single_strike":
            return "Single Strike Style";
        case "Rapid_strike":
            return "Rapid Strike Style";
        case "Ice_rider":
            return "Ice Rider";
        case "Shadow_rider":
            return "Shadow Rider";
        case "Family_of_four":
            return "Family of Four";
        case "Family_of_three":
            return "Family of Three";
        case "S":
            return "Apex";
    }

    return "";
}

/**
 * Gets the x and y coordinates for a specific pokemon in the pokemon icons
 * spritesheet.
 * TODO:
 * - polteageist, mimikyu, urshifu
 */
function GetPokemonIconCoords(pokemon_id, form, mega, mega_y) {

    const NUM_COLS = 12, W = 40, H = 30;

    let offsetID = pokemon_id;
    // offset reference: https://github.com/smogon/sprites/blob/master/ps-pokemon.sheet.mjs

    if (mega) {
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

        offsetID = megaOffset + megaLookup.indexOf(pokemon_id);
        if (mega_y) offsetID += 1;
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
        const kyuremLookup = ['White','Black'];

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
    // Aegislash Blade
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
    // Tauros
    else if (pokemon_id == 194 && form == "Paldea") offsetID = 1259 // Wooper
    else if (pokemon_id == 964 && form == "Hero") offsetID = 1261 // Palafin
    else if (pokemon_id == 925 && form == "Family_of_four") offsetID = 1262 // Maushold
    // Tatsugiri
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
