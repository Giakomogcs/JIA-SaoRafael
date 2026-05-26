-- =============================================
-- São Rafael — 011: Tabela de Clientes + Seed dos existentes
-- Extrai dados de empresas das submissions já feitas
-- =============================================

-- =======  UP  ========

-- 1. Habilitar extensão pg_trgm para busca fuzzy por nome
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Criar tabela de clientes
CREATE TABLE IF NOT EXISTS saorafael_clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social    TEXT NOT NULL,
  cnpj_cpf        TEXT,
  inscricao_estadual TEXT,
  telefone        TEXT,
  email           TEXT,
  cidade          TEXT,
  estado          TEXT,
  cep             TEXT,
  endereco        TEXT,
  local_instalacao TEXT,
  contato_nome    TEXT,
  contato_telefone TEXT,
  contato_email   TEXT,
  dados_tecnicos  TEXT,
  observacoes     TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para busca rápida
CREATE UNIQUE INDEX IF NOT EXISTS idx_saorafael_clients_cnpj
  ON saorafael_clients (cnpj_cpf) WHERE cnpj_cpf IS NOT NULL AND cnpj_cpf != '';

CREATE INDEX IF NOT EXISTS idx_saorafael_clients_razao_trgm
  ON saorafael_clients USING gin(razao_social gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_saorafael_clients_telefone
  ON saorafael_clients (telefone) WHERE telefone IS NOT NULL AND telefone != '';

CREATE INDEX IF NOT EXISTS idx_saorafael_clients_created_by
  ON saorafael_clients (created_by);

-- 4. Adicionar client_id na tabela de submissions
ALTER TABLE saorafael_wizard_submission
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES saorafael_clients(id);

-- 5. Popular clientes a partir das submissions existentes (apenas se ainda não houver clientes)
-- O form_data tem estrutura: { step2: { razao_social, cnpj_cpf, cidade, estado, ... } }
INSERT INTO saorafael_clients (
  razao_social,
  cnpj_cpf,
  inscricao_estadual,
  telefone,
  email,
  cidade,
  estado,
  cep,
  endereco,
  local_instalacao,
  contato_nome,
  contato_telefone,
  contato_email,
  dados_tecnicos,
  created_by,
  created_at
)
SELECT DISTINCT ON (COALESCE(NULLIF(TRIM(form_data->'step2'->>'cnpj_cpf'), ''), form_data->'step2'->>'razao_social'))
  COALESCE(NULLIF(TRIM(form_data->'step2'->>'razao_social'), ''), 'Cliente sem nome') AS razao_social,
  NULLIF(TRIM(form_data->'step2'->>'cnpj_cpf'), '') AS cnpj_cpf,
  NULLIF(TRIM(form_data->'step2'->>'inscricao_estadual'), '') AS inscricao_estadual,
  NULLIF(TRIM(form_data->'step2'->>'contato_telefone'), '') AS telefone,
  NULLIF(TRIM(form_data->'step2'->>'contato_email'), '') AS email,
  NULLIF(TRIM(form_data->'step2'->>'cidade'), '') AS cidade,
  NULLIF(TRIM(form_data->'step2'->>'estado'), '') AS estado,
  NULLIF(TRIM(form_data->'step2'->>'cep'), '') AS cep,
  NULLIF(TRIM(form_data->'step2'->>'endereco_entrega'), '') AS endereco,
  NULLIF(TRIM(form_data->'step2'->>'local_instalacao_municipio'), '') AS local_instalacao,
  NULLIF(TRIM(form_data->'step2'->>'contato_nome'), '') AS contato_nome,
  NULLIF(TRIM(form_data->'step2'->>'contato_telefone'), '') AS contato_telefone,
  NULLIF(TRIM(form_data->'step2'->>'contato_email'), '') AS contato_email,
  NULLIF(TRIM(form_data->'step2'->>'dados_tecnicos_resumo'), '') AS dados_tecnicos,
  user_id AS created_by,
  submitted_at AS created_at
FROM saorafael_wizard_submission
WHERE form_data->'step2'->>'razao_social' IS NOT NULL
  AND TRIM(form_data->'step2'->>'razao_social') != ''
  AND NOT EXISTS (SELECT 1 FROM saorafael_clients LIMIT 1)  -- só roda se a tabela está vazia
ORDER BY COALESCE(NULLIF(TRIM(form_data->'step2'->>'cnpj_cpf'), ''), form_data->'step2'->>'razao_social'),
         submitted_at DESC;  -- pega o mais recente se houver duplicatas

-- 6. Vincular submissions existentes ao client_id correspondente
UPDATE saorafael_wizard_submission s
SET client_id = c.id
FROM saorafael_clients c
WHERE (
  -- Match por CNPJ (exato)
  (c.cnpj_cpf IS NOT NULL AND c.cnpj_cpf != '' AND
   TRIM(s.form_data->'step2'->>'cnpj_cpf') = c.cnpj_cpf)
  OR
  -- Match por razão social (quando sem CNPJ)
  (c.cnpj_cpf IS NULL AND
   TRIM(s.form_data->'step2'->>'razao_social') = c.razao_social)
);

-- 7. Função de busca de clientes (para o front usar via RPC)
CREATE OR REPLACE FUNCTION saorafael_search_clients(p_query TEXT)
RETURNS TABLE (
  id UUID,
  razao_social TEXT,
  cnpj_cpf TEXT,
  telefone TEXT,
  email TEXT,
  cidade TEXT,
  estado TEXT,
  total_orcamentos BIGINT,
  ultimo_orcamento TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.razao_social,
    c.cnpj_cpf,
    c.telefone,
    c.email,
    c.cidade,
    c.estado,
    COUNT(s.id)::BIGINT AS total_orcamentos,
    MAX(s.submitted_at)::TIMESTAMPTZ AS ultimo_orcamento
  FROM saorafael_clients c
  LEFT JOIN saorafael_wizard_submission s ON s.client_id = c.id
  WHERE
    -- Busca por CNPJ/CPF (exato, sem pontuação)
    REPLACE(REPLACE(REPLACE(c.cnpj_cpf, '.', ''), '-', ''), '/', '') ILIKE '%' || REPLACE(REPLACE(REPLACE(p_query, '.', ''), '-', ''), '/', '') || '%'
    OR
    -- Busca fuzzy por razão social
    c.razao_social ILIKE '%' || p_query || '%'
    OR
    -- Busca por telefone
    REPLACE(REPLACE(REPLACE(REPLACE(c.telefone, '(', ''), ')', ''), '-', ''), ' ', '') ILIKE '%' || REPLACE(REPLACE(REPLACE(REPLACE(p_query, '(', ''), ')', ''), '-', ''), ' ', '') || '%'
  GROUP BY c.id, c.razao_social, c.cnpj_cpf, c.telefone, c.email, c.cidade, c.estado
  ORDER BY
    -- Prioriza match exato no CNPJ
    CASE WHEN REPLACE(REPLACE(REPLACE(c.cnpj_cpf, '.', ''), '-', ''), '/', '') = REPLACE(REPLACE(REPLACE(p_query, '.', ''), '-', ''), '/', '') THEN 0 ELSE 1 END,
    -- Depois por similaridade no nome
    c.razao_social <-> p_query,
    -- Depois pelo mais recente
    MAX(s.submitted_at) DESC NULLS LAST
  LIMIT 10;
END;
$$;

-- 8. Função para buscar detalhes de um cliente + histórico
CREATE OR REPLACE FUNCTION saorafael_client_detail(p_client_id UUID)
RETURNS TABLE (
  id UUID,
  razao_social TEXT,
  cnpj_cpf TEXT,
  inscricao_estadual TEXT,
  telefone TEXT,
  email TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  endereco TEXT,
  local_instalacao TEXT,
  contato_nome TEXT,
  contato_telefone TEXT,
  contato_email TEXT,
  dados_tecnicos TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.razao_social, c.cnpj_cpf, c.inscricao_estadual,
    c.telefone, c.email, c.cidade, c.estado, c.cep,
    c.endereco, c.local_instalacao, c.contato_nome,
    c.contato_telefone, c.contato_email, c.dados_tecnicos,
    c.created_at
  FROM saorafael_clients c
  WHERE c.id = p_client_id;
END;
$$;

-- 9. Função para listar orçamentos de um cliente
CREATE OR REPLACE FUNCTION saorafael_client_submissions(p_client_id UUID)
RETURNS TABLE (
  id BIGINT,
  protocol TEXT,
  status TEXT,
  tipo_produto TEXT,
  dimensoes TEXT,
  submitted_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id::BIGINT,
    s.protocol::TEXT,
    s.status::TEXT,
    (s.form_data->'step1'->>'tipo_produto')::TEXT AS tipo_produto,
    (COALESCE(s.form_data->'step3'->>'comprimento', '?') || 'x' ||
     COALESCE(s.form_data->'step3'->>'largura', '?') || 'x' ||
     COALESCE(s.form_data->'step3'->>'altura', '?') || 'm')::TEXT AS dimensoes,
    s.submitted_at::TIMESTAMPTZ,
    s.processed_at::TIMESTAMPTZ
  FROM saorafael_wizard_submission s
  WHERE s.client_id = p_client_id
  ORDER BY s.submitted_at DESC;
END;
$$;

-- 10. Função para cadastrar/atualizar cliente
CREATE OR REPLACE FUNCTION saorafael_upsert_client(
  p_razao_social TEXT,
  p_cnpj_cpf TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_cidade TEXT DEFAULT NULL,
  p_estado TEXT DEFAULT NULL,
  p_cep TEXT DEFAULT NULL,
  p_endereco TEXT DEFAULT NULL,
  p_local_instalacao TEXT DEFAULT NULL,
  p_contato_nome TEXT DEFAULT NULL,
  p_contato_telefone TEXT DEFAULT NULL,
  p_contato_email TEXT DEFAULT NULL,
  p_inscricao_estadual TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Tentar encontrar por CNPJ/CPF primeiro
  IF p_cnpj_cpf IS NOT NULL AND TRIM(p_cnpj_cpf) != '' THEN
    SELECT id INTO v_id FROM saorafael_clients
    WHERE cnpj_cpf = TRIM(p_cnpj_cpf);
  END IF;

  IF v_id IS NOT NULL THEN
    -- Atualizar dados do cliente existente
    UPDATE saorafael_clients SET
      razao_social = COALESCE(NULLIF(TRIM(p_razao_social), ''), razao_social),
      telefone = COALESCE(NULLIF(TRIM(p_telefone), ''), telefone),
      email = COALESCE(NULLIF(TRIM(p_email), ''), email),
      cidade = COALESCE(NULLIF(TRIM(p_cidade), ''), cidade),
      estado = COALESCE(NULLIF(TRIM(p_estado), ''), estado),
      cep = COALESCE(NULLIF(TRIM(p_cep), ''), cep),
      endereco = COALESCE(NULLIF(TRIM(p_endereco), ''), endereco),
      local_instalacao = COALESCE(NULLIF(TRIM(p_local_instalacao), ''), local_instalacao),
      contato_nome = COALESCE(NULLIF(TRIM(p_contato_nome), ''), contato_nome),
      contato_telefone = COALESCE(NULLIF(TRIM(p_contato_telefone), ''), contato_telefone),
      contato_email = COALESCE(NULLIF(TRIM(p_contato_email), ''), contato_email),
      inscricao_estadual = COALESCE(NULLIF(TRIM(p_inscricao_estadual), ''), inscricao_estadual),
      updated_at = NOW()
    WHERE id = v_id;
  ELSE
    -- Inserir novo cliente
    INSERT INTO saorafael_clients (
      razao_social, cnpj_cpf, telefone, email, cidade, estado, cep,
      endereco, local_instalacao, contato_nome, contato_telefone,
      contato_email, inscricao_estadual, created_by
    ) VALUES (
      TRIM(p_razao_social),
      NULLIF(TRIM(p_cnpj_cpf), ''),
      NULLIF(TRIM(p_telefone), ''),
      NULLIF(TRIM(p_email), ''),
      NULLIF(TRIM(p_cidade), ''),
      NULLIF(TRIM(p_estado), ''),
      NULLIF(TRIM(p_cep), ''),
      NULLIF(TRIM(p_endereco), ''),
      NULLIF(TRIM(p_local_instalacao), ''),
      NULLIF(TRIM(p_contato_nome), ''),
      NULLIF(TRIM(p_contato_telefone), ''),
      NULLIF(TRIM(p_contato_email), ''),
      NULLIF(TRIM(p_inscricao_estadual), ''),
      auth.uid()
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- 11. Apagar um cliente (e todos os seus orçamentos)
CREATE OR REPLACE FUNCTION saorafael_delete_client(p_client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_submissions INT;
  v_razao TEXT;
BEGIN
  -- Buscar nome para confirmação
  SELECT razao_social INTO v_razao FROM saorafael_clients WHERE id = p_client_id;
  IF v_razao IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;

  -- Remover vínculo das submissions (ou deletar, conforme desejado)
  DELETE FROM saorafael_wizard_submission WHERE client_id = p_client_id;
  GET DIAGNOSTICS v_deleted_submissions = ROW_COUNT;

  -- Deletar o cliente
  DELETE FROM saorafael_clients WHERE id = p_client_id;

  RETURN jsonb_build_object(
    'success', true,
    'cliente', v_razao,
    'orcamentos_removidos', v_deleted_submissions
  );
END;
$$;

-- 12. Apagar um orçamento (submission) — se o cliente ficar sem orçamentos, apaga o cliente também
CREATE OR REPLACE FUNCTION saorafael_delete_submission_smart(p_submission_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_protocol TEXT;
  v_remaining INT;
  v_client_deleted BOOLEAN := false;
  v_razao TEXT;
BEGIN
  -- Buscar submission
  SELECT client_id, protocol INTO v_client_id, v_protocol
  FROM saorafael_wizard_submission WHERE id = p_submission_id;

  IF v_protocol IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Orçamento não encontrado');
  END IF;

  -- Deletar a submission
  DELETE FROM saorafael_wizard_submission WHERE id = p_submission_id;

  -- Se tinha client_id, verificar se o cliente ficou órfão
  IF v_client_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_remaining
    FROM saorafael_wizard_submission
    WHERE client_id = v_client_id;

    IF v_remaining = 0 THEN
      -- Cliente sem nenhum orçamento → apagar cliente também
      SELECT razao_social INTO v_razao FROM saorafael_clients WHERE id = v_client_id;
      DELETE FROM saorafael_clients WHERE id = v_client_id;
      v_client_deleted := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'protocol', v_protocol,
    'client_deleted', v_client_deleted,
    'client_name', COALESCE(v_razao, null)
  );
END;
$$;

-- =======  DOWN  ========
-- DROP FUNCTION IF EXISTS saorafael_delete_submission_smart(BIGINT);
-- DROP FUNCTION IF EXISTS saorafael_delete_client(UUID);
-- DROP FUNCTION IF EXISTS saorafael_upsert_client(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS saorafael_client_submissions(UUID);
-- DROP FUNCTION IF EXISTS saorafael_client_detail(UUID);
-- DROP FUNCTION IF EXISTS saorafael_search_clients(TEXT);
-- ALTER TABLE saorafael_wizard_submission DROP COLUMN IF EXISTS client_id;
-- DROP TABLE IF EXISTS saorafael_clients;
