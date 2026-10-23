
const path = require("path");
const fs = require("fs");

require("dotenv").config({
  path: path.join(__dirname, ".env")
});

const mysql = require("mysql2/promise");

async function crearTablas() {
  let conexion;

  try {
    const archivoSQL = path.join(__dirname, "schema.sql");
    const rutaCA = path.join(
      __dirname,
      "certificados",
      "ca.pem"
    );

    if (!fs.existsSync(archivoSQL)) {
      throw new Error("No se encontró schema.sql");
    }

    if (!fs.existsSync(rutaCA)) {
      throw new Error("No se encontró el certificado CA");
    }

    const sql = fs.readFileSync(archivoSQL, "utf8");
    const certificadoCA = fs.readFileSync(rutaCA);

    conexion = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      connectTimeout: 15000,
      ssl: {
        ca: certificadoCA,
        rejectUnauthorized: true
      },
      multipleStatements: true
    });

    console.log("Conexión segura con MySQL establecida.");

    await conexion.query(sql);

    console.log("Script SQL ejecutado correctamente.");

    const [tablas] = await conexion.query("SHOW TABLES");

    console.log("Total de tablas:", tablas.length);

    for (const tabla of tablas) {
      console.log(Object.values(tabla)[0]);
    }
  } catch (error) {
    console.error("No se pudieron preparar las tablas.");
    console.error("Código:", error.code || "DESCONOCIDO");
    console.error("Mensaje:", error.message);
  } finally {
    if (conexion) {
      await conexion.end();
    }
  }
}

crearTablas();
