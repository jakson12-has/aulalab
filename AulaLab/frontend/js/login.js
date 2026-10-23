"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formLogin");
    const mensaje = document.getElementById("mensaje");
    const boton = document.getElementById("btnLogin");

    if (!form || !mensaje || !boton) return;

    function mostrarMensaje(texto, tipo = "error") {
        mensaje.textContent = texto;
        mensaje.className = `mensaje visible ${tipo}`;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email =
            document.getElementById("email").value.trim().toLowerCase();

        const password =
            document.getElementById("password").value;

        if (!email || !password) {
            mostrarMensaje("Ingresá tu correo y contraseña.");
            return;
        }

        boton.disabled = true;
        boton.textContent = "Verificando…";

        try {
            const config = window.AULALAB_CONFIG;

            if (!config) {
                throw new Error("No se cargó la configuración de AulaLab.");
            }

            const respuesta = await fetch(
                `${config.API_BASE}${config.ENDPOINTS.LOGIN}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password })
                }
            );

            const datos = await respuesta.json().catch(() => ({}));

            if (!respuesta.ok || datos.ok !== true || !datos.token) {
                throw new Error(
                    datos.mensaje || "No se pudo iniciar sesión."
                );
            }

            if (!datos.usuario || !datos.usuario.rol) {
                throw new Error(
                    "El servidor no devolvió el rol de la cuenta."
                );
            }

            // Guardamos la sesión en esta pestaña del navegador.
            sessionStorage.setItem("aulalab_token", datos.token);
            sessionStorage.setItem(
                "aulalab_usuario",
                JSON.stringify(datos.usuario)
            );

            const rol = String(datos.usuario.rol).toLowerCase();

            if (rol === "platform_admin") {
                window.location.href = "admin-global.html";
            } else if (rol === "teacher") {
                window.location.href = "docente.html";
            } else if (rol === "institution_admin") {
                window.location.href = "admin-institucion.html";
            } else {
                window.location.href = "inicio.html";
            }

        } catch (error) {
            mostrarMensaje(
                error.message ||
                "No se pudo conectar con el servidor."
            );
        } finally {
            boton.disabled = false;
            boton.textContent = "Iniciar sesión";
        }
    });
});
