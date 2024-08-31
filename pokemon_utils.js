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
            return "Hero of Many Battles";
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

    col = 0, row = 0;

    if (mega) {

        switch (pokemon_id) {
        case 3: // Venusaur
            col = 0, row = 105;
            break;
        case 6: // Charizard
            col = (mega_y) ? 2 : 1, row = 105;
            break;
        case 9: // Blastoise
            col = 3, row = 105;
            break;
        case 15: // Beedrill
            col = 4, row = 105;
            break;
        case 18: // Pidgeot
            col = 5, row = 105;
            break;
        case 65: // Alakazam
            col = 6, row = 105;
            break;
        case 80: // Slowbro
            col = 7, row = 105;
            break;
        case 94: // Gengar
            col = 8, row = 105;
            break;
        case 115: // Kangaskhan
            col = 9, row = 105;
            break;
        case 127: // Pinsir
            col = 10, row = 105;
            break;
        case 130: // Gyarados
            col = 11, row = 105;
            break;
        case 142: // Aerodactyl
            col = 0, row = 106;
            break;
        case 150: // Mewtwo
            col = (mega_y) ? 2 : 1, row = 106;
            break;
        case 181: // Ampharos
            col = 3, row = 106;
            break;
        case 208: // Steelix
            col = 4, row = 106;
            break;
        case 212: // Scizor
            col = 5, row = 106;
            break;
        case 214: // Heracross
            col = 6, row = 106;
            break;
        case 229: // Houndoom
            col = 7, row = 106;
            break;
        case 248: // Tyranitar
            col = 8, row = 106;
            break;
        case 254: // Sceptile
            col = 9, row = 106;
            break;
        case 257: // Blaziken
            col = 10, row = 106;
            break;
        case 260: // Swampert
            col = 11, row = 106;
            break;
        case 282: // Gardevoir
            col = 0, row = 107;
            break;
        case 302: // Sableye
            col = 1, row = 107;
            break;
        case 303: // Mawile
            col = 2, row = 107;
            break;
        case 306: // Aggron
            col = 3, row = 107;
            break;
        case 308: // Medicham
            col = 4, row = 107;
            break;
        case 310: // Manectric
            col = 5, row = 107;
            break;
        case 319: // Sharpedo
            col = 6, row = 107;
            break;
        case 323: // Camerupt
            col = 7, row = 107;
            break;
        case 334: // Altaria
            col = 8, row = 107;
            break;
        case 354: // Banette
            col = 9, row = 107;
            break;
        case 359: // Absol
            col = 10, row = 107;
            break;
        case 362: // Glalie
            col = 11, row = 107;
            break;
        case 373: // Salamence
            col = 0, row = 108;
            break;
        case 376: // Metagross
            col = 1, row = 108;
            break;
        case 380: // Latias
            col = 2, row = 108;
            break;
        case 381: // Latios
            col = 3, row = 108;
            break;
        case 382: // Kyogre
            col = 4, row = 108;
            break;
        case 383: // Groudon
            col = 5, row = 108;
            break;
        case 384: // Rayquaza
            col = 6, row = 108;
            break;
        case 428: // Lopunny
            col = 7, row = 108;
            break;
        case 445: // Garchomp
            col = 8, row = 108;
            break;
        case 448: // Lucario
            col = 9, row = 108;
            break;
        case 460: // Abomasnow
            col = 10, row = 108;
            break;
        case 475: // Gallade
            col = 11, row = 108;
            break;
        case 531: // Audino
            col = 0, row = 109;
            break;
        case 719: // Diancie
            col = 1, row = 109;
            break;
        }

    } else if (pokemon_id == 26 && form == "Alola") { // Raichu
        col = 1, row = 95;

    } else if (pokemon_id == 28 && form == "Alola") { // Sandslash
        col = 3, row = 95;

    } else if (pokemon_id == 38 && form == "Alola") { // Ninetales
        col = 5, row = 95;

    } else if (pokemon_id == 51 && form == "Alola") { // Dugtrio
        col = 7, row = 95;

    } else if (pokemon_id == 59 && form == "Hisuian") { // Arcanine
        col = 3, row = 102;

    } else if (pokemon_id == 76 && form == "Alola") { // Golem
        col = 0, row = 96;

    } else if (pokemon_id == 78 && form == "Galarian") { // Rapidash
        col = 0, row = 99;

    } else if (pokemon_id == 80 && form == "Galarian") { // Slowbro
        col = 5, row = 101;

    } else if (pokemon_id == 89 && form == "Alola") { // Muk
        col = 2, row = 96;

    } else if (pokemon_id == 103 && form == "Alola") { // Exeggutor
        col = 3, row = 96;

    } else if (pokemon_id == 110 && form == "Galarian") { // Weezing
        col = 2, row = 99;

    } else if (pokemon_id == 144 && form == "Galarian") { // Articuno
        col = 8, row = 101;
    } else if (pokemon_id == 145 && form == "Galarian") { // Zapdos
        col = 9, row = 101;
    } else if (pokemon_id == 146 && form == "Galarian") { // Moltres
        col = 10, row = 101;

    } else if (pokemon_id == 157 && form == "Hisuian") { // Typhlosion
        col = 6, row = 102;

    } else if (pokemon_id == 199 && form == "Galarian") { // Slowking
        col = 11, row = 101;

    } else if (pokemon_id == 211 && form == "Hisuian") { // Qwilfish
        col = 7, row = 102;

    } else if (pokemon_id == 423 && form == "East_sea") { // Gastrodon
        col = 11, row = 88;

    } else if (pokemon_id == 479 && form == "Heat") { // Rotom
        col = 2, row = 89;
    } else if (pokemon_id == 479 && form == "Wash") { // Rotom
        col = 4, row = 89;
    } else if (pokemon_id == 479 && form == "Frost") { // Rotom
        col = 1, row = 89;
    } else if (pokemon_id == 479 && form == "Fan") { // Rotom
        col = 0, row = 89;
    } else if (pokemon_id == 479 && form == "Mow") { // Rotom
        col = 3, row = 89;

    } else if (pokemon_id == 483 && form == "Origin") { // Dialga
        col = 9, row = 104;
    } else if (pokemon_id == 484 && form == "Origin") { // Palkia
        col = 10, row = 104;
    } else if (pokemon_id == 487 && form == "Origin") { // Giratina
        col = 5, row = 89;

    } else if (pokemon_id == 492 && form == "Sky") { // Shaymin
        col = 6, row = 89;

    } else if (pokemon_id == 503 && form == "Hisuian") { // Samurott
        col = 9, row = 102;

    } else if (pokemon_id == 555 && form == "Zen") { // Darmanitan
            col = 9, row = 89;
    } else if (pokemon_id == 555 && form == "Galarian_standard") { // Darmanitan
            col = 8, row = 99;
    } else if (pokemon_id == 555 && form == "Galarian_zen") { // Darmanitan
            col = 9, row = 99;

    } else if (pokemon_id == 593 && form == "Female") { // Jellicent
        col = 5, row = 90;

    } else if (pokemon_id == 628 && form == "Hisuian") { // Braviary
        col = 1, row = 103;

    } else if (pokemon_id == 641 && form == "Therian") { // Tornadus
        col = 6, row = 90;
    } else if (pokemon_id == 642 && form == "Therian") { // Thundurus
        col = 7, row = 90;
    } else if (pokemon_id == 645 && form == "Therian") { // Landorus
        col = 8, row = 90;

    } else if (pokemon_id == 646 && form == "White") { // Kyurem
        col = 10, row = 90;
    } else if (pokemon_id == 646 && form == "Black") { // Kyurem
        col = 9, row = 90;

    } else if (pokemon_id == 647 && form == "Resolute") { // Keldeo
        col = 11, row = 90;

    } else if (pokemon_id == 648 && form == "Pirouette") { // Meloetta
        col = 0, row = 91;

    } else if (pokemon_id == 668 && form == "Female") { // Pyroar
        col = 8, row = 92;

    } else if (pokemon_id == 671 && form == "Yellow") { // Florges
        col = 9, row = 93;
    } else if (pokemon_id == 671 && form == "Orange") { // Florges
        col = 7, row = 93;
    } else if (pokemon_id == 671 && form == "Blue") { // Florges
        col = 6, row = 93;
    } else if (pokemon_id == 671 && form == "White") { // Florges
        col = 8, row = 93;

    } else if (pokemon_id == 713 && form == "Hisuian") { // Avalugg
        col = 4, row = 103;

    } else if (pokemon_id == 718 && form == "Ten_percent") { // Zygarde
        col = 6, row = 96;
    } else if (pokemon_id == 718 && form == "Complete") { // Zygarde
        col = 7, row = 96;

    } else if (pokemon_id == 720 && form == "Unbound") { // Hoopa
        col = 10, row = 94;

    } else if (pokemon_id == 724 && form == "Hisuian") { // Decidueye
        col = 5, row = 103;

    } else if (pokemon_id == 741 && form == "Pompom") { // Oricorio
        col = 8, row = 96;
    } else if (pokemon_id == 741 && form == "Pau") { // Oricorio
        col = 9, row = 96;
    } else if (pokemon_id == 741 && form == "Sensu") { // Oricorio
        col = 10, row = 96;

    } else if (pokemon_id == 745 && form == "Midnight") { // Lycanroc
        col = 11, row = 96;
    } else if (pokemon_id == 745 && form == "Dusk") { // Lycanroc
        col = 4, row = 98;

    } else if (pokemon_id == 746 && form == "School") { // Wishiwashi
        col = 0, row = 97;

    } else if (pokemon_id == 800 && form == "Dawn_wings") { // Necrozma
        col = 6, row = 98;
    } else if (pokemon_id == 800 && form == "Dusk_mane") { // Necrozma
        col = 5, row = 98;

    } else if (pokemon_id == 849 && form == "Low_key") { // Toxtricity
        col = 2, row = 100;

    } else if (pokemon_id == 876 && form == "Female") { // Indeedee
        col = 0, row = 101;

    } else if (pokemon_id == 888 && form == "Crowned_sword") { // Zacian
        col = 2, row = 101;
    } else if (pokemon_id == 889 && form == "Crowned_shield") { // Zamazenta
        col = 3, row = 101;

    } else if (pokemon_id == 890 && form == "Eternamax") { // Eternatus
        col = 4, row = 111;

    } else if (pokemon_id == 898 && form == "Ice_rider") { // Calyrex
        col = 0, row = 102;
    } else if (pokemon_id == 898 && form == "Shadow_rider") { // Calyrex
        col = 1, row = 102;

    } else if (pokemon_id == 905 && form == "Therian") { // Enamorus
        col = 7, row = 103;

    } else {
        col = pokemon_id % NUM_COLS;
        row = Math.floor(pokemon_id / NUM_COLS);
    }

    return {x: col * -W, y: row * -H};
}
