-- AulaLab: inscripción y activación segura de estudiantes.
-- Revisar y respaldar la base de datos antes de ejecutar.

ALTER TABLE users
    MODIFY COLUMN email VARCHAR(150) NULL,
    ADD COLUMN student_nie VARCHAR(30) NULL,
    ADD UNIQUE KEY uq_users_student_nie (student_nie);

ALTER TABLE students
    ADD COLUMN middle_name VARCHAR(100) NULL,
    ADD COLUMN sex VARCHAR(20) NULL;

CREATE TABLE student_activation_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    code_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    attempts INT NOT NULL DEFAULT 0,
    locked_until DATETIME NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activation_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_activation_creator
        FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_activation_expiry (expires_at),
    INDEX idx_activation_used (used_at)
) ENGINE=InnoDB;
