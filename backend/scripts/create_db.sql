-- Идемпотентная подготовка роли и БД (запускать от суперпользователя postgres).
-- Пример:
--   psql -U postgres -p 5433 -f backend/scripts/create_db.sql
--
-- Пароль роли sto = sto (как в backend/.env)

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'sto') THEN
    CREATE ROLE sto LOGIN PASSWORD 'sto';
  ELSE
    ALTER ROLE sto WITH LOGIN PASSWORD 'sto';
  END IF;
END
$$;

SELECT 'CREATE DATABASE sto_crm OWNER sto'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sto_crm')\gexec

\c sto_crm

GRANT ALL ON SCHEMA public TO sto;
GRANT CREATE ON SCHEMA public TO sto;
ALTER DATABASE sto_crm OWNER TO sto;
