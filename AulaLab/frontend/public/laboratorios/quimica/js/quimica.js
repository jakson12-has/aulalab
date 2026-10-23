
"use strict";

/* =========================================
   AULALAB - LABORATORIO DE QUÍMICA
   Archivo: public/laboratorios/quimica/js/quimica.js
   Progreso guardado localmente con localStorage
========================================= */

const CLAVE_PROGRESO = "aulalab_quimica_progreso_v1";


/*
  Datos: número, símbolo, nombre, masa atómica,
  familia, período, grupo.
  Los elementos sintéticos usan números de masa
  entre corchetes como referencia habitual.
*/

const familiasQuimicas = {
  alcalino: "los metales alcalinos",
  alcalinoterreo: "los metales alcalinotérreos",
  transicion: "los metales de transición",
  postransicion: "los metales postransición",
  metaloide: "los metaloides",
  nometal: "los no metales",
  halogen: "los halógenos",
  gasnoble: "los gases nobles",
  lantanido: "los lantánidos",
  actinido: "los actínidos"
};

const elementos = [
  [1,"H","Hidrógeno","1.008","nometal",1,1],
  [2,"He","Helio","4.0026","gasnoble",1,18],
  [3,"Li","Litio","6.94","alcalino",2,1],
  [4,"Be","Berilio","9.0122","alcalinoterreo",2,2],
  [5,"B","Boro","10.81","metaloide",2,13],
  [6,"C","Carbono","12.011","nometal",2,14],
  [7,"N","Nitrógeno","14.007","nometal",2,15],
  [8,"O","Oxígeno","15.999","nometal",2,16],
  [9,"F","Flúor","18.998","halogen",2,17],
  [10,"Ne","Neón","20.180","gasnoble",2,18],
  [11,"Na","Sodio","22.990","alcalino",3,1],
  [12,"Mg","Magnesio","24.305","alcalinoterreo",3,2],
  [13,"Al","Aluminio","26.982","postransicion",3,13],
  [14,"Si","Silicio","28.085","metaloide",3,14],
  [15,"P","Fósforo","30.974","nometal",3,15],
  [16,"S","Azufre","32.06","nometal",3,16],
  [17,"Cl","Cloro","35.45","halogen",3,17],
  [18,"Ar","Argón","39.948","gasnoble",3,18],
  [19,"K","Potasio","39.098","alcalino",4,1],
  [20,"Ca","Calcio","40.078","alcalinoterreo",4,2],
  [21,"Sc","Escandio","44.956","transicion",4,3],
  [22,"Ti","Titanio","47.867","transicion",4,4],
  [23,"V","Vanadio","50.942","transicion",4,5],
  [24,"Cr","Cromo","51.996","transicion",4,6],
  [25,"Mn","Manganeso","54.938","transicion",4,7],
  [26,"Fe","Hierro","55.845","transicion",4,8],
  [27,"Co","Cobalto","58.933","transicion",4,9],
  [28,"Ni","Níquel","58.693","transicion",4,10],
  [29,"Cu","Cobre","63.546","transicion",4,11],
  [30,"Zn","Zinc","65.38","transicion",4,12],
  [31,"Ga","Galio","69.723","postransicion",4,13],
  [32,"Ge","Germanio","72.630","metaloide",4,14],
  [33,"As","Arsénico","74.922","metaloide",4,15],
  [34,"Se","Selenio","78.971","nometal",4,16],
  [35,"Br","Bromo","79.904","halogen",4,17],
  [36,"Kr","Kriptón","83.798","gasnoble",4,18],
  [37,"Rb","Rubidio","85.468","alcalino",5,1],
  [38,"Sr","Estroncio","87.62","alcalinoterreo",5,2],
  [39,"Y","Itrio","88.906","transicion",5,3],
  [40,"Zr","Circonio","91.224","transicion",5,4],
  [41,"Nb","Niobio","92.906","transicion",5,5],
  [42,"Mo","Molibdeno","95.95","transicion",5,6],
  [43,"Tc","Tecnecio","[98]","transicion",5,7],
  [44,"Ru","Rutenio","101.07","transicion",5,8],
  [45,"Rh","Rodio","102.906","transicion",5,9],
  [46,"Pd","Paladio","106.42","transicion",5,10],
  [47,"Ag","Plata","107.868","transicion",5,11],
  [48,"Cd","Cadmio","112.414","transicion",5,12],
  [49,"In","Indio","114.818","postransicion",5,13],
  [50,"Sn","Estaño","118.710","postransicion",5,14],
  [51,"Sb","Antimonio","121.760","metaloide",5,15],
  [52,"Te","Telurio","127.60","metaloide",5,16],
  [53,"I","Yodo","126.904","halogen",5,17],
  [54,"Xe","Xenón","131.293","gasnoble",5,18],
  [55,"Cs","Cesio","132.905","alcalino",6,1],
  [56,"Ba","Bario","137.327","alcalinoterreo",6,2],
  [57,"La","Lantano","138.905","lantanido",6,3],
  [58,"Ce","Cerio","140.116","lantanido",6,3],
  [59,"Pr","Praseodimio","140.908","lantanido",6,3],
  [60,"Nd","Neodimio","144.242","lantanido",6,3],
  [61,"Pm","Prometio","[145]","lantanido",6,3],
  [62,"Sm","Samario","150.36","lantanido",6,3],
  [63,"Eu","Europio","151.964","lantanido",6,3],
  [64,"Gd","Gadolinio","157.25","lantanido",6,3],
  [65,"Tb","Terbio","158.925","lantanido",6,3],
  [66,"Dy","Disprosio","162.500","lantanido",6,3],
  [67,"Ho","Holmio","164.930","lantanido",6,3],
  [68,"Er","Erbio","167.259","lantanido",6,3],
  [69,"Tm","Tulio","168.934","lantanido",6,3],
  [70,"Yb","Iterbio","173.045","lantanido",6,3],
  [71,"Lu","Lutecio","174.967","lantanido",6,3],
  [72,"Hf","Hafnio","178.49","transicion",6,4],
  [73,"Ta","Tantalio","180.948","transicion",6,5],
  [74,"W","Wolframio","183.84","transicion",6,6],
  [75,"Re","Renio","186.207","transicion",6,7],
  [76,"Os","Osmio","190.23","transicion",6,8],
  [77,"Ir","Iridio","192.217","transicion",6,9],
  [78,"Pt","Platino","195.084","transicion",6,10],
  [79,"Au","Oro","196.967","transicion",6,11],
  [80,"Hg","Mercurio","200.592","transicion",6,12],
  [81,"Tl","Talio","204.38","postransicion",6,13],
  [82,"Pb","Plomo","207.2","postransicion",6,14],
  [83,"Bi","Bismuto","208.980","postransicion",6,15],
  [84,"Po","Polonio","[209]","postransicion",6,16],
  [85,"At","Astato","[210]","halogen",6,17],
  [86,"Rn","Radón","[222]","gasnoble",6,18],
  [87,"Fr","Francio","[223]","alcalino",7,1],
  [88,"Ra","Radio","[226]","alcalinoterreo",7,2],
  [89,"Ac","Actinio","[227]","actinido",7,3],
  [90,"Th","Torio","232.038","actinido",7,3],
  [91,"Pa","Protactinio","231.036","actinido",7,3],
  [92,"U","Uranio","238.029","actinido",7,3],
  [93,"Np","Neptunio","[237]","actinido",7,3],
  [94,"Pu","Plutonio","[244]","actinido",7,3],
  [95,"Am","Americio","[243]","actinido",7,3],
  [96,"Cm","Curio","[247]","actinido",7,3],
  [97,"Bk","Berkelio","[247]","actinido",7,3],
  [98,"Cf","Californio","[251]","actinido",7,3],
  [99,"Es","Einstenio","[252]","actinido",7,3],
  [100,"Fm","Fermio","[257]","actinido",7,3],
  [101,"Md","Mendelevio","[258]","actinido",7,3],
  [102,"No","Nobelio","[259]","actinido",7,3],
  [103,"Lr","Lawrencio","[266]","actinido",7,3],
  [104,"Rf","Rutherfordio","[267]","transicion",7,4],
  [105,"Db","Dubnio","[268]","transicion",7,5],
  [106,"Sg","Seaborgio","[269]","transicion",7,6],
  [107,"Bh","Bohrio","[270]","transicion",7,7],
  [108,"Hs","Hassio","[277]","transicion",7,8],
  [109,"Mt","Meitnerio","[278]","transicion",7,9],
  [110,"Ds","Darmstadtio","[281]","transicion",7,10],
  [111,"Rg","Roentgenio","[282]","transicion",7,11],
  [112,"Cn","Copernicio","[285]","transicion",7,12],
  [113,"Nh","Nihonio","[286]","postransicion",7,13],
  [114,"Fl","Flerovio","[289]","postransicion",7,14],
  [115,"Mc","Moscovio","[290]","postransicion",7,15],
  [116,"Lv","Livermorio","[293]","postransicion",7,16],
  [117,"Ts","Teneso","[294]","halogen",7,17],
  [118,"Og","Oganesón","[294]","gasnoble",7,18]
].map(([numero, simbolo, nombre, masa, categoria, periodo, grupo]) => ({
  numero,
  simbolo,
  nombre,
  masa,
  categoria,
  periodo,
  grupo,
  descripcion: `El ${nombre} (${simbolo}) tiene número atómico ${numero}. Pertenece a la familia de ${familiasQuimicas[categoria]}.`
}));

