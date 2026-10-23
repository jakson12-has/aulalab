"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const token = sessionStorage.getItem("aulalab_token");
  let usuario = null;

  try {
    usuario = JSON.parse(sessionStorage.getItem("aulalab_usuario") || "null");
  } catch {
    usuario = null;
  }

  if (!token || !usuario || !usuario.rol) {
    window.location.replace("login.html");
    return;
  }

  const rol = String(usuario.rol).toLowerCase();

  if (rol !== "teacher") {
    const destinos = {
      platform_admin: "admin-global.html",
      institution_admin: "admin-institucion.html",
      student: "inicio.html",
      sin_institucion: "inicio.html"
    };

    window.location.replace(destinos[rol] || "inicio.html");
    return;
  }

  const nombre = String(usuario.first_name || "").trim();
  document.getElementById("nombreDocente").textContent = nombre || "docente";

  const botonMenu = document.getElementById("btnMenuDocente");
  const menu = document.getElementById("menuDocente");
  const overlay = document.getElementById("fondoMenu");
  const botonSalir = document.getElementById("btnCerrarSesion");

  function abrirMenu(abrir) {
    menu.classList.toggle("is-open", abrir);
    overlay.hidden = !abrir;
    botonMenu.setAttribute("aria-expanded", String(abrir));
    botonMenu.setAttribute("aria-label", abrir ? "Cerrar menú" : "Abrir menú");
    document.body.classList.toggle("menu-open", abrir);
  }

  botonMenu.addEventListener("click", () => {
    abrirMenu(!menu.classList.contains("is-open"));
  });

  overlay.addEventListener("click", () => abrirMenu(false));

  menu.querySelectorAll("a").forEach((enlace) => {
    enlace.addEventListener("click", () => abrirMenu(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") abrirMenu(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) abrirMenu(false);
  });


  // Seguimiento del laboratorio de química.
  const estadoProgresoQuimica =
    document.getElementById("estadoProgresoQuimicaDocente");
  const listaProgresoQuimica =
    document.getElementById("listaProgresoQuimicaDocente");
  const botonActualizarProgreso =
    document.getElementById("btnActualizarProgresoQuimica");

  async function cargarProgresoQuimicaDocente() {
    if (!estadoProgresoQuimica || !listaProgresoQuimica) return;

    const apiBase = window.AULALAB_CONFIG?.API_BASE;
    if (!apiBase) {
      estadoProgresoQuimica.textContent =
        "No se encontró la configuración de la API.";
      return;
    }

    estadoProgresoQuimica.textContent = "Consultando progreso...";
    listaProgresoQuimica.replaceChildren();

    try {
      const respuesta = await fetch(
        `${apiBase}/api/docente/progreso/actividades/quimica`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok || datos.ok !== true) {
        throw new Error(datos.mensaje || "No se pudo consultar el progreso.");
      }

      const estudiantes = Array.isArray(datos.estudiantes)
        ? datos.estudiantes : [];

      if (!estudiantes.length) {
        estadoProgresoQuimica.textContent =
          "Todavía no hay estudiantes aprobados vinculados a tu institución.";
        return;
      }

      estadoProgresoQuimica.textContent =
        `Estudiantes encontrados: ${estudiantes.length}.`;

      for (const estudiante of estudiantes) {
        const porcentaje = Math.max(
          0, Math.min(100, Number(estudiante.porcentaje) || 0)
        );
        const tarjeta = document.createElement("article");
        tarjeta.className = "teacher-progress-card";

        const cabecera = document.createElement("div");
        cabecera.className = "teacher-progress-card-header";

        const identidad = document.createElement("div");
        const nombre = document.createElement("h3");
        nombre.textContent =
          `${estudiante.first_name || ""} ${estudiante.last_name || ""}`.trim()
          || "Estudiante";

        const codigo = document.createElement("p");
        codigo.textContent =
          `Código: ${estudiante.student_code || "No disponible"}`;

        identidad.append(nombre, codigo);

        const numero = document.createElement("strong");
        numero.className = "teacher-progress-percent";
        numero.textContent = `${porcentaje}%`;

        cabecera.append(identidad, numero);

        const pista = document.createElement("div");
        pista.className = "teacher-progress-track";
        pista.setAttribute("role", "progressbar");
        pista.setAttribute("aria-label", `Progreso de ${nombre.textContent}`);
        pista.setAttribute("aria-valuemin", "0");
        pista.setAttribute("aria-valuemax", "100");
        pista.setAttribute("aria-valuenow", String(porcentaje));

        const barra = document.createElement("div");
        barra.className = "teacher-progress-bar";
        barra.style.width = `${porcentaje}%`;
        pista.appendChild(barra);

        const detalle = document.createElement("p");
        detalle.className = "teacher-progress-detail";
        detalle.textContent = estudiante.institution_name
          ? `Institución: ${estudiante.institution_name}`
          : "Laboratorio de química";

        tarjeta.append(cabecera, pista, detalle);
        listaProgresoQuimica.appendChild(tarjeta);
      }
    } catch (error) {
      estadoProgresoQuimica.textContent =
        error.message || "No se pudo cargar el progreso.";
    }
  }

  botonActualizarProgreso?.addEventListener(
    "click", cargarProgresoQuimicaDocente
  );
  cargarProgresoQuimicaDocente();

  // Notificaciones personales del docente autenticado.
  const panelNotificaciones = document.getElementById("listaNotificaciones");
  const estadoNotificaciones = document.getElementById("estadoNotificaciones");
  const contadorNotificaciones = document.getElementById("contadorNotificaciones");
  const botonActualizarNotificaciones =
    document.getElementById("btnActualizarNotificaciones");

  async function cargarNotificacionesDocente() {
    if (!panelNotificaciones || !estadoNotificaciones) return;

    const apiBase = window.AULALAB_CONFIG?.API_BASE;
    if (!apiBase) {
      estadoNotificaciones.textContent =
        "No se encontró la configuración de la API.";
      return;
    }

    estadoNotificaciones.textContent = "Consultando notificaciones...";
    panelNotificaciones.replaceChildren();

    try {
      const respuesta = await fetch(`${apiBase}/api/notificaciones`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok || datos.ok !== true) {
        throw new Error(datos.mensaje || "No se pudieron consultar los avisos.");
      }

      const notificaciones = Array.isArray(datos.notificaciones)
        ? datos.notificaciones : [];

      const noLeidas = notificaciones.filter(
        n => Number(n.is_read) === 0
      ).length;

      if (contadorNotificaciones) {
        contadorNotificaciones.textContent = String(noLeidas);
        contadorNotificaciones.setAttribute(
          "aria-label", `${noLeidas} notificaciones sin leer`
        );
      }

      if (notificaciones.length === 0) {
        estadoNotificaciones.textContent =
          "Todavía no tenés notificaciones.";
        return;
      }

      estadoNotificaciones.textContent = "";

      for (const notificacion of notificaciones) {
        const tarjeta = document.createElement("article");
        tarjeta.className = "notification-item";
        if (Number(notificacion.is_read) === 0) {
          tarjeta.classList.add("notification-unread");
        }

        const contenido = document.createElement("div");
        contenido.className = "notification-content";

        const titulo = document.createElement("h3");
        titulo.textContent = notificacion.title || "Notificación";

        const mensaje = document.createElement("p");
        mensaje.textContent = notificacion.message || "";

        const fecha = document.createElement("small");
        if (notificacion.created_at) {
          const fechaObj = new Date(
            String(notificacion.created_at).replace(" ", "T")
          );
          fecha.textContent = Number.isNaN(fechaObj.getTime())
            ? String(notificacion.created_at)
            : fechaObj.toLocaleString("es-SV");
        }

        contenido.append(titulo, mensaje, fecha);
        tarjeta.appendChild(contenido);

        if (Number(notificacion.is_read) === 0) {
          const botonLeida = document.createElement("button");
          botonLeida.type = "button";
          botonLeida.className = "notification-read-button";
          botonLeida.textContent = "Marcar como leída";

          botonLeida.addEventListener("click", async () => {
            botonLeida.disabled = true;

            try {
              const resultado = await fetch(
                `${apiBase}/api/notificaciones/${encodeURIComponent(notificacion.id)}/leida`,
                {
                  method: "PATCH",
                  headers: { Authorization: `Bearer ${token}` }
                }
              );

              const respuestaDatos = await resultado.json().catch(() => ({}));

              if (!resultado.ok || respuestaDatos.ok !== true) {
                throw new Error(
                  respuestaDatos.mensaje || "No se pudo marcar como leída."
                );
              }

              await cargarNotificacionesDocente();
            } catch (error) {
              alert(error.message || "Error al actualizar la notificación.");
              botonLeida.disabled = false;
            }
          });

          tarjeta.appendChild(botonLeida);
        } else {
          const leida = document.createElement("span");
          leida.className = "notification-read-label";
          leida.textContent = "Leída";
          tarjeta.appendChild(leida);
        }

        panelNotificaciones.appendChild(tarjeta);
      }
    } catch (error) {
      estadoNotificaciones.textContent =
        error.message || "No se pudieron cargar las notificaciones.";
    }
  }

  botonActualizarNotificaciones?.addEventListener(
    "click", cargarNotificacionesDocente
  );

  cargarNotificacionesDocente();

  botonSalir.addEventListener("click", () => {
    sessionStorage.removeItem("aulalab_token");
    sessionStorage.removeItem("aulalab_usuario");
    window.location.replace("login.html");
  });
});
