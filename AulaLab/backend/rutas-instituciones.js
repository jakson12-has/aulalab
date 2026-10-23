module.exports = function registrarRutasInstituciones({ app, db, verificarToken }) {
  "use strict";

  function idValido(valor) {
    const id = Number(valor);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }

  async function comprobarAdministrador(req, institutionId) {
    const [instituciones] = await db.execute(
      `SELECT i.id, i.is_active, u.is_active AS user_active,
              rg.name AS global_role
       FROM institutions i
       INNER JOIN users u ON u.id = ?
       LEFT JOIN roles rg ON rg.id = u.global_role_id
       WHERE i.id = ?
       LIMIT 1`,
      [req.usuario.id, institutionId]
    );

    if (!instituciones.length || Number(instituciones[0].is_active) !== 1) {
      return { ok: false, status: 404, mensaje: "La institución no existe o está inactiva." };
    }
    if (Number(instituciones[0].user_active) !== 1) {
      return { ok: false, status: 401, mensaje: "Tu cuenta está inactiva." };
    }
    if (instituciones[0].global_role === "platform_admin") return { ok: true };

    const [membresias] = await db.execute(
      `SELECT iu.id
       FROM institution_users iu
       INNER JOIN roles r ON r.id = iu.role_id
       WHERE iu.user_id = ? AND iu.institution_id = ?
         AND iu.is_active = 1 AND r.name = 'institution_admin'
       LIMIT 1`,
      [req.usuario.id, institutionId]
    );
    if (!membresias.length) {
      return { ok: false, status: 403, mensaje: "No tenés permisos activos para administrar esta institución." };
    }
    return { ok: true };
  }

  async function prepararRuta(req, res) {
    const institutionId = idValido(req.params.institutionId);
    if (!institutionId) {
      res.status(400).json({ ok: false, mensaje: "El identificador de la institución no es válido." });
      return null;
    }
    const acceso = await comprobarAdministrador(req, institutionId);
    if (!acceso.ok) {
      res.status(acceso.status).json({ ok: false, mensaje: acceso.mensaje });
      return null;
    }
    return institutionId;
  }

  app.get(
    "/api/instituciones/:institutionId/docentes",
    verificarToken,
    async (req, res) => {
      try {
        const institutionId = await prepararRuta(req, res);
        if (!institutionId) return;

        const [docentes] = await db.execute(
          `SELECT u.id AS user_id, t.id AS teacher_id, u.email,
                  u.first_name, u.last_name, t.specialization
           FROM institution_users iu
           INNER JOIN roles r ON r.id = iu.role_id AND r.name = 'teacher'
           INNER JOIN users u ON u.id = iu.user_id
           LEFT JOIN teachers t ON t.user_id = u.id
           WHERE iu.institution_id = ? AND iu.is_active = 1
             AND u.is_active = 1 AND u.approval_status = 'approved'
           ORDER BY u.last_name, u.first_name, u.email`,
          [institutionId]
        );
        res.json({ ok: true, docentes });
      } catch (error) {
        console.error("Listando docentes institucionales:", error.message);
        res.status(500).json({ ok: false, mensaje: "No se pudieron cargar los docentes de la institución." });
      }
    }
  );

  app.get(
    "/api/instituciones/:institutionId/docentes/buscar",
    verificarToken,
    async (req, res) => {
      try {
        const institutionId = await prepararRuta(req, res);
        if (!institutionId) return;

        const q = String(req.query.q || "").trim();
        if (q.length < 2 || q.length > 100) {
          return res.status(400).json({ ok: false, mensaje: "Escribí entre 2 y 100 caracteres para buscar." });
        }
        const termino = `%${q}%`;
        const [usuarios] = await db.execute(
          `SELECT u.id AS user_id, u.email, u.first_name, u.last_name
           FROM users u
           INNER JOIN roles rg ON rg.id = u.global_role_id AND rg.name = 'teacher'
           LEFT JOIN institution_users iu
             ON iu.user_id = u.id AND iu.institution_id = ?
             AND iu.role_id = (SELECT id FROM roles WHERE name = 'teacher' LIMIT 1)
             AND iu.is_active = 1
           WHERE u.is_active = 1 AND u.approval_status = 'approved'
             AND iu.id IS NULL
             AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)
           ORDER BY u.last_name, u.first_name
           LIMIT 30`,
          [institutionId, termino, termino, termino]
        );
        res.json({ ok: true, usuarios });
      } catch (error) {
        console.error("Buscando docentes institucionales:", error.message);
        res.status(500).json({ ok: false, mensaje: "No se pudieron buscar docentes. Revisá la configuración de la base de datos." });
      }
    }
  );

  app.post(
    "/api/instituciones/:institutionId/docentes",
    verificarToken,
    async (req, res) => {
      const institutionId = idValido(req.params.institutionId);
      const userId = idValido(req.body?.user_id);
      if (!institutionId || !userId) {
        return res.status(400).json({ ok: false, mensaje: "La institución o el docente seleccionado no son válidos." });
      }

      try {
        const acceso = await comprobarAdministrador(req, institutionId);
        if (!acceso.ok) return res.status(acceso.status).json({ ok: false, mensaje: acceso.mensaje });

        const connection = await db.getConnection();
        try {
          await connection.beginTransaction();
          const [usuarios] = await connection.execute(
            `SELECT u.id, u.is_active, u.approval_status, r.name AS global_role
             FROM users u
             INNER JOIN roles r ON r.id = u.global_role_id
             WHERE u.id = ? LIMIT 1 FOR UPDATE`,
            [userId]
          );
          if (!usuarios.length || usuarios[0].global_role !== "teacher" ||
              Number(usuarios[0].is_active) !== 1 || usuarios[0].approval_status !== "approved") {
            await connection.rollback();
            return res.status(404).json({ ok: false, mensaje: "La cuenta no es un docente activo y aprobado." });
          }

          const [roles] = await connection.execute(
            "SELECT id FROM roles WHERE name = 'teacher' LIMIT 1"
          );
          if (!roles.length) throw new Error("No está configurado el rol teacher.");

          const [existentes] = await connection.execute(
            `SELECT id FROM institution_users
             WHERE institution_id = ? AND user_id = ? AND role_id = ?
             LIMIT 1 FOR UPDATE`,
            [institutionId, userId, roles[0].id]
          );
          if (existentes.length) {
            await connection.execute(
              "UPDATE institution_users SET is_active = 1 WHERE id = ?",
              [existentes[0].id]
            );
          } else {
            await connection.execute(
              `INSERT INTO institution_users (institution_id, user_id, role_id, is_active)
               VALUES (?, ?, ?, 1)`,
              [institutionId, userId, roles[0].id]
            );
          }

          const [perfiles] = await connection.execute(
            "SELECT id, institution_id FROM teachers WHERE user_id = ? LIMIT 1 FOR UPDATE",
            [userId]
          );
          if (perfiles.length) {
            if (perfiles[0].institution_id == null) {
              await connection.execute(
                "UPDATE teachers SET institution_id = ? WHERE id = ?",
                [institutionId, perfiles[0].id]
              );
            }
          } else {
            await connection.execute(
              "INSERT INTO teachers (user_id, institution_id) VALUES (?, ?)",
              [userId, institutionId]
            );
          }

          await connection.commit();
          return res.json({ ok: true, mensaje: "Docente vinculado correctamente a la institución." });
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      } catch (error) {
        console.error("Vinculando docente a institución:", error.message);
        if (error.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ ok: false, mensaje: "El docente ya está vinculado a esta institución." });
        }
        return res.status(500).json({ ok: false, mensaje: "No se pudo vincular el docente. Revisá la configuración de la base de datos." });
      }
    }
  );
};
