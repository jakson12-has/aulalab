
-- =========================================================
-- AULALAB: BASE DE DATOS COMPLETA
-- MySQL 8.0+
-- No elimina tablas ni registros existentes.
-- =========================================================


-- =========================================================
-- 1. ROLES Y PERMISOS
-- =========================================================

CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    module VARCHAR(80),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
) ENGINE=InnoDB;

-- =========================================================
-- 2. USUARIOS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    global_role_id INT,
    avatar_url TEXT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (global_role_id) REFERENCES roles(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================================================
-- 3. INSTITUCIONES Y SOLICITUDES
-- =========================================================

CREATE TABLE IF NOT EXISTS institutions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150),
    phone VARCHAR(30),
    address TEXT,
    logo_url TEXT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS institution_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution_id INT NOT NULL,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (institution_id) REFERENCES institutions(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    UNIQUE (institution_id, user_id, role_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS institution_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution_name VARCHAR(150) NOT NULL,
    institution_code VARCHAR(50),
    institution_email VARCHAR(150),
    institution_phone VARCHAR(30),
    institution_address TEXT,
    logo_url TEXT,
    requester_user_id INT NOT NULL,
    status ENUM('pending','approved','rejected')
      NOT NULL DEFAULT 'pending',
    reviewed_by INT,
    reviewed_at DATETIME,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_user_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================================================
-- 4. ESTUDIANTES Y DOCENTES
-- =========================================================

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    institution_id INT,
    student_code VARCHAR(50),
    grade_level VARCHAR(50),
    section VARCHAR(50),
    birth_date DATE,
    guardian_name VARCHAR(150),
    guardian_phone VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (institution_id) REFERENCES institutions(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    institution_id INT,
    teacher_code VARCHAR(50),
    specialization VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (institution_id) REFERENCES institutions(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================================================
-- 5. MATERIAS, CURSOS Y MATRÍCULAS
-- =========================================================

CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution_id INT,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    color VARCHAR(20),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution_id INT,
    teacher_id INT,
    subject_id INT,
    title VARCHAR(200) NOT NULL,
    description LONGTEXT,
    objectives LONGTEXT,
    instructions LONGTEXT,
    start_date DATE,
    due_date DATE,
    max_points DECIMAL(8,2) DEFAULT 100,
    status ENUM('draft','published','archived') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active','completed','dropped') DEFAULT 'active',
    final_grade DECIMAL(5,2),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    UNIQUE (course_id, student_id)
) ENGINE=InnoDB;

-- =========================================================
-- 6. LECCIONES, ACTIVIDADES Y PREGUNTAS
-- =========================================================

CREATE TABLE IF NOT EXISTS lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    content LONGTEXT,
    video_url TEXT,
    position INT DEFAULT 0,
    estimated_minutes INT,
    is_published TINYINT(1) DEFAULT 0,
    published_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id)
      ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lesson_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    activity_type ENUM('quiz','assignment','project','discussion')
      NOT NULL DEFAULT 'assignment',
    instructions LONGTEXT,
    points DECIMAL(6,2) DEFAULT 0,
    due_date DATETIME,
    is_published TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
      ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    question_text LONGTEXT NOT NULL,
    question_type ENUM('multiple_choice','true_false','short_answer')
      NOT NULL,
    points DECIMAL(6,2) DEFAULT 0,
    position INT DEFAULT 0,
    explanation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id)
      ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS question_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    option_text TEXT NOT NULL,
    is_correct TINYINT(1) DEFAULT 0,
    position INT DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES questions(id)
      ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    student_id INT NOT NULL,
    content LONGTEXT,
    file_url TEXT,
    submitted_at DATETIME,
    status ENUM('submitted','graded','pending') DEFAULT 'pending',
    grade DECIMAL(6,2),
    teacher_feedback TEXT,
    graded_at DATETIME,
    graded_by INT,
    FOREIGN KEY (activity_id) REFERENCES activities(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (graded_by) REFERENCES users(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assessment_type ENUM('quiz','exam','assignment','project') NOT NULL,
    total_points DECIMAL(8,2) DEFAULT 100,
    start_date DATETIME,
    end_date DATETIME,
    time_limit_minutes INT,
    attempts_allowed INT DEFAULT 1,
    is_published TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id)
      ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assessment_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    student_id INT NOT NULL,
    attempt_number INT DEFAULT 1,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME,
    score DECIMAL(8,2),
    status ENUM('in_progress','submitted','graded','abandoned')
      DEFAULT 'in_progress',
    answers_json JSON,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id)
      ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id)
      ON DELETE CASCADE,
    UNIQUE (assessment_id, student_id, attempt_number)
) ENGINE=InnoDB;

