-- ============================================
-- SEED DATA: Tamil Nadu Universities & Hierarchy
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================

-- Universities
INSERT INTO universities (id, name, code) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Anna University', 'AU'),
  ('a1000000-0000-0000-0000-000000000002', 'Anna University - Chennai Regional Centre', 'AUCRC'),
  ('a1000000-0000-0000-0000-000000000003', 'Anna University - Trichy Regional Centre', 'AUTRC'),
  ('a1000000-0000-0000-0000-000000000004', 'Anna University - Coimbatore Regional Centre', 'AUCORC'),
  ('a1000000-0000-0000-0000-000000000005', 'Anna University - Madurai Regional Centre', 'AUMDRC'),
  ('a1000000-0000-0000-0000-000000000006', 'University of Madras', 'UM'),
  ('a1000000-0000-0000-0000-000000000007', 'Bharathidasan University', 'BDU'),
  ('a1000000-0000-0000-0000-000000000008', 'Madurai Kamaraj University', 'MKU'),
  ('a1000000-0000-0000-0000-000000000009', 'Alagappa University', 'ALU'),
  ('a1000000-0000-0000-0000-000000000010', 'Bharathiar University', 'BU'),
  ('a1000000-0000-0000-0000-000000000011', 'Periyar University', 'PU'),
  ('a1000000-0000-0000-0000-000000000012', 'Thanjavur Tamil University', 'TTU'),
  ('a1000000-0000-0000-0000-000000000013', 'Manonmaniam Sundaranar University', 'MSU'),
  ('a1000000-0000-0000-0000-000000000014', 'Vellore Institute of Technology', 'VIT'),
  ('a1000000-0000-0000-0000-000000000015', 'SRM Institute of Science and Technology', 'SRM'),
  ('a1000000-0000-0000-0000-000000000016', 'Amrita Vishwa Vidyapeetham', 'AVV'),
  ('a1000000-0000-0000-0000-000000000017', 'SASTRA University', 'SASTRA'),
  ('a1000000-0000-0000-0000-000000000018', 'Saveetha University', 'SAVEETHA'),
  ('a1000000-0000-0000-0000-000000000019', 'Sri Sivasubramaniya Nadar University', 'SSN'),
  ('a1000000-0000-0000-0000-000000000020', 'Hindusthan Institute of Technology', 'HIT')
ON CONFLICT (id) DO NOTHING;

-- Departments for Anna University (each university gets the same core engineering departments)
DO $$
DECLARE
  uni RECORD;
  dept_name TEXT;
  dept_code TEXT;
  dept_id UUID;
  sem_num INT;
  sem_id UUID;
  sub_name TEXT;
  sub_code TEXT;
  sub_id UUID;
  unit_num INT;
