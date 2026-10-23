"use strict";

const ACTIVIDAD = "quimica";
const CLAVES_EXTRA = [
    "atomos", "densidad", "moleculas", "detective", "misiones"
];

function calcularPorcentaje(principal, extra) {
    const tareas = [
        principal.phCompletado,
        principal.balanceoCompletado,
        principal.quizCompletado,
        ...CLAVES_EXTRA.map(k => extra.completadas[k])
    ];

    return Math.round(
        tareas.filter(Boolean).length / tareas.length * 100
    );
}

function registrarRutasProgreso({ app, db, verificarToken }) {
    async function buscarEstudiante(userId) {
        const [rows] = await db.query(
            `SELECT s.id
             FROM students s
             JOIN users u ON u.id = s.user_id
             WHERE s.user_id = ?
               AND s.approval_status = 'approved'
               AND u.is_active = 1
             LIMIT 1`,
            [userId]
        );

        return rows[0] || null;
    }

    function validarProgreso(body) {
        const principal = body?.main_progress;
        const extra = body?.extra_progress;

        if (
            !principal || typeof principal !== "object" ||
            !extra || typeof extra !== "object" ||
            !extra.completadas ||
            typeof extra.completadas !== "object"
        ) {
            return null;
        }

        for (const k of [
            "phCompletado", "balanceoCompletado", "quizCompletado"
        ]) {
            if (typeof principal[k] !== "boolean") return null;
        }

        for (const k of CLAVES_EXTRA) {
            if (typeof extra.completadas[k] !== "boolean") return null;
        }

        const principalSeguro = {
            nivel: ["bachillerato", "basico"].includes(principal.nivel)
                ? principal.nivel : "bachillerato",
            elementosExplorados: Array.isArray(principal.elementosExplorados)
                ? principal.elementosExplorados.slice(0, 120)
                : [],
            phCompletado: principal.phCompletado,
            balanceoCompletado: principal.balanceoCompletado,
            quizCompletado: principal.quizCompletado,
            mejorPuntaje: Number.isFinite(principal.mejorPuntaje)
                ? Math.max(0, Math.min(100, principal.mejorPuntaje)) : 0,
            ultimoPuntaje: Number.isFinite(principal.ultimoPuntaje)
                ? Math.max(0, Math.min(100, principal.ultimoPuntaje)) : null
        };

        const extraSeguro = {
            puntos: Number.isFinite(extra.puntos)
                ? Math.max(0, Math.min(100000, extra.puntos)) : 0,
            completadas: Object.fromEntries(
                CLAVES_EXTRA.map(k => [k, extra.completadas[k]])
            ),
            insignias: Array.isArray(extra.insignias)
                ? extra.insignias.slice(0, 100) : [],
            casosResueltos: Array.isArray(extra.casosResueltos)
                ? extra.casosResueltos.slice(0, 100) : [],
            casosConPuntos: Array.isArray(extra.casosConPuntos)
                ? extra.casosConPuntos.slice(0, 100) : [],
            casoActual: Number.isInteger(extra.casoActual)
                ? Math.max(0, Math.min(4, extra.casoActual)) : 0
        };

        return {
            principal: principalSeguro,
            extra: extraSeguro,
            porcentaje: calcularPorcentaje(principalSeguro, extraSeguro)
        };
    }

    app.get(
        "/api/progreso/actividades/:activityKey",
        verificarToken,
        async (req, res) => {
            try {
                if (
                    req.params.activityKey !== ACTIVIDAD ||
                    req.usuario.rol !== "student"
                ) {
                    return res.status(403).json({
                        ok: false,
                        mensaje: "Esta consulta es solo para estudiantes."
                    });
                }

                const estudiante = await buscarEstudiante(req.usuario.id);

                if (!estudiante) {
                    return res.status(403).json({
                        ok: false,
                        mensaje: "Tu cuenta estudiantil no está aprobada o activa."
                    });
                }

                const [rows] = await db.query(
                    `SELECT progress_percentage, main_progress,
                            extra_progress, updated_at
                     FROM student_activity_progress
                     WHERE student_id = ? AND activity_key = ?
                     LIMIT 1`,
                    [estudiante.id, ACTIVIDAD]
                );

                return res.json({
                    ok: true,
                    progreso: rows[0] || null
                });
            } catch (error) {
                console.error("Leyendo progreso:", error.message);
                return res.status(500).json({
                    ok: false,
                    mensaje: "No se pudo recuperar el progreso."
                });
            }
        }
    );

    app.put(
        "/api/progreso/actividades/:activityKey",
        verificarToken,
        async (req, res) => {
            try {
                if (
                    req.params.activityKey !== ACTIVIDAD ||
                    req.usuario.rol !== "student"
                ) {
                    return res.status(403).json({
                        ok: false,
                        mensaje: "Esta acción es solo para estudiantes."
                    });
                }

                const estudiante = await buscarEstudiante(req.usuario.id);

                if (!estudiante) {
                    return res.status(403).json({
                        ok: false,
                        mensaje: "Tu cuenta estudiantil no está aprobada o activa."
                    });
                }

                const datos = validarProgreso(req.body);

                if (!datos) {
                    return res.status(400).json({
                        ok: false,
                        mensaje: "Los datos de progreso no son válidos."
                    });
                }

                await db.query(
                    `INSERT INTO student_activity_progress
                        (student_id, activity_key, progress_percentage,
                         main_progress, extra_progress)
                     VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        progress_percentage = VALUES(progress_percentage),
                        main_progress = VALUES(main_progress),
                        extra_progress = VALUES(extra_progress)`,
                    [
                        estudiante.id,
                        ACTIVIDAD,
                        datos.porcentaje,
                        JSON.stringify(datos.principal),
                        JSON.stringify(datos.extra)
                    ]
                );

                return res.json({
                    ok: true,
                    porcentaje: datos.porcentaje,
                    mensaje: "Progreso guardado en AulaLab."
                });
            } catch (error) {
                console.error("Guardando progreso:", error.message);
                return res.status(500).json({
                    ok: false,
                    mensaje: "No se pudo guardar el progreso en MySQL."
                });
            }
        }
    );

    app.get(
        "/api/docente/progreso/actividades/:activityKey",
        verificarToken,
        async (req, res) => {
            try {
                if (
                    !["teacher", "institution_admin"].includes(req.usuario.rol) ||
                    req.params.activityKey !== ACTIVIDAD
                ) {
                    return res.status(403).json({
                        ok: false,
                        mensaje: "No tenés permiso para consultar estos datos."
                    });
                }

                const [rows] = await db.query(
                    `SELECT
                        s.id AS student_id,
                        s.student_code,
                        u.first_name,
                        u.last_name,
                        i.name AS institution_name,
                        COALESCE(p.progress_percentage, 0) AS porcentaje,
                        p.updated_at
                     FROM institution_users iu
                     JOIN institutions i
                       ON i.id = iu.institution_id
                      AND i.is_active = 1
                     JOIN students s
                       ON s.institution_id = iu.institution_id
                      AND s.approval_status = 'approved'
                     JOIN users u
                       ON u.id = s.user_id AND u.is_active = 1
                     LEFT JOIN student_activity_progress p
                       ON p.student_id = s.id
                      AND p.activity_key = ?
                     WHERE iu.user_id = ?
                       AND iu.is_active = 1
                       AND (
                           (iu.role_id = 3)
                           OR
                           (iu.role_id = 2 AND s.registered_by = iu.user_id)
                       )
                     ORDER BY u.last_name, u.first_name`,
                    [ACTIVIDAD, req.usuario.id]
                );

                return res.json({ ok: true, estudiantes: rows });
            } catch (error) {
                console.error("Consultando progreso docente:", error.message);
                return res.status(500).json({
                    ok: false,
                    mensaje: "No se pudo consultar el progreso de estudiantes."
                });
            }
        }
    );
}

module.exports = registrarRutasProgreso;
