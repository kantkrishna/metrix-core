-- docker/postgres-init/00-init-roles.sql
--
-- Purpose: Initializes least-privilege PostgreSQL database roles and creates the dedicated core schema.
--
-- Context: Enforces security separation so runtime application traffic executes as metrix_app with NOBYPASSRLS and can never circumvent tenant RLS.
--
-- Implementation Specs: PostgreSQL 16 idempotent DO block creating metrix_owner, metrix_app (NOSUPERUSER NOBYPASSRLS), and schema core.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'metrix_owner') THEN
    CREATE ROLE metrix_owner LOGIN PASSWORD 'metrix_owner_dev_pwd'
      NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'metrix_app') THEN
    CREATE ROLE metrix_app LOGIN PASSWORD 'metrix_app_dev_pwd'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;

GRANT CONNECT, CREATE ON DATABASE metrix_platform_core TO metrix_owner;
GRANT CONNECT ON DATABASE metrix_platform_core TO metrix_app;

CREATE SCHEMA IF NOT EXISTS core AUTHORIZATION metrix_owner;
GRANT USAGE ON SCHEMA core TO metrix_app;