const descripcionesNivel = {
  basica: {
    ph: "La escala de pH nos ayuda a saber si una sustancia es ácida, neutra o alcalina. El valor 7 se considera neutro en condiciones habituales.",
    reaccion: "Una reacción química transforma unas sustancias en otras. Los átomos no desaparecen: se reorganizan para formar nuevas sustancias."
  },
  bachillerato: {
    ph: "El pH se relaciona con la actividad de los iones hidrógeno. En soluciones acuosas diluidas, un pH menor que 7 suele indicar acidez y uno mayor que 7, alcalinidad, a 25 °C.",
    reaccion: "Una ecuación química balanceada conserva el número de átomos de cada elemento. Para balancearla se modifican los coeficientes, no los subíndices de las fórmulas."
  },
  superior: {
    ph: "Formalmente, el pH se define como menos el logaritmo decimal de la actividad del ion hidrógeno: pH = −log₁₀(aH⁺). En soluciones diluidas suele aproximarse usando su concentración efectiva.",
    reaccion: "El balanceo de una ecuación química expresa la conservación de los átomos. En reacciones redox también se verifica la conservación de la carga mediante métodos como el de semirreacciones."
  }
};

const pHInfo = {
  0: ["Muy ácido", "Una lectura cercana a 0 representa una acidez muy elevada."],
  1: ["Muy ácido", "El valor indica una sustancia fuertemente ácida en esta escala."],
  2: ["Ácido", "El jugo de limón puede presentar un pH cercano a este valor."],
  3: ["Ácido", "Algunas soluciones de vinagre pueden tener valores próximos a este nivel."],
  4: ["Ácido", "La sustancia es ácida: su pH se encuentra por debajo de 7."],
  5: ["Ligeramente ácido", "Es un valor ácido, aunque menos ácido que los valores inferiores."],
  6: ["Ligeramente ácido", "Se encuentra cerca de la neutralidad, pero sigue siendo menor que 7."],
  7: ["Neutro", "Un pH cercano a 7 se considera neutro en agua pura a 25 °C."],
  8: ["Ligeramente alcalino", "Se encuentra por encima de 7 y se considera alcalino."],
  9: ["Alcalino", "El valor está por encima de 7 y corresponde a una solución alcalina."],
  10: ["Alcalino", "Es un valor alcalino. Algunas soluciones jabonosas pueden aproximarse a este rango."],
  11: ["Muy alcalino", "Indica alcalinidad elevada. El valor real depende de la sustancia."],
  12: ["Muy alcalino", "Este valor corresponde a una solución fuertemente alcalina."],
  13: ["Muy alcalino", "Representa una alcalinidad muy elevada."],
  14: ["Muy alcalino", "Es el extremo alcalino de la escala didáctica de pH."]
};

const coloresPH = [
  "#e64a58", "#ef5149", "#f46a42", "#f78a40", "#f4a83e",
  "#d8c84a", "#b3cf57", "#70d59a", "#50d8b5", "#42c7ce",
  "#419ee0", "#4b82ed", "#696ce8", "#875be2", "#a64fd3"
];

const estadoInicial = {
  nivel: "bachillerato",
  elementosExplorados: [],
  phCompletado: false,
  balanceoCompletado: false,
  quizCompletado: false,
  mejorPuntaje: 0,
  ultimoPuntaje: null
};

let progreso = cargarProgreso();

window.AulaLabQuimicaProgreso =
  window.AulaLabQuimicaProgreso || {};

window.AulaLabQuimicaProgreso.aplicarPrincipal = function (datos) {
  if (!datos || typeof datos !== "object") return;

  progreso = {
    ...estadoInicial,
    ...datos,
    elementosExplorados: Array.isArray(datos.elementosExplorados)
      ? datos.elementosExplorados
      : []
  };

  guardarProgreso();
};
let elementoSeleccionado = 1;
let pHCompletadoEnEstaSesion = false;
let balanceoCompletadoEnEstaSesion = false;
let notificacionPendiente;

function cargarProgreso() {
  try {
    const guardado = localStorage.getItem(CLAVE_PROGRESO);

    if (!guardado) {
      return { ...estadoInicial, elementosExplorados: [] };
    }

    const datos = JSON.parse(guardado);

    return {
      ...estadoInicial,
      ...datos,
      elementosExplorados: Array.isArray(datos.elementosExplorados)
        ? datos.elementosExplorados
        : []
    };
  } catch (error) {
    console.warn("No se pudo recuperar el progreso guardado.", error);
    return { ...estadoInicial, elementosExplorados: [] };
  }
}

function guardarProgreso() {
  try {
    localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(progreso));
  } catch (error) {
    console.warn("No se pudo guardar el progreso en este navegador.", error);
    mostrarNotificacion("No fue posible guardar el progreso. Revisá la configuración del navegador.");
  }

  window.dispatchEvent(
    new Event("aulalab:quimica-progreso-actualizado")
  );

  actualizarPanelProgreso();
}

function obtenerElemento(id) {
  return document.getElementById(id);
}

function mostrarNotificacion(mensaje) {
  const toast = obtenerElemento("notificacion");
  if (!toast) return;

  toast.textContent = mensaje;
  toast.classList.add("visible");

  clearTimeout(notificacionPendiente);
  notificacionPendiente = setTimeout(() => {
    toast.classList.remove("visible");
  }, 3000);
}

/* -----------------------------------------
   NIVEL EDUCATIVO
----------------------------------------- */

function configurarNivel() {
  const selector = obtenerElemento("nivelEducativo");
  selector.value = progreso.nivel || "bachillerato";

  selector.addEventListener("change", () => {
    progreso.nivel = selector.value;
    guardarProgreso();
    actualizarExplicacionPH();
    actualizarDescripcionReaccion();
    mostrarNotificacion("Nivel educativo actualizado.");
  });

  actualizarDescripcionReaccion();
}

function actualizarDescripcionReaccion() {
  const texto = document.querySelector(".reaction-description > p");
  if (!texto) return;

  texto.textContent = descripcionesNivel[progreso.nivel].reaccion;
}

/* -----------------------------------------
   TABLA PERIÓDICA
----------------------------------------- */


