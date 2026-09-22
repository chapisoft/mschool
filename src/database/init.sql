-- Khởi tạo Database và Extension cho mschool
CREATE DATABASE mschool_db;
\c mschool_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
\i /docker-entrypoint-initdb.d/schema.sql;
\i /docker-entrypoint-initdb.d/seed.sql;
