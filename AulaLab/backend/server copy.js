
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./database");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error(
        "Configurá JWT_SECRET en .env con una clave aleatoria de al menos 32 caracteres."
    );
}

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// =====================================================
// UTILIDADES
// =====================================================

function crearToken(usuario) {
    return jwt.sign(
        {
            id: usuario.id,
            email: usuario.email,
            rol: usuario.rol
        },
        JWT_SECRET,
        { expiresIn: "8h" }
    );
}

function verificarToken(req, res, next) {
    const autorizacion = req.headers.authorization || "";
    const partes = autorizacion.split(" ");

    if (partes.length !== 2 || partes[0] !== "Bearer") {
        return res.status(401).json({
            ok: false,
            mensaje: "Iniciá sesión para continuar."
        });
    }

    try {
        req.usuario = jwt.verify(partes[1], JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({
            ok: false,
            mensaje: "Tu sesión venció o el token no es válido."
        });
    }
}

function verificarPlatformAdmin(req, res, next) {
    if (req.usuario.rol !== "platform_admin") {
        return res.status(403).json({
            ok: false,
            mensaje: "Esta acción requiere permisos de administrador global."
        });
    }

    next();
}

function manejarError(res, error, contexto) {
    console.error(`${contexto}:`, error.message);

    return res.status(500).json({
        ok: false,
        mensaje: "Ocurrió un error interno. Revisá la consola del servidor."
    });
}

// =====================================================
// ESTADO DEL SERVIDOR
// =====================================================

app.get("/", (req, res) => {
    res.json({
        ok: true,
        mensaje: "AulaLab API funcionando correctamente"
    });
});

app.get("/api/estado", async (req, res) => {
    try {
        await db.query("SELECT 1");

        res.json({
            ok: true,
            servidor: "funcionando",
            base_datos: "conectada"
        });
    } catch (error) {
        manejarError(res, error, "Comprobando la base de datos");
    }
});

// =====================================================
// REGISTRO
// =====================================================

app.post("/api/registro", async (req, res) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        const password = String(req.body.password || "");
        const firstName = String(req.body.first_name || "").trim();
        const lastName = String(req.body.last_name || "").trim();
        const avatarUrl = req.body.avatar_url || null;
        const tipoUsuario = String(
            req.body.tipo_usuario || "student"
        ).trim();

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                ok: false,
                mensaje: "Completá correo, contraseña, nombre y apellido."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                ok: false,
                mensaje: "El correo electrónico no tiene un formato válido."
            });
        }

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                ok: false,
                mensaje: "La contraseña debe tener entre 8 y 72 caracteres."
            });
        }

        if (!["student", "teacher"].includes(tipoUsuario)) {
            return res.status(400).json({
                ok: false,
                mensaje: "El tipo de usuario seleccionado no está permitido."
            });
        }

        const [existentes] = await db.execute(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                ok: false,
                mensaje: "Ese correo ya está registrado."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const globalRoleId = tipoUsuario === "teacher" ? 2 : 1;

        const [resultado] = await db.execute(
            `INSERT INTO users
                (email, password_hash, first_name, last_name,
                 avatar_url, is_active, global_role_id,
                 created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
            [
                email,
                passwordHash,
                firstName,
                lastName,
                avatarUrl,
                globalRoleId
            ]
        );

        return res.status(201).json({
            ok: true,
            mensaje: "Tu cuenta fue creada correctamente.",
            usuario: {
                id: resultado.insertId,
                email,
                first_name: firstName,
                last_name: lastName,
                rol: tipoUsuario
            }
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                ok: false,
                mensaje: "Ese correo ya está registrado."
            });
        }

        return manejarError(res, error, "Registrando usuario");
    }
});

// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        const password = String(req.body.password || "");

        if (!email || !password) {
            return res.status(400).json({
                ok: false,
                mensaje: "Ingresá tu correo y contraseña."
            });
        }

        const [usuarios] = await db.execute(
            `SELECT
                u.id,
                u.email,
                u.password_hash,
                u.first_name,
                u.last_name,
                u.avatar_url,
                u.is_active,
                u.global_role_id,
                r.name AS role_name
             FROM users u
             LEFT JOIN roles r ON r.id = u.global_role_id
             WHERE u.email = ?
             LIMIT 1`,
            [email]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                ok: false,
                mensaje: "Correo o contraseña incorrectos."
            });
        }

        const usuario = usuarios[0];

        if (Number(usuario.is_active) !== 1) {
            return res.status(403).json({
                ok: false,
                mensaje: "Tu cuenta está desactivada."
            });
        }

        const coincide = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!coincide) {
            return res.status(401).json({
                ok: false,
                mensaje: "Correo o contraseña incorrectos."
            });
        }

        let rol = usuario.role_name;

        if (!rol) {
            const [membresias] = await db.execute(
                `SELECT r.name AS role_name
                 FROM institution_users iu
                 INNER JOIN roles r ON r.id = iu.role_id
                 INNER JOIN institutions i ON i.id = iu.institution_id
                 WHERE iu.user_id = ?
                   AND iu.is_active = 1
                   AND i.is_active = 1
                 ORDER BY
                    CASE r.name
                        WHEN 'institution_admin' THEN 1
                        WHEN 'teacher' THEN 2
                        ELSE 3
                    END
                 LIMIT 1`,
                [usuario.id]
            );

            rol = membresias[0]?.role_name || "sin_institucion";
        }

        await db.execute(
            "UPDATE users SET last_login = NOW() WHERE id = ?",
            [usuario.id]
        );

        const token = crearToken({
            id: usuario.id,
            email: usuario.email,
            rol
        });

        return res.json({
            ok: true,
            mensaje: "Inicio de sesión correcto.",
            token,
            usuario: {
                id: usuario.id,
                email: usuario.email,
                first_name: usuario.first_name,
                last_name: usuario.last_name,
                avatar_url: usuario.avatar_url,
                rol
            }
        });
    } catch (error) {
        return manejarError(res, error, "Iniciando sesión");
    }
});

// =====================================================
// PERFIL DEL USUARIO
// =====================================================

app.get("/api/me", verificarToken, async (req, res) => {
    try {
        const [usuarios] = await db.execute(
            `SELECT id, email, first_name, last_name,
                    avatar_url, is_active, global_role_id
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [req.usuario.id]
        );

        if (
            usuarios.length === 0 ||
            Number(usuarios[0].is_active) !== 1
        ) {
            return res.status(401).json({
                ok: false,
                mensaje: "La cuenta no está disponible."
            });
        }

        const [instituciones] = await db.execute(
            `SELECT
                i.id,
                i.name,
                i.code,
                iu.role_id,
                r.name AS rol,
                iu.is_active
             FROM institution_users iu
             INNER JOIN institutions i ON i.id = iu.institution_id
             INNER JOIN roles r ON r.id = iu.role_id
             WHERE iu.user_id = ?
               AND iu.is_active = 1
               AND i.is_active = 1`,
            [req.usuario.id]
        );

        res.json({
            ok: true,
            usuario: {
                ...usuarios[0],
                rol: req.usuario.rol
            },
            instituciones
        });
    } catch (error) {
        manejarError(res, error, "Consultando perfil");
    }
});

