"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const lateral = document.getElementById("barraLateral");
    const botonMenu = document.getElementById("btnMenuMovil");
    const fondoMenu = document.getElementById("fondoMenuMovil");
    const botonSalir = document.getElementById("btnCerrarSesion");

    function cerrarMenu() {
        lateral?.classList.remove("menu-abierto");
        fondoMenu?.classList.remove("visible");
        botonMenu?.setAttribute("aria-expanded", "false");
    }

    botonMenu?.addEventListener("click", () => {
        const abierto = lateral?.classList.toggle("menu-abierto");
        fondoMenu?.classList.toggle("visible", Boolean(abierto));
        botonMenu.setAttribute("aria-expanded", String(Boolean(abierto)));
    });

    fondoMenu?.addEventListener("click", cerrarMenu);

    document.querySelectorAll(".panel-laboratorio .elemento-menu")
        .forEach(enlace => {
            enlace.addEventListener("click", cerrarMenu);
        });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") cerrarMenu();
    });

    botonSalir?.addEventListener("click", () => {
        sessionStorage.removeItem("aulalab_token");
        sessionStorage.removeItem("aulalab_usuario");
        window.location.href = "../../../login.html";
    });

    let usuario = null;

    try {
        usuario = JSON.parse(
            sessionStorage.getItem("aulalab_usuario") || "null"
        );
    } catch (error) {
        console.warn("No se pudo leer el usuario guardado.", error);
    }

    const nombre = [
        usuario?.first_name,
        usuario?.last_name
    ].filter(Boolean).join(" ").trim() || "Estudiante";

    const avatar = Array.from(nombre)[0]?.toUpperCase() || "E";

    const nombreElemento = document.getElementById("nombreCorto");
    const avatarElemento = document.getElementById("avatarEstudiante");

    if (nombreElemento) nombreElemento.textContent = nombre;
    if (avatarElemento) avatarElemento.textContent = avatar;
});
