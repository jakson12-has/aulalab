
"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const XLSX = require("xlsx");

const MAX_FILAS_EXCEL = 100;
const MAX_ARCHIVO = 5 * 1024 * 1024;
const INTENTOS_MAXIMOS = 5;
const DURACION_BLOQUEO_MINUTOS = 15;
const VIGENCIA_CODIGO_HORAS = 48;

const cargarArchivo = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_ARCHIVO,
        files: 1
    },
    fileFilter(req, file, callback) {
        if (!file.originalname.toLowerCase().endsWith(".xlsx")) {
            return callback(new Error("El archivo debe tener formato .xlsx."));
        }
        callback(null, true);
    }
}).single("archivoExcel");

function texto(valor) {
    return String(valor ?? "").trim();
}

function validarFecha(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;

    const [anio, mes, dia] = fecha.split("-").map(Number);
    const objeto = new Date(Date.UTC(anio, mes - 1, dia));

    if (
        objeto.getUTCFullYear() !== anio ||
        objeto.getUTCMonth() !== mes - 1 ||
        objeto.getUTCDate() !== dia
    ) {
        return false;
    }

    const hoy = new Date();
    const hoyUTC = Date.UTC(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate()
    );

    return objeto.getTime() <= hoyUTC;
}

function normalizarFecha(valor) {
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
        const fecha = [
            valor.getFullYear(),
            String(valor.getMonth() + 1).padStart(2, "0"),
            String(valor.getDate()).padStart(2, "0")
        ].join("-");

        return validarFecha(fecha) ? fecha : null;
    }

    if (typeof valor === "number" && Number.isFinite(valor)) {
        const partes = XLSX.SSF.parse_date_code(valor);

        if (!partes || !partes.y || !partes.m || !partes.d) {
            return null;
        }

        const fecha = [
            partes.y,
            String(partes.m).padStart(2, "0"),
            String(partes.d).padStart(2, "0")
        ].join("-");

        return validarFecha(fecha) ? fecha : null;
    }

    const fecha = texto(valor);
    return validarFecha(fecha) ? fecha : null;
}

function normalizarRegistro(datos) {
    const nombre = texto(datos.first_name);
    const segundoNombre = texto(datos.middle_name);
    const apellidos = texto(datos.last_name);
    const nie = texto(datos.nie).toUpperCase();
    const grado = texto(datos.grade_level);
    const seccion = texto(datos.section);
    const responsable = texto(datos.guardian_name);
    const telefono = texto(datos.guardian_phone);
    const sexo = texto(datos.sex).toUpperCase();
    const fecha = normalizarFecha(datos.birth_date);

    const errores = [];

    if (!nombre || nombre.length > 100) {
        errores.push("first_name es obligatorio y admite hasta 100 caracteres.");
    }

    if (segundoNombre.length > 100) {
        errores.push("middle_name admite hasta 100 caracteres.");
    }

    if (!apellidos || apellidos.length > 100) {
        errores.push("last_name es obligatorio y admite hasta 100 caracteres.");
    }

    if (!nie || nie.length > 30) {
        errores.push("nie es obligatorio y admite hasta 30 caracteres.");
    }

    if (!fecha) {
        errores.push("birth_date debe ser una fecha válida AAAA-MM-DD y no futura.");
    }

    if (!grado || grado.length > 50) {
        errores.push("grade_level es obligatorio y admite hasta 50 caracteres.");
    }

    if (seccion.length > 50) {
        errores.push("section admite hasta 50 caracteres.");
    }

    if (responsable.length > 150) {
        errores.push("guardian_name admite hasta 150 caracteres.");
    }

    if (telefono.length > 30) {
        errores.push("guardian_phone admite hasta 30 caracteres.");
    }

    if (sexo && !["F", "M", "O", "N"].includes(sexo)) {
        errores.push("sex debe ser F, M, O, N o estar vacío.");
    }

    return {
        errores,
        registro: {
            first_name: nombre,
            middle_name: segundoNombre || null,
            last_name: apellidos,
            nie,
            birth_date: fecha,
            sex: sexo || null,
            grade_level: grado,
            section: seccion || null,
            guardian_name: responsable || null,
            guardian_phone: telefono || null
        }
    };
}

function hashCodigo(codigo) {
    return crypto.createHash("sha256").update(codigo).digest("hex");
}