// =====================================================
// BUSCAR INSTITUCIONES ACTIVAS
// GET /api/instituciones/buscar?busqueda=...
// =====================================================

app.get(
    "/api/instituciones/buscar",
    verificarToken,
    async (req, res) => {
        try {
            const busqueda = String(
                req.query.busqueda || ""
            ).trim();

            if (busqueda.length < 2 || busqueda.length > 100) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Escribí entre 2 y 100 caracteres para buscar."
                });
            }

            const termino = `%${busqueda}%`;

            const [instituciones] = await db.execute(
                `SELECT id, name, code, address
                 FROM institutions
                 WHERE is_active = 1
                   AND (name LIKE ? OR code LIKE ?)
                 ORDER BY name ASC
                 LIMIT 20`,
                [termino, termino]
            );

            res.json({
                ok: true,
                total: instituciones.length,
                instituciones
            });
        } catch (error) {
            manejarError(res, error, "Buscando instituciones");
        }
    }
);

// =====================================================
// SOLICITAR REGISTRO DE UNA INSTITUCIÓN NUEVA
// =====================================================

app.post(
    "/api/institution-requests",
    verificarToken,
    async (req, res) => {
        try {
            const userId = Number(req.usuario.id);
            const nombre = String(
                req.body.institution_name || ""
            ).trim();
            const codigo = String(
                req.body.institution_code || ""
            ).trim();
            const email = String(
                req.body.institution_email || ""
            ).trim();
            const telefono = String(
                req.body.institution_phone || ""
            ).trim();
            const direccion = String(
                req.body.institution_address || ""
            ).trim();
            const logoUrl = req.body.logo_url || null;

            if (
                nombre.length < 3 ||
                nombre.length > 150 ||
                codigo.length < 2 ||
                codigo.length > 50
            ) {
                return res.status(400).json({
                    ok: false,
                    mensaje:
                        "El nombre debe tener entre 3 y 150 caracteres y el código entre 2 y 50."
                });
            }

            const [usuarios] = await db.execute(
                `SELECT id, is_active, global_role_id
                 FROM users WHERE id = ? LIMIT 1`,
                [userId]
            );

            if (
                usuarios.length === 0 ||
                Number(usuarios[0].is_active) !== 1
            ) {
                return res.status(403).json({
                    ok: false,
                    mensaje: "Tu cuenta no está activa."
                });
            }

            if (![2, 3, 4].includes(Number(usuarios[0].global_role_id))) {
                return res.status(403).json({
                    ok: false,
                    mensaje:
                        "Solo un docente o usuario autorizado puede solicitar el registro de una institución."
                });
            }

            const [existentes] = await db.execute(
                `SELECT id FROM institutions
                 WHERE code = ? LIMIT 1`,
                [codigo]
            );

            if (existentes.length > 0) {
                return res.status(409).json({
                    ok: false,
                    mensaje:
                        "Ya existe una institución con ese código. Buscala en AulaLab."
                });
            }

            const [pendientes] = await db.execute(
                `SELECT id FROM institution_requests
                 WHERE institution_code = ?
                   AND status = 'pending'
                 LIMIT 1`,
                [codigo]
            );

            if (pendientes.length > 0) {
                return res.status(409).json({
                    ok: false,
                    mensaje:
                        "Ya existe una solicitud pendiente con ese código."
                });
            }

            const [resultado] = await db.execute(
                `INSERT INTO institution_requests
                 (
                    institution_name,
                    institution_code,
                    institution_email,
                    institution_phone,
                    institution_address,
                    logo_url,
                    requester_user_id,
                    status,
                    created_at,
                    updated_at
                 )
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
                [
                    nombre,
                    codigo,
                    email || null,
                    telefono || null,
                    direccion || null,
                    logoUrl,
                    userId
                ]
            );

            res.status(201).json({
                ok: true,
                mensaje:
                    "La solicitud de registro fue enviada para revisión.",
                solicitud_id: resultado.insertId
            });
        } catch (error) {
            manejarError(
                res,
                error,
                "Solicitando registro de institución"
            );
        }
    }
);

app.get(
    "/api/institution-requests/mine",
    verificarToken,
    async (req, res) => {
        try {
            const [solicitudes] = await db.execute(
                `SELECT id, institution_name, institution_code,
                        status, created_at, reviewed_at,
                        rejection_reason
                 FROM institution_requests
                 WHERE requester_user_id = ?
                 ORDER BY created_at DESC`,
                [req.usuario.id]
            );

            res.json({ ok: true, solicitudes });
        } catch (error) {
            manejarError(res, error, "Consultando solicitudes propias");
        }
    }
);

// =====================================================
// SOLICITUD PARA ADMINISTRAR UNA INSTITUCIÓN EXISTENTE
// =====================================================

app.post(
    "/api/administrator-requests",
    verificarToken,
    async (req, res) => {
        try {
            const userId = Number(req.usuario.id);
            const institutionId = Number(req.body.institution_id);
            const justificacion = String(
                req.body.justificacion || req.body.justification || ""
            ).trim();

            if (!Number.isInteger(institutionId) || institutionId <= 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Seleccioná una institución válida."
                });
            }

            if (
                justificacion.length < 15 ||
                justificacion.length > 1000
            ) {
                return res.status(400).json({
                    ok: false,
                    mensaje:
                        "La justificación debe tener entre 15 y 1000 caracteres."
                });
            }

            const [usuarios] = await db.execute(
                `SELECT id, global_role_id, is_active
                 FROM users WHERE id = ? LIMIT 1`,
                [userId]
            );

            if (
                usuarios.length === 0 ||
                Number(usuarios[0].is_active) !== 1
            ) {
                return res.status(403).json({
                    ok: false,
                    mensaje: "Tu cuenta no está activa."
                });
            }

            if (Number(usuarios[0].global_role_id) !== 2) {
                return res.status(403).json({
                    ok: false,
                    mensaje:
                        "Solo un docente puede solicitar administración institucional."
                });
            }

            const [instituciones] = await db.execute(
                `SELECT id, name, code FROM institutions
                 WHERE id = ? AND is_active = 1 LIMIT 1`,
                [institutionId]
            );

            if (instituciones.length === 0) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "La institución no existe o está desactivada."
                });
            }

            const [membresias] = await db.execute(
                `SELECT id FROM institution_users
                 WHERE user_id = ?
                   AND institution_id = ?
                   AND role_id = 3
                   AND is_active = 1
                 LIMIT 1`,
                [userId, institutionId]
            );

            if (membresias.length > 0) {
                return res.status(409).json({
                    ok: false,
                    mensaje: "Ya sos administrador de esta institución."
                });
            }

            const [pendientes] = await db.execute(
                `SELECT id FROM administrator_requests
                 WHERE requester_user_id = ?
                   AND institution_id = ?
                   AND status = 'pending'
                 LIMIT 1`,
                [userId, institutionId]
            );

            if (pendientes.length > 0) {
                return res.status(409).json({
                    ok: false,
                    mensaje: "Ya tenés una solicitud pendiente."
                });
            }

            const [resultado] = await db.execute(
                `INSERT INTO administrator_requests
                 (institution_id, requester_user_id,
                  requested_role, justification, status)
                 VALUES (?, ?, 'institution_admin', ?, 'pending')`,
                [institutionId, userId, justificacion]
            );

            res.status(201).json({
                ok: true,
                mensaje: "Tu solicitud fue enviada para revisión.",
                solicitud_id: resultado.insertId
            });
        } catch (error) {
            manejarError(
                res,
                error,
                "Solicitando administración institucional"
            );
        }
    }
);

app.get(
    "/api/administrator-requests/mine",
    verificarToken,
    async (req, res) => {
        try {
            const [solicitudes] = await db.execute(
                `SELECT ar.id, ar.institution_id,
                        i.name AS institution_name,
                        ar.justification, ar.status,
                        ar.created_at, ar.reviewed_at,
                        ar.rejection_reason
                 FROM administrator_requests ar
                 INNER JOIN institutions i
                    ON i.id = ar.institution_id
                 WHERE ar.requester_user_id = ?
                 ORDER BY ar.created_at DESC`,
                [req.usuario.id]
            );

            res.json({ ok: true, solicitudes });
        } catch (error) {
            manejarError(
                res,
                error,
                "Consultando solicitudes de administración"
            );
        }
    }
);

// =====================================================
// ADMIN GLOBAL - SOLICITUDES DE REGISTRO INSTITUCIONAL
// =====================================================

app.get(
    "/api/admin/institution-requests",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        try {
            const [solicitudes] = await db.execute(
                `SELECT ir.*,
                        CONCAT(u.first_name, ' ', u.last_name)
                            AS requester_name,
                        u.email AS requester_email
                 FROM institution_requests ir
                 LEFT JOIN users u ON u.id = ir.requester_user_id
                 ORDER BY
                    CASE WHEN ir.status = 'pending' THEN 0 ELSE 1 END,
                    ir.created_at DESC`
            );

            res.json({ ok: true, solicitudes });
        } catch (error) {
            manejarError(res, error, "Listando solicitudes institucionales");
        }
    }
);

app.get(
    "/api/admin/institutions",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        try {
            const [instituciones] = await db.execute(
                `SELECT i.*,
                        COUNT(iu.id) AS total_usuarios
                 FROM institutions i
                 LEFT JOIN institution_users iu
                    ON iu.institution_id = i.id
                   AND iu.is_active = 1
                 GROUP BY i.id
                 ORDER BY i.name ASC`
            );

            res.json({ ok: true, instituciones });
        } catch (error) {
            manejarError(res, error, "Listando instituciones");
        }
    }
);

// Aprobar registro de una institución nueva.
app.post(
    "/api/admin/institution-requests/:id/approve",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        let connection;

        try {
            const requestId = Number(req.params.id);

            if (!Number.isInteger(requestId) || requestId <= 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "ID inválido."
                });
            }

            connection = await db.getConnection();
            await connection.beginTransaction();

            const [filas] = await connection.execute(
                `SELECT * FROM institution_requests
                 WHERE id = ? FOR UPDATE`,
                [requestId]
            );

            if (filas.length === 0 || filas[0].status !== "pending") {
                await connection.rollback();

                return res.status(409).json({
                    ok: false,
                    mensaje:
                        "La solicitud no existe o ya fue revisada."
                });
            }

            const solicitud = filas[0];

            const [duplicadas] = await connection.execute(
                "SELECT id FROM institutions WHERE code = ? LIMIT 1",
                [solicitud.institution_code]
            );

            if (duplicadas.length > 0) {
                await connection.rollback();

                return res.status(409).json({
                    ok: false,
                    mensaje:
                        "Ya existe una institución con ese código."
                });
            }

            const [insertada] = await connection.execute(
                `INSERT INTO institutions
                 (name, code, email, phone, address, logo_url,
                  is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
                [
                    solicitud.institution_name,
                    solicitud.institution_code,
                    solicitud.institution_email,
                    solicitud.institution_phone,
                    solicitud.institution_address,
                    solicitud.logo_url
                ]
            );

            const institutionId = insertada.insertId;

            const [roles] = await connection.execute(
                "SELECT id FROM roles WHERE name = 'institution_admin' LIMIT 1"
            );

            if (roles.length === 0) {
                throw new Error(
                    "No existe el rol institution_admin en la tabla roles."
                );
            }

            const [membresias] = await connection.execute(
                `SELECT id FROM institution_users
                 WHERE institution_id = ? AND user_id = ?
                 LIMIT 1`,
                [institutionId, solicitud.requester_user_id]
            );

            if (membresias.length === 0) {
                await connection.execute(
                    `INSERT INTO institution_users
                     (institution_id, user_id, role_id, is_active)
                     VALUES (?, ?, ?, 1)`,
                    [
                        institutionId,
                        solicitud.requester_user_id,
                        roles[0].id
                    ]
                );
            }

            await connection.execute(
                `UPDATE institution_requests
                 SET status = 'approved',
                     reviewed_by = ?,
                     reviewed_at = NOW(),
                     updated_at = NOW()
                 WHERE id = ?`,
                [req.usuario.id, requestId]
            );

            await connection.commit();

            res.json({
                ok: true,
                mensaje: "Institución aprobada y registrada correctamente.",
                institution_id: institutionId
            });
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch {}
            }

            manejarError(res, error, "Aprobando institución");
        } finally {
            if (connection) connection.release();
        }
    }
);

