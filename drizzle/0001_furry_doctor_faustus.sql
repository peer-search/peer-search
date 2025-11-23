CREATE TABLE "employee_organizations" (
	"employee_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"position" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employee_organizations_employee_id_organization_id_pk" PRIMARY KEY("employee_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_number" text NOT NULL,
	"name_kanji" text NOT NULL,
	"name_kana" text NOT NULL,
	"photo_s3_key" text,
	"mobile_phone" text,
	"email" text NOT NULL,
	"hire_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_number_unique" UNIQUE("employee_number"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "organizations" DROP CONSTRAINT "organizations_parent_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "employee_organizations" ADD CONSTRAINT "employee_organizations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_organizations" ADD CONSTRAINT "employee_organizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_employee_organizations_employee_id" ON "employee_organizations" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_employee_organizations_organization_id" ON "employee_organizations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_employees_name_kana" ON "employees" USING btree ("name_kana");--> statement-breakpoint
CREATE INDEX "idx_employees_employee_number" ON "employees" USING btree ("employee_number");--> statement-breakpoint
CREATE INDEX "idx_employees_hire_date" ON "employees" USING btree ("hire_date");