-- Create "porter_app_revisions" table
CREATE TABLE "public"."porter_app_revisions" (
 "id" uuid NOT NULL,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "deleted_at" timestamptz NULL,
 "base64_contract" text NOT NULL DEFAULT '',
 "project_id" bigint NOT NULL,
 PRIMARY KEY ("id"),
 CONSTRAINT "fk_projects_porter_app_revisions" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