function codigoAleatorio() {
    return crypto.randomBytes(5).toString("hex").toUpperCase();
}

async function comprobarAccesoInstitucion(db, usuarioId, institucionId) {
    const [filas] = await db.execute(
        `SELECT iu.institution_id
         FROM institution_users iu
         INNER JOIN institutions i ON i.id = iu.institution_id
         INNER JOIN roles r ON r.id = iu.role_id
         INNER JOIN users u ON u.id = iu.user_id
         WHERE iu.user_id = ?
           AND iu.institution_id = ?
           AND iu.is_active = 1
           AND i.is_active = 1
           AND u.is_active = 1
           AND r.name IN ('teacher', 'institution_admin')
         LIMIT 1`,
        [usuarioId, institucionId]
    );

    return filas.length > 0;
}

function leerInstitucion(valor) {
    const id = Number(valor);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function registrarRutasEstudiantes({ app, db, verificarToken }) {
    // Instituciones a las que pertenece el usuario autenticado.
    app.get(
        "/api/estudiantes/mis-instituciones",
        verificarToken,
        async (req, res) => {
            try {
                const [filas] = await db.execute(
                    `SELECT DISTINCT i.id, i.name, i.code
                     FROM institution_users iu
                     INNER JOIN institutions i ON i.id = iu.institution_id
                     INNER JOIN roles r ON r.id = iu.role_id
                     INNER JOIN users u ON u.id = iu.user_id
                     WHERE iu.user_id = ?
                       AND iu.is_active = 1
                       AND i.is_active = 1
                       AND u.is_active = 1
                       AND r.name IN ('teacher', 'institution_admin')
                     ORDER BY i.name`,
                    [req.usuario.id]
                );

                return res.json({ ok: true, instituciones: filas });
            } catch (error) {
                console.error("Consultando instituciones:", error.message);

                return res.status(500).json({
                    ok: false,
                    mensaje: "No se pudieron cargar las instituciones."
                });
            }
        }
    );

    async function prepararInscripciones(
        registros,
        institucionId,
        creadorId,
        res
    ) {
        const acceso = await comprobarAccesoInstitucion(
            db,
            creadorId,
            institucionId
        );

        if (!acceso) {
            res.status(403).json({
                ok: false,
                mensaje: "No tenés permisos activos para inscribir estudiantes en esa institución."
            });
            return null;
        }

        const [roles] = await db.execute(
            "SELECT id FROM roles WHERE name = 'student' LIMIT 1"
        );

        if (!roles.length) {
            res.status(500).json({
                ok: false,
                mensaje: "No se encontró el rol student en la base de datos."
            });
            return null;
        }

        const vistos = new Set();
        const errores = [];

        registros.forEach((registro, indice) => {
            const resultado = normalizarRegistro(registro);
            registro.__validado = resultado.registro;

            if (resultado.errores.length) {
                errores.push({
                    fila: indice + 2,
                    nie: texto(registro.nie),
                    errores: resultado.errores
                });
            }

            const nie = resultado.registro.nie;

            if (nie && vistos.has(nie)) {
                errores.push({
                    fila: indice + 2,
                    nie,
                    errores: ["El NIE está repetido dentro de la solicitud."]
                });
            }

            if (nie) vistos.add(nie);
        });

        if (errores.length) {
            res.status(400).json({
                ok: false,
                mensaje: "Hay filas que deben corregirse. No se guardó ninguna cuenta.",
                errores
            });
            return null;
        }

        const nies = registros.map(registro => registro.__validado.nie);
        const marcadores = nies.map(() => "?").join(",");

        const [duplicados] = await db.execute(
            `SELECT student_nie
             FROM users
             WHERE student_nie IN (${marcadores})`,
            nies
        );

        if (duplicados.length) {
            res.status(409).json({
                ok: false,
                mensaje: "Hay NIE que ya están registrados. No se guardó ninguna cuenta.",
                duplicados: duplicados.map(fila => fila.student_nie)
            });
            return null;
        }

        return { studentRoleId: roles[0].id };
    }

    async function crearEstudiante(
        conexion,
        registro,
        institucionId,
        creadorId,
        studentRoleId
    ) {
        const datos = registro.__validado;
        const codigo = codigoAleatorio();

        const passwordTemporal = crypto.randomBytes(32).toString("hex");
        const passwordHash = await bcrypt.hash(passwordTemporal, 12);

        const [usuarioInsertado] = await conexion.execute(
            `INSERT INTO users
             (email, student_nie, password_hash, first_name, last_name,
              global_role_id, is_active, approval_status)
             VALUES (NULL, ?, ?, ?, ?, ?, 0, 'pending')`,
            [
                datos.nie,
                passwordHash,
                datos.first_name,
                datos.last_name,
                studentRoleId
            ]
        );

        const userId = usuarioInsertado.insertId;

        await conexion.execute(
    `INSERT INTO students
     (user_id, institution_id, registered_by, student_code,
      grade_level, section, birth_date, guardian_name,
      guardian_phone, middle_name, sex, approval_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
        userId,
        institucionId,
        creadorId,
        datos.nie,
        datos.grade_level,
        datos.section,
        datos.birth_date,
        datos.guardian_name,
        datos.guardian_phone,
        datos.middle_name,
        datos.sex
    ]
);

        await conexion.execute(
            `INSERT INTO student_activation_codes
             (user_id, code_hash, expires_at, created_by)
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ${VIGENCIA_CODIGO_HORAS} HOUR), ?)`,
            [userId, hashCodigo(codigo), creadorId]
        );

        return {
            nie: datos.nie,
            nombre: `${datos.first_name} ${datos.last_name}`,
            codigo_activacion: codigo
        };
    }

    // Inscripción individual.
    app.post(
        "/api/estudiantes",
        verificarToken,
        async (req, res) => {
            const institucionId = leerInstitucion(req.body?.institution_id);

            if (!institucionId) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Seleccioná una institución válida."
                });
            }

            const { errores, registro } = normalizarRegistro(req.body || {});

            if (errores.length) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Revisá los datos del estudiante.",
                    errores
                });
            }

            try {
                const preparado = await prepararInscripciones(
                    [registro],
                    institucionId,
                    req.usuario.id,
                    res
                );

                if (!preparado) return;

                const conexion = await db.getConnection();

                try {
                    await conexion.beginTransaction();

                    const inscritos = [
                        await crearEstudiante(
                            conexion,
                            { __validado: registro },
                            institucionId,
                            req.usuario.id,
                            preparado.studentRoleId
                        )
                    ];

                    await conexion.commit();

                    return res.status(201).json({
                        ok: true,
                        mensaje: "Estudiante inscrito. Entregá el código de activación directamente al estudiante.",
                        estudiantes: inscritos
                    });
                } catch (error) {
                    await conexion.rollback();

                    if (error.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            ok: false,
                            mensaje: "El NIE ya está registrado."
                        });
                    }

                    throw error;
                } finally {
                    conexion.release();
                }
            } catch (error) {
                console.error("Inscribiendo estudiante:", error.message);

                if (!res.headersSent) {
                    return res.status(500).json({
                        ok: false,
                        mensaje: "No se pudo completar la inscripción."
                    });
                }
            }
        }
    );

    // Importación Excel.
    app.post(
        "/api/estudiantes/importar",
        verificarToken,
        (req, res) => {
            cargarArchivo(req, res, async errorCarga => {
                if (errorCarga) {
                    const limite = errorCarga.code === "LIMIT_FILE_SIZE";

                    return res.status(400).json({
                        ok: false,
                        mensaje: limite
                            ? "El archivo supera el límite de 5 MB."
                            : errorCarga.message || "No se pudo leer el archivo."
                    });
                }

                const institucionId = leerInstitucion(req.body?.institution_id);

                if (!institucionId) {
                    return res.status(400).json({
                        ok: false,
                        mensaje: "Seleccioná una institución válida."
                    });
                }

                if (!req.file) {
                    return res.status(400).json({
                        ok: false,
                        mensaje: "Seleccioná un archivo .xlsx."
                    });
                }

                try {
                    const libro = XLSX.read(req.file.buffer, {
                        type: "buffer",
                        cellDates: true
                    });

                    const nombreHoja = libro.SheetNames[0];

                    if (!nombreHoja) {
                        return res.status(400).json({
                            ok: false,
                            mensaje: "El archivo no contiene una hoja de cálculo."
                        });
                    }

                    const filasExcel = XLSX.utils.sheet_to_json(
                        libro.Sheets[nombreHoja],
                        { defval: "", raw: true }
                    );

                    if (
                        !filasExcel.length ||
                        filasExcel.length > MAX_FILAS_EXCEL
                    ) {
                        return res.status(400).json({
                            ok: false,
                            mensaje: `El archivo debe contener entre 1 y ${MAX_FILAS_EXCEL} estudiantes.`
                        });
                    }

                    const campos = [
                        "first_name", "middle_name", "last_name", "nie",
                        "birth_date", "sex", "grade_level", "section",
                        "guardian_name", "guardian_phone"
                    ];

                    const registros = filasExcel.map(fila => {
                        const normalizados = {};

                        for (const [clave, valor] of Object.entries(fila)) {
                            normalizados[
                                texto(clave).toLowerCase().replace(/\s+/g, "_")
                            ] = valor;
                        }

                        const registro = {};

                        for (const campo of campos) {
                            registro[campo] = normalizados[campo] ?? "";
                        }

                        return registro;
                    });

                    const preparado = await prepararInscripciones(
                        registros,
                        institucionId,
                        req.usuario.id,
                        res
                    );

                    if (!preparado) return;

                    const conexion = await db.getConnection();

                    try {
                        await conexion.beginTransaction();

                        const inscritos = [];

                        for (const registro of registros) {
                            inscritos.push(
                                await crearEstudiante(
                                    conexion,
                                    registro,
                                    institucionId,
                                    req.usuario.id,
                                    preparado.studentRoleId
                                )
                            );
                        }

                        await conexion.commit();

                        return res.status(201).json({
                            ok: true,
                            mensaje: `Se inscribieron ${inscritos.length} estudiantes. Entregá cada código al estudiante correspondiente.`,
                            total: inscritos.length,
                            estudiantes: inscritos
                        });
                    } catch (error) {
                        await conexion.rollback();

                        if (error.code === "ER_DUP_ENTRY") {
                            return res.status(409).json({
                                ok: false,
                                mensaje: "Se detectó un NIE duplicado. No se guardó la importación."
                            });
                        }

                        throw error;
                    } finally {
                        conexion.release();
                    }
                } catch (error) {
                    console.error("Importando estudiantes:", error.message);

                    if (!res.headersSent) {
                        return res.status(500).json({
                            ok: false,
                            mensaje: "No se pudo importar el archivo."
                        });
                    }
                }
            });
        }
    );

    // Activación pública: el estudiante crea su contraseña personal.
    app.post("/api/estudiantes/activar", async (req, res) => {
        const nie = texto(req.body?.nie).toUpperCase();
        const codigo = texto(req.body?.code).toUpperCase();
        const password = String(req.body?.password || "");

        if (
            !nie ||
            nie.length > 30 ||
            !/^[A-F0-9]{10}$/.test(codigo) ||
            Buffer.byteLength(password, "utf8") < 10 ||
            Buffer.byteLength(password, "utf8") > 72
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "Verificá el NIE, el código y la contraseña. La contraseña debe tener entre 10 y 72 bytes."
            });
        }

        let conexion;

        try {
            conexion = await db.getConnection();
            await conexion.beginTransaction();

            const [usuarios] = await conexion.execute(
                `SELECT
                    u.id,
                    u.is_active,
                    u.approval_status AS user_approval_status,
                    s.approval_status AS student_approval_status
                 FROM users u
                 INNER JOIN students s ON s.user_id = u.id
                 INNER JOIN roles r ON r.id = u.global_role_id
                 WHERE UPPER(u.student_nie) = ?
                   AND r.name = 'student'
                 LIMIT 1
                 FOR UPDATE`,
                [nie]
            );

            if (!usuarios.length || Number(usuarios[0].is_active) === 1) {
                await conexion.rollback();

                return res.status(400).json({
                    ok: false,
                    mensaje: "No se pudo activar la cuenta. Verificá el NIE y el código."
                });
            }

            const usuario = usuarios[0];

            if (
                usuario.student_approval_status !== "approved" ||
                usuario.user_approval_status !== "approved"
            ) {
                await conexion.rollback();

                const rechazada =
                    usuario.student_approval_status === "rejected" ||
                    usuario.user_approval_status === "rejected";

                return res.status(403).json({
                    ok: false,
                    mensaje: rechazada
                        ? "La inscripción fue rechazada. Contactá a la institución."
                        : "La inscripción todavía está pendiente de aprobación."
                });
            }

            const [activaciones] = await conexion.execute(
                `SELECT
                    id,
                    code_hash,
                    used_at,
                    attempts,
                    (expires_at <= NOW()) AS expired,
                    (locked_until IS NOT NULL AND locked_until > NOW()) AS is_locked
                 FROM student_activation_codes
                 WHERE user_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [usuario.id]
            );

            if (!activaciones.length) {
                await conexion.rollback();

                return res.status(400).json({
                    ok: false,
                    mensaje: "No se encontró un código de activación válido."
                });
            }

            const activacion = activaciones[0];

            if (activacion.used_at) {
                await conexion.rollback();

                return res.status(400).json({
                    ok: false,
                    mensaje: "Este código ya fue utilizado."
                });
            }

            if (Number(activacion.is_locked) === 1) {
                await conexion.rollback();

                return res.status(429).json({
                    ok: false,
                    mensaje: "Demasiados intentos. Esperá 15 minutos."
                });
            }

            if (Number(activacion.expired) === 1) {
                await conexion.rollback();

                return res.status(400).json({
                    ok: false,
                    mensaje: "El código venció. Contactá al responsable de la inscripción."
                });
            }

            const hashIngresado = Buffer.from(hashCodigo(codigo), "hex");
            const hashGuardado = Buffer.from(String(activacion.code_hash), "hex");

            const codigoValido =
                hashIngresado.length === hashGuardado.length &&
                crypto.timingSafeEqual(hashIngresado, hashGuardado);

            if (!codigoValido) {
                const intentos = Number(activacion.attempts || 0) + 1;

                await conexion.execute(
                    `UPDATE student_activation_codes
                     SET attempts = ?,
                         locked_until = CASE
                             WHEN ? >= ?
                             THEN DATE_ADD(NOW(), INTERVAL ${DURACION_BLOQUEO_MINUTOS} MINUTE)
                             ELSE NULL
                         END
                     WHERE id = ? AND used_at IS NULL`,
                    [intentos, intentos, INTENTOS_MAXIMOS, activacion.id]
                );

                await conexion.commit();

                const bloqueado = intentos >= INTENTOS_MAXIMOS;

                return res.status(bloqueado ? 429 : 400).json({
                    ok: false,
                    mensaje: bloqueado
                        ? "Se alcanzó el límite de intentos. Esperá 15 minutos."
                        : `Código incorrecto. Intento ${intentos} de ${INTENTOS_MAXIMOS}.`
                });
            }

            const passwordHash = await bcrypt.hash(password, 12);

            const [actualizacionUsuario] = await conexion.execute(
                `UPDATE users
                 SET password_hash = ?,
                     is_active = 1,
                     updated_at = NOW()
                 WHERE id = ?
                   AND is_active = 0
                   AND approval_status = 'approved'`,
                [passwordHash, usuario.id]
            );

            if (actualizacionUsuario.affectedRows !== 1) {
                await conexion.rollback();

                return res.status(409).json({
                    ok: false,
                    mensaje: "La cuenta cambió de estado. Consultá con el administrador."
                });
            }

            const [actualizacionCodigo] = await conexion.execute(
                `UPDATE student_activation_codes
                 SET used_at = NOW()
                 WHERE id = ?
                   AND user_id = ?
                   AND used_at IS NULL
                   AND expires_at > NOW()`,
                [activacion.id, usuario.id]
            );

            if (actualizacionCodigo.affectedRows !== 1) {
                await conexion.rollback();

                return res.status(409).json({
                    ok: false,
                    mensaje: "El código venció o ya fue utilizado."
                });
            }

            await conexion.commit();

            return res.json({
                ok: true,
                mensaje: "Cuenta activada correctamente. Ya podés iniciar sesión con tu NIE y tu nueva contraseña."
            });
        } catch (error) {
            if (conexion) {
                try {
                    await conexion.rollback();
                } catch (errorRollback) {
                    console.error("Error al revertir activación:", errorRollback.message);
                }
            }

            console.error("Activando estudiante:", error.message);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo activar la cuenta. Intentá nuevamente."
            });
        } finally {
            if (conexion) conexion.release();
        }
    });
}

module.exports = registrarRutasEstudiantes;
