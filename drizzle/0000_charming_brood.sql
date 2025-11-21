CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"level" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parent_id_organizations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_level_check" CHECK ("level" >= 1 AND "level" <= 4);--> statement-breakpoint
CREATE INDEX "idx_organizations_parent_id" ON "organizations" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_organizations_level" ON "organizations" USING btree ("level");--> statement-breakpoint
CREATE OR REPLACE FUNCTION get_org_hierarchy()
RETURNS TABLE (id uuid, name text, parent_id uuid, level integer)
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE org_tree AS (
    -- Base case: ルートノード（parent_id が NULL）
    SELECT
      o.id,
      o.name,
      o.parent_id,
      o.level,
      ARRAY[o.id] AS path
    FROM organizations o
    WHERE o.parent_id IS NULL

    UNION ALL

    -- Recursive case: 親ノードの子を取得
    SELECT
      o.id,
      o.name,
      o.parent_id,
      o.level,
      ot.path || o.id
    FROM organizations o
    INNER JOIN org_tree ot ON o.parent_id = ot.id
    WHERE NOT o.id = ANY(ot.path) -- 循環参照を防ぐ
  )
  SELECT id, name, parent_id, level
  FROM org_tree
  ORDER BY level, parent_id NULLS FIRST;
$$;