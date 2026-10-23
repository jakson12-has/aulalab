"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const config = window.AULALAB_CONFIG;

    const token = sessionStorage.getItem("aulalab_token");

    const saludo = document.getElementById("saludo");
    const mensajeEstado = document.getElementById("mensajeEstado");
    const botonSalir = document.getElementById("btnCerrarSesion");

    const nombreCorto = document.getElementById("nombreCorto");
    const nombrePerfil = document.getElementById("nombrePerfil");
    const correoPerfil = document.getElementById("correoPerfil");
    const nombreInstitucion = document.getElementById("nombreInstitucion");

    const avatarEstudiante = document.getElementById("avatarEstudiante");
    const avatarPerfil = document.getElementById("avatarPerfil");

    const barraLateral = document.getElementById("barraLateral");
    const btnMenuMovil = document.getElementById("btnMenuMovil");
    const fondoMenuMovil = document.getElementById("fondoMenuMovil");

    const modal = document.getElementById("modalLaboratorio");
    const tituloModal = document.getElementById("tituloModal");
    const descripcionModal = document.getElementById("descripcionModal");
    const iconoModal = document.getElementById("iconoModal");

    function cerrarSesion() {
        sessionStorage.removeItem("aulalab_token");
        sessionStorage.removeItem("aulalab_usuario");
        window.location.replace("login.html");
    }

    function mostrarEstado(texto, tipo = "info") {
        if (!mensajeEstado) return;

        mensajeEstado.textContent = texto;
        mensajeEstado.className = `mensaje-panel ${tipo}`;
        mensajeEstado.hidden = false;
    }

    function ocultarEstado() {
        if (mensajeEstado) {
            mensajeEstado.hidden = true;
        }
    }

    function abrirMenuMovil() {
        barraLateral.classList.add("menu-abierto");
        fondoMenuMovil.classList.add("visible");
        btnMenuMovil.setAttribute("aria-expanded", "true");
    }

    function cerrarMenuMovil() {
        barraLateral.classList.remove("menu-abierto");
        fondoMenuMovil.classList.remove("visible");
        btnMenuMovil.setAttribute("aria-expanded", "false");
    }

    function abrirModal(tipo) {
        const laboratorios = {
            electronica: {
                titulo: "Laboratorio de Electrónica",
                url: "public/laboratorios/electronica/electronica.html",
                icono: "⚡",
                descripcion:
                    "Un espacio dedicado al aprendizaje de circuitos, " +
                    "componentes electrónicos y fundamentos de electricidad."
            },
            quimica: {
                titulo: "Laboratorio de Química",
                url: "public/laboratorios/quimica/laboratorio-quimica.html",
                icono: "⚗",
                descripcion:
                    "Un espacio dedicado al estudio de la materia, " +
                    "las sustancias, sus propiedades y los conceptos químicos."
            }
        };

        const laboratorio = laboratorios[tipo];

        if (!laboratorio || !modal) return;

        tituloModal.textContent = laboratorio.titulo;
        descripcionModal.textContent = laboratorio.descripcion;
        iconoModal.textContent = laboratorio.icono;
        modal.dataset.url = laboratorio.url;

        modal.hidden = false;
        document.body.classList.add("modal-abierto");

        document.getElementById("aceptarModal").focus();
    }

    function cerrarModal() {
        if (!modal) return;

        modal.hidden = true;
        document.body.classList.remove("modal-abierto");
    }

    if (botonSalir) {
        botonSalir.addEventListener("click", cerrarSesion);
    }

    if (btnMenuMovil) {
        btnMenuMovil.addEventListener("click", () => {
            const abierto = barraLateral.classList.contains("menu-abierto");

            if (abierto) {
                cerrarMenuMovil();
            } else {
                abrirMenuMovil();
            }
        });
    }

    if (fondoMenuMovil) {
        fondoMenuMovil.addEventListener("click", cerrarMenuMovil);
    }

    document.querySelectorAll(".elemento-menu").forEach(enlace => {
        enlace.addEventListener("click", () => {
            document.querySelectorAll(".elemento-menu").forEach(item => {
                item.classList.remove("activo");
            });

            enlace.classList.add("activo");
            cerrarMenuMovil();
        });
    });

    document.querySelectorAll("[data-laboratorio]").forEach(boton => {
        boton.addEventListener("click", () => {
            abrirModal(boton.dataset.laboratorio);
        });
    });

    document.getElementById("cerrarModal")?.addEventListener(
        "click",
        cerrarModal
    );

    document.getElementById("aceptarModal")?.addEventListener(
        "click",
        () => {
            const destino = modal?.dataset.url;

            if (destino) {
                window.location.href = destino;
            } else {
                cerrarModal();
            }
        }
    );

    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                cerrarModal();
            }
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            cerrarModal();
            cerrarMenuMovil();
        }
    });

    if (!token || !config) {
        cerrarSesion();
        return;
    }

    try {
        const respuesta = await fetch(
            `${config.API_BASE}${config.ENDPOINTS.ME}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok || datos.ok !== true || !datos.usuario) {
            cerrarSesion();
            return;
        }

        const usuario = datos.usuario;
        const rol = String(usuario.rol || "").toLowerCase();

        if (rol !== "student") {
            if (rol === "teacher") {
                window.location.replace("docente.html");
            } else if (rol === "platform_admin") {
                window.location.replace("admin-global.html");
            } else if (rol === "institution_admin") {
                window.location.replace("admin-institucion.html");
            } else {
                cerrarSesion();
            }

            return;
        }

        const nombreCompleto = [
            usuario.first_name,
            usuario.last_name
        ].filter(Boolean).join(" ").trim();

        const nombre = nombreCompleto || "Estudiante";
        const inicial = Array.from(nombre)[0].toUpperCase();

        saludo.textContent = `¡Hola, ${nombre}!`;
        nombreCorto.textContent = nombre;
        nombrePerfil.textContent = nombre;
        correoPerfil.textContent = usuario.email || "Cuenta de estudiante";

        avatarEstudiante.textContent = inicial;
        avatarPerfil.textContent = inicial;

        const instituciones = Array.isArray(datos.instituciones)
            ? datos.instituciones
            : [];

        nombreInstitucion.textContent = instituciones.length
            ? instituciones.map(item => item.name).filter(Boolean).join(", ")
            : "Sin institución asignada";

        ocultarEstado();

        sessionStorage.setItem(
            "aulalab_usuario",
            JSON.stringify(usuario)
        );

    } catch (error) {
        console.error("Error al cargar el panel estudiantil:", error);

        mostrarEstado(
            "No se pudo conectar con AulaLab. Revisá tu conexión y recargá la página.",
            "error"
        );
    }
});