// Rechazar registro de institución nueva.
app.post(
    "/api/admin/institution-requests/:id/reject",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        try {
            const requestId = Number(req.params.id);
            const motivo = String(
                req.body.rejection_reason || ""
            ).trim();

            if (
                !Number.isInteger(requestId) ||
                requestId <= 0 ||
                !motivo ||
                motivo.length > 1000
            ) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Indicá un ID válido y un motivo de rechazo."
                });
            }

            const [resultado] = await db.execute(
                `UPDATE institution_requests
                 SET status = 'rejected',
                     reviewed_by = ?,
                     reviewed_at = NOW(),
                     rejection_reason = ?,
                     updated_at = NOW()
                 WHERE id = ? AND status = 'pending'`,
                [req.usuario.id, motivo, requestId]
            );

            if (resultado.affectedRows === 0) {
                return res.status(409).json({
                    ok: false,
                    mensaje:
                        "La solicitud no existe o ya fue revisada."
                });
            }

            res.json({
                ok: true,
                mensaje: "Solicitud rechazada correctamente."
            });
        } catch (error) {
            manejarError(res, error, "Rechazando institución");
        }
    }
);

// =====================================================
// ADMIN GLOBAL - SOLICITUDES DE ADMINISTRACIÓN
// =====================================================

app.get(
    "/api/admin/administrator-requests",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        try {
            const [solicitudes] = await db.execute(
                `SELECT ar.*,
                        i.name AS institution_name,
                        i.code AS institution_code,
                        CONCAT(u.first_name, ' ', u.last_name)
                            AS requester_name,
                        u.email AS requester_email
                 FROM administrator_requests ar
                 INNER JOIN institutions i ON i.id = ar.institution_id
                 INNER JOIN users u ON u.id = ar.requester_user_id
                 ORDER BY
                    CASE WHEN ar.status = 'pending' THEN 0 ELSE 1 END,
                    ar.created_at DESC`
            );

            res.json({ ok: true, solicitudes });
        } catch (error) {
            manejarError(
                res,
                error,
                "Listando solicitudes de administración"
            );
        }
    }
);

