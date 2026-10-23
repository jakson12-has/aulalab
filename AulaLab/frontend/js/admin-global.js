
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const token = sessionStorage.getItem("aulalab_token");
  const config = window.AULALAB_CONFIG;

  if (!token) {
    window.location.replace("login.html");
    return;
  }

  if (!config || !config.API_BASE) {
    alert("No se cargó la configuración de AulaLab.");
    return;
  }

  const api = config.API_BASE;
  const $ = id => document.getElementById(id);

  $("btnCerrarSesion")?.addEventListener("click", () => {
    sessionStorage.removeItem("aulalab_token");
    sessionStorage.removeItem("aulalab_usuario");
    window.location.replace("login.html");
  });

  function avisar(texto, tipo = "info") {
    const elemento = $("mensajeAdmin");

    if (!elemento) {
      console.error("No existe el elemento HTML #mensajeAdmin.");
      return;
    }

    elemento.textContent = texto;
    elemento.className = `mensaje visible ${tipo}`;
  }

  async function solicitud(ruta, opciones = {}) {
    let respuesta;

    try {
      respuesta = await fetch(`${api}${ruta}`, {
        ...opciones,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(opciones.body
            ? { "Content-Type": "application/json" }
            : {}),
          ...(opciones.headers || {})
        }
      });
    } catch (error) {
      throw new Error(
        `No se pudo conectar con el servidor (${ruta}). ` +
        "Revisá la conexión y la dirección de la API."
      );
    }

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok || datos.ok === false) {
      throw new Error(
        datos.mensaje ||
        `Error HTTP ${respuesta.status} en ${ruta}`
      );
    }

    return datos;
  }

  function encontrarLista(datos) {
    if (Array.isArray(datos)) {
      return datos;
    }

    if (datos && typeof datos === "object") {
      const clavesPreferidas = [
        "solicitudes",
        "instituciones",
        "usuarios",
        "estudiantes",
        "administradores",
        "filas",
        "data"
      ];

      for (const clave of clavesPreferidas) {
        if (Array.isArray(datos[clave])) {
          return datos[clave];
        }
      }

      for (const valor of Object.values(datos)) {
        if (Array.isArray(valor)) {
          return valor;
        }
      }
    }

    return [];
  }

  function textoSeguro(valor) {
    return valor === null ||
      valor === undefined ||
      valor === ""
      ? "No indicado"
      : String(valor);
  }

  function obtenerEstado(fila) {
    return String(
      fila.status ||
      fila.approval_status ||
      "pending"
    ).toLowerCase();
  }

  function estadoBonito(valor) {
    return ({
      pending: "Pendiente",
      approved: "Aprobada",
      rejected: "Rechazada"
    })[String(valor || "").toLowerCase()] || textoSeguro(valor);
  }

  function agregarDato(contenedor, etiqueta, valor) {
    const p = document.createElement("p");
    const strong = document.createElement("strong");

    strong.textContent = `${etiqueta}: `;
    p.append(
      strong,
      document.createTextNode(textoSeguro(valor))
    );

    contenedor.appendChild(p);
  }

  function crearTarjeta(fila, tipo) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "item-solicitud";

    const titulo = document.createElement("h3");

    titulo.textContent =
      fila.institution_name ||
      fila.institution_name_request ||
      fila.name ||
      fila.requester_name ||
      fila.full_name ||
      [fila.first_name, fila.last_name]
        .filter(Boolean)
        .join(" ") ||
      `Solicitud #${fila.id ?? "?"}`;

    const estadoActual = obtenerEstado(fila);
    const estado = document.createElement("span");

    estado.className = `estado estado-${estadoActual}`;
    estado.textContent = estadoBonito(estadoActual);

    tarjeta.append(titulo, estado);

    const nombre = [
      fila.first_name,
      fila.last_name
    ].filter(Boolean).join(" ");

    if (nombre && nombre !== titulo.textContent) {
      agregarDato(tarjeta, "Nombre", nombre);
    }

    if (fila.email || fila.requester_email) {
      agregarDato(
        tarjeta,
        "Correo",
        fila.email || fila.requester_email
      );
    }

    if (fila.institution_name) {
      agregarDato(
        tarjeta,
        "Institución",
        fila.institution_name
      );
    }

    if (fila.institution_email) {
      agregarDato(
        tarjeta,
        "Correo institucional",
        fila.institution_email
      );
    }

    if (fila.institution_code) {
      agregarDato(
        tarjeta,
        "Código institucional",
        fila.institution_code
      );
    }

    if (fila.institution_id) {
      agregarDato(
        tarjeta,
        "ID de institución",
        fila.institution_id
      );
    }

    if (fila.student_nie) {
      agregarDato(tarjeta, "NIE", fila.student_nie);
    }

    if (fila.student_code) {
      agregarDato(
        tarjeta,
        "Código estudiantil",
        fila.student_code
      );
    }

    if (fila.grade_level) {
      agregarDato(tarjeta, "Grado", fila.grade_level);
    }

    if (fila.section) {
      agregarDato(tarjeta, "Sección", fila.section);
    }

    if (
      fila.global_role_id !== null &&
      fila.global_role_id !== undefined
    ) {
      const roles = {
        1: "Estudiante",
        2: "Docente",
        3: "Administrador institucional",
        4: "Administrador global"
      };

      agregarDato(
        tarjeta,
        "Tipo de cuenta",
        roles[Number(fila.global_role_id)] ||
          fila.global_role_id
      );
    }

    if (fila.institution_address) {
      agregarDato(
        tarjeta,
        "Dirección",
        fila.institution_address
      );
    }

    if (fila.justification || fila.justificacion) {
      agregarDato(
        tarjeta,
        "Justificación",
        fila.justification || fila.justificacion
      );
    }

    if (fila.created_at) {
      const fecha = new Date(fila.created_at);

      agregarDato(
        tarjeta,
        "Fecha",
        Number.isNaN(fecha.getTime())
          ? fila.created_at
          : fecha.toLocaleString("es-SV")
      );
    }

    if (fila.rejection_reason) {
      agregarDato(
        tarjeta,
        "Motivo de rechazo",
        fila.rejection_reason
      );
    }

    if (tipo === "instituciones") {
      if (fila.code) {
        agregarDato(tarjeta, "Código", fila.code);
      }

      if (fila.email) {
        agregarDato(tarjeta, "Correo", fila.email);
      }

      if (fila.total_usuarios !== undefined) {
        agregarDato(
          tarjeta,
          "Usuarios registrados",
          fila.total_usuarios
        );
      }

      return tarjeta;
    }

    if (estadoActual !== "pending") {
      return tarjeta;
    }

    const rutas = {
      accesos: {
        aprobar: id =>
          `/api/admin/admin-access-requests/${id}/approve`,
        rechazar: id =>
          `/api/admin/admin-access-requests/${id}/reject`
      },

      administradores: {
        aprobar: id =>
          `/api/admin/administrator-requests/${id}/approve`,
        rechazar: id =>
          `/api/admin/administrator-requests/${id}/reject`
      },

      nuevasInstituciones: {
        aprobar: id =>
          `/api/admin/institution-requests/${id}/approve`,
        rechazar: id =>
          `/api/admin/institution-requests/${id}/reject`
      },

      usuarios: {
        aprobar: id =>
          `/api/admin/user-requests/${id}/approve`,
        rechazar: id =>
          `/api/admin/user-requests/${id}/reject`
      },

      estudiantes: {
        aprobar: id =>
          `/api/admin/student-requests/${id}/approve`,
        rechazar: id =>
          `/api/admin/student-requests/${id}/reject`
      }
    };

    if (!rutas[tipo]) {
      console.error(
        "Tipo de solicitud no reconocido:",
        tipo
      );
      return tarjeta;
    }

    const acciones = document.createElement("div");
    acciones.className = "acciones-solicitud";

    const aprobar = document.createElement("button");
    aprobar.type = "button";
    aprobar.className = "boton-aprobar";
    aprobar.textContent = "Aprobar";

    const rechazar = document.createElement("button");
    rechazar.type = "button";
    rechazar.className = "boton-rechazar";
    rechazar.textContent = "Rechazar";

    aprobar.addEventListener("click", async () => {
      if (
        !confirm(
          "¿Confirmás que querés aprobar esta solicitud?"
        )
      ) {
        return;
      }

      aprobar.disabled = true;
      rechazar.disabled = true;

      try {
        const datos = await solicitud(
          rutas[tipo].aprobar(fila.id),
          {
            method: "POST",
            body: JSON.stringify({})
          }
        );

        avisar(
          datos.mensaje ||
            "Solicitud aprobada correctamente.",
          "exito"
        );

        await cargarTodo();
      } catch (error) {
        avisar(
          `No se pudo aprobar: ${error.message}`,
          "error"
        );

        aprobar.disabled = false;
        rechazar.disabled = false;
      }
    });

    rechazar.addEventListener("click", async () => {
      const motivo = prompt(
        "Escribí el motivo del rechazo:"
      );

      if (motivo === null) {
        return;
      }

      if (motivo.trim().length < 5) {
        avisar(
          "El motivo debe tener al menos 5 caracteres.",
          "error"
        );
        return;
      }

      aprobar.disabled = true;
      rechazar.disabled = true;

      try {
        const datos = await solicitud(
          rutas[tipo].rechazar(fila.id),
          {
            method: "POST",
            body: JSON.stringify({
              rejection_reason: motivo.trim()
            })
          }
        );

        avisar(
          datos.mensaje ||
            "Solicitud rechazada correctamente.",
          "exito"
        );

        await cargarTodo();
      } catch (error) {
        avisar(
          `No se pudo rechazar: ${error.message}`,
          "error"
        );

        aprobar.disabled = false;
        rechazar.disabled = false;
      }
    });

    acciones.append(aprobar, rechazar);
    tarjeta.appendChild(acciones);

    return tarjeta;
  }

  function pintar(contenedor, filas, tipo) {
    if (!contenedor) {
      return;
    }

    contenedor.replaceChildren();

    if (!filas.length) {
      const vacio = document.createElement("p");
      vacio.className = "vacio";
      vacio.textContent = tipo === "instituciones"
        ? "Todavía no hay instituciones registradas."
        : "No hay solicitudes pendientes.";

      contenedor.appendChild(vacio);
      return;
    }

    filas.forEach(fila => {
      contenedor.appendChild(
        crearTarjeta(fila, tipo)
      );
    });
  }

  async function cargarLista(
    ruta,
    contenedorId,
    tipo,
    contadorId
  ) {
    const contenedor = $(contenedorId);

    if (!contenedor) {
      throw new Error(
        `No existe el elemento HTML #${contenedorId}.`
      );
    }

    try {
      const datos = await solicitud(ruta);
      const filas = encontrarLista(datos);

      pintar(contenedor, filas, tipo);

      if (contadorId && $(contadorId)) {
        const pendientes = filas.filter(
          fila => obtenerEstado(fila) === "pending"
        ).length;

        $(contadorId).textContent = pendientes;
      }

      return filas;
    } catch (error) {
      contenedor.textContent = error.message;
      throw error;
    }
  }

  async function cargarTodo() {
    const secciones = [
      {
        nombre: "Solicitudes de acceso",
        cargar: () => cargarLista(
          "/api/admin/admin-access-requests",
          "listaAccesos",
          "accesos",
          "totalAccesos"
        )
      },
      {
        nombre: "Solicitudes de administradores",
        cargar: () => cargarLista(
          "/api/admin/administrator-requests",
          "listaAdministradores",
          "administradores",
          "totalAdministradores"
        )
      },
      {
        nombre: "Solicitudes de instituciones",
        cargar: () => cargarLista(
          "/api/admin/institution-requests",
          "listaInstitucionesPendientes",
          "nuevasInstituciones",
          "totalInstitucionesPendientes"
        )
      },
      {
        nombre: "Instituciones registradas",
        cargar: () => cargarLista(
          "/api/admin/institutions",
          "listaInstituciones",
          "instituciones",
          "totalInstituciones"
        )
      },
      {
        nombre: "Usuarios pendientes",
        cargar: () => cargarLista(
          "/api/admin/user-requests",
          "listaUsuariosPendientes",
          "usuarios",
          "totalUsuariosPendientes"
        )
      },
      {
        nombre: "Estudiantes pendientes",
        cargar: () => cargarLista(
          "/api/admin/student-requests",
          "listaEstudiantesPendientes",
          "estudiantes",
          "totalEstudiantesPendientes"
        )
      }
    ];

    const resultados = await Promise.allSettled(
      secciones.map(seccion => seccion.cargar())
    );

    const errores = resultados
      .map((resultado, indice) => ({
        resultado,
        nombre: secciones[indice].nombre
      }))
      .filter(
        item => item.resultado.status === "rejected"
      );

    if (errores.length > 0) {
      const detalle = errores
        .map(item => {
          const motivo = item.resultado.reason;

          const mensaje =
            motivo && motivo.message
              ? motivo.message
              : "Error desconocido";

          return `${item.nombre}: ${mensaje}`;
        })
        .join(" | ");

      avisar(
        `No se pudieron cargar todas las secciones. ${detalle}`,
        "error"
      );

      console.error(
        "Errores al cargar el panel global:",
        errores
      );

      return;
    }

    avisar(
      "Panel actualizado correctamente.",
      "exito"
    );
  }

  document
    .querySelectorAll("[data-actualizar]")
    .forEach(boton => {
      boton.addEventListener("click", cargarTodo);
    });

  cargarTodo();
});
