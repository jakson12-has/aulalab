-- AulaLab: migración de compatibilidad de autenticación, estudiantes y progreso.
-- Ejecutar una sola vez en la base correcta; las comprobaciones hacen que pueda repetirse.
-- Hacé un respaldo antes de ejecutarla en producción.
SET @db_name = DATABASE();

-- Usuarios: permitir email NULL para estudiantes que inician sesión con NIE.
ALTER TABLE users MODIFY COLUMN email VARCHAR(150) NULL;

-- Agregar columnas faltantes sin duplicarlas.
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='student_nie')=0,
  'ALTER TABLE users ADD COLUMN student_nie VARCHAR(30) NULL AFTER email',
  'SELECT "users.student_nie ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='approved_by')=0,
  'ALTER TABLE users ADD COLUMN approved_by INT NULL',
  'SELECT "users.approved_by ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='approved_at')=0,
  'ALTER TABLE users ADD COLUMN approved_at DATETIME NULL',
  'SELECT "users.approved_at ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='rejection_reason')=0,
  'ALTER TABLE users ADD COLUMN rejection_reason TEXT NULL',
  'SELECT "users.rejection_reason ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='approval_status')=0,
  "ALTER TABLE users ADD COLUMN approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER is_active",
  'SELECT "users.approval_status ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Un NIE no puede repetirse. Si hay NIE duplicados preexistentes, crear el índice fallará;
-- en ese caso hay que revisar esos registros antes de continuar.
SET @sql = IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND INDEX_NAME='uq_users_student_nie')=0,
  'ALTER TABLE users ADD UNIQUE INDEX uq_users_student_nie (student_nie)',
  'SELECT "Índice uq_users_student_nie ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Datos adicionales de inscripción y aprobación de estudiantes.
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='students' AND COLUMN_NAME='registered_by')=0,
  'ALTER TABLE students ADD COLUMN registered_by INT NULL',
  'SELECT "students.registered_by ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='students' AND COLUMN_NAME='middle_name')=0,
  'ALTER TABLE students ADD COLUMN middle_name VARCHAR(100) NULL',
  'SELECT "students.middle_name ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='students' AND COLUMN_NAME='sex')=0,
  "ALTER TABLE students ADD COLUMN sex ENUM('F','M','O','N') NULL",
  'SELECT "students.sex ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='students' AND COLUMN_NAME='approval_status')=0,
  "ALTER TABLE students ADD COLUMN approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'",
  'SELECT "students.approval_status ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='students' AND COLUMN_NAME='rejection_reason')=0,
  'ALTER TABLE students ADD COLUMN rejection_reason TEXT NULL',
  'SELECT "students.rejection_reason ya existe" AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Códigos de activación: solo se almacena el hash del código, nunca el código en claro.
CREATE TABLE IF NOT EXISTS student_activation_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    attempts INT NOT NULL DEFAULT 0,
    locked_until DATETIME NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_student_activation_user (user_id),
    CONSTRAINT fk_activation_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_activation_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Progreso de la actividad de química utilizado por rutas-progreso.js.
CREATE TABLE IF NOT EXISTS student_activity_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    activity_key VARCHAR(100) NOT NULL,
    progress_percentage TINYINT UNSIGNED NOT NULL DEFAULT 0,
    main_progress JSON NOT NULL,
    extra_progress JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_student_activity_progress (student_id, activity_key),
    CONSTRAINT fk_activity_progress_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Solicitudes para que docentes pidan acceso administrativo previo.
CREATE TABLE IF NOT EXISTS admin_access_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_user_id INT NOT NULL,
    justification TEXT NOT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,
    rejection_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_access_requester FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_admin_access_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Solicitudes de administración institucional.
CREATE TABLE IF NOT EXISTS administrator_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution_id INT NOT NULL,
    requester_user_id INT NOT NULL,
    requested_role VARCHAR(50) NOT NULL DEFAULT 'institution_admin',
    justification TEXT NOT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,
    rejection_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id),
    FOREIGN KEY (requester_user_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Fin de la migración.
