
require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./database");
const readline = require("readline/promises");

async function crearAdministrador() {
    const terminal = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        console.log("\n=== CREAR ADMINISTRADOR GLOBAL DE AULALAB ===\n");

        const email = (
            await terminal.question("Correo del administrador: ")
        ).trim().toLowerCase();

        const password = await terminal.question(
            "Contraseña (mínimo 12 caracteres): "
        );

        const nombre = (
            await terminal.question("Nombre: ")
        ).trim();

        const apellido = (
            await terminal.question("Apellido: ")
        ).trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("El correo no tiene un formato válido.");
        }

        if (password.length < 12 || password.length > 72) {
            throw new Error(
                "La contraseña debe tener entre 12 y 72 caracteres."
            );
        }

        if (!nombre || !apellido) {
            throw new Error("Ingresá el nombre y el apellido.");
        }

        const [roles] = await db.execute(
            "SELECT id FROM roles WHERE name = 'platform_admin' LIMIT 1"
        );

        if (roles.length === 0) {
            throw new Error(
                "No existe platform_admin en la tabla roles."
            );
        }

        const [administradores] = await db.execute(
            `SELECT id, email
             FROM users
             WHERE global_role_id = ?
             LIMIT 1`,
            [roles[0].id]
        );

        if (administradores.length > 0) {
            throw new Error(
                "Ya existe una cuenta con rol de administrador global. " +
                "Revisá los administradores actuales antes de crear otra."
            );
        }

        const [usuarios] = await db.execute(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (usuarios.length > 0) {
            throw new Error(
                "Ese correo ya pertenece a una cuenta. No se modificó."
            );
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const [resultado] = await db.execute(
            `INSERT INTO users
             (
                email,
                password_hash,
                first_name,
                last_name,
                is_active,
                global_role_id,
                created_at,
                updated_at
             )
             VALUES (?, ?, ?, ?, 1, ?, NOW(), NOW())`,
            [
                email,
                passwordHash,
                nombre,
                apellido,
                roles[0].id
            ]
        );

        console.log("\nAdministrador global creado correctamente.");
        console.log("ID:", resultado.insertId);
        console.log("Correo:", email);
        console.log("Rol: platform_admin");
        console.log("Contraseña: no se muestra por seguridad.");
    } catch (error) {
        console.error("\nNo se pudo crear la cuenta:", error.message);
    } finally {
        terminal.close();
        await db.end();
    }
}

crearAdministrador();
