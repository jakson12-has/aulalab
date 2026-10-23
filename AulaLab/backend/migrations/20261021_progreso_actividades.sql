CREATE TABLE IF NOT EXISTS student_activity_progress (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    student_id INT NOT NULL,
    activity_key VARCHAR(80) NOT NULL,
    progress_percentage TINYINT UNSIGNED NOT NULL DEFAULT 0,
    main_progress JSON NOT NULL,
    extra_progress JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_student_activity (student_id, activity_key),
    CONSTRAINT fk_activity_progress_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_activity_progress_percentage
        CHECK (progress_percentage BETWEEN 0 AND 100)
);
