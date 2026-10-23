
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const config = window.AULALAB_CONFIG;

    const formulario = document.getElementById("formActivar");
    const campoNIE = document.getElementById("nie");
    const campoCodigo = document.getElementById("code");
    const campoPassword = document.getElementById("password");
    const campoConfirmacion = document.getElementById("confirmarPassword");
    const mensaje = document.getElementById("mensaje");
    const boton = document.getElementById("btnActivar");

    if (
        !config ||
        !formulario ||
        !campoNIE ||
        !campoCodigo ||
        !campoPassword ||
        !campoConfirmacion ||
        !mensaje ||
        !boton
    ) {
        console.error("No se pudo cargar el formulario de activación de AulaLab.");
        return;
    }

    function mostrarMensaje(texto, tipo = "info") {
        mensaje.textContent = texto;
        mensaje.dataset.tipo = tipo;
        mensaje.setAttribute(
            "role",
            tipo === "error" ? "alert" : "status"
        );
    }

    function limpiarMensaje() {
        mensaje.textContent = "";
        delete mensaje.dataset.tipo;
    }

    campoNIE.addEventListener("input", () => {
        campoNIE.value = campoNIE.value.trim().toUpperCase();
    });

    campoCodigo.addEventListener("input", () => {
        campoCodigo.value = campoCodigo.value
            .replace(/[^a-fA-F0-9]/g, "")
            .toUpperCase()
            .slice(0, 10);
    });

    formulario.addEventListener("reset", limpiarMensaje);

    formulario.addEventListener("submit", async event => {
        event.preventDefault();
        limpiarMensaje();

        const nie = campoNIE.value.trim().toUpperCase();
        const code = campoCodigo.value.trim().toUpperCase();
        const password = campoPassword.value;
        const confirmarPassword = campoConfirmacion.value;

        if (!nie || nie.length > 30) {
            mostrarMensaje(
                "Ingresá un NIE válido.",
                "error"
            );
            campoNIE.focus();
            return;
        }

        if (!/^[A-F0-9]{10}$/.test(code)) {
            mostrarMensaje(
                "El código debe tener exactamente 10 caracteres hexadecimales.",
                "error"
            );
            campoCodigo.focus();
            return;
        }

        const bytesPassword = new TextEncoder().encode(password).length;

        if (bytesPassword < 10 || bytesPassword > 72) {
            mostrarMensaje(
                "La contraseña debe tener entre 10 y 72 bytes.",
                "error"
            );
            campoPassword.focus();
            return;
        }

        if (password !== confirmarPassword) {
            mostrarMensaje(
                "Las contraseñas no coinciden. Verificalas.",
                "error"
            );
            campoConfirmacion.focus();
            return;
        }

        const textoOriginal = boton.textContent;
        boton.disabled = true;
        boton.textContent = "Activando cuenta…";

        try {
            const respuesta = await fetch(
                `${config.API_BASE}${config.ENDPOINTS.ACTIVAR_ESTUDIANTE}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        nie,
                        code,
                        password
                    })
                }
            );

            const resultado = await respuesta.json().catch(() => ({}));

            if (!respuesta.ok || resultado.ok === false) {
                throw new Error(
                    resultado.mensaje ||
                    "No se pudo activar la cuenta. Revisá los datos e intentá de nuevo."
                );
            }

            mostrarMensaje(
                (resultado.mensaje || "Tu cuenta fue activada correctamente.") +
                " Ya podés iniciar sesión con tu NIE y tu nueva contraseña.",
                "success"
            );

            formulario.reset();

            // Después de activar, se ofrece el acceso al inicio de sesión.
            const enlaceLogin = document.createElement("a");
            enlaceLogin.href = "login.html";
            enlaceLogin.textContent = "Ir a iniciar sesión";
            enlaceLogin.className = "boton-principal";
            enlaceLogin.style.display = "block";
            enlaceLogin.style.textAlign = "center";
            enlaceLogin.style.textDecoration = "none";
            enlaceLogin.style.marginTop = "16px";

            if (!formulario.querySelector(".enlace-login-exito")) {
                enlaceLogin.classList.add("enlace-login-exito");
                formulario.appendChild(enlaceLogin);
            }

            boton.hidden = true;
        } catch (error) {
            mostrarMensaje(
                error.message || "No se pudo conectar con AulaLab.",
                "error"
            );
        } finally {
            boton.disabled = false;

            if (!boton.hidden) {
                boton.textContent = textoOriginal;
            }
        }
    });
});