function crearTablaElementos() {
  const contenedor = obtenerElemento("tablaElementos");
  contenedor.innerHTML = "";

  const coloresFamilias = {
    alcalino: ["#60a5fa", "rgba(96,165,250,.13)"],
    alcalinoterreo: ["#818cf8", "rgba(129,140,248,.13)"],
    transicion: ["#34d399", "rgba(52,211,153,.12)"],
    postransicion: ["#2dd4bf", "rgba(45,212,191,.12)"],
    metaloide: ["#fbbf24", "rgba(251,191,36,.12)"],
    nometal: ["#a78bfa", "rgba(167,139,250,.13)"],
    halogen: ["#f472b6", "rgba(244,114,182,.13)"],
    gasnoble: ["#fb923c", "rgba(251,146,60,.13)"],
    lantanido: ["#e879f9", "rgba(232,121,249,.13)"],
    actinido: ["#f87171", "rgba(248,113,113,.13)"]
  };

  // Las series inferiores se muestran en filas separadas,
  // como en una tabla periódica convencional.
  const etiquetaLant = document.createElement("div");
  etiquetaLant.className = "f-block-label";
  etiquetaLant.textContent = "Lantánidos";
  etiquetaLant.style.gridColumn = "1 / span 3";
  etiquetaLant.style.gridRow = "8";
  contenedor.appendChild(etiquetaLant);

  const etiquetaAct = document.createElement("div");
  etiquetaAct.className = "f-block-label";
  etiquetaAct.textContent = "Actínidos";
  etiquetaAct.style.gridColumn = "1 / span 3";
  etiquetaAct.style.gridRow = "9";
  contenedor.appendChild(etiquetaAct);

  elementos.forEach((elemento) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "element-tile";
    boton.dataset.numero = elemento.numero;

    const colores = coloresFamilias[elemento.categoria] ||
      ["#9db0c9", "rgba(157,176,201,.1)"];

    boton.style.setProperty("--family-color", colores[0]);
    boton.style.setProperty("--family-bg", colores[1]);

    // Posición de los lantánidos y actínidos en las filas inferiores.
    if (elemento.categoria === "lantanido") {
      boton.style.gridColumn = String(elemento.numero - 53);
      boton.style.gridRow = "8";
    } else if (elemento.categoria === "actinido") {
      boton.style.gridColumn = String(elemento.numero - 85);
      boton.style.gridRow = "9";
    } else {
      boton.style.gridColumn = String(elemento.grupo);
      boton.style.gridRow = String(elemento.periodo);
    }

    boton.setAttribute(
      "aria-label",
      `${elemento.nombre}, número atómico ${elemento.numero}, ${familiasQuimicas[elemento.categoria]}`
    );

    boton.innerHTML = `
      <span class="atomic-number">${elemento.numero}</span>
      <span class="symbol">${elemento.simbolo}</span>
      <span class="short-name">${elemento.nombre}</span>
      <span class="atomic-mass">${elemento.masa}</span>
    `;

    boton.addEventListener("click", () => {
      seleccionarElemento(elemento.numero);
    });

    contenedor.appendChild(boton);
  });

  seleccionarElemento(elementoSeleccionado);
}


function seleccionarElemento(numero) {
  const elemento = elementos.find((item) => item.numero === numero);
  if (!elemento) return;

  elementoSeleccionado = numero;

  obtenerElemento("simboloElemento").textContent = elemento.simbolo;
  obtenerElemento("nombreElemento").textContent = elemento.nombre;
  obtenerElemento("descripcionElemento").textContent = elemento.descripcion;
  obtenerElemento("numeroAtomico").textContent = elemento.numero;
  obtenerElemento("masaAtomica").textContent = `${elemento.masa} u`;
  obtenerElemento("categoriaElemento").textContent =
    familiasQuimicas[elemento.categoria];
  
  const periodo = obtenerElemento("periodoElemento");
  const grupo = obtenerElemento("grupoElemento");

  if (periodo) periodo.textContent = elemento.periodo;
  if (grupo) {
    grupo.textContent =
      elemento.categoria === "lantanido"
        ? "Serie de los lantánidos"
        : elemento.categoria === "actinido"
          ? "Serie de los actínidos"
          : elemento.grupo;
  }

  document.querySelectorAll(".periodic-table .element-tile").forEach((boton) => {
    const seleccionado = Number(boton.dataset.numero) === numero;

    boton.classList.toggle("selected", seleccionado);
    boton.classList.toggle(
      "explored",
      progreso.elementosExplorados.includes(Number(boton.dataset.numero))
    );

    boton.setAttribute("aria-pressed", String(seleccionado));
  });

  const yaExplorado = progreso.elementosExplorados.includes(numero);
  const botonMarcar = obtenerElemento("marcarElemento");

  botonMarcar.disabled = yaExplorado;
  botonMarcar.textContent = yaExplorado
    ? "✓ Elemento explorado"
    : "Marcar como explorado";
}

/* -----------------------------------------
   SIMULADOR DE pH
----------------------------------------- */

function crearEscalaPH() {
  const escala = obtenerElemento("escalaPH");
  escala.innerHTML = "";

  for (let valor = 0; valor <= 14; valor++) {
    const celda = document.createElement("div");
    celda.className = "ph-cell";
    celda.textContent = valor;
    celda.dataset.ph = valor;
    celda.style.backgroundColor = coloresPH[valor];
    escala.appendChild(celda);
  }
}

function actualizarPH(valor) {
  const ph = Number(valor);
  const info = pHInfo[ph];

  obtenerElemento("valorPH").textContent = ph;
  obtenerElemento("estadoPH").textContent = info[0];
  obtenerElemento("explicacionPH").textContent =
    `${info[1]} ${descripcionesNivel[progreso.nivel].ph}`;

  obtenerElemento("valorPH").style.color = coloresPH[ph];
  obtenerElemento("estadoPH").style.color = coloresPH[ph];

  document.querySelectorAll(".ph-cell").forEach((celda) => {
    const activo = Number(celda.dataset.ph) === ph;
    celda.classList.toggle("active", activo);
    celda.setAttribute("aria-current", activo ? "true" : "false");
  });
}

function actualizarExplicacionPH() {
  actualizarPH(obtenerElemento("controlPH").value);
}

function configurarPH() {
  crearEscalaPH();

  const control = obtenerElemento("controlPH");
  control.addEventListener("input", () => {
    obtenerElemento("sustanciaPH").value = "automatico";
    actualizarPH(control.value);
  });

  obtenerElemento("sustanciaPH").addEventListener("change", (evento) => {
    const valores = {
      limon: 2,
      vinagre: 3,
      agua: 7,
      bicarbonato: 8,
      jabon: 10
    };

    const valor = valores[evento.target.value];

    if (valor !== undefined) {
      control.value = valor;
      actualizarPH(valor);
    }
  });

  obtenerElemento("completarPH").addEventListener("click", () => {
    progreso.phCompletado = true;
    pHCompletadoEnEstaSesion = true;
    guardarProgreso();
    mostrarNotificacion("¡Experimento de pH completado!");
  });

  actualizarPH(control.value);
}

/* -----------------------------------------
   RETO DE BALANCEO
----------------------------------------- */

function configurarBalanceo() {
  const opciones = obtenerElemento("opcionesBalanceo");

  opciones.querySelectorAll("button").forEach((boton) => {
    boton.addEventListener("click", () => {
      const coeficiente = Number(boton.dataset.coeficiente);

      obtenerElemento("coeficienteActual").textContent = coeficiente;

      opciones.querySelectorAll("button").forEach((otro) => {
        otro.classList.toggle("chosen", otro === boton);
      });

      const resultado = obtenerElemento("resultadoBalanceo");

      if (coeficiente === 2) {
        resultado.textContent =
          "¡Correcto! 2H₂ + O₂ → 2H₂O conserva 4 átomos de hidrógeno y 2 de oxígeno.";
        resultado.className = "feedback correct";

        progreso.balanceoCompletado = true;
        balanceoCompletadoEnEstaSesion = true;
        guardarProgreso();
      } else {
        resultado.textContent =
          "Todavía no. Contá los átomos de hidrógeno y oxígeno en ambos lados e intentá otra vez.";
        resultado.className = "feedback incorrect";
      }
    });
  });
}

