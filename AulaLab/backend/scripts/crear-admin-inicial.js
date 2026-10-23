const db = require('../database');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const pool = typeof db.promise === 'function' ? db.promise() : db;

async function consultar(sql, params = []) {
  const resultado = await pool.query(sql, params);
  return Array.isArray(resultado[0]) ? resultado[0] : resultado;
}

async function ejecutar() {
  const correo = process.env.AULALAB_ADMIN_EMAIL?.trim().toLowerCase();
  const nombre = process.env.AULALAB_ADMIN_NOMBRE?.trim();
  const apellido = process.env.AULALAB_ADMIN_APELLIDO?.trim();
  const password = process.env.AULALAB_ADMIN_PASSWORD;

  if (!correo || !nombre || !apellido || !password) {
    throw new Error('Faltan datos. Ejecutá el script desde el bloque de terminal indicado.');
  }

  if (password.length < 12) {
    throw new Error('La contraseña debe tener al menos 12 caracteres.');
  }

  const roles = await consultar(
    "SELECT id, name FROM roles WHERE id = 4 AND name = 'platform_admin' LIMIT 1"
  );

  if (!roles.length) {
    throw new Error(
      'No se encontró el rol platform_admin con id 4. No se modificó la base de datos.'
    );
  }

  const existentes = await consultar(
    'SELECT id FROM users WHERE global_role_id = 4 LIMIT 1'
  );

  if (existentes.length) {
    throw new Error(
      'Ya existe una cuenta con rol platform_admin. No se creó otra cuenta.'
    );
  }

  const porCorreo = await consultar(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [correo]
  );

  if (porCorreo.length) {
    throw new Error(
      'Ese correo ya está registrado. No se modificó la cuenta existente.'
    );
  }

  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users
      (email, password_hash, first_name, last_name,
       is_active, global_role_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, 4, NOW(), NOW())`,
    [correo, hash, nombre, apellido]
  );

  console.log('\nCuenta de administrador global creada correctamente.');
  console.log('Correo:', correo);
  console.log('Rol: platform_admin');
  console.log('Ya podés intentar iniciar sesión en AulaLab.');
}

ejecutar()
  .catch((error) => {
    console.error('\nNo se creó la cuenta:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (typeof pool.end === 'function') {
      await pool.end();
    }
  });
