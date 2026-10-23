
require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./database");
const registrarRutasEstudiantes = require("./rutas-estudiantes");
const registrarRutasProgreso = require("./rutas-progreso");
const registrarRutasAsignaciones = require("./rutas-asignaciones");
const nodemailer = require("nodemailer");

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

// Publicar las páginas, estilos, scripts e imágenes del frontend.
app.use(express.static(path.join(__dirname, "../frontend")));

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

registrarRutasEstudiantes({ app, db, verificarToken });
registrarRutasProgreso({ app, db, verificarToken });
registrarRutasAsignaciones({ app, db, verificarToken });

async function enviarCorreoAprobacion(destinatario) {
    if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASS ||
        !process.env.SMTP_FROM
    ) {
        console.warn(
            "Correo no enviado: falta configurar SMTP en backend/.env."
        );
        return false;
    }

    const puerto = Number(process.env.SMTP_PORT || 587);
    const seguro = String(process.env.SMTP_SECURE || "false") === "true";

    const transporte = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: puerto,
        secure: seguro,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    await transporte.sendMail({
        from: process.env.SMTP_FROM,
        to: destinatario,
        subject: "AulaLab: inscripción estudiantil aprobada",
        text:
            "Hola, docente.\n\n" +
            "La inscripción de un estudiante que registraste fue aprobada " +
            "por el administrador de AulaLab.\n\n" +
            "El estudiante podrá continuar con el proceso de activación " +
            "de su cuenta cuando esté disponible.\n\n" +
            "Este correo no contiene contraseñas ni códigos de activación.\n\n" +
            "Equipo AulaLab"
    });

    return true;
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
     approval_status, created_at, updated_at)
 VALUES (?, ?, ?, ?, ?, 0, ?, 'pending', NOW(), NOW())`,
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
            mensaje: "Tu cuenta fue registrada y está pendiente de aprobación del administrador global.",
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
        const identificador = String(
            req.body.email || req.body.identificador || ""
        ).trim();

        const email = identificador.toLowerCase();
        const nie = identificador.toUpperCase();
        const password = String(req.body.password || "");

        if (!identificador || !password) {
            return res.status(400).json({
                ok: false,
                mensaje: "Ingresá tu correo o NIE y tu contraseña."
            });
        }

        const [usuarios] = await db.execute(
            `SELECT
                u.id,
                u.email,
                u.student_nie,
                u.password_hash,
                u.first_name,
                u.last_name,
                u.avatar_url,
                u.is_active,
                u.approval_status,
                u.global_role_id,
                r.name AS role_name
             FROM users u
             LEFT JOIN roles r ON r.id = u.global_role_id
             WHERE LOWER(u.email) = ?
                OR UPPER(u.student_nie) = ?
             ORDER BY CASE
                WHEN LOWER(u.email) = ? THEN 0
                ELSE 1
             END
             LIMIT 1`,
            [email, nie, email]
        );

        if (!usuarios.length) {
            return res.status(401).json({
                ok: false,
                mensaje: "Correo, NIE o contraseña incorrectos."
            });
        }

        const usuario = usuarios[0];

        const coincide = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!coincide) {
            return res.status(401).json({
                ok: false,
                mensaje: "Correo, NIE o contraseña incorrectos."
            });
        }

        if (usuario.approval_status === "pending") {
            return res.status(403).json({
                ok: false,
                mensaje:
                    "Tu cuenta está pendiente de aprobación del administrador global."
            });
        }

        if (usuario.approval_status === "rejected") {
            return res.status(403).json({
                ok: false,
                mensaje:
                    "Tu solicitud de registro fue rechazada. Contactá al administrador."
            });
        }

        if (Number(usuario.is_active) !== 1) {
            return res.status(403).json({
                ok: false,
                mensaje:
                    "Tu cuenta está inactiva. Si sos estudiante, verificá que tu inscripción esté aprobada y activá tu cuenta."
            });
        }

        const token = crearToken({
            id: usuario.id,
            email: usuario.email,
            rol: usuario.role_name
        });

        await db.execute(
            "UPDATE users SET last_login = NOW() WHERE id = ?",
            [usuario.id]
        );

        const [instituciones] = await db.execute(
            `SELECT
                i.id,
                i.name,
                i.code,
                iu.role_id,
                r.name AS rol,
                iu.is_active
             FROM institution_users iu
             INNER JOIN institutions i
                ON i.id = iu.institution_id
             INNER JOIN roles r
                ON r.id = iu.role_id
             WHERE iu.user_id = ?
               AND iu.is_active = 1
               AND i.is_active = 1`,
            [usuario.id]
        );

        let tipoAcceso = "sin_institucion";

        if (usuario.role_name === "platform_admin") {
            tipoAcceso = "global";
        } else if (instituciones.length > 0) {
            tipoAcceso = "institucional";
        }

        return res.json({
            ok: true,
            mensaje: "Inicio de sesión correcto.",
            token,
            tipo_acceso: tipoAcceso,
            usuario: {
                id: usuario.id,
                email: usuario.email,
                first_name: usuario.first_name,
                last_name: usuario.last_name,
                avatar_url: usuario.avatar_url,
                global_role_id: usuario.global_role_id,
                rol: usuario.role_name
            },
            instituciones
        });
    } catch (error) {
        manejarError(res, error, "Iniciando sesión");
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
                    created_at
                 )
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
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
    verificarDocenteActivo,
    verificarAccesoAdminAprobado,
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
                     reviewed_at = NOW()
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



// Comprueba en MySQL que el usuario tenga el rol de docente.
// El rol que manda es el de la base de datos, no el que envía el navegador.
async function verificarDocenteActivo(req, res, next) {
    try {
        const [usuarios] = await db.execute(
            `SELECT u.id
             FROM users u
             INNER JOIN roles r ON r.id = u.global_role_id
             WHERE u.id = ?
               AND u.is_active = 1
               AND r.name = 'teacher'
             LIMIT 1`,
            [req.usuario.id]
        );

        if (!usuarios.length) {
            return res.status(403).json({
                ok: false,
                mensaje: "Esta acción requiere una cuenta activa de docente."
            });
        }

        next();
    } catch (error) {
        console.error("Error verificando docente:", error);
        res.status(500).json({
            ok: false,
            mensaje: "No se pudieron verificar los permisos."
        });
    }
}

// Comprueba que el docente ya recibió la primera aprobación.
async function verificarAccesoAdminAprobado(req, res, next) {
    try {
        const [solicitudes] = await db.execute(
            `SELECT id
             FROM admin_access_requests
             WHERE requester_user_id = ?
               AND status = 'approved'
             ORDER BY reviewed_at DESC, id DESC
             LIMIT 1`,
            [req.usuario.id]
        );

        if (!solicitudes.length) {
            return res.status(403).json({
                ok: false,
                mensaje: "Primero necesitás la aprobación de acceso administrativo."
            });
        }

        next();
    } catch (error) {
        console.error("Error comprobando aprobación:", error);
        res.status(500).json({
            ok: false,
            mensaje: "No se pudo comprobar la aprobación."
        });
    }
}

// 1. Enviar solicitud de permiso administrativo.
app.post(
    "/api/admin-access-requests",
    verificarToken,
    verificarDocenteActivo,
    async (req, res) => {
        try {
            const justification = String(
                req.body.justification || ""
            ).trim();

            if (justification.length < 20 || justification.length > 3000) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "La justificación debe tener entre 20 y 3000 caracteres."
                });
            }

            const [previas] = await db.execute(
                `SELECT id, status
                 FROM admin_access_requests
                 WHERE requester_user_id = ?
                 ORDER BY id DESC
                 LIMIT 1`,
                [req.usuario.id]
            );

            if (previas.length && previas[0].status === "approved") {
                return res.status(409).json({
                    ok: false,
                    mensaje: "Tu permiso administrativo ya está aprobado."
                });
            }

            if (previas.length && previas[0].status === "pending") {
                return res.status(409).json({
                    ok: false,
                    mensaje: "Ya tenés una solicitud pendiente."
                });
            }

            await db.execute(
                `INSERT INTO admin_access_requests
                    (requester_user_id, justification, status)
                 VALUES (?, ?, 'pending')`,
                [req.usuario.id, justification]
            );

            res.status(201).json({
                ok: true,
                mensaje: "Solicitud enviada. Esperá la revisión del administrador global."
            });
        } catch (error) {
            console.error("Error creando solicitud:", error);
            res.status(500).json({
                ok: false,
                mensaje: "No se pudo registrar la solicitud."
            });
        }
    }
);

// 2. Consultar el estado de la solicitud del usuario conectado.
app.get(
    "/api/admin-access-requests/mine",
    verificarToken,
    verificarDocenteActivo,
    async (req, res) => {
        try {
            const [filas] = await db.execute(
                `SELECT id, status, justification, rejection_reason,
                        created_at, reviewed_at
                 FROM admin_access_requests
                 WHERE requester_user_id = ?
                 ORDER BY id DESC
                 LIMIT 1`,
                [req.usuario.id]
            );

            const solicitud = filas[0] || null;

            res.json({
                ok: true,
                solicitud,
                status: solicitud ? solicitud.status : "none",
                approved: solicitud?.status === "approved"
            });
        } catch (error) {
            console.error("Error consultando solicitud:", error);
            res.status(500).json({
                ok: false,
                mensaje: "No se pudo consultar el estado."
            });
        }
    }
);

// 3. Bandeja global de solicitudes pendientes.
app.get(
    "/api/admin/admin-access-requests",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        try {
            const [filas] = await db.execute(
                `SELECT a.id, a.justification, a.status, a.created_at,
                        u.id AS requester_user_id,
                        u.first_name, u.last_name, u.email
                 FROM admin_access_requests a
                 INNER JOIN users u ON u.id = a.requester_user_id
                 WHERE a.status = 'pending'
                 ORDER BY a.created_at ASC`
            );

            res.json({ ok: true, solicitudes: filas });
        } catch (error) {
            console.error("Error listando solicitudes:", error);
            res.status(500).json({
                ok: false,
                mensaje: "No se pudieron cargar las solicitudes."
            });
        }
    }
);

// 4. Aprobar la primera etapa.
app.post(
    "/api/admin/admin-access-requests/:id/approve",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [solicitudes] = await connection.execute(
                `SELECT a.id, a.requester_user_id
                 FROM admin_access_requests a
                 INNER JOIN users u ON u.id = a.requester_user_id
                 INNER JOIN roles r ON r.id = u.global_role_id
                 WHERE a.id = ?
                   AND a.status = 'pending'
                   AND u.is_active = 1
                   AND r.name = 'teacher'
                 FOR UPDATE`,
                [req.params.id]
            );

            if (!solicitudes.length) {
                await connection.rollback();
                return res.status(404).json({
                    ok: false,
                    mensaje: "La solicitud no existe, ya fue revisada o el usuario no es docente activo."
                });
            }

            await connection.execute(
                `UPDATE admin_access_requests
                 SET status = 'approved',
                     reviewed_by = ?,
                     reviewed_at = NOW(),
                     rejection_reason = NULL
                 WHERE id = ? AND status = 'pending'`,
                [req.usuario.id, req.params.id]
            );

            await connection.commit();

            res.json({
                ok: true,
                mensaje: "Primera aprobación completada. El docente ya puede solicitar administrar una institución."
            });
        } catch (error) {
            await connection.rollback();
            console.error("Error aprobando solicitud:", error);
            res.status(500).json({
                ok: false,
                mensaje: "No se pudo aprobar la solicitud."
            });
        } finally {
            connection.release();
        }
    }
);

// 5. Rechazar la primera etapa.
app.post(
    "/api/admin/admin-access-requests/:id/reject",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        try {
            const motivo = String(req.body.rejection_reason || "").trim();

            if (motivo.length < 5) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Escribí un motivo de rechazo de al menos 5 caracteres."
                });
            }

            const [resultado] = await db.execute(
                `UPDATE admin_access_requests
                 SET status = 'rejected',
                     reviewed_by = ?,
                     reviewed_at = NOW(),
                     rejection_reason = ?
                 WHERE id = ? AND status = 'pending'`,
                [req.usuario.id, motivo, req.params.id]
            );

            if (!resultado.affectedRows) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "La solicitud no existe o ya fue revisada."
                });
            }

            res.json({
                ok: true,
                mensaje: "Solicitud rechazada."
            });
        } catch (error) {
            console.error("Error rechazando solicitud:", error);
            res.status(500).json({
                ok: false,
                mensaje: "No se pudo rechazar la solicitud."
            });
        }
    }
);

// =====================================================
// INICIAR SERVIDOR
// =====================================================

/* =====================================================
   ADMIN GLOBAL: APROBACIÓN DE USUARIOS Y ESTUDIANTES
   Insertar antes del bloque INICIAR SERVIDOR.
   ===================================================== */

// Lista de cuentas pendientes de aprobación.
app.get(
    "/api/admin/user-requests",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        try {
            const [solicitudes] = await db.execute(
                `SELECT id, email, first_name, last_name,
                        global_role_id, approval_status,
                        created_at
                 FROM users
                 WHERE approval_status = 'pending'
                   AND email IS NOT NULL
                 ORDER BY created_at ASC`
            );

            res.json({ ok: true, solicitudes });
        } catch (error) {
            manejarError(res, error, "Consultando usuarios pendientes");
        }
    }
);

// Aprobar una cuenta registrada.
app.post(
    "/api/admin/user-requests/:id/approve",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "ID de usuario inválido."
                });
            }

            const [resultado] = await db.execute(
                `UPDATE users
                 SET approval_status = 'approved',
                     approved_by = ?,
                     approved_at = NOW(),
                     rejection_reason = NULL,
                     is_active = 1,
                     updated_at = NOW()
                 WHERE id = ?
                   AND approval_status = 'pending'
                   AND email IS NOT NULL`,
                [req.usuario.id, id]
            );

            if (!resultado.affectedRows) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "La cuenta no existe o ya fue revisada."
                });
            }

            res.json({
                ok: true,
                mensaje: "Cuenta aprobada. El usuario ya puede iniciar sesión."
            });
        } catch (error) {
            manejarError(res, error, "Aprobando usuario");
        }
    }
);

// Rechazar una cuenta registrada.
app.post(
    "/api/admin/user-requests/:id/reject",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        try {
            const id = Number(req.params.id);
            const motivo = String(
                req.body.rejection_reason || ""
            ).trim();

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "ID de usuario inválido."
                });
            }

            if (motivo.length < 5) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El motivo debe tener al menos 5 caracteres."
                });
            }

            const [resultado] = await db.execute(
                `UPDATE users
                 SET approval_status = 'rejected',
                     approved_by = ?,
                     approved_at = NOW(),
                     rejection_reason = ?,
                     is_active = 0,
                     updated_at = NOW()
                 WHERE id = ?
                   AND approval_status = 'pending'
                   AND email IS NOT NULL`,
                [req.usuario.id, motivo, id]
            );

            if (!resultado.affectedRows) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "La cuenta no existe o ya fue revisada."
                });
            }

            res.json({
                ok: true,
                mensaje: "Solicitud de cuenta rechazada."
            });
        } catch (error) {
            manejarError(res, error, "Rechazando usuario");
        }
    }
);

// Listar estudiantes pendientes de aprobación.
app.get(
    "/api/admin/student-requests",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        try {
            const [solicitudes] = await db.execute(
                `SELECT s.id, s.user_id, s.institution_id,
                        s.student_code, s.grade_level, s.section,
                        s.created_at, s.approval_status,
                        s.rejection_reason,
                        u.first_name, u.last_name, u.student_nie,
                        i.name AS institution_name
                 FROM students s
                 INNER JOIN users u ON u.id = s.user_id
                 LEFT JOIN institutions i ON i.id = s.institution_id
                 WHERE s.approval_status = 'pending'
                 ORDER BY s.created_at ASC`
            );

            res.json({ ok: true, solicitudes });
        } catch (error) {
            manejarError(res, error, "Consultando estudiantes pendientes");
        }
    }
);

// Aprobar la inscripción de un estudiante.
app.post(
    "/api/admin/student-requests/:id/approve",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        let conexion;
        let transaccionActiva = false;
        let correoDocente = null;

        try {
            const id = Number(req.params.id);

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "ID de inscripción inválido."
                });
            }

            conexion = await db.getConnection();
            await conexion.beginTransaction();
            transaccionActiva = true;

            const [filas] = await conexion.execute(
                `SELECT id, user_id, registered_by
                 FROM students
                 WHERE id = ?
                   AND approval_status = 'pending'
                 FOR UPDATE`,
                [id]
            );

            if (!filas.length) {
                await conexion.rollback();
                transaccionActiva = false;

                return res.status(404).json({
                    ok: false,
                    mensaje: "La inscripción no existe o ya fue revisada."
                });
            }

            const estudiante = filas[0];
            const docenteId = estudiante.registered_by;

            await conexion.execute(
                `UPDATE students
                 SET approval_status = 'approved',
                     reviewed_by = ?,
                     reviewed_at = NOW(),
                     rejection_reason = NULL
                 WHERE id = ?
                   AND approval_status = 'pending'`,
                [req.usuario.id, id]
            );

            await conexion.execute(
                `UPDATE users
                 SET approval_status = 'approved',
                     approved_by = ?,
                     approved_at = NOW(),
                     rejection_reason = NULL,
                     is_active = 0,
                     updated_at = NOW()
                 WHERE id = ?`,
                [req.usuario.id, estudiante.user_id]
            );

            if (docenteId) {
                await conexion.execute(
                    `INSERT INTO notifications
                     (user_id, title, message, notification_type,
                      related_type, related_id)
                     VALUES (?, ?, ?, 'success', 'student', ?)`,
                    [
                        docenteId,
                        "Inscripción aprobada",
                        "El administrador aprobó la inscripción de un estudiante que registraste. Ya puede continuar con la activación de su cuenta.",
                        id
                    ]
                );

                const [docentes] = await conexion.execute(
                    `SELECT email
                     FROM users
                     WHERE id = ?
                     LIMIT 1`,
                    [docenteId]
                );

                correoDocente = docentes[0]?.email || null;
            }

            await conexion.commit();
            transaccionActiva = false;

            // El correo se envía después de confirmar la aprobación.
            if (correoDocente) {
                try {
                    await enviarCorreoAprobacion(correoDocente);
                } catch (errorCorreo) {
                    console.error(
                        "No se pudo enviar el correo de aprobación:",
                        errorCorreo.message
                    );
                }
            }

            return res.json({
                ok: true,
                mensaje: "Inscripción aprobada. El estudiante ya puede continuar con el proceso de activación."
            });
        } catch (error) {
            if (conexion && transaccionActiva) {
                try {
                    await conexion.rollback();
                } catch (errorRollback) {
                    console.error(
                        "No se pudo revertir la transacción:",
                        errorRollback.message
                    );
                }
            }

            return manejarError(res, error, "Aprobando inscripción");
        } finally {
            if (conexion) {
                conexion.release();
            }
        }
    }
);

// Rechazar inscripción e invalidar su código de activación.
app.post(
    "/api/admin/student-requests/:id/reject",
    verificarToken,
    verificarPlatformAdmin,
    async (req, res) => {
        let conexion;

        try {
            const id = Number(req.params.id);
            const motivo = String(
                req.body.rejection_reason || ""
            ).trim();

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "ID de inscripción inválido."
                });
            }

            if (motivo.length < 5) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El motivo debe tener al menos 5 caracteres."
                });
            }

            conexion = await db.getConnection();
            await conexion.beginTransaction();

            const [filas] = await conexion.execute(
    `SELECT id, user_id
     FROM students
     WHERE id = ?
       AND approval_status = 'pending'
     FOR UPDATE`,
    [id]
);

            if (!filas.length) {
                await conexion.rollback();

                return res.status(404).json({
                    ok: false,
                    mensaje: "La inscripción no existe o ya fue revisada."
                });
            }

            const estudiante = filas[0];

            await conexion.execute(
                `UPDATE students
                 SET approval_status = 'rejected',
                     reviewed_by = ?,
                     reviewed_at = NOW(),
                     rejection_reason = ?
                 WHERE id = ? AND approval_status = 'pending'`,
                [req.usuario.id, motivo, id]
            );

            await conexion.execute(
                `UPDATE student_activation_codes
                 SET used_at = COALESCE(used_at, NOW())
                 WHERE user_id = ?`,
                [estudiante.user_id]
            );

            await conexion.execute(
                `UPDATE users
                 SET is_active = 0
                 WHERE id = ?`,
                [estudiante.user_id]
            );

            await conexion.commit();

            res.json({
                ok: true,
                mensaje: "Inscripción rechazada y código de activación invalidado."
            });
        } catch (error) {
            if (conexion) await conexion.rollback();
            manejarError(res, error, "Rechazando inscripción");
        } finally {
            if (conexion) conexion.release();
        }
    }
);


// Consultar las notificaciones del usuario autenticado.
app.get("/api/notificaciones", verificarToken, async (req, res) => {
    try {
        const [notificaciones] = await db.execute(
            `SELECT id, title, message, notification_type,
                    related_type, related_id, is_read, created_at
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 50`,
            [req.usuario.id]
        );

        res.json({
            ok: true,
            notificaciones,
            no_leidas: notificaciones.filter(
                notificacion => !notificacion.is_read
            ).length
        });
    } catch (error) {
        manejarError(res, error, "Consultando notificaciones");
    }
});

// Marcar como leída una notificación propia.
app.patch(
    "/api/notificaciones/:id/leida",
    verificarToken,
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "ID de notificación inválido."
                });
            }

            const [resultado] = await db.execute(
                `UPDATE notifications
                 SET is_read = 1, read_at = NOW()
                 WHERE id = ? AND user_id = ?`,
                [id, req.usuario.id]
            );

            if (!resultado.affectedRows) {
                const [existentes] = await db.execute(
                    `SELECT id FROM notifications
                     WHERE id = ? AND user_id = ?`,
                    [id, req.usuario.id]
                );

                if (!existentes.length) {
                    return res.status(404).json({
                        ok: false,
                        mensaje: "No se encontró esa notificación."
                    });
                }
            }

            res.json({
                ok: true,
                mensaje: "Notificación marcada como leída."
            });
        } catch (error) {
            manejarError(res, error, "Marcando notificación como leída");
        }
    }
);

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
