require("dotenv").config({ path: __dirname + "/.env" });

const nodemailer = require("nodemailer");

const requeridas = [
    "SMTP_USER",
    "SMTP_PASS"
];

const faltantes = requeridas.filter(
    nombre => !process.env[nombre]
);

if (faltantes.length) {
    console.error("Faltan variables SMTP_USER o SMTP_PASS en backend/.env");
    process.exit(1);
}

const transporte = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

transporte.verify()
    .then(() => {
        console.log("Conexión SMTP verificada correctamente.");
    })
    .catch(error => {
        console.error(
            "No se pudo verificar SMTP:",
            error.code || error.message
        );
        process.exitCode = 1;
    });