/* -----------------------------------------
   CUESTIONARIO
----------------------------------------- */

function configurarQuiz() {
  const formulario = obtenerElemento("formularioQuiz");

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const respuestas = {
      p1: "b",
      p2: "a",
      p3: "c",
      p4: "b"
    };

    let correctas = 0;

    Object.entries(respuestas).forEach(([pregunta, respuesta]) => {
      const seleccionada = formulario.querySelector(
        `input[name="${pregunta}"]:checked`
      );

      if (seleccionada && seleccionada.value === respuesta) {
        correctas++;
      }
    });

    const total = Object.keys(respuestas).length;
    const porcentaje = Math.round((correctas / total) * 100);
    const resultado = obtenerElemento("resultadoQuiz");

    resultado.hidden = false;
    resultado.innerHTML = `
      <strong>${porcentaje}% · ${correctas}/${total} correctas</strong>
      <p>${mensajeResultado(porcentaje)} Tu resultado se guardará como tu mejor puntaje si supera el anterior.</p>
    `;

    progreso.ultimoPuntaje = porcentaje;
    progreso.mejorPuntaje = Math.max(progreso.mejorPuntaje, porcentaje);
    progreso.quizCompletado = true;

    guardarProgreso();
    mostrarNotificacion("Evaluación calificada. ¡Seguí aprendiendo!");
    resultado.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

function mensajeResultado(porcentaje) {
  if (porcentaje === 100) {
    return "¡Excelente! Respondiste todas las preguntas correctamente.";
  }

  if (porcentaje >= 75) {
    return "¡Muy buen trabajo! Comprendés los conceptos principales.";
  }

  if (porcentaje >= 50) {
    return "Vas avanzando. Repasá las explicaciones y volvé a intentarlo.";
  }

  return "Este es un buen punto de partida. Repasá el laboratorio y practicá de nuevo.";
}

/* -----------------------------------------
   PANEL DE PROGRESO
----------------------------------------- */

function actualizarPanelProgreso() {
  const actividades = [
    progreso.phCompletado,
    progreso.balanceoCompletado,
    progreso.quizCompletado
  ];

  const completadas = actividades.filter(Boolean).length;
  const porcentaje = Math.round((completadas / actividades.length) * 100);

  obtenerElemento("porcentajeProgreso").textContent = `${porcentaje}%`;
  obtenerElemento("barraProgreso").style.width = `${porcentaje}%`;
  obtenerElemento("barraProgreso").setAttribute("role", "progressbar");
  obtenerElemento("barraProgreso").setAttribute("aria-valuemin", "0");
  obtenerElemento("barraProgreso").setAttribute("aria-valuemax", "100");
  obtenerElemento("barraProgreso").setAttribute("aria-valuenow", String(porcentaje));

  obtenerElemento("actividadesCompletadas").textContent = completadas;
  obtenerElemento("mejorPuntaje").textContent = `${progreso.mejorPuntaje}%`;
  obtenerElemento("elementosExplorados").textContent =
    progreso.elementosExplorados.length;
}

/* -----------------------------------------
   REINICIAR PROGRESO
----------------------------------------- */

function reiniciarProgreso() {
  const confirmar = window.confirm(
    "¿Querés reiniciar tu progreso de Química? Se borrarán los elementos explorados y los resultados guardados en este navegador."
  );

  if (!confirmar) return;

  progreso = { ...estadoInicial, elementosExplorados: [] };
  elementoSeleccionado = 1;
  pHCompletadoEnEstaSesion = false;
  balanceoCompletadoEnEstaSesion = false;

  try {
    localStorage.removeItem(CLAVE_PROGRESO);
  } catch (error) {
    console.warn("No se pudo borrar el progreso guardado.", error);
  }

  obtenerElemento("nivelEducativo").value = progreso.nivel;
  obtenerElemento("resultadoQuiz").hidden = true;
  obtenerElemento("resultadoBalanceo").textContent =
    "Seleccioná una respuesta para comprobarla.";
  obtenerElemento("resultadoBalanceo").className = "feedback";
  obtenerElemento("coeficienteActual").textContent = "1";

  obtenerElemento("opcionesBalanceo")
    .querySelectorAll("button")
    .forEach((boton) => boton.classList.remove("chosen"));

  obtenerElemento("formularioQuiz").reset();

  crearTablaElementos();
  actualizarPH(obtenerElemento("controlPH").value);
  actualizarDescripcionReaccion();
  actualizarPanelProgreso();

  mostrarNotificacion("Tu progreso se reinició correctamente.");
}

/* -----------------------------------------
   INICIALIZACIÓN
----------------------------------------- */

function iniciarLaboratorio() {
  configurarNivel();
  crearTablaElementos();
  configurarPH();
  configurarBalanceo();
  configurarQuiz();
  actualizarPanelProgreso();

  obtenerElemento("marcarElemento").addEventListener(
    "click",
    marcarElementoExplorado
  );

  obtenerElemento("reiniciarProgreso").addEventListener(
    "click",
    reiniciarProgreso
  );
}

document.addEventListener("DOMContentLoaded", iniciarLaboratorio);


/* ==========================================
   AULALAB - FUNCIONALIDAD DE EXPERIMENTOS
   ========================================== */

function iniciarMesaExperimentos() {
    const boton = document.getElementById("btnMezclar");

    // Si el HTML de la mesa no existe, no hacemos nada.
    if (!boton) return;

    // Evita registrar el mismo evento más de una vez.
    if (boton.dataset.iniciado === "true") return;

    boton.dataset.iniciado = "true";
    boton.addEventListener("click", ejecutarMezcla);
}

function ejecutarMezcla() {
    const selectorA = document.getElementById("sustanciaA");
    const selectorB = document.getElementById("sustanciaB");

    const liquido = document.getElementById("liquidoResultado");
    const burbujas = document.getElementById("burbujasResultado");
    const titulo = document.getElementById("tituloResultado");
    const texto = document.getElementById("textoResultado");
    const estado = document.getElementById("estadoReaccion");
    const panel = document.querySelector(
        "#mesaExperimentos .resultado-mezcla"
    );

    if (
        !selectorA || !selectorB || !liquido ||
        !burbujas || !titulo || !texto || !estado
    ) {
        console.error(
            "AulaLab: faltan elementos HTML de la Mesa de experimentos."
        );
        return;
    }

    const a = selectorA.value;
    const b = selectorB.value;

    const sustancias = {
        agua: {
            nombre: "agua",
            color: "#38bdf8"
        },
        acido: {
            nombre: "solución ácida simulada",
            color: "#fb923c"
        },
        base: {
            nombre: "solución básica simulada",
            color: "#818cf8"
        },
        indicador: {
            nombre: "indicador de pH",
            color: "#a78bfa"
        },
        sal: {
            nombre: "solución salina simulada",
            color: "#94a3b8"
        }
    };

    let resultado;

    // Dos muestras de la misma sustancia.
    if (a === b) {
        resultado = {
            titulo: "Misma sustancia",
            texto:
                "Seleccionaste dos muestras de " +
                sustancias[a].nombre +
                ". En este modelo no se representa una reacción nueva.",
            color: sustancias[a].color,
            estado: "Sin reacción nueva",
            burbujas: false,
            nivel: "55%"
        };
    }

    // Ácido y base: representación educativa de neutralización.
    else if (
        (a === "acido" && b === "base") ||
        (a === "base" && b === "acido")
    ) {
        resultado = {
            titulo: "Neutralización simulada",
            texto:
                "Un ácido y una base pueden reaccionar y formar agua " +
                "y una sal. El resultado real depende de las sustancias, " +
                "sus concentraciones y las cantidades utilizadas.",
            color: "#a5b4fc",
            estado: "Neutralización",
            burbujas: false,
            nivel: "70%"
        };
    }

    // Indicador en medio ácido.
    else if (
        (a === "indicador" && b === "acido") ||
        (a === "acido" && b === "indicador")
    ) {
        resultado = {
            titulo: "Indicador en medio ácido",
            texto:
                "El color representa un medio ácido. El color real " +
                "depende del indicador utilizado y de las condiciones " +
                "de la solución.",
            color: "#fb7185",
            estado: "Cambio de color",
            burbujas: false,
            nivel: "65%"
        };
    }

    // Indicador en medio básico.
    else if (
        (a === "indicador" && b === "base") ||
        (a === "base" && b === "indicador")
    ) {
        resultado = {
            titulo: "Indicador en medio básico",
            texto:
                "El color representa un medio básico. Distintos " +
                "indicadores pueden mostrar colores diferentes.",
            color: "#34d399",
            estado: "Cambio de color",
            burbujas: false,
            nivel: "65%"
        };
    }

    // Indicador en agua.
    else if (
        (a === "indicador" && b === "agua") ||
        (a === "agua" && b === "indicador")
    ) {
        resultado = {
            titulo: "Indicador en agua",
            texto:
                "El agua pura a temperatura ambiente es aproximadamente " +
                "neutra. El color que muestre el indicador depende del " +
                "tipo de indicador empleado.",
            color: "#a78bfa",
            estado: "Observación de pH",
            burbujas: false,
            nivel: "60%"
        };
    }

    // Otras combinaciones: no se afirma una reacción específica.
    else {
        resultado = {
            titulo: "Mezcla simulada",
            texto:
                "Combinaste " + sustancias[a].nombre + " con " +
                sustancias[b].nombre + ". Esta simulación no predice " +
                "una reacción química específica para esta combinación.",
            color: "#67e8f9",
            estado: "Mezcla virtual",
            burbujas: false,
            nivel: "60%"
        };
    }

    // Actualizar la apariencia del vaso.
    liquido.style.background = resultado.color;
    liquido.style.height = resultado.nivel;

    // Reiniciar las burbujas y activarlas solo si corresponde.
    burbujas.classList.remove("activo");

    if (resultado.burbujas) {
        burbujas.classList.add("activo");
    }

    // Mostrar el resultado.
    titulo.textContent = resultado.titulo;
    texto.textContent = resultado.texto;
    estado.textContent = resultado.estado;

    // Reproducir la animación de entrada.
    if (panel) {
        panel.classList.remove("resultado-animado");

        // Reinicia la animación sin bloquear la interacción.
        void panel.offsetWidth;

        panel.classList.add("resultado-animado");
    }
}

// Inicializar cuando el documento esté disponible.
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        iniciarMesaExperimentos
    );
} else {
    iniciarMesaExperimentos();
}