-- =========================================================
-- 7. PROYECTOS, ENTREGAS Y RÚBRICAS
-- =========================================================

CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT,
    teacher_id INT,
    title VARCHAR(200) NOT NULL,
    description LONGTEXT,
    objectives LONGTEXT,
    instructions LONGTEXT,
    start_date DATE,
    due_date DATE,
    max_points DECIMAL(8,2) DEFAULT 100,
    status ENUM('draft','published','archived') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    student_id INT NOT NULL,
    title VARCHAR(200),
    description LONGTEXT,
    file_url TEXT,
    submitted_at DATETIME,
    grade DECIMAL(6,2),
    feedback LONGTEXT,
    status ENUM('submitted','graded','pending') DEFAULT 'pending',
    graded_at DATETIME,
    graded_by INT,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (graded_by) REFERENCES users(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rubrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT,
    project_id INT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    max_points DECIMAL(8,2) DEFAULT 100,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rubric_criteria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rubric_id INT NOT NULL,
    criterion_name VARCHAR(200) NOT NULL,
    description TEXT,
    max_points DECIMAL(8,2) DEFAULT 0,
    position INT DEFAULT 0,
    FOREIGN KEY (rubric_id) REFERENCES rubrics(id)
      ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- 8. RUTAS Y PROGRESO DE APRENDIZAJE
-- =========================================================

CREATE TABLE IF NOT EXISTS learning_paths (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution_id INT,
    subject_id INT,
    title VARCHAR(200) NOT NULL,
    description LONGTEXT,
    difficulty ENUM('easy','medium','hard') DEFAULT 'medium',
    estimated_hours DECIMAL(6,2),
    is_published TINYINT(1) DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS learning_path_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    learning_path_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    lesson_id INT,
    activity_id INT,
    position INT DEFAULT 0,
    estimated_minutes INT,
    is_required TINYINT(1) DEFAULT 1,
    FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id)
      ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
      ON DELETE SET NULL,
    FOREIGN KEY (activity_id) REFERENCES activities(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS learning_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    learning_path_id INT NOT NULL,
    student_id INT NOT NULL,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    current_step INT DEFAULT 0,
    status ENUM('in_progress','completed','not_started')
      DEFAULT 'not_started',
    started_at DATETIME,
    completed_at DATETIME,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id)
      ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id)
      ON DELETE CASCADE,
    UNIQUE (learning_path_id, student_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS learning_step_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    learning_progress_id INT NOT NULL,
    step_id INT NOT NULL,
    status ENUM('not_started','in_progress','completed')
      DEFAULT 'not_started',
    score DECIMAL(8,2),
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (learning_progress_id) REFERENCES learning_progress(id)
      ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES learning_path_steps(id)
      ON DELETE CASCADE,
    UNIQUE (learning_progress_id, step_id)
) ENGINE=InnoDB;

-- =========================================================
-- 9. LABORATORIOS
-- =========================================================

CREATE TABLE IF NOT EXISTS laboratories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution_id INT,
    subject_id INT,
    course_id INT,
    created_by INT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    laboratory_type ENUM('virtual','physical') DEFAULT 'virtual',
    instructions LONGTEXT,
    simulation_config JSON,
    difficulty ENUM('easy','medium','hard') DEFAULT 'medium',
    estimated_minutes INT,
    is_published TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS laboratory_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    laboratory_id INT NOT NULL,
    student_id INT NOT NULL,
    attempt_number INT DEFAULT 1,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    status ENUM('in_progress','completed','abandoned')
      DEFAULT 'in_progress',
    score DECIMAL(8,2),
    result_data JSON,
    feedback TEXT,
    FOREIGN KEY (laboratory_id) REFERENCES laboratories(id)
      ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id)
      ON DELETE CASCADE,
    UNIQUE (laboratory_id, student_id, attempt_number)
) ENGINE=InnoDB;

-- =========================================================
-- 10. MISIONES, INSIGNIAS Y EXPERIENCIA
-- =========================================================

