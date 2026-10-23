
"use strict";

// ================================================
// AULALAB - LABORATORIO VIRTUAL DE ELECTRÓNICA
// HTML + CSS + JavaScript
// ================================================

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const SVG_NS = "http://www.w3.org/2000/svg";

const board = $("#board");
const wireLayer = $("#wireLayer");
const canvasWrap = $("#canvasWrap");
const editor = $("#editor");

if (!board || !wireLayer || !canvasWrap || !editor) {
    throw new Error(
        "AulaLab: no se encontraron los elementos del tablero. Revisa los IDs del HTML."
    );
}

const definitions = {
    battery: {
        label: "Batería de 9 V",
        short: "Batería",
        symbol: "＋ −",
        terminals: [
            { x: -36, y: 0, label: "Positivo (+)" },
            { x: 36, y: 0, label: "Negativo (−)" }
        ],
        color: "#d4a96a"
    },

    switch: {
        label: "Interruptor",
        short: "Interruptor",
        symbol: "─○╱",
        terminals: [
            { x: -35, y: 0, label: "Entrada" },
            { x: 35, y: 0, label: "Salida" }
        ],
        color: "#a8bdd4"
    },

    button: {
        label: "Pulsador",
        short: "Pulsador",
        symbol: "●",
        terminals: [
            { x: -32, y: 0, label: "Entrada" },
            { x: 32, y: 0, label: "Salida" }
        ],
        color: "#fda4af"
    },

    resistor: {
        label: "Resistencia de 220 Ω",
        short: "Resistencia",
        symbol: "▱",
        terminals: [
            { x: -39, y: 0, label: "Terminal 1" },
            { x: 39, y: 0, label: "Terminal 2" }
        ],
        color: "#e9c08b"
    },

    buzzer: {
        label: "Zumbador",
        short: "Zumbador",
        symbol: ")))",
        terminals: [
            { x: -34, y: 0, label: "Positivo (+)" },
            { x: 34, y: 0, label: "Negativo (−)" }
        ],
        color: "#a5b4fc"
    },

    "led-red": {
        label: "LED rojo",
        short: "LED rojo",
        symbol: "●",
        led: true,
        colorName: "rojo",
        terminals: [
            { x: -30, y: 0, label: "Ánodo (+)" },
            { x: 30, y: 0, label: "Cátodo (−)" }
        ],
        color: "#fb7185"
    },

    "led-yellow": {
        label: "LED amarillo",
        short: "LED amarillo",
        symbol: "●",
        led: true,
        colorName: "amarillo",
        terminals: [
            { x: -30, y: 0, label: "Ánodo (+)" },
            { x: 30, y: 0, label: "Cátodo (−)" }
        ],
        color: "#facc15"
    },

    "led-green": {
        label: "LED verde",
        short: "LED verde",
        symbol: "●",
        led: true,
        colorName: "verde",
        terminals: [
            { x: -30, y: 0, label: "Ánodo (+)" },
            { x: 30, y: 0, label: "Cátodo (−)" }
        ],
        color: "#4ade80"
    }
};

// ================================================
// ESTADO DEL LABORATORIO
// ================================================

let parts = [];
let wires = [];

let selectedId = null;
let terminalSelection = null;

let running = false;
let simulationTimer = null;
let activePractice = "";
let nextId = 1;
let dragInfo = null;

// ================================================
// AUDIO DEL ZUMBADOR
// ================================================

// Estructura esperada:
// index.html
// js/electronica.js
// sounds/buzzer.mp3

const audioSonora = new Audio("sounds/buzzer.mp3");

audioSonora.loop = true;
audioSonora.volume = 0.7;

function reproducirSonora() {
    if (!audioSonora.paused) return;

    audioSonora.currentTime = 0;

    audioSonora.play().catch(error => {
        console.warn(
            "No se pudo reproducir el sonido. Revisa sounds/buzzer.mp3:",
            error
        );
    });
}

function detenerSonora() {
    audioSonora.pause();

    try {
        audioSonora.currentTime = 0;
    } catch (_) {
        // El audio puede no haberse cargado todavía.
    }
}

// ================================================
// FUNCIONES AUXILIARES
// ================================================

function uid(prefix) {
    return `${prefix}-${nextId++}`;
}

function getPart(id) {
    return parts.find(part => part.id === id);
}

function getDef(part) {
    return part ? definitions[part.type] : null;
}

function clamp(value, min, max) {
    if (max < min) max = min;
    return Math.max(min, Math.min(max, value));
}

function svgEl(tag, attrs = {}, text = null) {
    const element = document.createElementNS(SVG_NS, tag);

    Object.entries(attrs).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });

    if (text !== null) {
        element.textContent = text;
    }

    return element;
}

function canvasSize() {
    const rect = canvasWrap.getBoundingClientRect();

    return {
        width: Math.max(100, rect.width),
        height: Math.max(100, rect.height)
    };
}