/* =====================================================
   AULALAB - MOTOR DE LAS NUEVAS ACTIVIDADES
   HTML + CSS + JAVASCRIPT PURO
   ===================================================== */

(function () {
    "use strict";

    const CLAVE_PROGRESO = "aulalab_nuevas_actividades_v1";

    const actividades = [
        { id: "atomos", nombre: "Constructor de átomos", icono: "⚛️" },
        { id: "densidad", nombre: "Laboratorio de densidad", icono: "💧" },
        { id: "moleculas", nombre: "Constructor de moléculas", icono: "🧬" },
        { id: "detective", nombre: "Detective de reacciones", icono: "🔎" },
        { id: "misiones", nombre: "Misiones científicas", icono: "🏆" }
    ];

    const insigniasDisponibles = [
        {
            id: "primera",
            nombre: "Primera exploración",
            descripcion: "Completá tu primera actividad.",
            icono: "🌟",
            cumple: estado => Object.values(estado.completadas).some(Boolean)
        },
        {
            id: "explorador",
            nombre: "Explorador científico",
            descripcion: "Alcanzá 40 puntos de experiencia.",
            icono: "🔬",
            cumple: estado => estado.puntos >= 40
        },
        {
            id: "experto",
            nombre: "Experto de laboratorio",
            descripcion: "Alcanzá 100 puntos de experiencia.",
            icono: "🧪",
            cumple: estado => estado.puntos >= 100
        },
        {
            id: "coleccionista",
            nombre: "Coleccionista de logros",
            descripcion: "Completá tres actividades diferentes.",
            icono: "🏅",
            cumple: estado =>
                Object.values(estado.completadas).filter(Boolean).length >= 3
        },
        {
            id: "maestro",
            nombre: "Maestro de AulaLab",
            descripcion: "Completá las cinco actividades.",
            icono: "👑",
            cumple: estado =>
                Object.values(estado.completadas).filter(Boolean).length >= 5
        }
    ];

    function crearEstadoInicial() {
        return {
            puntos: 0,
            completadas: {
                atomos: false,
                densidad: false,
                moleculas: false,
                detective: false,
                misiones: false
            },
            insignias: [],
            casosResueltos: [],
            casosConPuntos: [],
            casoActual: 0
        };
    }

    function cargarEstado() {
        const inicial = crearEstadoInicial();

        try {
            const guardado = localStorage.getItem(CLAVE_PROGRESO);

            if (!guardado) return inicial;

            const datos = JSON.parse(guardado);

            if (!datos || typeof datos !== "object") return inicial;

            return {
                ...inicial,
                puntos: Number.isFinite(datos.puntos)
                    ? Math.max(0, datos.puntos)
                    : 0,
                completadas: {
                    ...inicial.completadas,
                    ...(datos.completadas || {})
                },
                insignias: Array.isArray(datos.insignias)
                    ? datos.insignias
                    : [],
                casosResueltos: Array.isArray(datos.casosResueltos)
                    ? datos.casosResueltos
                    : [],
                casosConPuntos: Array.isArray(datos.casosConPuntos)
                    ? datos.casosConPuntos
                    : [],
                casoActual: Number.isInteger(datos.casoActual)
                    ? Math.min(4, Math.max(0, datos.casoActual))
                    : 0
            };
        } catch (error) {
            console.warn("No se pudo leer el progreso de AulaLab.", error);
            return inicial;
        }
    }

    let estado = cargarEstado();

    window.AulaLabQuimicaProgreso =
        window.AulaLabQuimicaProgreso || {};

    window.AulaLabQuimicaProgreso.aplicarExtra = function (datos) {
        if (!datos || typeof datos !== "object") return;

        estado = {
            ...estado,
            ...datos,
            completadas: {
                ...estado.completadas,
                ...(datos.completadas || {})
            },
            insignias: Array.isArray(datos.insignias)
                ? datos.insignias : estado.insignias,
            casosResueltos: Array.isArray(datos.casosResueltos)
                ? datos.casosResueltos : estado.casosResueltos,
            casosConPuntos: Array.isArray(datos.casosConPuntos)
                ? datos.casosConPuntos : estado.casosConPuntos
        };

        actualizarProgreso();
    };

    function guardarEstado() {
        try {
            localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(estado));
        } catch (error) {
            console.warn("No se pudo guardar el progreso de AulaLab.", error);
        }

        window.dispatchEvent(
            new Event("aulalab:quimica-progreso-actualizado")
        );
    }

    function elemento(id) {
        return document.getElementById(id);
    }

    function mostrarTexto(id, texto) {
        const nodo = elemento(id);
        if (nodo) nodo.textContent = texto;
    }

    function obtenerCompletadas() {
        return Object.values(estado.completadas).filter(Boolean).length;
    }

    function obtenerNivel() {
        if (estado.puntos >= 100) return "Maestro";
        if (estado.puntos >= 60) return "Científico";
        if (estado.puntos >= 30) return "Investigador";
        return "Explorador";
    }

    function actualizarInsignias() {
        insigniasDisponibles.forEach(insignia => {
            if (
                insignia.cumple(estado) &&
                !estado.insignias.includes(insignia.id)
            ) {
                estado.insignias.push(insignia.id);
            }
        });
    }

    function actualizarProgreso() {
        actualizarInsignias();
        guardarEstado();

        mostrarTexto("alPuntos", estado.puntos);
        mostrarTexto(
            "alInsignias",
            estado.insignias.length
        );
        mostrarTexto(
            "alCompletadas",
            obtenerCompletadas() + "/5"
        );
        mostrarTexto("alNivel", obtenerNivel());

        const barra = elemento("alBarraProgreso");

        if (barra) {
            barra.style.width = (obtenerCompletadas() / 5 * 100) + "%";
        }

        mostrarTexto(
            "alTextoProgreso",
            obtenerCompletadas() === 5
                ? "¡Excelente! Completaste todas las actividades nuevas."
                : "Has completado " + obtenerCompletadas() +
                  " de 5 actividades. ¡Seguí aprendiendo!"
        );

        renderizarMisiones();
        renderizarInsignias();
    }

    function completarActividad(id) {
        if (!Object.prototype.hasOwnProperty.call(
            estado.completadas,
            id
        )) {
            return;
        }

        if (estado.completadas[id]) {
            actualizarProgreso();
            return;
        }

        estado.completadas[id] = true;
        estado.puntos += 20;

        actualizarProgreso();

        const boton = elemento({
            atomos: "alCompletarAtomo",
            densidad: "alCompletarDensidad",
            moleculas: "alCompletarMolecula",
            detective: "alSiguienteCaso"
        }[id] || "");

        if (boton && id !== "detective") {
            boton.textContent = "✓ Actividad completada";
            boton.disabled = true;
        }
    }

    /* =========================================
       1. CONSTRUCTOR DE ÁTOMOS
       ========================================= */

    const simbolos = (
        "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca " +
        "Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr " +
        "Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba " +
        "La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W " +
        "Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U " +
        "Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds " +
        "Rg Cn Nh Fl Mc Lv Ts Og"
    ).split(" ");

    const nombresElementos = (
        "Hidrógeno|Helio|Litio|Berilio|Boro|Carbono|Nitrógeno|Oxígeno|" +
        "Flúor|Neón|Sodio|Magnesio|Aluminio|Silicio|Fósforo|Azufre|" +
        "Cloro|Argón|Potasio|Calcio|Escandio|Titanio|Vanadio|Cromo|" +
        "Manganeso|Hierro|Cobalto|Níquel|Cobre|Zinc|Galio|Germanio|" +
        "Arsénico|Selenio|Bromo|Kriptón|Rubidio|Estroncio|Itrio|" +
        "Circonio|Niobio|Molibdeno|Tecnecio|Rutenio|Rodio|Paladio|" +
        "Plata|Cadmio|Indio|Estaño|Antimonio|Telurio|Yodo|Xenón|" +
        "Cesio|Bario|Lantano|Cerio|Praseodimio|Neodimio|Prometio|" +
        "Samario|Europio|Gadolinio|Terbio|Disprosio|Holmio|Erbio|" +
        "Tulio|Iterbio|Lutecio|Hafnio|Tántalo|Wolframio|Renio|" +
        "Osmio|Iridio|Platino|Oro|Mercurio|Talio|Plomo|Bismuto|" +
        "Polonio|Astato|Radón|Francio|Radio|Actinio|Torio|" +
        "Protactinio|Uranio|Neptunio|Plutonio|Americio|Curio|" +
        "Berkelio|Californio|Einstenio|Fermio|Mendelevio|Nobelio|" +
        "Lawrencio|Rutherfordio|Dubnio|Seaborgio|Bohrio|Hassio|" +
        "Meitnerio|Darmstadtio|Roentgenio|Copernicio|Nihonio|" +
        "Flerovio|Moscovio|Livermorio|Teneso|Oganesón"
    ).split("|");

    let protones = 1;
    let neutrones = 0;
    let electrones = 1;

    function dibujarAtomo() {
        const nucleo = elemento("alNucleoAtomico");
        const orbita = elemento("alOrbitaElectronica");

        if (!nucleo || !orbita) return;

        nucleo.replaceChildren();
        orbita.replaceChildren();

        // Dibujar hasta 30 partículas del núcleo para evitar saturarlo.
        const totalNucleo = Math.min(protones + neutrones, 30);

        for (let i = 0; i < totalNucleo; i++) {
            const particula = document.createElement("span");
            particula.className = i < Math.min(protones, totalNucleo)
                ? "al-p"
                : "al-n";
            nucleo.appendChild(particula);
        }

        // Representación simplificada de hasta 18 electrones.
        const totalElectrones = Math.min(electrones, 18);

        for (let i = 0; i < totalElectrones; i++) {
            const punto = document.createElement("span");
            const angulo = (2 * Math.PI * i / Math.max(totalElectrones, 1));
            const radio = i < 2 ? 34 : i < 10 ? 58 : 79;

            punto.className = "al-electron-visual";
            punto.style.left = (87.5 + Math.cos(angulo) * radio) + "px";
            punto.style.top = (87.5 + Math.sin(angulo) * radio) + "px";

            orbita.appendChild(punto);
        }

        const numeroAtomico = protones;
        const indice = numeroAtomico - 1;
        const carga = protones - electrones;

        mostrarTexto("alProtones", protones);
        mostrarTexto("alNeutrones", neutrones);
        mostrarTexto("alElectrones", electrones);
        mostrarTexto("alNumeroAtomico", numeroAtomico);
        mostrarTexto("alNumeroMasico", protones + neutrones);
        mostrarTexto("alCargaAtomo", carga > 0 ? "+" + carga : carga);

        if (numeroAtomico >= 1 && numeroAtomico <= simbolos.length) {
            mostrarTexto("alSimboloAtomo", simbolos[indice]);
            mostrarTexto("alNombreAtomo", nombresElementos[indice]);
        } else {
            mostrarTexto("alSimboloAtomo", "?");
            mostrarTexto("alNombreAtomo", "Sin elemento identificado");
        }

        let explicacion = "";

        if (protones === 0) {
            explicacion =
                "Sin protones no se identifica un elemento químico. " +
                "Agregá al menos un protón.";
        } else if (carga === 0) {
            explicacion =
                "El átomo es eléctricamente neutro porque tiene la " +
                "misma cantidad de protones y electrones.";
        } else if (carga > 0) {
            explicacion =
                "La partícula tiene carga positiva: posee más protones " +
                "que electrones. Se representa como un catión.";
        } else {
            explicacion =
                "La partícula tiene carga negativa: posee más electrones " +
                "que protones. Se representa como un anión.";
        }

        mostrarTexto("alExplicacionAtomo", explicacion);
    }

    function cambiarParticula(tipo, cambio) {
        const limites = {
            protones: [0, 118],
            neutrones: [0, 200],
            electrones: [0, 118]
        };

        if (!limites[tipo]) return;

        const actual = {
            protones,
            neutrones,
            electrones
        }[tipo];

        const nuevo = Math.min(
            limites[tipo][1],
            Math.max(limites[tipo][0], actual + cambio)
        );

        if (tipo === "protones") protones = nuevo;
        if (tipo === "neutrones") neutrones = nuevo;
        if (tipo === "electrones") electrones = nuevo;

        dibujarAtomo();
    }

    function iniciarAtomos() {
        document.querySelectorAll("[data-al-particula]").forEach(boton => {
            boton.addEventListener("click", () => {
                cambiarParticula(
                    boton.dataset.alParticula,
                    Number(boton.dataset.alCambio)
                );
            });
        });

        const reiniciar = elemento("alReiniciarAtomo");

        if (reiniciar) {
            reiniciar.addEventListener("click", () => {
                protones = 1;
                neutrones = 0;
                electrones = 1;
                dibujarAtomo();
            });
        }

        const completar = elemento("alCompletarAtomo");

        if (completar) {
            completar.addEventListener("click", () => {
                if (protones < 1) {
                    mostrarTexto(
                        "alExplicacionAtomo",
                        "Agregá al menos un protón para identificar un elemento."
                    );
                    return;
                }

                completarActividad("atomos");
            });
        }

        dibujarAtomo();
    }

    /* =========================================
       2. LABORATORIO DE DENSIDAD
       ========================================= */

    function actualizarDensidad() {
        const masaInput = elemento("alMasa");
        const volumenInput = elemento("alVolumen");
        const liquidoInput = elemento("alLiquido");

        if (!masaInput || !volumenInput || !liquidoInput) return;

        const masa = Number(masaInput.value);
        const volumen = Number(volumenInput.value);
        const densidadLiquido = Number(liquidoInput.value);

        if (
            !Number.isFinite(masa) || !Number.isFinite(volumen) ||
            masa <= 0 || volumen <= 0 ||
            masa > 1000 || volumen > 1000
        ) {
            mostrarTexto("alDensidad", "—");
            mostrarTexto(
                "alExplicacionDensidad",
                "Ingresá una masa y un volumen mayores que cero y no superiores a 1000."
            );
            mostrarTexto("alEstadoFlotacion", "Datos inválidos");
            return;
        }

        const densidad = masa / volumen;

        mostrarTexto("alDensidad", densidad.toFixed(2));

        const objeto = elemento("alObjetoFlotante");

        if (densidad < densidadLiquido - 0.001) {
            mostrarTexto("alEstadoFlotacion", "Flota");
            mostrarTexto(
                "alExplicacionDensidad",
                "La densidad del objeto es menor que la del líquido; " +
                "en este modelo el objeto flota."
            );

            if (objeto) {
                objeto.style.top = "12%";
                objeto.style.background = "#06b6d4";
            }
        } else if (densidad > densidadLiquido + 0.001) {
            mostrarTexto("alEstadoFlotacion", "Se hunde");
            mostrarTexto(
                "alExplicacionDensidad",
                "La densidad del objeto es mayor que la del líquido; " +
                "en este modelo el objeto se hunde."
            );

            if (objeto) {
                objeto.style.top = "72%";
                objeto.style.background = "#7c3aed";
            }
        } else {
            mostrarTexto("alEstadoFlotacion", "Equilibrio");
            mostrarTexto(
                "alExplicacionDensidad",
                "Las densidades son aproximadamente iguales. " +
                "El objeto puede quedar suspendido en el modelo ideal."
            );

            if (objeto) {
                objeto.style.top = "43%";
                objeto.style.background = "#64748b";
            }
        }
    }

    function iniciarDensidad() {
        ["alMasa", "alVolumen", "alLiquido"].forEach(id => {
            const control = elemento(id);

            if (control) {
                control.addEventListener("input", actualizarDensidad);
                control.addEventListener("change", actualizarDensidad);
            }
        });

        const completar = elemento("alCompletarDensidad");

        if (completar) {
            completar.addEventListener("click", () => {
                const masa = Number(elemento("alMasa").value);
                const volumen = Number(elemento("alVolumen").value);

                if (
                    !Number.isFinite(masa) ||
                    !Number.isFinite(volumen) ||
                    masa <= 0 || volumen <= 0 ||
                    masa > 1000 || volumen > 1000
                ) {
                    actualizarDensidad();
                    return;
                }

                completarActividad("densidad");
            });
        }

        actualizarDensidad();
    }

    /* =========================================
       3. CONSTRUCTOR DE MOLÉCULAS
       ========================================= */

    const moleculas = {
        agua: {
            nombre: "Agua",
            formula: "H₂O",
            atomos: ["H", "O", "H"],
            tipos: 2,
            descripcion:
                "La molécula de agua contiene dos átomos de hidrógeno " +
                "y uno de oxígeno. Es fundamental para los seres vivos."
        },
        dioxido: {
            nombre: "Dióxido de carbono",
            formula: "CO₂",
            atomos: ["O", "C", "O"],
            tipos: 2,
            descripcion:
                "Cada molécula contiene un átomo de carbono y dos de " +
                "oxígeno. Participa en la fotosíntesis y en el ciclo del carbono."
        },
        oxigeno: {
            nombre: "Oxígeno molecular",
            formula: "O₂",
            atomos: ["O", "O"],
            tipos: 1,
            descripcion:
                "El oxígeno molecular está formado por dos átomos de " +
                "oxígeno unidos mediante un enlace covalente doble."
        },
        amoniaco: {
            nombre: "Amoníaco",
            formula: "NH₃",
            atomos: ["N", "H", "H", "H"],
            tipos: 2,
            descripcion:
                "La molécula de amoníaco contiene un átomo de nitrógeno " +
                "y tres de hidrógeno. Su geometría es piramidal trigonal."
        },
        metano: {
            nombre: "Metano",
            formula: "CH₄",
            atomos: ["C", "H", "H", "H", "H"],
            tipos: 2,
            descripcion:
                "El metano contiene un átomo de carbono y cuatro de " +
                "hidrógeno. Su geometría molecular es tetraédrica."
        }
    };

    function renderizarMolecula() {
        const selector = elemento("alSeleccionMolecula");
        const dibujo = elemento("alMoleculaDibujo");

        if (!selector || !dibujo) return;

        const molecula = moleculas[selector.value];

        if (!molecula) return;

        mostrarTexto("alNombreMolecula", molecula.nombre);
        mostrarTexto("alFormulaMolecula", molecula.formula);
        mostrarTexto("alDescripcionMolecula", molecula.descripcion);
        mostrarTexto("alCantidadAtomos", molecula.atomos.length);
        mostrarTexto("alTiposElementos", molecula.tipos);

        dibujo.replaceChildren();

        molecula.atomos.forEach((simbolo, indice) => {
            if (indice > 0) {
                const enlace = document.createElement("span");
                enlace.className = "al-enlace-molecula";
                enlace.textContent = "—";
                enlace.setAttribute("aria-hidden", "true");
                dibujo.appendChild(enlace);
            }

            const atomo = document.createElement("span");
            atomo.className = "al-atomo-molecula al-" + simbolo;
            atomo.textContent = simbolo;
            atomo.setAttribute("aria-label", "Átomo de " + simbolo);

            dibujo.appendChild(atomo);
        });
    }

    function iniciarMoleculas() {
        const selector = elemento("alSeleccionMolecula");

        if (selector) {
            selector.addEventListener("change", renderizarMolecula);
        }

        const completar = elemento("alCompletarMolecula");

        if (completar) {
            completar.addEventListener("click", () => {
                completarActividad("moleculas");
            });
        }

        renderizarMolecula();
    }

    /* =========================================
       4. DETECTIVE DE REACCIONES
       ========================================= */

    const casos = [
        {
            titulo: "El hielo desaparecido",
            descripcion:
                "Un cubo de hielo se derrite y se convierte en agua líquida. " +
                "No se forma una sustancia nueva.",
            opciones: [
                "Cambio físico",
                "Cambio químico",
                "Cambio nuclear",
                "No ocurre ningún cambio"
            ],
            correcta: 0,
            explicacion:
                "Correcto: es un cambio físico. El agua sigue siendo H₂O; " +
                "solo cambia su estado."
        },
        {
            titulo: "El clavo oxidado",
            descripcion:
                "Un clavo de hierro permanece expuesto al oxígeno y la humedad " +
                "y con el tiempo aparece óxido.",
            opciones: [
                "Evaporación",
                "Cambio químico",
                "Congelación",
                "Disolución sin reacción"
            ],
            correcta: 1,
            explicacion:
                "Correcto: se forman compuestos nuevos de hierro y oxígeno; " +
                "es un cambio químico."
        },
        {
            titulo: "La sal en el agua",
            descripcion:
                "La sal se disuelve en agua y forma una mezcla uniforme. " +
                "En condiciones habituales, la sal puede recuperarse al evaporar el agua.",
            opciones: [
                "Combustión",
                "Cambio nuclear",
                "Disolución física",
                "Oxidación"
            ],
            correcta: 2,
            explicacion:
                "Correcto: la disolución de sal en agua es normalmente un " +
                "proceso físico y puede revertirse por evaporación."
        },
        {
            titulo: "La vela encendida",
            descripcion:
                "La cera de una vela se quema y produce gases y otras sustancias.",
            opciones: [
                "Solo un cambio de estado",
                "Una mezcla sin cambios",
                "Solo una transformación física",
                "Combustión: cambio químico"
            ],
            correcta: 3,
            explicacion:
                "Correcto: la combustión produce sustancias nuevas. La cera " +
                "también puede fundirse, que es un cambio físico."
        },
        {
            titulo: "Las burbujas inesperadas",
            descripcion:
                "Al mezclar dos soluciones adecuadas en condiciones controladas, " +
                "se libera un gas como producto de una reacción.",
            opciones: [
                "La formación de gas puede ser evidencia de una reacción",
                "Siempre significa que el líquido está hirviendo",
                "Demuestra que no hay reacción",
                "Es necesariamente un cambio nuclear"
            ],
            correcta: 0,
            explicacion:
                "Correcto: la formación de gas puede indicar una reacción química, " +
                "aunque también hay otros procesos que producen burbujas."
        }
    ];

    function renderizarCaso() {
        const caso = casos[estado.casoActual];

        if (!caso) return;

        mostrarTexto("alNumeroCaso", "CASO " + (estado.casoActual + 1));
        mostrarTexto("alTituloCaso", caso.titulo);
        mostrarTexto("alDescripcionCaso", caso.descripcion);

        const opciones = elemento("alOpcionesDetective");
        const feedback = elemento("alFeedbackDetective");
        const siguiente = elemento("alSiguienteCaso");

        if (!opciones || !siguiente) return;

        opciones.replaceChildren();
        feedback.textContent = "";

        const yaResuelto = estado.casosResueltos.includes(estado.casoActual);

        caso.opciones.forEach((opcion, indice) => {
            const boton = document.createElement("button");
            boton.type = "button";
            boton.className = "al-opcion-detective";
            boton.textContent = opcion;

            if (yaResuelto) {
                boton.disabled = true;

                if (indice === caso.correcta) {
                    boton.classList.add("correcta");
                }
            } else {
                boton.addEventListener("click", () => {
                    responderCaso(indice);
                });
            }

            opciones.appendChild(boton);
        });

        if (yaResuelto) {
            feedback.textContent = caso.explicacion;
        }

        siguiente.disabled = !yaResuelto;
        siguiente.textContent = estado.casoActual === casos.length - 1
            ? "Finalizar casos"
            : "Siguiente caso";
    }

    

    function responderCaso(indice) {
        const caso = casos[estado.casoActual];

        if (
            !caso ||
            estado.casosResueltos.includes(estado.casoActual)
        ) {
            return;
        }

        const botones = elemento("alOpcionesDetective").querySelectorAll("button");

        botones.forEach((boton, posicion) => {
            boton.disabled = true;

            if (posicion === caso.correcta) {
                boton.classList.add("correcta");
            } else if (posicion === indice) {
                boton.classList.add("incorrecta");
            }
        });

        const feedback = elemento("alFeedbackDetective");

        if (indice === caso.correcta) {
            feedback.textContent = caso.explicacion;

            // Cada caso puede dar puntos una sola vez.
            if (!estado.casosConPuntos.includes(estado.casoActual)) {
                estado.puntos += 5;
                estado.casosConPuntos.push(estado.casoActual);
            }
        } else {
            feedback.textContent =
                "Todavía no. La respuesta correcta es «" +
                caso.opciones[caso.correcta] +
                "». " + caso.explicacion;
        }

        estado.casosResueltos.push(estado.casoActual);

        const siguiente = elemento("alSiguienteCaso");
        siguiente.disabled = false;

        if (estado.casoActual === casos.length - 1) {
            siguiente.textContent = "Finalizar casos";
        } else {
            siguiente.textContent = "Siguiente caso";
        }

        actualizarProgreso();
    }

    function iniciarDetective() {
        const siguiente = elemento("alSiguienteCaso");

        if (siguiente) {
            siguiente.addEventListener("click", () => {
                if (!estado.casosResueltos.includes(estado.casoActual)) {
                    return;
                }

                if (estado.casoActual >= casos.length - 1) {
                    completarActividad("detective");
                    mostrarTexto(
                        "alFeedbackDetective",
                        "¡Investigación finalizada! Revisá tus puntos e insignias."
                    );
                    siguiente.disabled = true;
                    siguiente.textContent = "Investigación completada";
                    return;
                }

                estado.casoActual += 1;
                guardarEstado();
                renderizarCaso();
            });
        }

        renderizarCaso();

        if (estado.completadas.detective && siguiente) {
            siguiente.disabled = true;
            siguiente.textContent = "Investigación completada";
        }
    }

    /* =========================================
       5. MISIONES E INSIGNIAS
       ========================================= */

    function renderizarMisiones() {
        const contenedor = elemento("alListaMisiones");

        if (!contenedor) return;

        contenedor.replaceChildren();

        actividades.forEach(actividad => {
            const completada = Boolean(estado.completadas[actividad.id]);

            const fila = document.createElement("div");
            fila.className = "al-mision" +
                (completada ? " completada" : "");

            const icono = document.createElement("span");
            icono.className = "al-mision-icono";
            icono.textContent = actividad.icono;

            const texto = document.createElement("div");
            texto.className = "al-mision-texto";

            const titulo = document.createElement("strong");
            titulo.textContent = actividad.nombre;

            const descripcion = document.createElement("small");
            descripcion.textContent = completada
                ? "Actividad completada. Recompensa obtenida."
                : "Completá la actividad para ganar 20 puntos XP.";

            texto.append(titulo, descripcion);

            const estadoMision = document.createElement("span");
            estadoMision.className = "al-mision-estado";
            estadoMision.textContent = completada ? "✓ Completada" : "+20 XP";

            fila.append(icono, texto, estadoMision);
            contenedor.appendChild(fila);
        });
    }

    function renderizarInsignias() {
        const contenedor = elemento("alListaInsignias");

        if (!contenedor) return;

        contenedor.replaceChildren();

        insigniasDisponibles.forEach(insignia => {
            const desbloqueada = estado.insignias.includes(insignia.id);

            const tarjeta = document.createElement("div");
            tarjeta.className = "al-insignia" +
                (desbloqueada ? " desbloqueada" : "");

            const icono = document.createElement("span");
            icono.textContent = insignia.icono;

            const titulo = document.createElement("strong");
            titulo.textContent = insignia.nombre;

            const descripcion = document.createElement("small");
            descripcion.textContent = desbloqueada
                ? "¡Insignia desbloqueada!"
                : insignia.descripcion;

            tarjeta.append(icono, titulo, descripcion);
            contenedor.appendChild(tarjeta);
        });
    }

    function iniciarMisiones() {
        actualizarProgreso();
    }

    /* =========================================
       INICIALIZACIÓN
       ========================================= */

    function iniciarNuevasActividades() {
        // Si no se insertó el HTML nuevo, no hacemos nada.
        if (!elemento("nuevasActividades")) return;

        iniciarAtomos();
        iniciarDensidad();
        iniciarMoleculas();
        iniciarDetective();
        iniciarMisiones();

        // Restaurar el estado visual de los botones completados.
        const botones = {
            atomos: "alCompletarAtomo",
            densidad: "alCompletarDensidad",
            moleculas: "alCompletarMolecula"
        };

        Object.entries(botones).forEach(([id, botonId]) => {
            const boton = elemento(botonId);

            if (boton && estado.completadas[id]) {
                boton.textContent = "✓ Actividad completada";
                boton.disabled = true;
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            iniciarNuevasActividades
        );
    } else {
        iniciarNuevasActividades();
    }
})();