app.post(
    "/api/admin/administrator-requests/:id/approve",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        let connection;

        try {
            const requestId = Number(req.params.id);

            if (!Number.isInteger(requestId) || requestId <= 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "ID inválido."
                });
            }

            connection = await db.getConnection();
            await connection.beginTransaction();

            const [filas] = await connection.execute(
                `SELECT * FROM administrator_requests
                 WHERE id = ? FOR UPDATE`,
                [requestId]
            );

            if (filas.length === 0 || filas[0].status !== "pending") {
                await connection.rollback();

                return res.status(409).json({
                    ok: false,
                    mensaje:
                        "La solicitud no existe o ya fue revisada."
                });
            }

            const solicitud = filas[0];

            const [usuarios] = await connection.execute(
                `SELECT id, is_active, global_role_id
                 FROM users WHERE id = ? FOR UPDATE`,
                [solicitud.requester_user_id]
            );

            if (
                usuarios.length === 0 ||
                Number(usuarios[0].is_active) !== 1 ||
                Number(usuarios[0].global_role_id) !== 2
            ) {
                await connection.rollback();

                return res.status(409).json({
                    ok: false,
                    mensaje:
                        "El docente ya no cumple los requisitos para recibir permisos."
                });
            }

            const [instituciones] = await connection.execute(
                `SELECT id, is_active FROM institutions
                 WHERE id = ? FOR UPDATE`,
                [solicitud.institution_id]
            );

            if (
                instituciones.length === 0 ||
                Number(instituciones[0].is_active) !== 1
            ) {
                await connection.rollback();

                return res.status(409).json({
                    ok: false,
                    mensaje: "La institución no está activa."
                });
            }

            const [roles] = await connection.execute(
                `SELECT id FROM roles
                 WHERE name = 'institution_admin' LIMIT 1`
            );

            if (roles.length === 0) {
                throw new Error(
                    "Falta el rol institution_admin en la tabla roles."
                );
            }

            const [membresias] = await connection.execute(
                `SELECT id FROM institution_users
                 WHERE institution_id = ? AND user_id = ?
                 LIMIT 1 FOR UPDATE`,
                [solicitud.institution_id, solicitud.requester_user_id]
            );

            if (membresias.length > 0) {
                await connection.execute(
                    `UPDATE institution_users
                     SET role_id = ?, is_active = 1
                     WHERE id = ?`,
                    [roles[0].id, membresias[0].id]
                );
            } else {
                await connection.execute(
                    `INSERT INTO institution_users
                     (institution_id, user_id, role_id, is_active)
                     VALUES (?, ?, ?, 1)`,
                    [
                        solicitud.institution_id,
                        solicitud.requester_user_id,
                        roles[0].id
                    ]
                );
            }

            await connection.execute(
                `UPDATE administrator_requests
                 SET status = 'approved',
                     reviewed_by = ?,
                     reviewed_at = NOW(),
                     rejection_reason = NULL
                 WHERE id = ?`,
                [req.usuario.id, requestId]
            );

            await connection.commit();

            res.json({
                ok: true,
                mensaje: "Solicitud de administración aprobada."
            });
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch {}
            }

            manejarError(
                res,
                error,
                "Aprobando administración institucional"
            );
        } finally {
            if (connection) connection.release();
        }
    }
);

