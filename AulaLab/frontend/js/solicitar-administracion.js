"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const token = sessionStorage.getItem("aulalab_token");
  const config = window.AULALAB_CONFIG;
  const $ = id => document.getElementById(id);

  if (!token) {
    window.location.replace("login.html");
    return;
  }

  if (!config || !config.API_BASE) {
    alert("No se cargó la configuración de AulaLab.");
    return;
  }

  const api = config.API_BASE;

  $("btnCerrarSesion")?.addEventListener("click", () => {
    sessionStorage.removeItem("aulalab_token");
    sessionStorage.removeItem("aulalab_usuario");
    window.location.replace("login.html");
  });

  function mensaje(elemento, texto, tipo = "info") {
    if (!elemento) return;
    elemento.textContent = texto;
    elemento.className = `mensaje visible ${tipo}`;
  }

  async function solicitud(ruta, opciones = {}) {
    const respuesta = await fetch(`${api}${ruta}`, {
      ...opciones,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opciones.body ? { "Content-Type": "application/json" } : {}),
        ...(opciones.headers || {})
      }
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok || datos.ok === false) {
      throw new Error(datos.mensaje || `Error HTTP ${respuesta.status}`);
    }

    return datos;
  }

  const estados = {
    pending: {
      titulo: "Pendiente de revisión",
      explicacion: "El administrador global todavía no ha tomado una decisión.",
      icono: "⏳"
    },
    approved: {
      titulo: "Solicitud aprobada",
      explicacion: "Tu solicitud fue aceptada.",
      icono: "✅"
    },
    rejected: {
      titulo: "Solicitud rechazada",
      explicacion: "Tu solicitud no fue aprobada. Revisá el motivo si aparece abajo.",
      icono: "❌"
    },
    none: {
      titulo: "Sin solicitudes",
      explicacion: "Todavía no has enviado esta solicitud.",
      icono: "ℹ️"
    }
  };

  function textoEstado(valor) {
    return estados[String(valor || "none").toLowerCase()] ||
      { titulo: String(valor || "Estado desconocido"), explicacion: "", icono: "ℹ️" };
  }

  function fechaTexto(fecha) {
    if (!fecha) return "";
    const fechaValida = new Date(fecha);
    return Number.isNaN(fechaValida.getTime())
      ? ""
      : fechaValida.toLocaleString("es-SV");
  }

  function crearTarjeta(contenedor, fila, tituloGrupo) {
    const estado = textoEstado(fila.status);
    const tarjeta = document.createElement("article");
    tarjeta.className = "item-solicitud";

    const titulo = document.createElement("h3");
    titulo.textContent =
      fila.institution_name ||
      fila.institutionName ||
      fila.institution_id && `Institución ID ${fila.institution_id}` ||
      fila.name ||
      tituloGrupo;

    const estadoElemento = document.createElement("p");
    estadoElemento.className =
      `estado estado-${String(fila.status || "none").toLowerCase()}`;
    estadoElemento.textContent = `${estado.icono} ${estado.titulo}`;

    const explicacion = document.createElement("p");
    explicacion.textContent = estado.explicacion;

    const detalle = document.createElement("p");
    detalle.textContent = [
      fila.justificacion || fila.justification || "",
      fila.rejection_reason ? `Motivo del rechazo: ${fila.rejection_reason}` : "",
      fechaTexto(fila.created_at) ? `Enviada: ${fechaTexto(fila.created_at)}` : "",
      fechaTexto(fila.reviewed_at) ? `Revisada: ${fechaTexto(fila.reviewed_at)}` : ""
    ].filter(Boolean).join(" · ");

    tarjeta.append(titulo, estadoElemento, explicacion);
    if (detalle.textContent) tarjeta.appendChild(detalle);
    contenedor.appendChild(tarjeta);
  }

  function extraerFilas(datos) {
    if (Array.isArray(datos)) return datos;

    if (datos && datos.solicitud) {
      return [datos.solicitud];
    }

    for (const valor of Object.values(datos || {})) {
      if (Array.isArray(valor)) return valor;
    }

    if (datos && datos.status && datos.status !== "none") {
      return [datos];
    }

    return [];
  }

  async function cargarMisSolicitudes() {
    const contenedor = $("listaMisSolicitudes");
    if (!contenedor) return;

    contenedor.textContent = "Actualizando tus solicitudes…";

    const rutas = [
      ["/api/admin-access-requests/mine", "Permiso de administrador global"],
      ["/api/administrator-requests/mine", "Administración de institución"],
      ["/api/institution-requests/mine", "Registro de institución nueva"]
    ];

    contenedor.replaceChildren();

    for (const [ruta, titulo] of rutas) {
      const grupo = document.createElement("section");
      grupo.className = "grupo-solicitudes";

      const encabezado = document.createElement("h3");
      encabezado.textContent = titulo;
      grupo.appendChild(encabezado);

      try {
        const datos = await solicitud(ruta);
        const filas = extraerFilas(datos);

        if (filas.length) {
          filas.forEach(fila => crearTarjeta(grupo, fila, titulo));
        } else {
          const tarjeta = document.createElement("article");
          tarjeta.className = "item-solicitud";

          const estado = textoEstado("none");
          const encabezadoEstado = document.createElement("p");
          encabezadoEstado.textContent = `${estado.icono} ${estado.titulo}`;

          const descripcion = document.createElement("p");
          descripcion.textContent = estado.explicacion;

          tarjeta.append(encabezadoEstado, descripcion);
          grupo.appendChild(tarjeta);
        }
      } catch (error) {
        const errorTexto = document.createElement("p");
        errorTexto.textContent = `No se pudo consultar el estado: ${error.message}`;
        grupo.appendChild(errorTexto);
      }

      contenedor.appendChild(grupo);
    }

    const actualizado = document.createElement("p");
    actualizado.className = "texto-ayuda";
    actualizado.textContent =
      `Última actualización: ${new Date().toLocaleTimeString("es-SV")}`;
    contenedor.appendChild(actualizado);
  }

  async function enviarFormulario(formulario, ruta, obtenerDatos, resultado) {
    if (!formulario) return;

    formulario.addEventListener("submit", async evento => {
      evento.preventDefault();

      const boton = formulario.querySelector('button[type="submit"]');
      const textoOriginal = boton?.textContent;

      if (boton) {
        boton.disabled = true;
        boton.textContent = "Enviando…";
      }

      try {
        const datos = obtenerDatos();

        await solicitud(ruta, {
          method: "POST",
          body: JSON.stringify(datos)
        });

        mensaje(
          resultado,
          "Solicitud enviada correctamente. Podés consultar el resultado en «Mis solicitudes».",
          "exito"
        );

        formulario.reset();
        await cargarMisSolicitudes();
      } catch (error) {
        mensaje(resultado, error.message || "No se pudo enviar la solicitud.", "error");
      } finally {
        if (boton) {
          boton.disabled = false;
          boton.textContent = textoOriginal;
        }
      }
    });
  }

  enviarFormulario(
    $("formAccesoAdmin"),
    "/api/admin-access-requests",
    () => ({ justification: $("justificacionAcceso").value.trim() }),
    $("estadoAcceso")
  );

  enviarFormulario(
    $("formAdminInstitucion"),
    "/api/administrator-requests",
    () => {
      const id = Number($("idInstitucion").value);

      if (!Number.isInteger(id) || id < 1) {
        throw new Error("Primero seleccioná una institución válida.");
      }

      return {
        institution_id: id,
        justificacion: $("justificacionInstitucion").value.trim()
      };
    },
    $("estadoAdminInstitucion")
  );

  enviarFormulario(
    $("formNuevaInstitucion"),
    "/api/institution-requests",
    () => ({
      institution_name: $("nombreInstitucion").value.trim(),
      institution_code: $("codigoInstitucion").value.trim(),
      institution_email: $("correoInstitucion").value.trim(),
      institution_phone: $("telefonoInstitucion").value.trim(),
      institution_address: $("direccionInstitucion").value.trim(),
      logo_url: $("logoInstitucion").value.trim()
    }),
    $("estadoNuevaInstitucion")
  );

  $("btnActualizar")?.addEventListener("click", cargarMisSolicitudes);
  cargarMisSolicitudes();

  // Actualiza los estados mientras la página permanezca abierta.
  setInterval(cargarMisSolicitudes, 30000);
});
