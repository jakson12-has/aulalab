-- AulaLab: compatibilidad de autenticación y solicitudes institucionales.
-- Ejecutar una sola vez en la base de datos correcta. No borra registros.
SET @db_name = DATABASE();

SET @has_approval_status = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'approval_status'
);
SET @sql = IF(
  @has_approval_status = 0,
  "ALTER TABLE users ADD COLUMN approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER is_active",
  "SELECT 'users.approval_status ya existe' AS resultado"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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
