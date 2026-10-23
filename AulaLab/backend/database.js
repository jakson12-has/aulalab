
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

// Cargar las variables del archivo .env de backend
dotenv.config({
    path: path.join(__dirname, ".env")
});

// Certificado de la conexión segura con Aiven
const caPath = path.join(
    __dirname,
    "certificados",
    "ca.pem"
);

if (!fs.existsSync(caPath)) {
    throw new Error(
        "No se encontró el certificado SSL: " + caPath
    );
}

const ca = fs.readFileSync(caPath, "utf8");

// Crear el pool de conexiones de AulaLab
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || "aulalab",
    port: Number(process.env.MYSQL_PORT),

    ssl: {
        ca,
        rejectUnauthorized: true
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