function terminalPosition(part, index) {
    const terminal = getDef(part).terminals[index];
    const angle = (part.rotation || 0) * Math.PI / 180;

    return {
        x: part.x + terminal.x * Math.cos(angle)
            - terminal.y * Math.sin(angle),

        y: part.y + terminal.x * Math.sin(angle)
            + terminal.y * Math.cos(angle)
    };
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function terminalKey(partId, terminal) {
    return `${partId}:${terminal}`;
}

// ================================================
// AGREGAR COMPONENTES
// ================================================

function addPart(type, x, y) {
    if (!definitions[type]) return null;

    const size = canvasSize();

    stopSimulation(false);

    const part = {
        id: uid("part"),
        type,
        x: clamp(x ?? size.width / 2, 50, size.width - 50),
        y: clamp(y ?? size.height / 2, 40, size.height - 40),
        rotation: 0,
        isOn: false,
        customLabel: ""
    };

    parts.push(part);
    selectedId = part.id;
    activePractice = "";

    render();

    return part;
}

// ================================================
// DIBUJAR SÍMBOLOS ELÉCTRICOS
// ================================================

function drawSymbol(group, part, def) {
    const stroke = def.color || "#c4d3e4";

    const common = {
        stroke,
        "stroke-width": 3,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        fill: "none"
    };

    if (part.type === "battery") {
        group.append(
            svgEl("line", {
                x1: -20, y1: -16, x2: -20, y2: 16,
                ...common
            }),
            svgEl("line", {
                x1: -9, y1: -9, x2: -9, y2: 9,
                ...common,
                "stroke-width": 2
            }),
            svgEl("line", {
                x1: 12, y1: -16, x2: 12, y2: 16,
                ...common
            }),
            svgEl("line", {
                x1: 23, y1: -9, x2: 23, y2: 9,
                ...common,
                "stroke-width": 2
            }),
            svgEl("text", {
                x: -23, y: -22,
                fill: "#dbeafe",
                "font-size": 10
            }, "+"),
            svgEl("text", {
                x: 20, y: -22,
                fill: "#dbeafe",
                "font-size": 10
            }, "−")
        );
    }

    else if (part.type === "resistor") {
        group.append(
            svgEl("line", {
                x1: -39, y1: 0, x2: -24, y2: 0,
                ...common
            }),
            svgEl("rect", {
                x: -24, y: -10,
                width: 48, height: 20,
                rx: 4,
                fill: "#c69b6d",
                stroke: "#f1d2a8",
                "stroke-width": 2
            })
        );

        [-12, 0, 12].forEach((x, index) => {
            group.append(
                svgEl("line", {
                    x1: x, y1: -9,
                    x2: x, y2: 9,
                    stroke: ["#8b5e3c", "#9f1239", "#7c5a3a"][index],
                    "stroke-width": 3
                })
            );
        });

        group.append(
            svgEl("line", {
                x1: 24, y1: 0, x2: 39, y2: 0,
                ...common
            })
        );
    }

    else if (part.type.startsWith("led-")) {
        group.append(
            svgEl("line", {
                x1: -30, y1: 0, x2: -15, y2: 0,
                ...common
            }),
            svgEl("path", {
                d: "M -15 -15 L 15 0 L -15 15 Z",
                fill: part.isOn ? stroke : "#25394c",
                stroke,
                "stroke-width": 2.5
            }),
            svgEl("line", {
                x1: 17, y1: -16, x2: 17, y2: 16,
                ...common
            }),
            svgEl("line", {
                x1: 17, y1: 0, x2: 30, y2: 0,
                ...common
            }),
            svgEl("path", {
                d: "M -3 -20 l8 -7 m-2 0 l2 0 l0 3",
                stroke,
                fill: "none",
                "stroke-width": 1.8
            })
        );

        if (part.isOn) {
            group.append(
                svgEl("circle", {
                    cx: 0, cy: 0, r: 25,
                    fill: stroke,
                    "fill-opacity": ".18"
                })
            );
        }
    }

    else if (part.type === "switch") {
        group.append(
            svgEl("line", {
                x1: -35, y1: 0, x2: -10, y2: 0,
                ...common
            }),
            svgEl("circle", {
                cx: -7, cy: 0, r: 3,
                fill: stroke
            }),
            svgEl("circle", {
                cx: 9, cy: 0, r: 3,
                fill: stroke
            }),
            svgEl("line", {
                x1: -6,
                y1: 0,
                x2: part.isOn ? 9 : 6,
                y2: part.isOn ? 0 : -13,
                ...common
            }),
            svgEl("line", {
                x1: 12, y1: 0, x2: 35, y2: 0,
                ...common
            }),
            svgEl("text", {
                x: 0, y: 25,
                "text-anchor": "middle",
                fill: "#9eb2c9",
                "font-size": 9
            }, part.isOn ? "CERRADO" : "ABIERTO")
        );
    }

    else if (part.type === "button") {
        group.append(
            svgEl("line", {
                x1: -32, y1: 0, x2: -9, y2: 0,
                ...common
            }),
            svgEl("line", {
                x1: -9, y1: 0, x2: 9, y2: 0,
                ...common
            }),
            svgEl("line", {
                x1: 0, y1: -16, x2: 0, y2: -3,
                ...common
            }),
            svgEl("circle", {
                cx: 0, cy: -19, r: 5,
                fill: part.isOn ? stroke : "#26394c",
                stroke
            }),
            svgEl("line", {
                x1: 9, y1: 0, x2: 32, y2: 0,
                ...common
            }),
            svgEl("text", {
                x: 0, y: 25,
                "text-anchor": "middle",
                fill: "#9eb2c9",
                "font-size": 9
            }, part.isOn ? "PULSADO" : "LIBRE")
        );
    }

    else if (part.type === "buzzer") {
        group.append(
            svgEl("circle", {
                cx: 0, cy: 0, r: 19,
                fill: "#202d4b",
                stroke,
                "stroke-width": 2
            }),
            svgEl("circle", {
                cx: 0, cy: 0, r: 5,
                fill: stroke
            }),
            svgEl("path", {
                d: "M 22 -10 Q 32 0 22 10 M 28 -16 Q 43 0 28 16",
                fill: "none",
                stroke,
                "stroke-width": 2
            })
        );
    }
}

// ================================================
// RENDERIZAR LA MESA
// ================================================

function render() {
    const { width, height } = canvasSize();

    board.setAttribute("viewBox", `0 0 ${width} ${height}`);
    wireLayer.setAttribute("viewBox", `0 0 ${width} ${height}`);

    board.replaceChildren();
    wireLayer.replaceChildren();

    // Dibujar cables.
    wires.forEach(wire => {
        const partA = getPart(wire.a.partId);
        const partB = getPart(wire.b.partId);

        if (!partA || !partB) return;

        const a = terminalPosition(partA, wire.a.terminal);
        const b = terminalPosition(partB, wire.b.terminal);
        const middle = (a.x + b.x) / 2;

        const analysis = analyzeCircuit();
        const isActive = analysis.activeWireIds.includes(wire.id);

        wireLayer.append(
            svgEl("path", {
                d: `M ${a.x} ${a.y}
                    C ${middle} ${a.y},
                      ${middle} ${b.y},
                      ${b.x} ${b.y}`,
                class: `wire ${
                    running && isActive ? "connected" : ""
                }`
            })
        );
    });

    // Dibujar componentes.
    parts.forEach(part => {
        const def = getDef(part);

        const group = svgEl("g", {
            class: `part ${selectedId === part.id ? "selected" : ""}`,
            transform: `translate(${part.x} ${part.y}) rotate(${part.rotation || 0})`,
            "data-part": part.id
        });

        group.append(
            svgEl("rect", {
                x: -51,
                y: -34,
                width: 102,
                height: 68,
                rx: 12,
                fill: "#15263a",
                "fill-opacity": ".9",
                stroke: "#324960",
                "stroke-width": "1.3",
                class: "outline"
            })
        );

        const symbol = svgEl("g", { class: "part-shape" });
        drawSymbol(symbol, part, def);
        group.append(symbol);

        group.append(
            svgEl("text", {
                x: 0,
                y: 49,
                "text-anchor": "middle",
                class: "part-label"
            }, part.customLabel || def.short)
        );

        def.terminals.forEach((terminal, index) => {
            const active =
                terminalSelection?.partId === part.id &&
                terminalSelection?.terminal === index;

            group.append(
                svgEl("circle", {
                    cx: terminal.x,
                    cy: terminal.y,
                    r: 6.2,
                    class: `terminal ${active ? "active" : ""}`,
                    "data-terminal-part": part.id,
                    "data-terminal-index": index
                })
            );
        });

        board.append(group);
    });

    $("#componentCount").textContent = parts.length;
    $("#outParts").textContent = parts.length;

    $("#emptyHint").classList.toggle("hidden", parts.length > 0);

    $("#delete").disabled = !selectedId;
    $("#rotate").disabled = !selectedId;

    const selectedPart = getPart(selectedId);

    $("#selectionHint").textContent = selectedPart
        ? `Seleccionado: ${getDef(selectedPart).short}`
        : "Ningún componente seleccionado";

    $("#connectionHint").textContent = terminalSelection
        ? "Ahora selecciona el segundo terminal para completar el cable."
        : "Selecciona un terminal y después otro para crear un cable.";

    renderEditor();
    updateMetrics();
}

// ================================================
// INSPECTOR DE COMPONENTES
// ================================================

function renderEditor() {
    const part = getPart(selectedId);

    if (!part) {
        editor.innerHTML = `
            <div class="inspector-empty">
                <div>⌖</div>
                <strong>Selecciona una pieza</strong>
                <p>Sus propiedades y terminales aparecerán aquí.</p>
            </div>
        `;
        return;
    }

    const def = getDef(part);

    editor.innerHTML = `
        <div class="editor-title">
            <div class="editor-symbol">${escapeHtml(def.symbol)}</div>
            <div>
                <strong>${escapeHtml(def.label)}</strong>
                <small>ID: ${escapeHtml(part.id)}</small>
            </div>
        </div>

        <div class="field">
            <label for="partLabel">Nombre visible</label>
            <input
                id="partLabel"
                maxlength="24"
                value="${escapeHtml(part.customLabel || def.short)}"
            >
        </div>

        <div class="field">
            <label for="partX">Posición horizontal (px)</label>
            <input id="partX" type="number" value="${Math.round(part.x)}">
        </div>

        <div class="field">
            <label for="partY">Posición vertical (px)</label>
            <input id="partY" type="number" value="${Math.round(part.y)}">
        </div>

        ${def.led ? `
            <label class="check-field">
                <input id="partOn" type="checkbox" ${part.isOn ? "checked" : ""}>
                LED encendido (prueba visual)
            </label>
        ` : ""}

        ${part.type === "switch" ? `
            <label class="check-field">
                <input id="partOn" type="checkbox" ${part.isOn ? "checked" : ""}>
                Interruptor cerrado
            </label>
        ` : ""}

        ${part.type === "button" ? `
            <label class="check-field">
                <input id="partOn" type="checkbox" ${part.isOn ? "checked" : ""}>
                Pulsador presionado
            </label>
        ` : ""}

        <div class="terminal-list">
            <strong>TERMINALES</strong>

            ${def.terminals.map((terminal, index) => `
                <div class="terminal-row">
                    <span>${index + 1}. ${escapeHtml(terminal.label)}</span>
                    <button
                        type="button"
                        data-editor-terminal="${index}"
                    >Elegir</button>
                </div>
            `).join("")}
        </div>
    `;

    $("#partLabel").addEventListener("change", event => {
        part.customLabel = event.target.value.trim();
        render();
    });

    $("#partX").addEventListener("change", event => {
        const { width } = canvasSize();

        part.x = clamp(
            Number(event.target.value) || 0,
            45,
            width - 45
        );

        stopSimulation(false);
        render();
    });

    $("#partY").addEventListener("change", event => {
        const { height } = canvasSize();

        part.y = clamp(
            Number(event.target.value) || 0,
            40,
            height - 40
        );

        stopSimulation(false);
        render();
    });

    const toggle = $("#partOn");

    if (toggle) {
        toggle.addEventListener("change", event => {
            part.isOn = event.target.checked;

            // Al cambiar un interruptor o pulsador, se detiene la
            // simulación para que pueda iniciarse con el nuevo estado.
            stopSimulation(false);
            render();
        });
    }

    $$("[data-editor-terminal]", editor).forEach(button => {
        button.addEventListener("click", () => {
            chooseTerminal(
                part.id,
                Number(button.dataset.editorTerminal)
            );
        });
    });
}

// ================================================
// CONEXIÓN DE TERMINALES
// ================================================

function chooseTerminal(partId, terminal) {
    const part = getPart(partId);

    if (!part || !getDef(part).terminals[terminal]) return;

    if (!terminalSelection) {
        terminalSelection = { partId, terminal };
        render();
        return;
    }

    if (
        terminalSelection.partId === partId &&
        terminalSelection.terminal === terminal
    ) {
        terminalSelection = null;
        render();
        return;
    }

    const a = { ...terminalSelection };
    const b = { partId, terminal };

    const exists = wires.some(wire =>
        (
            wire.a.partId === a.partId &&
            wire.a.terminal === a.terminal &&
            wire.b.partId === b.partId &&
            wire.b.terminal === b.terminal
        ) ||
        (
            wire.b.partId === a.partId &&
            wire.b.terminal === a.terminal &&
            wire.a.partId === b.partId &&
            wire.a.terminal === b.terminal
        )
    );

    if (exists) {
        showResult("Esos terminales ya están conectados.", "warning");
    } else {
        stopSimulation(false);

        wires.push({
            id: uid("wire"),
            a,
            b
        });

        showResult(
            "Cable añadido. Puedes conectar más terminales o iniciar la simulación.",
            "success"
        );
    }

    terminalSelection = null;
    render();
}

// ================================================
// MENSAJES Y MEDIDORES
// ================================================

function showResult(message, type = "info") {
    const result = $("#result");

    if (!result) return;

    result.className = `result ${
        type === "success" ? "success" :
        type === "warning" ? "warning" :
        type === "error" ? "error" : ""
    }`;

    const icon = type === "success" ? "✓" :
        type === "error" ? "!" : "i";

    result.innerHTML = `
        <span class="result-icon">${icon}</span>
        <p>${escapeHtml(message)}</p>
    `;
}

function updateMetrics(analysis = null) {
    // Si no se recibe un análisis, se calcula el estado actual.
    analysis = analysis || analyzeCircuit();

    const battery = parts.some(part => part.type === "battery");

    $("#outVolt").innerHTML =
        `${battery ? "9.0" : "0.0"} <small>V</small>`;

    $("#outCurrent").innerHTML =
        `${analysis.currentMa || 0} <small>mA</small>`;

    $("#outParts").textContent = parts.length;

    const metrics = $$(".metric-track i");

    if (metrics[0]) {
        metrics[0].style.width = battery ? "100%" : "0%";
    }

    if (metrics[1]) {
        metrics[1].style.width =
            `${clamp((analysis.currentMa || 0) / 40 * 100, 0, 100)}%`;
    }

    if (metrics[2]) {
        metrics[2].style.width =
            `${clamp(parts.length / 12 * 100, 0, 100)}%`;
    }
}

// ================================================
// ANÁLISIS EDUCATIVO DEL CIRCUITO
// ================================================

function analyzeCircuit() {
    const batteries = parts.filter(part => part.type === "battery");

    if (!batteries.length) {
        return {
            hasBattery: false,
            activeLeds: [],
            activeBuzzers: [],
            currentMa: 0,
            complete: false,
            shortCircuit: false,
            activeWireIds: []
        };
    }

    // Se usa la primera batería como fuente principal.
    const battery = batteries[0];

    const positiveKey = terminalKey(battery.id, 0);
    const negativeKey = terminalKey(battery.id, 1);

    // ------------------------------------------------
    // 1. DETECTAR CORTOCIRCUITOS
    // Se consideran cables y contactos cerrados.
    // LED, zumbadores y resistencias no se consideran
    // cables directos para esta comprobación.
    // ------------------------------------------------

    const shortGraph = new Map();

    function shortLink(a, b) {
        if (!shortGraph.has(a)) shortGraph.set(a, new Set());
        if (!shortGraph.has(b)) shortGraph.set(b, new Set());

        shortGraph.get(a).add(b);
        shortGraph.get(b).add(a);
    }

    wires.forEach(wire => {
        if (!getPart(wire.a.partId) || !getPart(wire.b.partId)) return;

        shortLink(
            terminalKey(wire.a.partId, wire.a.terminal),
            terminalKey(wire.b.partId, wire.b.terminal)
        );
    });

    parts.forEach(part => {
        if (
            (part.type === "switch" || part.type === "button") &&
            part.isOn
        ) {
            shortLink(
                terminalKey(part.id, 0),
                terminalKey(part.id, 1)
            );
        }
    });

    function findNetwork(graph, start) {
        const visited = new Set([start]);
        const stack = [start];

        while (stack.length) {
            const current = stack.pop();

            for (const next of graph.get(current) || []) {
                if (!visited.has(next)) {
                    visited.add(next);
                    stack.push(next);
                }
            }
        }

        return visited;
    }

    const shortNetwork = findNetwork(shortGraph, positiveKey);
    const shortCircuit = shortNetwork.has(negativeKey);

    if (shortCircuit) {
        return {
            hasBattery: true,
            activeLeds: [],
            activeBuzzers: [],
            currentMa: 0,
            complete: false,
            shortCircuit: true,
            activeWireIds: []
        };
    }

    // ------------------------------------------------
    // 2. CREAR EL GRAFO ELÉCTRICO
    //
    // Cable: permite corriente en ambas direcciones.
    // Resistencia: permite corriente en ambas direcciones.
    // Interruptor/pulsador: conduce si está cerrado.
    // LED/zumbador: conduce del terminal 0 al 1.
    // Batería: no une sus propios terminales.
    // ------------------------------------------------

    const graph = new Map();

    function ensureNode(key) {
        if (!graph.has(key)) graph.set(key, new Set());
    }

    function linkBoth(a, b) {
        ensureNode(a);
        ensureNode(b);

        graph.get(a).add(b);
        graph.get(b).add(a);
    }

    function linkOneWay(a, b) {
        ensureNode(a);
        ensureNode(b);

        graph.get(a).add(b);
    }

    wires.forEach(wire => {
        if (!getPart(wire.a.partId) || !getPart(wire.b.partId)) return;

        linkBoth(
            terminalKey(wire.a.partId, wire.a.terminal),
            terminalKey(wire.b.partId, wire.b.terminal)
        );
    });

    parts.forEach(part => {
        const terminal0 = terminalKey(part.id, 0);
        const terminal1 = terminalKey(part.id, 1);

        ensureNode(terminal0);
        ensureNode(terminal1);

        if (part.type === "battery") {
            // La batería separa sus polos.
            return;
        }

        if (part.type === "switch" || part.type === "button") {
            if (part.isOn) {
                linkBoth(terminal0, terminal1);
            }

            return;
        }

        if (part.type === "resistor") {
            linkBoth(terminal0, terminal1);
            return;
        }

        if (
            part.type.startsWith("led-") ||
            part.type === "buzzer"
        ) {
            // Componente polarizado: positivo en terminal 0.
            linkOneWay(terminal0, terminal1);
        }
    });

    // ------------------------------------------------
    // 3. BUSCAR RUTAS DE CORRIENTE
    // ------------------------------------------------

    const positive = findNetwork(graph, positiveKey);

    const activeLeds = parts.filter(part => {
        if (!part.type.startsWith("led-")) return false;

        const anode = terminalKey(part.id, 0);
        const cathode = terminalKey(part.id, 1);

        if (!positive.has(anode)) return false;

        const fromCathode = findNetwork(graph, cathode);

        return fromCathode.has(negativeKey);
    });

    const activeBuzzers = parts.filter(part => {
        if (part.type !== "buzzer") return false;

        const positiveTerminal = terminalKey(part.id, 0);
        const negativeTerminal = terminalKey(part.id, 1);

        if (!positive.has(positiveTerminal)) return false;

        const fromBuzzerNegative = findNetwork(graph, negativeTerminal);

        return fromBuzzerNegative.has(negativeKey);
    });

    const complete =
        activeLeds.length > 0 || activeBuzzers.length > 0;

    // Estimación educativa; no representa una medición real.
    const currentMa = complete
        ? activeLeds.length * 10 + activeBuzzers.length * 15
        : 0;

    // ------------------------------------------------
    // 4. IDENTIFICAR CABLES QUE PERTENECEN A UNA RUTA
    // ------------------------------------------------

    const activeWireIds = wires
        .filter(wire => {
            const a = terminalKey(wire.a.partId, wire.a.terminal);
            const b = terminalKey(wire.b.partId, wire.b.terminal);

            return positive.has(a) && positive.has(b);
        })
        .map(wire => wire.id);

    return {
        hasBattery: true,
        activeLeds,
        activeBuzzers,
        currentMa,
        complete,
        shortCircuit: false,
        activeWireIds
    };
}

// ================================================
// INICIAR SIMULACIÓN
// ================================================

function startSimulation() {
    stopSimulation(false);

    if (!parts.length) {
        showResult(
            "Primero coloca componentes en la mesa.",
            "warning"
        );
        return;
    }

    const analysis = analyzeCircuit();

    if (!analysis.hasBattery) {
        showResult(
            "No se detectó una batería. Añade una fuente de energía.",
            "warning"
        );

        updateMetrics(analysis);
        return;
    }

    if (analysis.shortCircuit) {
        showResult(
            "¡Cortocircuito! El positivo y el negativo están unidos mediante cables o contactos cerrados. Revisa las conexiones.",
            "error"
        );

        updateMetrics(analysis);
        return;
    }

    running = true;

    $("#outState").textContent = "En marcha";
    $("#outState").classList.add("running");

    $("#simulate").disabled = true;
    $("#stop").disabled = false;

    // Práctica especial del semáforo.
    if (activePractice === "traffic") {
        runTrafficLight();
        updateMetrics(analysis);
        return;
    }

    if (analysis.complete) {
        // Encender únicamente los LED que tienen una ruta válida.
        parts.forEach(part => {
            if (part.type.startsWith("led-")) {
                part.isOn = analysis.activeLeds.some(
                    led => led.id === part.id
                );
            }

            if (part.type === "buzzer") {
                part.isOn = analysis.activeBuzzers.some(
                    buzzer => buzzer.id === part.id
                );
            }
        });

        // Reproducir el sonido únicamente si hay un zumbador activo.
        if (analysis.activeBuzzers.length > 0) {
            reproducirSonora();
        } else {
            detenerSonora();
        }

        render();

        const ledMessage = analysis.activeLeds.length
            ? "LED encendidos: " +
              analysis.activeLeds
                  .map(led => getDef(led).colorName)
                  .join(", ") + ". "
            : "";

        const buzzerMessage = analysis.activeBuzzers.length
            ? "El zumbador está activo. "
            : "";

        showResult(
            `${ledMessage}${buzzerMessage}Se encontró una ruta completa de corriente. Esta simulación es educativa y simplificada.`,
            "success"
        );
    } else {
        detenerSonora();

        parts.forEach(part => {
            if (
                part.type.startsWith("led-") ||
                part.type === "buzzer"
            ) {
                part.isOn = false;
            }
        });

        render();

        showResult(
            "Hay una batería, pero no se encontró una ruta completa. Revisa los cables, la polaridad del LED y el estado de los interruptores o pulsadores.",
            "warning"
        );
    }

    updateMetrics(analysis);
}

// ================================================
// DETENER SIMULACIÓN
// ================================================

function stopSimulation(showMessage = true) {
    const wasRunning = running;

    if (simulationTimer !== null) {
        clearInterval(simulationTimer);
        simulationTimer = null;
    }

    detenerSonora();

    running = false;

    $("#outState").textContent = "Detenida";
    $("#outState").classList.remove("running");

    $("#simulate").disabled = false;
    $("#stop").disabled = true;

    parts.forEach(part => {
        if (
            part.type.startsWith("led-") ||
            part.type === "buzzer"
        ) {
            part.isOn = false;
        }
    });

    render();

    if (showMessage && wasRunning) {
        showResult("Simulación detenida.", "info");
    }
}

// ================================================
// SECUENCIA DEL SEMÁFORO
// ================================================

function runTrafficLight() {
    const order = [
        "led-red",
        "led-yellow",
        "led-green",
        "led-yellow"
    ];

    let step = 0;

    detenerSonora();

    function light() {
        if (!running) return;

        parts.forEach(part => {
            if (part.type.startsWith("led-")) {
                part.isOn = false;
            }
        });

        const wanted = order[step % order.length];
        const led = parts.find(part => part.type === wanted);

        if (led) {
            led.isOn = true;
        }

        render();

        const color = wanted === "led-red"
            ? "roja"
            : wanted === "led-yellow"
                ? "amarilla"
                : "verde";

        showResult(
            `Semáforo: luz ${color}. Secuencia demostrativa.`,
            "success"
        );

        step++;
    }

    light();
    simulationTimer = setInterval(light, 1200);
}

// ================================================
// CARGAR PRÁCTICAS
// ================================================

function loadPractice(name) {
    stopSimulation(false);

    parts = [];
    wires = [];

    selectedId = null;
    terminalSelection = null;
    activePractice = name;

    const { width, height } = canvasSize();
    const midY = height / 2;

    function create(type, x, y) {
        const part = {
            id: uid("part"),
            type,
            x: clamp(x, 50, Math.max(50, width - 50)),
            y: clamp(y, 40, Math.max(40, height - 40)),
            rotation: 0,
            isOn: false,
            customLabel: ""
        };

        parts.push(part);
        return part;
    }

    function wire(a, terminalA, b, terminalB) {
        wires.push({
            id: uid("wire"),
            a: {
                partId: a.id,
                terminal: terminalA
            },
            b: {
                partId: b.id,
                terminal: terminalB
            }
        });
    }

    const battery = create("battery", 70, midY);

    if (name === "led") {
        const resistor = create("resistor", width * 0.38, midY - 85);
        const led = create("led-green", width * 0.68, midY - 85);

        wire(battery, 0, resistor, 0);
        wire(resistor, 1, led, 0);
        wire(led, 1, battery, 1);

        showResult(
            "Práctica LED básico cargada. Inicia la simulación para revisar las conexiones.",
            "info"
        );
    }

    else if (name === "switch") {
        const sw = create("switch", width * 0.25, midY);
        const resistor = create("resistor", width * 0.48, midY - 75);
        const led = create("led-green", width * 0.75, midY - 75);

        wire(battery, 0, sw, 0);
        wire(sw, 1, resistor, 0);
        wire(resistor, 1, led, 0);
        wire(led, 1, battery, 1);

        selectedId = sw.id;

        showResult(
            "Práctica con interruptor cargada. Selecciona el interruptor y márcalo como cerrado en el inspector.",
            "info"
        );
    }

    else if (name === "traffic") {
        const red = create("led-red", width * 0.55, midY - 110);
        const yellow = create("led-yellow", width * 0.55, midY);
        const green = create("led-green", width * 0.55, midY + 110);

        const r1 = create("resistor", width * 0.30, midY - 110);
        const r2 = create("resistor", width * 0.30, midY);
        const r3 = create("resistor", width * 0.30, midY + 110);

        wire(battery, 0, r1, 0);
        wire(r1, 1, red, 0);
        wire(red, 1, battery, 1);

        wire(battery, 0, r2, 0);
        wire(r2, 1, yellow, 0);
        wire(yellow, 1, battery, 1);

        wire(battery, 0, r3, 0);
        wire(r3, 1, green, 0);
        wire(green, 1, battery, 1);

        showResult(
            "Práctica de semáforo cargada. Inicia la simulación para ver la secuencia de luces.",
            "info"
        );
    }

    else if (name === "colors") {
        const red = create("led-red", width * 0.65, midY - 110);
        const yellow = create("led-yellow", width * 0.65, midY);
        const green = create("led-green", width * 0.65, midY + 110);

        const r1 = create("resistor", width * 0.36, midY - 110);
        const r2 = create("resistor", width * 0.36, midY);
        const r3 = create("resistor", width * 0.36, midY + 110);

        wire(battery, 0, r1, 0);
        wire(r1, 1, red, 0);
        wire(red, 1, battery, 1);

        wire(battery, 0, r2, 0);
        wire(r2, 1, yellow, 0);
        wire(yellow, 1, battery, 1);

        wire(battery, 0, r3, 0);
        wire(r3, 1, green, 0);
        wire(green, 1, battery, 1);

        showResult(
            "Práctica de colores cargada. Cada LED tiene su propia rama y resistencia.",
            "info"
        );
    }

    else if (name === "series") {
        const resistor = create("resistor", width * 0.28, midY - 70);
        const led1 = create("led-green", width * 0.50, midY - 70);
        const led2 = create("led-red", width * 0.73, midY - 70);

        wire(battery, 0, resistor, 0);
        wire(resistor, 1, led1, 0);
        wire(led1, 1, led2, 0);
        wire(led2, 1, battery, 1);

        showResult(
            "Práctica en serie cargada. Los dos LED comparten una misma ruta.",
            "info"
        );
    }

    else if (name === "parallel") {
        const r1 = create("resistor", width * 0.30, midY - 90);
        const r2 = create("resistor", width * 0.30, midY + 90);

        const led1 = create("led-red", width * 0.65, midY - 90);
        const led2 = create("led-green", width * 0.65, midY + 90);

        wire(battery, 0, r1, 0);
        wire(r1, 1, led1, 0);
        wire(led1, 1, battery, 1);

        wire(battery, 0, r2, 0);
        wire(r2, 1, led2, 0);
        wire(led2, 1, battery, 1);

        showResult(
            "Práctica en paralelo cargada. Cada LED tiene su propia rama con resistencia.",
            "info"
        );
    }

    else if (name === "buzzer") {
        const button = create("button", width * 0.28, midY);
        const buzzer = create("buzzer", width * 0.65, midY);

        wire(battery, 0, button, 0);
        wire(button, 1, buzzer, 0);
        wire(buzzer, 1, battery, 1);

        selectedId = button.id;

        showResult(
            "Práctica de alarma cargada. Selecciona el pulsador, márcalo como presionado y luego inicia la simulación.",
            "info"
        );
    }

    else {
        activePractice = "";

        showResult(
            "No se reconoció esa práctica. Selecciona una de las prácticas disponibles.",
            "warning"
        );
    }

    render();
}

// ================================================
// ELIMINAR COMPONENTES Y LIMPIAR
// ================================================

function removeSelected() {
    if (!selectedId) return;

    stopSimulation(false);

    const removedId = selectedId;

    parts = parts.filter(part => part.id !== removedId);

    wires = wires.filter(wire =>
        wire.a.partId !== removedId &&
        wire.b.partId !== removedId
    );

    selectedId = null;
    terminalSelection = null;
    activePractice = "";

    render();

    showResult(
        "Componente eliminado. Revisa las conexiones antes de simular.",
        "info"
    );
}

function clearAll() {
    stopSimulation(false);

    parts = [];
    wires = [];

    selectedId = null;
    terminalSelection = null;
    activePractice = "";

    render();

    showResult(
        "Mesa limpia. Añade componentes o selecciona una práctica.",
        "info"
    );
}

// ================================================
// ARRASTRAR COMPONENTES
// ================================================

function pointerPosition(event) {
    const rect = board.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

board.addEventListener("pointerdown", event => {
    const terminal = event.target.closest("[data-terminal-part]");

    if (terminal) {
        event.stopPropagation();

        chooseTerminal(
            terminal.dataset.terminalPart,
            Number(terminal.dataset.terminalIndex)
        );

        return;
    }

    const partNode = event.target.closest("[data-part]");

    if (!partNode) {
        selectedId = null;
        terminalSelection = null;
        dragInfo = null;

        render();
        return;
    }

    const part = getPart(partNode.dataset.part);

    if (!part) return;

    selectedId = part.id;

    const position = pointerPosition(event);

    dragInfo = {
        id: part.id,
        startX: position.x,
        startY: position.y,
        partX: part.x,
        partY: part.y,
        moved: false,
        pointerId: event.pointerId
    };

    if (board.setPointerCapture) {
        try {
            board.setPointerCapture(event.pointerId);
        } catch (_) {
            // Algunos navegadores pueden rechazar la captura.
        }
    }

    render();
});

board.addEventListener("pointermove", event => {
    if (!dragInfo || dragInfo.pointerId !== event.pointerId) {
        return;
    }

    const position = pointerPosition(event);
    const part = getPart(dragInfo.id);

    if (!part) return;

    if (
        Math.abs(position.x - dragInfo.startX) > 2 ||
        Math.abs(position.y - dragInfo.startY) > 2
    ) {
        dragInfo.moved = true;
    }

    if (!dragInfo.moved) return;

    const { width, height } = canvasSize();

    part.x = clamp(
        dragInfo.partX + position.x - dragInfo.startX,
        48,
        width - 48
    );

    part.y = clamp(
        dragInfo.partY + position.y - dragInfo.startY,
        38,
        height - 38
    );

    render();
});

board.addEventListener("pointerup", () => {
    dragInfo = null;
});

board.addEventListener("pointercancel", () => {
    dragInfo = null;
});

// ================================================
// EVENTOS DE BOTONES
// ================================================

// Añadir componentes.
$$("[data-add]").forEach(button => {
    button.addEventListener("click", () => {
        const { width, height } = canvasSize();
        const offset = (parts.length % 5) * 18;
        const type = button.dataset.add;

        if (!definitions[type]) {
            showResult("Tipo de componente no reconocido.", "error");
            return;
        }

        addPart(
            type,
            width / 2 + offset - 35,
            height / 2 + offset - 30
        );

        showResult(
            `${definitions[type].label} añadido. Conecta sus terminales para incorporarlo al circuito.`,
            "info"
        );
    });
});

// Cargar prácticas.
$$("[data-practice]").forEach(button => {
    button.addEventListener("click", () => {
        loadPractice(button.dataset.practice);
    });
});

// Limpiar mesa.
$("#clear").addEventListener("click", clearAll);

// Eliminar componente seleccionado.
$("#delete").addEventListener("click", removeSelected);

// Girar componente.
$("#rotate").addEventListener("click", () => {
    const part = getPart(selectedId);

    if (!part) return;

    part.rotation = ((part.rotation || 0) + 90) % 360;

    stopSimulation(false);
    render();
});

// Iniciar simulación.
$("#simulate").addEventListener("click", startSimulation);

// Detener simulación.
$("#stop").addEventListener("click", () => {
    stopSimulation(true);
});

// Cargar ejemplo.
$("#loadExample").addEventListener("click", () => {
    loadPractice("led");
});

// Atajos del teclado.
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        terminalSelection = null;
        render();
    }

    if (
        (event.key === "Delete" || event.key === "Backspace") &&
        !["INPUT", "TEXTAREA"].includes(
            document.activeElement?.tagName
        )
    ) {
        removeSelected();
    }
});

// Adaptar el tablero al cambiar el tamaño de la ventana.
window.addEventListener("resize", () => {
    render();
});

// ================================================
// INICIALIZACIÓN
// ================================================

render();

showResult(
    "¡Bienvenido a AulaLab! Añade componentes o selecciona una práctica para comenzar.",
    "info"
);
