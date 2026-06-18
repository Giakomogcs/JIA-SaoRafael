-- =============================================
-- São Rafael — 000: Ownership Guard
-- Roda ANTES de todas as outras migrations.
--
-- Por quê: as tabelas saorafael_* (chat_message, wizard_submission, documents,
-- clients, etc.) podem ter sido criadas por outra role — por exemplo, pelo
-- workflow n8n "Create Standard Tables" usando a credencial do Postgres do n8n.
-- Quando isso acontece, as migrations seguintes (ALTER TABLE, CREATE INDEX,
-- ENABLE RLS, CREATE POLICY, DROP/CREATE FUNCTION) falham com:
--     "must be owner of table saorafael_..."
--
-- Esta migration reassina a posse de TODOS os objetos saorafael_* para a role
-- atual (CURRENT_USER), de forma idempotente. Em um banco novo, onde nada existe
-- ainda, ela simplesmente não faz nada — é segura para rodar sempre.
--
-- Observação: a reassinatura só funciona se a role que executa for superuser
-- (ex.: 'postgres' no Supabase SQL Editor) ou membro da role dona atual.
-- Caso não tenha privilégio, o erro é ignorado para não abortar o setup.
-- =============================================

-- =======  UP  ========

DO $ownership_guard$
DECLARE
  r RECORD;
BEGIN
  -- 1. Tabelas
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'saorafael_%'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I OWNER TO CURRENT_USER', r.tablename);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sem privilégio para reassinar a tabela %, mantendo dono atual.', r.tablename;
    END;
  END LOOP;

  -- 2. Views
  FOR r IN
    SELECT viewname
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname LIKE 'saorafael_%'
  LOOP
    BEGIN
      EXECUTE format('ALTER VIEW public.%I OWNER TO CURRENT_USER', r.viewname);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sem privilégio para reassinar a view %, mantendo dono atual.', r.viewname;
    END;
  END LOOP;

  -- 3. Sequences
  FOR r IN
    SELECT sequencename
    FROM pg_sequences
    WHERE schemaname = 'public'
      AND sequencename LIKE 'saorafael_%'
  LOOP
    BEGIN
      EXECUTE format('ALTER SEQUENCE public.%I OWNER TO CURRENT_USER', r.sequencename);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sem privilégio para reassinar a sequence %, mantendo dono atual.', r.sequencename;
    END;
  END LOOP;

  -- 4. Functions (inclui a assinatura completa via regprocedure)
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'saorafael_%'
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s OWNER TO CURRENT_USER', r.sig);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sem privilégio para reassinar a função %, mantendo dono atual.', r.sig;
    END;
  END LOOP;
END
$ownership_guard$;

-- =======  DOWN  ========
-- Não há rollback: reassinar posse não destrói dados.