BEGIN
  -- For each university, create departments
  FOR uni IN SELECT id, code FROM universities LOOP
    -- Engineering departments
    FOR dept_name, dept_code IN
      SELECT * FROM (VALUES
        ('Computer Science and Engineering', 'CSE'),
        ('Information Technology', 'IT'),
        ('Electronics and Communication Engineering', 'ECE'),
        ('Electrical and Electronics Engineering', 'EEE'),
        ('Mechanical Engineering', 'MECH'),
        ('Civil Engineering', 'CIVIL'),
        ('Chemical Engineering', 'CHEM'),
        ('Biotechnology', 'BIO')
      ) AS t(dept_name, dept_code)
    LOOP
      dept_id := gen_random_uuid();
      INSERT INTO departments (id, university_id, name, code)
      VALUES (dept_id, uni.id, dept_name, dept_code)
      ON CONFLICT DO NOTHING;

      -- 8 semesters
      FOR sem_num IN 1..8 LOOP
        sem_id := gen_random_uuid();
        INSERT INTO semesters (id, department_id, number)
        VALUES (sem_id, dept_id, sem_num)
        ON CONFLICT DO NOTHING;

        -- Add some common subjects for CSE/IT departments
        IF dept_code IN ('CSE', 'IT') THEN
          -- Semester 1
          IF sem_num = 1 THEN
            FOR sub_name, sub_code IN
              SELECT * FROM (VALUES
                ('Engineering Mathematics I', 'MA101'),
                ('Engineering Physics', 'PH101'),
                ('Engineering Chemistry', 'CH101'),
                ('Basic Computer Science', 'CS101'),
                ('English for Engineers', 'HS101')
              ) AS t(sub_name, sub_code)
            LOOP
              sub_id := gen_random_uuid();
              INSERT INTO subjects (id, semester_id, name, code)
              VALUES (sub_id, sem_id, sub_name, sub_code)
              ON CONFLICT DO NOTHING;

              -- 5 units per subject
              FOR unit_num IN 1..5 LOOP
                INSERT INTO units (id, subject_id, number, title)
                VALUES (gen_random_uuid(), sub_id, unit_num, 'Unit ' || unit_num)
                ON CONFLICT DO NOTHING;
              END LOOP;
            END LOOP;

          -- Semester 2
          ELSIF sem_num = 2 THEN
            FOR sub_name, sub_code IN
              SELECT * FROM (VALUES
                ('Engineering Mathematics II', 'MA102'),
                ('Data Structures', 'CS102'),
                ('Digital Logic Design', 'CS103'),
                ('Object Oriented Programming', 'CS104'),
                ('Environmental Science', 'HS102')
              ) AS t(sub_name, sub_code)
            LOOP
              sub_id := gen_random_uuid();
              INSERT INTO subjects (id, semester_id, name, code)
              VALUES (sub_id, sem_id, sub_name, sub_code)
              ON CONFLICT DO NOTHING;

              FOR unit_num IN 1..5 LOOP
                INSERT INTO units (id, subject_id, number, title)
                VALUES (gen_random_uuid(), sub_id, unit_num, 'Unit ' || unit_num)
                ON CONFLICT DO NOTHING;
              END LOOP;
            END LOOP;

          -- Semester 3
          ELSIF sem_num = 3 THEN
            FOR sub_name, sub_code IN
              SELECT * FROM (VALUES
                ('Discrete Mathematics', 'MA201'),
                ('Computer Architecture', 'CS201'),
                ('Database Management Systems', 'CS202'),
                ('Operating Systems', 'CS203'),
                ('Technical Communication', 'HS201')
              ) AS t(sub_name, sub_code)
            LOOP
              sub_id := gen_random_uuid();
              INSERT INTO subjects (id, semester_id, name, code)
              VALUES (sub_id, sem_id, sub_name, sub_code)
              ON CONFLICT DO NOTHING;

              FOR unit_num IN 1..5 LOOP
                INSERT INTO units (id, subject_id, number, title)
                VALUES (gen_random_uuid(), sub_id, unit_num, 'Unit ' || unit_num)
                ON CONFLICT DO NOTHING;
              END LOOP;
            END LOOP;

          -- Semester 4
          ELSIF sem_num = 4 THEN
            FOR sub_name, sub_code IN
              SELECT * FROM (VALUES
                ('Probability and Statistics', 'MA202'),
                ('Design and Analysis of Algorithms', 'CS204'),
                ('Software Engineering', 'CS205'),
                ('Computer Networks', 'CS206'),
                ('Theory of Computation', 'CS207')
              ) AS t(sub_name, sub_code)
            LOOP
              sub_id := gen_random_uuid();
              INSERT INTO subjects (id, semester_id, name, code)
              VALUES (sub_id, sem_id, sub_name, sub_code)
              ON CONFLICT DO NOTHING;

              FOR unit_num IN 1..5 LOOP
                INSERT INTO units (id, subject_id, number, title)
                VALUES (gen_random_uuid(), sub_id, unit_num, 'Unit ' || unit_num)
                ON CONFLICT DO NOTHING;
              END LOOP;
            END LOOP;

          -- Semester 5
          ELSIF sem_num = 5 THEN
            FOR sub_name, sub_code IN
              SELECT * FROM (VALUES
                ('Machine Learning', 'CS301'),
                ('Web Technologies', 'CS302'),
                ('Compiler Design', 'CS303'),
                ('Information Security', 'CS304'),
                ('Elective I', 'CS305')
              ) AS t(sub_name, sub_code)
            LOOP
              sub_id := gen_random_uuid();
              INSERT INTO subjects (id, semester_id, name, code)
              VALUES (sub_id, sem_id, sub_name, sub_code)
              ON CONFLICT DO NOTHING;

              FOR unit_num IN 1..5 LOOP
                INSERT INTO units (id, subject_id, number, title)
                VALUES (gen_random_uuid(), sub_id, unit_num, 'Unit ' || unit_num)
                ON CONFLICT DO NOTHING;
              END LOOP;
            END LOOP;

          -- Semester 6
          ELSIF sem_num = 6 THEN
            FOR sub_name, sub_code IN
              SELECT * FROM (VALUES
                ('Deep Learning', 'CS306'),
                ('Internet of Things', 'CS307'),
                ('Cloud Computing', 'CS308'),
                ('Big Data Analytics', 'CS309'),
                ('Elective II', 'CS310')
              ) AS t(sub_name, sub_code)
            LOOP
              sub_id := gen_random_uuid();
              INSERT INTO subjects (id, semester_id, name, code)
              VALUES (sub_id, sem_id, sub_name, sub_code)
              ON CONFLICT DO NOTHING;

              FOR unit_num IN 1..5 LOOP
                INSERT INTO units (id, subject_id, number, title)
                VALUES (gen_random_uuid(), sub_id, unit_num, 'Unit ' || unit_num)
                ON CONFLICT DO NOTHING;
              END LOOP;
            END LOOP;

          -- Semester 7
          ELSIF sem_num = 7 THEN
            FOR sub_name, sub_code IN
              SELECT * FROM (VALUES
                ('AI and Natural Language Processing', 'CS401'),
                ('Blockchain Technology', 'CS402'),
                ('Cyber Security', 'CS403'),
                ('Elective III', 'CS404'),
                ('Project Work I', 'CS405')
              ) AS t(sub_name, sub_code)
            LOOP
              sub_id := gen_random_uuid();
              INSERT INTO subjects (id, semester_id, name, code)
              VALUES (sub_id, sem_id, sub_name, sub_code)
              ON CONFLICT DO NOTHING;

              FOR unit_num IN 1..5 LOOP
                INSERT INTO units (id, subject_id, number, title)
                VALUES (gen_random_uuid(), sub_id, unit_num, 'Unit ' || unit_num)
                ON CONFLICT DO NOTHING;
              END LOOP;
            END LOOP;

          -- Semester 8
          ELSIF sem_num = 8 THEN
            FOR sub_name, sub_code IN
              SELECT * FROM (VALUES
                ('Elective IV', 'CS406'),
                ('Elective V', 'CS407'),
                ('Project Work II', 'CS408')
              ) AS t(sub_name, sub_code)
            LOOP
              sub_id := gen_random_uuid();
              INSERT INTO subjects (id, semester_id, name, code)
              VALUES (sub_id, sem_id, sub_name, sub_code)
              ON CONFLICT DO NOTHING;

              FOR unit_num IN 1..5 LOOP
                INSERT INTO units (id, subject_id, number, title)
                VALUES (gen_random_uuid(), sub_id, unit_num, 'Unit ' || unit_num)
                ON CONFLICT DO NOTHING;
              END LOOP;
            END LOOP;
          END IF;

        -- For ECE departments
        ELSIF dept_code = 'ECE' THEN
          IF sem_num = 3 THEN
            FOR sub_name, sub_code IN
              SELECT * FROM (VALUES
                ('Signals and Systems', 'EC201'),
                ('Electronic Devices', 'EC202'),
                ('Network Theory', 'EC203'),
                ('Digital Electronics', 'EC204'),
                ('Engineering Mathematics III', 'MA301')
              ) AS t(sub_name, sub_code)
            LOOP
              sub_id := gen_random_uuid();
              INSERT INTO subjects (id, semester_id, name, code)
              VALUES (sub_id, sem_id, sub_name, sub_code)
              ON CONFLICT DO NOTHING;

              FOR unit_num IN 1..5 LOOP
                INSERT INTO units (id, subject_id, number, title)
                VALUES (gen_random_uuid(), sub_id, unit_num, 'Unit ' || unit_num)
                ON CONFLICT DO NOTHING;
              END LOOP;
            END LOOP;
          END IF;

        -- For EEE departments
        ELSIF dept_code = 'EEE' THEN
          IF sem_num = 3 THEN
            FOR sub_name, sub_code IN
              SELECT * FROM (VALUES
                ('Electromagnetic Theory', 'EE201'),
                ('Circuit Theory', 'EE202'),
                ('Electrical Machines I', 'EE203'),
                ('Power Systems I', 'EE204'),
                ('Control Systems', 'EE205')
              ) AS t(sub_name, sub_code)
            LOOP
              sub_id := gen_random_uuid();
              INSERT INTO subjects (id, semester_id, name, code)
              VALUES (sub_id, sem_id, sub_name, sub_code)
              ON CONFLICT DO NOTHING;

              FOR unit_num IN 1..5 LOOP
                INSERT INTO units (id, subject_id, number, title)
                VALUES (gen_random_uuid(), sub_id, unit_num, 'Unit ' || unit_num)
                ON CONFLICT DO NOTHING;
              END LOOP;
            END LOOP;
          END IF;

        -- For MECH departments
        ELSIF dept_code = 'MECH' THEN
          IF sem_num = 3 THEN
            FOR sub_name, sub_code IN
              SELECT * FROM (VALUES
                ('Engineering Thermodynamics', 'ME201'),
                ('Fluid Mechanics', 'ME202'),
                ('Strength of Materials', 'ME203'),
                ('Manufacturing Technology', 'ME204'),
                ('Engineering Graphics', 'ME205')
              ) AS t(sub_name, sub_code)
            LOOP
              sub_id := gen_random_uuid();
              INSERT INTO subjects (id, semester_id, name, code)
              VALUES (sub_id, sem_id, sub_name, sub_code)
              ON CONFLICT DO NOTHING;

              FOR unit_num IN 1..5 LOOP
                INSERT INTO units (id, subject_id, number, title)
                VALUES (gen_random_uuid(), sub_id, unit_num, 'Unit ' || unit_num)
                ON CONFLICT DO NOTHING;
              END LOOP;
            END LOOP;
          END IF;

        -- For CIVIL departments
        ELSIF dept_code = 'CIVIL' THEN
          IF sem_num = 3 THEN
            FOR sub_name, sub_code IN
              SELECT * FROM (VALUES
                ('Structural Analysis', 'CV201'),
                ('Surveying', 'CV202'),
                ('Fluid Mechanics', 'CV203'),
                ('Building Materials', 'CV204'),
                ('Geotechnical Engineering', 'CV205')
              ) AS t(sub_name, sub_code)
            LOOP
              sub_id := gen_random_uuid();
              INSERT INTO subjects (id, semester_id, name, code)
              VALUES (sub_id, sem_id, sub_name, sub_code)
              ON CONFLICT DO NOTHING;

              FOR unit_num IN 1..5 LOOP
                INSERT INTO units (id, subject_id, number, title)
                VALUES (gen_random_uuid(), sub_id, unit_num, 'Unit ' || unit_num)
                ON CONFLICT DO NOTHING;
              END LOOP;
            END LOOP;
          END IF;
        END IF;

      END LOOP;
    END LOOP;
  END LOOP;
END $$;
