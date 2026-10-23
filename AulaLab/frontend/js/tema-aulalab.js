"use strict";

(() => {
    const CLAVE_TEMA = "aulalab-tema";

    function aplicarTema(tema) {
        const claro = tema === "claro";

        document.documentElement.dataset.tema = claro ? "claro" : "oscuro";
        document.documentElement.style.colorScheme = claro ? "light" : "dark";

        document.querySelectorAll("[data-cambiar-tema]").forEach((boton) => {
            boton.textContent = claro ? "🌙 Modo oscuro" : "☀️ Modo claro";
            boton.setAttribute(
                "aria-label",
                claro ? "Cambiar a modo oscuro" : "Cambiar a modo claro"
            );
            boton.setAttribute("aria-pressed", String(claro));
        });
    }

    let temaGuardado = "oscuro";

    try {
        temaGuardado = localStorage.getItem(CLAVE_TEMA) || "oscuro";
    } catch (error) {
        temaGuardado = "oscuro";
    }

    aplicarTema(temaGuardado);

    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll("[data-cambiar-tema]").forEach((boton) => {
            boton.addEventListener("click", () => {
                const siguiente =
                    document.documentElement.dataset.tema === "claro"
                        ? "oscuro"
                        : "claro";

                aplicarTema(siguiente);

                try {
                    localStorage.setItem(CLAVE_TEMA, siguiente);
                } catch (error) {
                    // El cambio sigue funcionando durante esta visita.
                }
            });
        });
    });
})();
