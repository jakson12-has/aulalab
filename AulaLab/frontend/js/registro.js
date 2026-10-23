"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formRegistro");
    const mensaje = document.getElementById("mensaje");
    const boton = document.getElementById("btnRegistro");

    if (!form || !mensaje || !boton) return;

    function mostrarMensaje(texto, tipo) {
        mensaje.textContent = texto;
        mensaje.className = `mensaje visible ${tipo}`;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const firstName =
            document.getElementById("first_name").value.trim();

        const lastName =
            document.getElementById("last_name").value.trim();

        const email =
            document.getElementById("email").value.trim().toLowerCase();

        const password =
            document.getElementById("password").value;

        const confirmPassword =
            document.getElementById("confirm_password").value;

        if (!firstName || !lastName || !email || !password) {
            mostrarMensaje("Completá todos los campos.", "error");
            return;
        }

        if (password.length < 8 || password.length > 72) {
            mostrarMensaje(
                "La contraseña debe tener entre 8 y 72 caracteres.",
                "error"
            );
            return;
        }

        if (password !== confirmPassword) {
            mostrarMensaje(
                "Las contraseñas no coinciden.",
                "error"
            );
            return;
        }

        boton.disabled = true;
        boton.textContent = "Creando cuenta…";

        try {
            const config = window.AULALAB_CONFIG;

            if (!config) {
                throw new Error("No se cargó la configuración de AulaLab.");
            }

            const respuesta = await fetch(
                `${config.API_BASE}${config.ENDPOINTS.REGISTRO}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        first_name: firstName,
                        last_name: lastName,
                        email,
                        password,
                        tipo_usuario: "teacher"
                    })
                }
            );

            const datos = await respuesta.json().catch(() => ({}));

            if (!respuesta.ok || datos.ok !== true) {
                throw new Error(
                    datos.mensaje || "No se pudo crear la cuenta."
                );
            }

            form.reset();
            mostrarMensaje(
                "¡Tu cuenta docente fue creada! Ahora podés iniciar sesión.",
                "exito"
            );

            window.setTimeout(() => {
                window.location.href = "login.html";
            }, 1400);

        } catch (error) {
            mostrarMensaje(
                error.message ||
                "No se pudo conectar con AulaLab. Intentá nuevamente.",
                "error"
            );
        } finally {
            boton.disabled = false;
            boton.textContent = "Crear mi cuenta";
        }
    });
});
