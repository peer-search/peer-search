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
CREATE INDEX "idx_organizations_level" ON "organizations" USING btree ("level");