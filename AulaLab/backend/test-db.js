const db = require("./database");

async function probarConexion() {
    try {
        const [result] = await db.query("SELECT DATABASE() AS database_name");

        console.log("=================================");
        console.log("   AULALAB - PRUEBA DE MYSQL");
        console.log("=================================");

        console.log("✅ Conexión exitosa");
        console.log("📁 Base de datos:", result[0].database_name);

        process.exit(0);

    } catch (error) {

        console.error("❌ Error al conectar con MySQL");
        console.error(error.message);

        process.exit(1);
    }
}

probarConexion();