-- =============================================
-- São Rafael — 012: RLS Policies for Clients Table
-- Vendedor vê próprios clientes, admin vê todos
-- =============================================

-- =======  UP  ========

-- Enable RLS on clients table
ALTER TABLE saorafael_clients ENABLE ROW LEVEL SECURITY;

-- Vendedores podem ver TODOS os clientes (leitura compartilhada)
-- Motivo: um cliente pode ser atendido por mais de um vendedor
CREATE POLICY "Authenticated users can read all clients"
  ON saorafael_clients
  FOR SELECT
  TO authenticated
  USING (true);

-- Vendedores podem inserir clientes (created_by = auth.uid())
CREATE POLICY "Users can insert clients"
  ON saorafael_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Vendedores podem atualizar apenas clientes que criaram
CREATE POLICY "Users can update own clients"
  ON saorafael_clients
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Admins podem atualizar qualquer cliente
CREATE POLICY "Admins can update all clients"
  ON saorafael_clients
  FOR UPDATE
  TO authenticated
  USING (saorafael_is_admin());

-- Admins podem deletar clientes
CREATE POLICY "Admins can delete clients"
  ON saorafael_clients
  FOR DELETE
  TO authenticated
  USING (saorafael_is_admin());

-- Service role full access (para n8n backend)
CREATE POLICY "Service role full access clients"
  ON saorafael_clients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =======  DOWN  ========
-- DROP POLICY IF EXISTS "Service role full access clients" ON saorafael_clients;
-- DROP POLICY IF EXISTS "Admins can delete clients" ON saorafael_clients;
-- DROP POLICY IF EXISTS "Admins can update all clients" ON saorafael_clients;
-- DROP POLICY IF EXISTS "Users can update own clients" ON saorafael_clients;
-- DROP POLICY IF EXISTS "Users can insert clients" ON saorafael_clients;
-- DROP POLICY IF EXISTS "Authenticated users can read all clients" ON saorafael_clients;
-- ALTER TABLE saorafael_clients DISABLE ROW LEVEL SECURITY;
