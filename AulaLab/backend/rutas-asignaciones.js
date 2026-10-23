"use strict";

module.exports = function registrarRutasAsignaciones({ app, db, verificarToken }) {
    async function comprobarAdministradorInstitucional(usuarioId, institucionId) {
        const [filas] = await db.execute(
            `SELECT iu.institution_id
             FROM institution_users iu
             INNER JOIN roles r ON r.id = iu.role_id
             INNER JOIN institutions i ON i.id = iu.institution_id
             INNER JOIN users u ON u.id = iu.user_id
             WHERE iu.user_id = ?
               AND iu.institution_id = ?
               AND iu.is_active = 1
               AND r.name = 'institution_admin'
               AND i.is_active = 1
               AND u.is_active = 1
             LIMIT 1`,
            [usuarioId, institucionId]
        );
        return filas.length > 0;
    }

    async function exigirAdministrador(req, res, institucionId) {
        const id = Number(institucionId);
        if (!Number.isInteger(id) || id <= 0) {
            res.status(400).json({ ok: false, mensaje: "Seleccioná una institución válida." });
            return false;
        }
        const autorizado = await comprobarAdministradorInstitucional(Number(req.usuario.id), id);
        if (!autorizado) {
            res.status(403).json({
                ok: false,
                mensaje: "No tenés permisos de administración para esta institución."
            });
            return false;
        }
        return true;
    }

    app.get("/api/instituciones/:institutionId/docentes/buscar", verificarToken, async (req, res) => {
        try {
            const institutionId = Number(req.params.institutionId);
            if (!(await exigirAdministrador(req, res, institutionId))) return;

            const q = String(req.query.q || "").trim();
            if (q.length < 2 || q.length > 100) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Escribí entre 2 y 100 caracteres para buscar."
                });
            }

            const term = `%${q}%`;
            const [usuarios] = await db.execute(
                `SELECT u.id AS user_id, u.first_name, u.last_name, u.email
                 FROM users u
                 INNER JOIN roles rg ON rg.id = u.global_role_id
                 LEFT JOIN teachers t ON t.user_id = u.id
                 WHERE rg.name = 'teacher'
                   AND u.is_active = 1
                   AND (u.approval_status = 'approved' OR u.approval_status IS NULL)
                   AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)
                   AND (t.id IS NULL OR t.institution_id IS NULL OR t.institution_id = ?)
                   AND NOT EXISTS (
                       SELECT 1
                       FROM institution_users iu
                       INNER JOIN roles ri ON ri.id = iu.role_id
                       WHERE iu.user_id = u.id
                         AND iu.institution_id = ?
                         AND iu.is_active = 1
                         AND ri.name = 'teacher'
                   )
                 ORDER BY u.first_name, u.last_name
                 LIMIT 20`,
                [term, term, term, institutionId, institutionId]
            );
            res.json({ ok: true, usuarios });
        } catch (error) {
            console.error("Buscando docentes para institución:", error.message);
            res.status(500).json({ ok: false, mensaje: "No se pudo buscar docentes." });
        }
    });

    app.post("/api/instituciones/:institutionId/docentes", verificarToken, async (req, res) => {
        let connection;
        try {
            const institutionId = Number(req.params.institutionId);
            if (!(await exigirAdministrador(req, res, institutionId))) return;

            const userId = Number(req.body.user_id);
            if (!Number.isInteger(userId) || userId <= 0) {
                return res.status(400).json({ ok: false, mensaje: "Seleccioná una cuenta docente válida." });
            }

            const [users] = await db.execute(
                `SELECT u.id, u.is_active, u.approval_status, r.name AS rol
                 FROM users u
                 INNER JOIN roles r ON r.id = u.global_role_id
                 WHERE u.id = ? LIMIT 1`,
                [userId]
            );
            if (
                users.length === 0 ||
                users[0].rol !== "teacher" ||
                Number(users[0].is_active) !== 1 ||
                ![null, undefined, "approved"].includes(users[0].approval_status)
            ) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "La cuenta no es un docente activo y aprobado."
                });
            }

            const [institutions] = await db.execute(
                "SELECT id FROM institutions WHERE id = ? AND is_active = 1 LIMIT 1",
                [institutionId]
            );
            if (institutions.length === 0) {
                return res.status(404).json({ ok: false, mensaje: "La institución no existe o está desactivada." });
            }

            const [teacherRows] = await db.execute(
                "SELECT id, institution_id FROM teachers WHERE user_id = ? LIMIT 1",
                [userId]
            );
            if (teacherRows.length && teacherRows[0].institution_id &&
                Number(teacherRows[0].institution_id) !== institutionId) {
                return res.status(409).json({
                    ok: false,
                    mensaje: "Este perfil docente ya está vinculado a otra institución."
                });
            }

            const [already] = await db.execute(
                `SELECT iu.id
                 FROM institution_users iu
                 INNER JOIN roles r ON r.id = iu.role_id
                 WHERE iu.user_id = ? AND iu.institution_id = ?
                   AND iu.is_active = 1 AND r.name = 'teacher'
                 LIMIT 1`,
                [userId, institutionId]
            );
            if (already.length) {
                return res.status(409).json({ ok: false, mensaje: "Este docente ya está vinculado a la institución." });
            }

            const [teacherRole] = await db.execute(
                "SELECT id FROM roles WHERE name = 'teacher' LIMIT 1"
            );
            if (!teacherRole.length) {
                return res.status(500).json({ ok: false, mensaje: "Falta configurar el rol teacher en la tabla roles." });
            }

            connection = await db.getConnection();
            await connection.beginTransaction();
            await connection.execute(
                `INSERT INTO teachers (user_id, institution_id)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE institution_id = VALUES(institution_id)`,
                [userId, institutionId]
            );
            await connection.execute(
                `INSERT INTO institution_users (institution_id, user_id, role_id, is_active)
                 VALUES (?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE is_active = 1`,
                [institutionId, userId, teacherRole[0].id]
            );
            await connection.commit();
            res.status(201).json({ ok: true, mensaje: "Docente vinculado correctamente." });
        } catch (error) {
            if (connection) {
                try { await connection.rollback(); } catch {}
            }
            console.error("Vinculando docente:", error.message);
            res.status(500).json({ ok: false, mensaje: "No se pudo vincular el docente." });
        } finally {
            if (connection) connection.release();
        }
    });

    app.get("/api/instituciones/:institutionId/docentes", verificarToken, async (req, res) => {
        try {
            const institutionId = Number(req.params.institutionId);
            if (!(await exigirAdministrador(req, res, institutionId))) return;
            const [docentes] = await db.execute(
                `SELECT u.id AS user_id, u.first_name, u.last_name, u.email,
                        t.teacher_code, t.specialization, iu.joined_at
                 FROM institution_users iu
                 INNER JOIN roles r ON r.id = iu.role_id
                 INNER JOIN users u ON u.id = iu.user_id
                 LEFT JOIN teachers t ON t.user_id = u.id
                 WHERE iu.institution_id = ?
                   AND iu.is_active = 1
                   AND r.name = 'teacher'
                 ORDER BY u.first_name, u.last_name`,
                [institutionId]
            );
            res.json({ ok: true, docentes });
        } catch (error) {
            console.error("Listando docentes institucionales:", error.message);
            res.status(500).json({ ok: false, mensaje: "No se pudo cargar la lista de docentes." });
        }
    });
};