app.post(
    "/api/admin/administrator-requests/:id/reject",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        try {
            const requestId = Number(req.params.id);
            const motivo = String(
                req.body.rejection_reason || ""
            ).trim();

            if (
                !Number.isInteger(requestId) ||
                requestId <= 0 ||
                !motivo ||
                motivo.length > 1000
            ) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Indicá un ID válido y un motivo de rechazo."
                });
            }

            const [resultado] = await db.execute(
                `UPDATE administrator_requests
                 SET status = 'rejected',
                     reviewed_by = ?,
                     reviewed_at = NOW(),
                     rejection_reason = ?
                 WHERE id = ? AND status = 'pending'`,
                [req.usuario.id, motivo, requestId]
            );

            if (resultado.affectedRows === 0) {
                return res.status(409).json({
                    ok: false,
                    mensaje:
                        "La solicitud no existe o ya fue revisada."
                });
            }

            res.json({
                ok: true,
                mensaje: "Solicitud de administración rechazada."
            });
        } catch (error) {
            manejarError(
                res,
                error,
                "Rechazando administración institucional"
            );
        }
    }
);

// =====================================================
// INICIAR SERVIDOR
// =====================================================

async function iniciarServidor() {
    try {
        await db.query("SELECT 1");

        app.listen(PORT, () => {
            console.log(`AulaLab API funcionando en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error(
            "No se pudo conectar a MySQL. Revisá database.js y .env:",
            error.message
        );
        process.exit(1);
    }
}

iniciarServidor();
