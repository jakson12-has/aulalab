
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const config = window.AULALAB_CONFIG;

  const formIndividual = document.getElementById("formEstudiante");
  const formExcel = document.getElementById("formExcel");
  const mensajeIndividual = document.getElementById("mensajeIndividual");
  const mensajeExcel = document.getElementById("mensajeExcel");
  const archivoExcel = document.getElementById("archivoExcel");
  const nombreArchivo = document.getElementById("nombreArchivo");

  if (
    !config ||
    !formIndividual ||
    !formExcel ||
    !mensajeIndividual ||
    !mensajeExcel
  ) {
    console.error("No se encontró la configuración o el formulario de AulaLab.");
    return;
  }

  const token = sessionStorage.getItem("aulalab_token");

  let usuario = null;

  try {
    usuario = JSON.parse(
      sessionStorage.getItem("aulalab_usuario") || "null"
    );
  } catch {
    usuario = null;
  }

  if (!token || !usuario || !usuario.rol) {
    window.location.href = "inicio.html";
    return;
  }

  const rol = String(usuario.rol).toLowerCase();

  if (!["teacher", "institution_admin"].includes(rol)) {
    alert("Esta sección está disponible para docentes y administradores institucionales.");
    window.location.href = "inicio.html";
    return;
  }

  // --------------------------------------------------
  // MENSAJES
  // --------------------------------------------------

  function mostrarMensaje(elemento, texto, tipo = "info") {
    const clasesMensaje = ["info", "exito", "error"];

    elemento.textContent = texto;

    elemento.classList.add("visible");
    elemento.classList.remove(...clasesMensaje);

    const claseTipo = tipo === "success" ? "exito" : tipo;
    elemento.classList.add(
      clasesMensaje.includes(claseTipo) ? claseTipo : "info"
    );

    elemento.dataset.tipo = claseTipo;
    elemento.setAttribute(
      "role",
      claseTipo === "error" ? "alert" : "status"
    );
  }

  function limpiarMensaje(elemento) {
    elemento.textContent = "";
    elemento.classList.remove("visible", "info", "exito", "error");
    delete elemento.dataset.tipo;
  }

  // --------------------------------------------------
  // PETICIONES AUTENTICADAS
  // --------------------------------------------------

  async function solicitar(ruta, opciones = {}) {
    const headers = new Headers(opciones.headers || {});

    headers.set("Authorization", `Bearer ${token}`);

    const respuesta = await fetch(
      `${config.API_BASE}${ruta}`,
      {
        ...opciones,
        headers
      }
    );

    const contenido = await respuesta.json().catch(() => ({}));

    if (respuesta.status === 401) {
      sessionStorage.removeItem("aulalab_token");
      sessionStorage.removeItem("aulalab_usuario");
      window.location.href = "inicio.html";
      throw new Error("Tu sesión venció. Iniciá sesión nuevamente.");
    }

    if (!respuesta.ok || contenido.ok === false) {
      let mensaje = contenido.mensaje || "No se pudo completar la operación.";

      if (Array.isArray(contenido.errores)) {
        const detalles = contenido.errores
          .map(fila => {
            const errores = Array.isArray(fila.errores)
              ? fila.errores.join(" ")
              : "";

            return `Fila ${fila.fila || "?"}: ${errores}`;
          })
          .join("\n");

        if (detalles) {
          mensaje += "\n" + detalles;
        }
      }

      if (Array.isArray(contenido.duplicados)) {
        mensaje += "\nNIE duplicados: " + contenido.duplicados.join(", ");
      }

      throw new Error(mensaje);
    }

    return contenido;
  }

  // --------------------------------------------------
  // SELECTOR DE INSTITUCIÓN
  // --------------------------------------------------

  function crearSelectorInstitucion(formulario, id) {
    let selector = formulario.querySelector('[name="institution_id"]');

    if (selector) return selector;

    const etiqueta = document.createElement("label");
    etiqueta.textContent = "Institución donde se inscribirán los estudiantes *";

    selector = document.createElement("select");
    selector.id = id;
    selector.name = "institution_id";
    selector.required = true;
    selector.disabled = true;

    const opcion = document.createElement("option");
    opcion.value = "";
    opcion.textContent = "Cargando instituciones…";
    selector.appendChild(opcion);

    etiqueta.appendChild(selector);
    formulario.insertBefore(etiqueta, formulario.firstChild);

    return selector;
  }

  const selectorIndividual = crearSelectorInstitucion(
    formIndividual,
    "institucionIndividual"
  );

  const selectorExcel = crearSelectorInstitucion(
    formExcel,
    "institucionExcel"
  );

  // --------------------------------------------------
  // CARGAR INSTITUCIONES AUTORIZADAS
  // --------------------------------------------------

  async function cargarInstituciones() {
    selectorIndividual.disabled = true;
    selectorExcel.disabled = true;

    try {
      const datos = await solicitar(config.ENDPOINTS.MIS_INSTITUCIONES);

      const instituciones = Array.isArray(datos.instituciones)
        ? datos.instituciones
        : [];

      for (const selector of [selectorIndividual, selectorExcel]) {
        selector.replaceChildren();

        const inicial = document.createElement("option");
        inicial.value = "";
        inicial.textContent = instituciones.length
          ? "Seleccioná una institución"
          : "No hay instituciones disponibles";

        selector.appendChild(inicial);

        for (const institucion of instituciones) {
          const opcion = document.createElement("option");
          opcion.value = String(institucion.id);
          opcion.textContent = institucion.name;
          selector.appendChild(opcion);
        }

        selector.disabled = instituciones.length === 0;
      }

      if (instituciones.length === 0) {
        mostrarMensaje(
          mensajeIndividual,
          "Tu cuenta no tiene acceso a instituciones activas para inscribir estudiantes. Contactá al administrador.",
          "error"
        );
      }
    } catch (error) {
      selectorIndividual.replaceChildren();
      selectorExcel.replaceChildren();

      for (const selector of [selectorIndividual, selectorExcel]) {
        const opcion = document.createElement("option");
        opcion.value = "";
        opcion.textContent = "No se pudieron cargar las instituciones";
        selector.appendChild(opcion);
        selector.disabled = true;
      }

      mostrarMensaje(
        mensajeIndividual,
        error.message || "No se pudieron cargar las instituciones.",
        "error"
      );
    }
  }

  // --------------------------------------------------
  // PESTAÑAS
  // --------------------------------------------------

  const tabIndividual = document.getElementById("tabIndividual");
  const tabExcel = document.getElementById("tabExcel");
  const panelIndividual = document.getElementById("panelIndividual");
  const panelExcel = document.getElementById("panelExcel");

  function cambiarPestana(excel) {
    panelIndividual.hidden = excel;
    panelExcel.hidden = !excel;

    tabIndividual.classList.toggle("active", !excel);
    tabExcel.classList.toggle("active", excel);

    tabIndividual.setAttribute("aria-selected", String(!excel));
    tabExcel.setAttribute("aria-selected", String(excel));
  }

  tabIndividual.addEventListener("click", () => cambiarPestana(false));
  tabExcel.addEventListener("click", () => cambiarPestana(true));

  // --------------------------------------------------
  // VALIDACIÓN BÁSICA DEL FORMULARIO INDIVIDUAL
  // --------------------------------------------------

  const fechaNacimiento = formIndividual.elements.namedItem("birth_date");

  if (fechaNacimiento) {
    const hoy = new Date();

    fechaNacimiento.max = [
      hoy.getFullYear(),
      String(hoy.getMonth() + 1).padStart(2, "0"),
      String(hoy.getDate()).padStart(2, "0")
    ].join("-");
  }

  function validarFormularioIndividual() {
    if (!formIndividual.reportValidity()) return false;

    if (!selectorIndividual.value) {
      mostrarMensaje(
        mensajeIndividual,
        "Seleccioná la institución antes de continuar.",
        "error"
      );
      selectorIndividual.focus();
      return false;
    }

    const fecha = fechaNacimiento.value;

    if (fecha && fecha > fechaNacimiento.max) {
      mostrarMensaje(
        mensajeIndividual,
        "La fecha de nacimiento no puede ser futura.",
        "error"
      );
      return false;
    }

    return true;
  }

  // --------------------------------------------------
  // INSCRIPCIÓN INDIVIDUAL REAL
  // --------------------------------------------------

  formIndividual.addEventListener("submit", async event => {
    event.preventDefault();
    limpiarMensaje(mensajeIndividual);

    if (!validarFormularioIndividual()) return;

    const boton = formIndividual.querySelector('[type="submit"]');

    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Guardando inscripción…";

    try {
      const datosFormulario = new FormData(formIndividual);
      const datos = Object.fromEntries(datosFormulario.entries());

      datos.institution_id = Number(datos.institution_id);

      mostrarMensaje(
        mensajeIndividual,
        "Enviando los datos al servidor para su validación…",
        "info"
      );

      const resultado = await solicitar(
        config.ENDPOINTS.INSCRIBIR_ESTUDIANTE,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(datos)
        }
      );

      const estudiantes = Array.isArray(resultado.estudiantes)
        ? resultado.estudiantes
        : [];

      let mensaje =
        resultado.mensaje ||
        "La inscripción se guardó correctamente.";

      if (estudiantes.length) {
        mensaje += "\n\nDatos para entregar al estudiante:";

        for (const estudiante of estudiantes) {
          mensaje +=
            `\nNombre: ${estudiante.nombre}` +
            `\nNIE: ${estudiante.nie}` +
            `\nCódigo de activación: ${estudiante.codigo_activacion}\n`;
        }

        mensaje +=
          "\nEntregá el código de forma privada. No lo publiques ni lo compartás con otras personas.";
      }

      // Limpiar los campos antes de mostrar el resultado.
// El evento reset borra los mensajes, por eso lo hacemos primero.
formIndividual.reset();

// Mostrar el resultado después de limpiar el formulario.
mostrarMensaje(
  mensajeIndividual,
  mensaje,
  "success"
);
mostrarMensaje(
  mensajeIndividual,
  mensaje,
  "success"
);

    } catch (error) {
      mostrarMensaje(
        mensajeIndividual,
        error.message || "No se pudo guardar la inscripción.",
        "error"
      );
    } finally {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  });

  formIndividual.addEventListener("reset", () => {
    limpiarMensaje(mensajeIndividual);
  });

  // --------------------------------------------------
  // VALIDACIÓN DEL ARCHIVO EXCEL
  // --------------------------------------------------

  archivoExcel.addEventListener("change", () => {
    const seleccionado = archivoExcel.files[0];
    limpiarMensaje(mensajeExcel);

    if (!seleccionado) {
      nombreArchivo.textContent = "Ningún archivo seleccionado.";
      return;
    }

    if (!seleccionado.name.toLowerCase().endsWith(".xlsx")) {
      archivoExcel.value = "";
      nombreArchivo.textContent = "Elegí un archivo .xlsx.";
      mostrarMensaje(
        mensajeExcel,
        "El formato del archivo no es válido.",
        "error"
      );
      return;
    }

    if (seleccionado.size > 5 * 1024 * 1024) {
      archivoExcel.value = "";
      nombreArchivo.textContent = "Ningún archivo seleccionado.";
      mostrarMensaje(
        mensajeExcel,
        "El archivo supera el límite de 5 MB.",
        "error"
      );
      return;
    }

    nombreArchivo.textContent = `Archivo seleccionado: ${seleccionado.name}`;
  });

  // --------------------------------------------------
  // IMPORTACIÓN REAL DESDE EXCEL
  // --------------------------------------------------

  formExcel.addEventListener("submit", async event => {
    event.preventDefault();
    limpiarMensaje(mensajeExcel);

    if (!selectorExcel.value) {
      mostrarMensaje(
        mensajeExcel,
        "Seleccioná la institución donde se inscribirán los estudiantes.",
        "error"
      );
      selectorExcel.focus();
      return;
    }

    const archivo = archivoExcel.files[0];

    if (!archivo) {
      mostrarMensaje(
        mensajeExcel,
        "Seleccioná un archivo Excel antes de continuar.",
        "error"
      );
      return;
    }

    if (!archivo.name.toLowerCase().endsWith(".xlsx")) {
      mostrarMensaje(mensajeExcel, "El archivo debe ser .xlsx.", "error");
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      mostrarMensaje(mensajeExcel, "El archivo supera los 5 MB.", "error");
      return;
    }

    const boton = formExcel.querySelector('[type="submit"]');
    const textoOriginal = boton.textContent;

    boton.disabled = true;
    boton.textContent = "Validando e importando…";

    try {
      const datos = new FormData();

      datos.append("institution_id", selectorExcel.value);
      datos.append("archivoExcel", archivo);

      mostrarMensaje(
        mensajeExcel,
        "Enviando el archivo al servidor. Se validarán las filas antes de guardar.",
        "info"
      );

      // No se establece Content-Type manualmente:
      // el navegador debe incluir el límite multipart/form-data.
      const resultado = await solicitar(
        config.ENDPOINTS.IMPORTAR_ESTUDIANTES,
        {
          method: "POST",
          body: datos
        }
      );

      const estudiantes = Array.isArray(resultado.estudiantes)
        ? resultado.estudiantes
        : [];

      let mensaje =
        resultado.mensaje ||
        `Importación completada: ${resultado.total || estudiantes.length} estudiantes.`;

      if (estudiantes.length) {
        mensaje += "\n\nCódigos de activación para entregar en privado:";

        for (const estudiante of estudiantes) {
          mensaje +=
            `\n${estudiante.nombre} | NIE: ${estudiante.nie}` +
            ` | Código: ${estudiante.codigo_activacion}`;
        }
      }

      mostrarMensaje(mensajeExcel, mensaje, "success");

      formExcel.reset();
      nombreArchivo.textContent = "Ningún archivo seleccionado.";

    } catch (error) {
      mostrarMensaje(
        mensajeExcel,
        error.message || "No se pudo importar el archivo.",
        "error"
      );
    } finally {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  });

  // Cargar las instituciones autorizadas al entrar a la página.
  cargarInstituciones();
});