CREATE TABLE IF NOT EXISTS missions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    mission_type ENUM('daily','weekly','course','laboratory','custom')
      DEFAULT 'custom',
    requirement_type VARCHAR(100) NOT NULL,
    requirement_value INT DEFAULT 1,
    xp_reward INT DEFAULT 0,
    starts_at DATETIME,
    ends_at DATETIME,
    is_active TINYINT(1) DEFAULT 1,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_missions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mission_id INT NOT NULL,
    progress_value INT DEFAULT 0,
    status ENUM('in_progress','completed','claimed')
      DEFAULT 'in_progress',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    claimed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE,
    FOREIGN KEY (mission_id) REFERENCES missions(id)
      ON DELETE CASCADE,
    UNIQUE (user_id, mission_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    xp_reward INT DEFAULT 0,
    requirement_type VARCHAR(100),
    requirement_value INT DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id)
      ON DELETE CASCADE,
    UNIQUE (user_id, badge_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_experience (
    user_id INT PRIMARY KEY,
    total_xp BIGINT DEFAULT 0,
    current_level INT DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS xp_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    xp_amount INT NOT NULL,
    source_type VARCHAR(80) NOT NULL,
    source_id BIGINT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- 11. NOTIFICACIONES, AUDITORÍA E IA
-- =========================================================

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('info','warning','error','success')
      DEFAULT 'info',
    related_type VARCHAR(80),
    related_id BIGINT,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    institution_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id BIGINT,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE SET NULL,
    FOREIGN KEY (institution_id) REFERENCES institutions(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ai_interactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT,
    lesson_id INT,
    activity_id INT,
    mode ENUM('chat','completion','embedding') DEFAULT 'chat',
    user_message LONGTEXT,
    ai_response LONGTEXT,
    tokens_used INT,
    model_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id)
      ON DELETE SET NULL,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
      ON DELETE SET NULL,
    FOREIGN KEY (activity_id) REFERENCES activities(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================================================
-- 12. CONFIGURACIÓN
-- =========================================================

CREATE TABLE IF NOT EXISTS user_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    language VARCHAR(10) DEFAULT 'es',
    theme ENUM('light','dark','system') DEFAULT 'system',
    email_notifications TINYINT(1) DEFAULT 1,
    push_notifications TINYINT(1) DEFAULT 1,
    accessibility_json JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value JSON,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================================================
-- 13. REGISTROS INICIALES DE ROLES Y PERMISOS
-- No crea usuarios ni contraseñas.
-- =========================================================

INSERT IGNORE INTO roles (name, description) VALUES
('student', 'Usuario estudiante de AulaLab'),
('teacher', 'Docente de AulaLab'),
('institution_admin', 'Administrador de una institución educativa'),
('platform_admin', 'Administrador general de la plataforma');

INSERT IGNORE INTO permissions (name, description, module) VALUES
('institution.create_request', 'Solicitar registro de institución', 'institutions'),
('institution.view_own', 'Consultar su institución', 'institutions'),
('institution.update_own', 'Actualizar su institución', 'institutions'),
('institution.manage_users', 'Gestionar usuarios institucionales', 'institutions'),
('institution.manage_teachers', 'Gestionar docentes', 'institutions'),
('institution.manage_students', 'Gestionar estudiantes', 'institutions'),
('institution.view_requests', 'Consultar solicitudes institucionales', 'institutions'),
('institution.approve_request', 'Aprobar solicitudes institucionales', 'institutions'),
('institution.reject_request', 'Rechazar solicitudes institucionales', 'institutions'),
('users.manage', 'Gestionar usuarios globales', 'users'),
('roles.manage', 'Gestionar roles y permisos', 'security'),
('courses.manage', 'Gestionar cursos', 'courses'),
('laboratories.manage', 'Gestionar laboratorios', 'laboratories'),
('reports.view', 'Consultar informes', 'reports');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'institution.create_request'
WHERE r.name = 'teacher';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'institution.view_own',
  'institution.update_own',
  'institution.manage_users',
  'institution.manage_teachers',
  'institution.manage_students'
)
WHERE r.name = 'institution_admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'institution.view_requests',
  'institution.approve_request',
  'institution.reject_request',
  'users.manage',
  'roles.manage',
  'courses.manage',
  'laboratories.manage',
  'reports.view'
)
WHERE r.name = 'platform_admin';

-- =========================================================
-- 14. VERIFICACIÓN
-- =========================================================

SHOW TABLES;

SELECT id, name, description
FROM roles
ORDER BY id;

SELECT id, name, module
FROM permissions
ORDER BY module, name;

-- FIN DE AULALAB


-- =========================================================
-- SOLICITUDES DE ADMINISTRACIÓN DE INSTITUCIONES
-- =========================================================
CREATE TABLE IF NOT EXISTS administrator_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution_id INT NOT NULL,
    requester_user_id INT NOT NULL,
    requested_role VARCHAR(50) NOT NULL DEFAULT 'institution_admin',
    justification TEXT NOT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by INT,
    reviewed_at DATETIME,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id),
    FOREIGN KEY (requester_user_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
