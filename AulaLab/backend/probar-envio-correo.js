require("dotenv").config({ path: __dirname + "/.env" });

const nodemailer = require("nodemailer");
const destinatario = process.argv[2];

if (!destinatario || !destinatario.includes("@")) {
    console.error(
        "Uso: node probar-envio-correo.js TU_CORREO_DE_PRUEBA"
    );
    process.exit(1);
}

const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

transporte.sendMail({
    from: process.env.SMTP_FROM,
    to: destinatario,
    subject: "Prueba de correo de AulaLab",
    text: "¡Hola! Este es un correo de prueba del sistema AulaLab. La conexión de correo está funcionando."
}).then(() => {
    console.log("Correo de prueba enviado correctamente.");
}).catch(error => {
    console.error("No se pudo enviar el correo:", error.code || error.message);
    process.exitCode = 1;
});
