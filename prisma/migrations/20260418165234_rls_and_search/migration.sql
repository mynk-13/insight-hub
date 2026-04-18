-- RLS: Row-Level Security for workspace-scoped tables.
-- Prisma middleware sets app.current_workspace_id via SET LOCAL before each
-- workspace-scoped query, scoping all data access to the active workspace.

-- Enable RLS
ALTER TABLE sources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations    ENABLE ROW LEVEL SECURITY;

-- FORCE RLS applies policies even for the table owner role
ALTER TABLE sources        FORCE ROW LEVEL SECURITY;
ALTER TABLE chunks         FORCE ROW LEVEL SECURITY;
ALTER TABLE chats          FORCE ROW LEVEL SECURITY;
ALTER TABLE messages       FORCE ROW LEVEL SECURITY;
ALTER TABLE collections    FORCE ROW LEVEL SECURITY;
ALTER TABLE source_collections FORCE ROW LEVEL SECURITY;
ALTER TABLE annotations    FORCE ROW LEVEL SECURITY;
ALTER TABLE invitations    FORCE ROW LEVEL SECURITY;

-- Isolation policies: access is restricted to the workspace set in the
-- session config. When not set (NULL), no rows are visible — deny by default.
CREATE POLICY workspace_isolation ON sources
  AS RESTRICTIVE USING (
    "workspaceId" = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY workspace_isolation ON chunks
  AS RESTRICTIVE USING (
    "workspaceId" = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY workspace_isolation ON chats
  AS RESTRICTIVE USING (
    "workspaceId" = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY workspace_isolation ON messages
  AS RESTRICTIVE USING (
    "workspaceId" = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY workspace_isolation ON collections
  AS RESTRICTIVE USING (
    "workspaceId" = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY workspace_isolation ON source_collections
  AS RESTRICTIVE USING (
    EXISTS (
      SELECT 1 FROM sources s
      WHERE s.id = source_collections."sourceId"
        AND s."workspaceId" = current_setting('app.current_workspace_id', true)
    )
  );

CREATE POLICY workspace_isolation ON annotations
  AS RESTRICTIVE USING (
    "workspaceId" = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY workspace_isolation ON invitations
  AS RESTRICTIVE USING (
    "workspaceId" = current_setting('app.current_workspace_id', true)
  );

-- GIN index for BM25 full-text search on sources
CREATE INDEX sources_search_vector_idx ON sources USING GIN("searchVector");

-- Trigger to auto-populate searchVector on insert/update
CREATE FUNCTION update_source_search_vector() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector('english', COALESCE(NEW.title, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sources_search_vector_update
  BEFORE INSERT OR UPDATE OF title ON sources
  FOR EACH ROW EXECUTE FUNCTION update_source_search_vector();
