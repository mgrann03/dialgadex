/* Web component for Pokemon type selection
with special behavior for multiselection */
class TypeSelector extends HTMLElement {
    #typeNodeMap;
    static #typeList = [
        "Normal",
        "Fire",
        "Water",
        "Grass",
        "Electric",
        "Ice",
        "Fighting",
        "Poison",
        "Ground",
        "Flying",
        "Psychic",
        "Bug",
        "Rock",
        "Ghost",
        "Dragon",
        "Dark",
        "Steel",
        "Fairy"
    ];

    constructor() {
        super();
    }

    #newTextNode(innerText) {
        const textNode = document.createElement("li");
        textNode.innerText = innerText;
        this.appendChild(textNode);
    }

    #newTypeNode(type, innerText, addClass) {
        const typeNode = document.createElement("li");
        if (addClass) typeNode.classList.add(addClass);

        const typeLink = document.createElement("a");
        typeLink.dataset["type"] = type;
        typeLink.classList.add("type-text");
        typeLink.classList.add("bg-"+type);
        typeLink.innerText = innerText ?? type;

        typeNode.appendChild(typeLink);
        this.appendChild(typeNode);
        this.#typeNodeMap.set(type, typeNode);
    }

    connectedCallback() {
        this.#typeNodeMap = new Map();

        this.#newTextNode("\u00A0");
        this.#newTypeNode("Any", "All types", "span2");
        this.#newTypeNode("Each", "Each type", "span2");
        this.#newTextNode("\u00A0");

        // Build buttons for each type
        for (const type of TypeSelector.#typeList) {
            this.#newTypeNode(type);
        }

        this.selectedType = "Any";
        
        this.addEventListener("click", (event) => {
            this.#buttonClick(event.target);
            event.preventDefault();
        });
    }

    setHrefs(paramFunc) {
        for (const [type, node] of this.#typeNodeMap) {
            const typeLink = node.firstElementChild;
            typeLink.setAttribute("href", paramFunc(type));
        }
    }

    // Handle click of a type button
    #buttonClick(elem) {
        if (elem.tagName !== "A") return; // type buttons only

        const prevType = this.selectedType;
        this.selectedType = elem.dataset["type"];

        if (this.selectedType != prevType) {
            this.#typeUpdateEvent();
        }

        this.#updateSelectedStyle();
    }

    #typeUpdateEvent() {
        this.dispatchEvent(new CustomEvent('type-change', {
            detail: { type: this.selectedType },
            bubbles: true,
            composed: true
        }));
    }

    #updateSelectedStyle() {
        for (const node of this.#typeNodeMap.values()) {
            node.classList.remove("selected");
        }

        this.#typeNodeMap.get(this.selectedType).classList.add("selected");
    }
}

window.customElements.define('type-selector', TypeSelector);