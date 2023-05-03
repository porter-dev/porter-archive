-- Create "job_notification_configs" table
CREATE TABLE "public"."job_notification_configs" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "name" text NULL,
  "namespace" text NULL,
  "project_id" bigint NULL,
  "cluster_id" bigint NULL,
  "last_notified_time" timestamptz NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_job_notification_configs_deleted_at" to table: "job_notification_configs"
CREATE INDEX "idx_job_notification_configs_deleted_at" ON "public"."job_notification_configs" ("deleted_at");
-- Create "api_contract_revisions" table
CREATE TABLE "public"."api_contract_revisions" (
  "id" uuid NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "base64_contract" text NULL,
  "cluster_id" bigint NULL,
  "project_id" bigint NULL,
  "condition" text NULL,
  "condition_metadata" jsonb NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_api_contract_revisions_deleted_at" to table: "api_contract_revisions"
CREATE INDEX "idx_api_contract_revisions_deleted_at" ON "public"."api_contract_revisions" ("deleted_at");
-- Create "api_tokens" table
CREATE TABLE "public"."api_tokens" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "unique_id" text NULL,
  "project_id" bigint NULL,
  "created_by_user_id" bigint NULL,
  "expiry" timestamptz NULL,
  "revoked" boolean NULL,
  "policy_uid" text NULL,
  "policy_name" text NULL,
  "name" text NULL,
  "secret_key" bytea NULL,
  PRIMARY KEY ("id")
);
-- Create index "api_tokens_unique_id_key" to table: "api_tokens"
CREATE UNIQUE INDEX "api_tokens_unique_id_key" ON "public"."api_tokens" ("unique_id");
-- Create index "idx_api_tokens_deleted_at" to table: "api_tokens"
CREATE INDEX "idx_api_tokens_deleted_at" ON "public"."api_tokens" ("deleted_at");
-- Create "auth_codes" table
CREATE TABLE "public"."auth_codes" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "token" text NULL,
  "authorization_code" text NULL,
  "expiry" timestamptz NULL,
  PRIMARY KEY ("id")
);
-- Create index "auth_codes_authorization_code_key" to table: "auth_codes"
CREATE UNIQUE INDEX "auth_codes_authorization_code_key" ON "public"."auth_codes" ("authorization_code");
-- Create index "auth_codes_token_key" to table: "auth_codes"
CREATE UNIQUE INDEX "auth_codes_token_key" ON "public"."auth_codes" ("token");
-- Create index "idx_auth_codes_deleted_at" to table: "auth_codes"
CREATE INDEX "idx_auth_codes_deleted_at" ON "public"."auth_codes" ("deleted_at");
-- Create "users" table
CREATE TABLE "public"."users" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "email" text NULL,
  "password" text NULL,
  "email_verified" boolean NULL,
  "first_name" text NULL,
  "last_name" text NULL,
  "company_name" text NULL,
  "github_app_integration_id" bigint NULL,
  "github_user_id" bigint NULL,
  "google_user_id" text NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_users_deleted_at" to table: "users"
CREATE INDEX "idx_users_deleted_at" ON "public"."users" ("deleted_at");
-- Create index "users_email_key" to table: "users"
CREATE UNIQUE INDEX "users_email_key" ON "public"."users" ("email");
-- Create "user_billings" table
CREATE TABLE "public"."user_billings" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "user_id" bigint NULL,
  "teammate_id" text NULL,
  "token" bytea NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_user_billings_deleted_at" to table: "user_billings"
CREATE INDEX "idx_user_billings_deleted_at" ON "public"."user_billings" ("deleted_at");
-- Create "token_caches" table
CREATE TABLE "public"."token_caches" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "expiry" timestamptz NULL,
  "token" bytea NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_token_caches_deleted_at" to table: "token_caches"
CREATE INDEX "idx_token_caches_deleted_at" ON "public"."token_caches" ("deleted_at");
-- Create "slack_integrations" table
CREATE TABLE "public"."slack_integrations" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "client_id" bytea NULL,
  "access_token" bytea NULL,
  "refresh_token" bytea NULL,
  "expiry" timestamptz NULL,
  "client" text NULL,
  "user_id" bigint NULL,
  "project_id" bigint NULL,
  "team_id" text NULL,
  "team_name" text NULL,
  "team_icon_url" text NULL,
  "channel" text NULL,
  "channel_id" text NULL,
  "configuration_url" text NULL,
  "webhook" bytea NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_slack_integrations_deleted_at" to table: "slack_integrations"
CREATE INDEX "idx_slack_integrations_deleted_at" ON "public"."slack_integrations" ("deleted_at");
-- Create "build_configs" table
CREATE TABLE "public"."build_configs" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "name" text NULL,
  "builder" text NULL,
  "buildpacks" text NULL,
  "config" bytea NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_build_configs_deleted_at" to table: "build_configs"
CREATE INDEX "idx_build_configs_deleted_at" ON "public"."build_configs" ("deleted_at");
-- Create "sessions" table
CREATE TABLE "public"."sessions" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "key" text NULL,
  "data" bytea NULL,
  "expires_at" timestamptz NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_sessions_deleted_at" to table: "sessions"
CREATE INDEX "idx_sessions_deleted_at" ON "public"."sessions" ("deleted_at");
-- Create index "sessions_key_key" to table: "sessions"
CREATE UNIQUE INDEX "sessions_key_key" ON "public"."sessions" ("key");
-- Create "pw_reset_tokens" table
CREATE TABLE "public"."pw_reset_tokens" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "email" text NULL,
  "is_valid" boolean NULL,
  "expiry" timestamptz NULL,
  "token" text NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_pw_reset_tokens_deleted_at" to table: "pw_reset_tokens"
CREATE INDEX "idx_pw_reset_tokens_deleted_at" ON "public"."pw_reset_tokens" ("deleted_at");
-- Create "cluster_token_caches" table
CREATE TABLE "public"."cluster_token_caches" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "expiry" timestamptz NULL,
  "token" bytea NULL,
  "cluster_id" bigint NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_cluster_token_caches_deleted_at" to table: "cluster_token_caches"
CREATE INDEX "idx_cluster_token_caches_deleted_at" ON "public"."cluster_token_caches" ("deleted_at");
-- Create "projects" table
CREATE TABLE "public"."projects" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "name" text NULL,
  "project_usage_id" bigint NULL,
  "project_usage_cache_id" bigint NULL,
  "preview_envs_enabled" boolean NULL,
  "rds_databases_enabled" boolean NULL,
  "managed_infra_enabled" boolean NULL,
  "stacks_enabled" boolean NULL,
  "api_tokens_enabled" boolean NULL,
  "capi_provisioner_enabled" boolean NULL,
  "simplified_view_enabled" boolean NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_projects_deleted_at" to table: "projects"
CREATE INDEX "idx_projects_deleted_at" ON "public"."projects" ("deleted_at");
-- Create "credentials_exchange_tokens" table
CREATE TABLE "public"."credentials_exchange_tokens" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "token" bytea NULL,
  "expiry" timestamptz NULL,
  "do_credential_id" bigint NULL,
  "aws_credential_id" bigint NULL,
  "gcp_credential_id" bigint NULL,
  "azure_credential_id" bigint NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_credentials_exchange_tokens_deleted_at" to table: "credentials_exchange_tokens"
CREATE INDEX "idx_credentials_exchange_tokens_deleted_at" ON "public"."credentials_exchange_tokens" ("deleted_at");
-- Create "project_usages" table
CREATE TABLE "public"."project_usages" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "resource_cpu" bigint NULL,
  "resource_memory" bigint NULL,
  "clusters" bigint NULL,
  "users" bigint NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_project_usages_deleted_at" to table: "project_usages"
CREATE INDEX "idx_project_usages_deleted_at" ON "public"."project_usages" ("deleted_at");
-- Create "db_migrations" table
CREATE TABLE "public"."db_migrations" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "version" bigint NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_db_migrations_deleted_at" to table: "db_migrations"
CREATE INDEX "idx_db_migrations_deleted_at" ON "public"."db_migrations" ("deleted_at");
-- Create "deployments" table
CREATE TABLE "public"."deployments" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "environment_id" bigint NULL,
  "namespace" text NULL,
  "status" text NULL,
  "subdomain" text NULL,
  "pull_request_id" bigint NULL,
  "gh_deployment_id" bigint NULL,
  "ghpr_comment_id" bigint NULL,
  "pr_name" text NULL,
  "repo_name" text NULL,
  "repo_owner" text NULL,
  "commit_sha" text NULL,
  "pr_branch_from" text NULL,
  "pr_branch_into" text NULL,
  "last_errors" text NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_deployments_deleted_at" to table: "deployments"
CREATE INDEX "idx_deployments_deleted_at" ON "public"."deployments" ("deleted_at");
-- Create "dns_records" table
CREATE TABLE "public"."dns_records" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "subdomain_prefix" text NULL,
  "root_domain" text NULL,
  "endpoint" text NULL,
  "hostname" text NULL,
  "cluster_id" bigint NULL,
  PRIMARY KEY ("id")
);
-- Create index "dns_records_subdomain_prefix_key" to table: "dns_records"
CREATE UNIQUE INDEX "dns_records_subdomain_prefix_key" ON "public"."dns_records" ("subdomain_prefix");
-- Create index "idx_dns_records_deleted_at" to table: "dns_records"
CREATE INDEX "idx_dns_records_deleted_at" ON "public"."dns_records" ("deleted_at");
-- Create "environments" table
CREATE TABLE "public"."environments" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "cluster_id" bigint NULL,
  "git_installation_id" bigint NULL,
  "git_repo_owner" text NULL,
  "git_repo_name" text NULL,
  "git_repo_branches" text NULL,
  "name" text NULL,
  "mode" text NULL,
  "new_comments_disabled" boolean NULL,
  "namespace_labels" bytea NULL,
  "namespace_annotations" bytea NULL,
  "git_deploy_branches" text NULL,
  "webhook_id" text NULL,
  "github_webhook_id" bigint NULL,
  PRIMARY KEY ("id")
);
-- Create index "environments_webhook_id_key" to table: "environments"
CREATE UNIQUE INDEX "environments_webhook_id_key" ON "public"."environments" ("webhook_id");
-- Create index "idx_environments_deleted_at" to table: "environments"
CREATE INDEX "idx_environments_deleted_at" ON "public"."environments" ("deleted_at");
-- Create "project_usage_caches" table
CREATE TABLE "public"."project_usage_caches" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "resource_cpu" bigint NULL,
  "resource_memory" bigint NULL,
  "clusters" bigint NULL,
  "users" bigint NULL,
  "exceeded" boolean NULL,
  "exceeded_since" timestamptz NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_project_usage_caches_deleted_at" to table: "project_usage_caches"
CREATE INDEX "idx_project_usage_caches_deleted_at" ON "public"."project_usage_caches" ("deleted_at");
-- Create "project_billings" table
CREATE TABLE "public"."project_billings" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "billing_team_id" text NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_project_billings_deleted_at" to table: "project_billings"
CREATE INDEX "idx_project_billings_deleted_at" ON "public"."project_billings" ("deleted_at");
-- Create "porter_apps" table
CREATE TABLE "public"."porter_apps" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "cluster_id" bigint NULL,
  "name" text NULL,
  "image_repo_uri" text NULL,
  "git_repo_id" bigint NULL,
  "repo_name" text NULL,
  "git_branch" text NULL,
  "build_context" text NULL,
  "builder" text NULL,
  "buildpacks" text NULL,
  "dockerfile" text NULL,
  "pull_request_url" text NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_porter_apps_deleted_at" to table: "porter_apps"
CREATE INDEX "idx_porter_apps_deleted_at" ON "public"."porter_apps" ("deleted_at");
-- Create "policies" table
CREATE TABLE "public"."policies" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "unique_id" text NULL,
  "project_id" bigint NULL,
  "created_by_user_id" bigint NULL,
  "name" text NULL,
  "policy_bytes" bytea NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_policies_deleted_at" to table: "policies"
CREATE INDEX "idx_policies_deleted_at" ON "public"."policies" ("deleted_at");
-- Create index "policies_unique_id_key" to table: "policies"
CREATE UNIQUE INDEX "policies_unique_id_key" ON "public"."policies" ("unique_id");
-- Create "github_app_installations" table
CREATE TABLE "public"."github_app_installations" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "account_id" bigint NULL,
  "installation_id" bigint NULL,
  PRIMARY KEY ("id")
);
-- Create index "github_app_installations_account_id_key" to table: "github_app_installations"
CREATE UNIQUE INDEX "github_app_installations_account_id_key" ON "public"."github_app_installations" ("account_id");
-- Create index "idx_github_app_installations_deleted_at" to table: "github_app_installations"
CREATE INDEX "idx_github_app_installations_deleted_at" ON "public"."github_app_installations" ("deleted_at");
-- Create "github_app_o_auth_integrations" table
CREATE TABLE "public"."github_app_o_auth_integrations" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "client_id" bytea NULL,
  "access_token" bytea NULL,
  "refresh_token" bytea NULL,
  "expiry" timestamptz NULL,
  "user_id" bigint NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_github_app_o_auth_integrations_deleted_at" to table: "github_app_o_auth_integrations"
CREATE INDEX "idx_github_app_o_auth_integrations_deleted_at" ON "public"."github_app_o_auth_integrations" ("deleted_at");
-- Create "gitlab_app_o_auth_integrations" table
CREATE TABLE "public"."gitlab_app_o_auth_integrations" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "o_auth_integration_id" bigint NULL,
  "gitlab_integration_id" bigint NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_gitlab_app_o_auth_integrations_deleted_at" to table: "gitlab_app_o_auth_integrations"
CREATE INDEX "idx_gitlab_app_o_auth_integrations_deleted_at" ON "public"."gitlab_app_o_auth_integrations" ("deleted_at");
-- Create "onboardings" table
CREATE TABLE "public"."onboardings" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "current_step" text NULL,
  "connected_source" text NULL,
  "skip_registry_connection" boolean NULL,
  "skip_resource_provision" boolean NULL,
  "registry_connection_id" bigint NULL,
  "registry_connection_credential_id" bigint NULL,
  "registry_connection_provider" text NULL,
  "registry_infra_id" bigint NULL,
  "registry_infra_credential_id" bigint NULL,
  "registry_infra_provider" text NULL,
  "cluster_infra_id" bigint NULL,
  "cluster_infra_credential_id" bigint NULL,
  "cluster_infra_provider" text NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_onboardings_deleted_at" to table: "onboardings"
CREATE INDEX "idx_onboardings_deleted_at" ON "public"."onboardings" ("deleted_at");
-- Create "notification_configs" table
CREATE TABLE "public"."notification_configs" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "enabled" boolean NULL,
  "success" boolean NULL,
  "failure" boolean NULL,
  "last_notified_time" timestamptz NULL,
  "notif_limit" text NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_notification_configs_deleted_at" to table: "notification_configs"
CREATE INDEX "idx_notification_configs_deleted_at" ON "public"."notification_configs" ("deleted_at");
-- Create "monitor_test_results" table
CREATE TABLE "public"."monitor_test_results" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "cluster_id" bigint NULL,
  "category" text NULL,
  "object_id" text NULL,
  "last_status_change" timestamptz NULL,
  "last_tested" timestamptz NULL,
  "last_run_result" text NULL,
  "last_run_result_enum" bigint NULL,
  "last_recommender_run_id" text NULL,
  "archived" boolean NULL,
  "title" text NULL,
  "message" text NULL,
  "severity" text NULL,
  "severity_enum" bigint NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_monitor_test_results_deleted_at" to table: "monitor_test_results"
CREATE INDEX "idx_monitor_test_results_deleted_at" ON "public"."monitor_test_results" ("deleted_at");
-- Create "allowlists" table
CREATE TABLE "public"."allowlists" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "user_email" text NOT NULL,
  PRIMARY KEY ("id")
);
-- Create index "allowlists_user_email_key" to table: "allowlists"
CREATE UNIQUE INDEX "allowlists_user_email_key" ON "public"."allowlists" ("user_email");
-- Create index "idx_allowlists_deleted_at" to table: "allowlists"
CREATE INDEX "idx_allowlists_deleted_at" ON "public"."allowlists" ("deleted_at");
-- Create "invites" table
CREATE TABLE "public"."invites" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "token" text NULL,
  "expiry" timestamptz NULL,
  "email" text NULL,
  "kind" text NULL,
  "project_id" bigint NULL,
  "user_id" bigint NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_invites" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_invites_deleted_at" to table: "invites"
CREATE INDEX "idx_invites_deleted_at" ON "public"."invites" ("deleted_at");
-- Create index "invites_token_key" to table: "invites"
CREATE UNIQUE INDEX "invites_token_key" ON "public"."invites" ("token");
-- Create "kube_events" table
CREATE TABLE "public"."kube_events" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "cluster_id" bigint NULL,
  "name" text NULL,
  "resource_type" text NULL,
  "owner_type" text NULL,
  "owner_name" text NULL,
  "namespace" text NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_kube_events_deleted_at" to table: "kube_events"
CREATE INDEX "idx_kube_events_deleted_at" ON "public"."kube_events" ("deleted_at");
-- Create "kube_sub_events" table
CREATE TABLE "public"."kube_sub_events" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "kube_event_id" bigint NULL,
  "message" text NULL,
  "reason" text NULL,
  "timestamp" timestamptz NULL,
  "event_type" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_kube_events_sub_events" FOREIGN KEY ("kube_event_id") REFERENCES "public"."kube_events" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_kube_sub_events_deleted_at" to table: "kube_sub_events"
CREATE INDEX "idx_kube_sub_events_deleted_at" ON "public"."kube_sub_events" ("deleted_at");
-- Create "infras" table
CREATE TABLE "public"."infras" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "kind" text NULL,
  "api_version" text NULL,
  "source_link" text NULL,
  "source_version" text NULL,
  "suffix" text NULL,
  "project_id" bigint NULL,
  "created_by_user_id" bigint NULL,
  "parent_cluster_id" bigint NULL,
  "status" text NULL,
  "aws_integration_id" bigint NULL,
  "azure_integration_id" bigint NULL,
  "gcp_integration_id" bigint NULL,
  "do_integration_id" bigint NULL,
  "database_id" bigint NULL,
  "last_applied" bytea NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_infras" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_infras_deleted_at" to table: "infras"
CREATE INDEX "idx_infras_deleted_at" ON "public"."infras" ("deleted_at");
-- Create "operations" table
CREATE TABLE "public"."operations" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "uid" text NULL,
  "infra_id" bigint NULL,
  "type" text NULL,
  "status" text NULL,
  "errored" boolean NULL,
  "error" text NULL,
  "template_version" text NULL,
  "last_applied" bytea NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_infras_operations" FOREIGN KEY ("infra_id") REFERENCES "public"."infras" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_operations_deleted_at" to table: "operations"
CREATE INDEX "idx_operations_deleted_at" ON "public"."operations" ("deleted_at");
-- Create index "operations_uid_key" to table: "operations"
CREATE UNIQUE INDEX "operations_uid_key" ON "public"."operations" ("uid");
-- Create "stacks" table
CREATE TABLE "public"."stacks" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "cluster_id" bigint NULL,
  "namespace" text NULL,
  "name" text NULL,
  "uid" text NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_stacks_deleted_at" to table: "stacks"
CREATE INDEX "idx_stacks_deleted_at" ON "public"."stacks" ("deleted_at");
-- Create index "stacks_uid_key" to table: "stacks"
CREATE UNIQUE INDEX "stacks_uid_key" ON "public"."stacks" ("uid");
-- Create "stack_revisions" table
CREATE TABLE "public"."stack_revisions" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "revision_number" bigint NULL,
  "stack_id" bigint NULL,
  "status" text NULL,
  "reason" text NULL,
  "message" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_stacks_revisions" FOREIGN KEY ("stack_id") REFERENCES "public"."stacks" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_stack_revisions_deleted_at" to table: "stack_revisions"
CREATE INDEX "idx_stack_revisions_deleted_at" ON "public"."stack_revisions" ("deleted_at");
-- Create "azure_integrations" table
CREATE TABLE "public"."azure_integrations" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "user_id" bigint NULL,
  "project_id" bigint NULL,
  "azure_client_id" text NULL,
  "azure_subscription_id" text NULL,
  "azure_tenant_id" text NULL,
  "acr_token_name" text NULL,
  "acr_resource_group_name" text NULL,
  "acr_name" text NULL,
  "service_principal_secret" bytea NULL,
  "acr_password1" bytea NULL,
  "acr_password2" bytea NULL,
  "aks_password" bytea NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_azure_integrations" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_azure_integrations_deleted_at" to table: "azure_integrations"
CREATE INDEX "idx_azure_integrations_deleted_at" ON "public"."azure_integrations" ("deleted_at");
-- Create "databases" table
CREATE TABLE "public"."databases" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "cluster_id" bigint NULL,
  "infra_id" bigint NULL,
  "instance_id" text NULL,
  "instance_endpoint" text NULL,
  "instance_name" text NULL,
  "status" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_infras_database" FOREIGN KEY ("infra_id") REFERENCES "public"."infras" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "fk_projects_databases" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_databases_deleted_at" to table: "databases"
CREATE INDEX "idx_databases_deleted_at" ON "public"."databases" ("deleted_at");
-- Create "gitlab_integrations" table
CREATE TABLE "public"."gitlab_integrations" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "instance_url" text NULL,
  "app_client_id" bytea NULL,
  "app_client_secret" bytea NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_gitlab_integrations" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_gitlab_integrations_deleted_at" to table: "gitlab_integrations"
CREATE INDEX "idx_gitlab_integrations_deleted_at" ON "public"."gitlab_integrations" ("deleted_at");
-- Create "aws_integrations" table
CREATE TABLE "public"."aws_integrations" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "user_id" bigint NULL,
  "project_id" bigint NULL,
  "aws_arn" text NULL,
  "aws_region" text NULL,
  "aws_assume_role_arn" text NULL,
  "aws_cluster_id" bytea NULL,
  "aws_access_key_id" bytea NULL,
  "aws_secret_access_key" bytea NULL,
  "aws_session_token" bytea NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_aws_integrations" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_aws_integrations_deleted_at" to table: "aws_integrations"
CREATE INDEX "idx_aws_integrations_deleted_at" ON "public"."aws_integrations" ("deleted_at");
-- Create "basic_integrations" table
CREATE TABLE "public"."basic_integrations" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "user_id" bigint NULL,
  "project_id" bigint NULL,
  "username" bytea NULL,
  "password" bytea NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_basic_integrations" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_basic_integrations_deleted_at" to table: "basic_integrations"
CREATE INDEX "idx_basic_integrations_deleted_at" ON "public"."basic_integrations" ("deleted_at");
-- Create "clusters" table
CREATE TABLE "public"."clusters" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "auth_mechanism" text NULL,
  "project_id" bigint NULL,
  "agent_integration_enabled" boolean NULL,
  "name" text NULL,
  "vanity_name" text NULL,
  "server" text NULL,
  "cluster_location_of_origin" text NULL,
  "tls_server_name" text NULL,
  "insecure_skip_tls_verify" boolean NULL,
  "proxy_url" text NULL,
  "user_location_of_origin" text NULL,
  "user_impersonate" text NULL,
  "user_impersonate_groups" text NULL,
  "infra_id" bigint NULL,
  "notifications_disabled" boolean NULL,
  "preview_envs_enabled" boolean NULL,
  "aws_cluster_id" text NULL,
  "status" text NULL,
  "provisioned_by" text NULL,
  "cloud_provider" text NULL,
  "cloud_provider_credential_identifier" text NULL,
  "kube_integration_id" bigint NULL,
  "o_id_c_integration_id" bigint NULL,
  "gcp_integration_id" bigint NULL,
  "aws_integration_id" bigint NULL,
  "do_integration_id" bigint NULL,
  "azure_integration_id" bigint NULL,
  "token_cache_id" bigint NULL,
  "certificate_authority_data" bytea NULL,
  "monitor_helm_releases" boolean NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_clusters" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_clusters_deleted_at" to table: "clusters"
CREATE INDEX "idx_clusters_deleted_at" ON "public"."clusters" ("deleted_at");
-- Create "o_auth_integrations" table
CREATE TABLE "public"."o_auth_integrations" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "client_id" bytea NULL,
  "access_token" bytea NULL,
  "refresh_token" bytea NULL,
  "expiry" timestamptz NULL,
  "client" text NULL,
  "user_id" bigint NULL,
  "project_id" bigint NULL,
  "target_email" text NULL,
  "target_name" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_o_auth_integrations" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_o_auth_integrations_deleted_at" to table: "o_auth_integrations"
CREATE INDEX "idx_o_auth_integrations_deleted_at" ON "public"."o_auth_integrations" ("deleted_at");
-- Create "registries" table
CREATE TABLE "public"."registries" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "name" text NULL,
  "url" text NULL,
  "project_id" bigint NULL,
  "infra_id" bigint NULL,
  "gcp_integration_id" bigint NULL,
  "aws_integration_id" bigint NULL,
  "azure_integration_id" bigint NULL,
  "do_integration_id" bigint NULL,
  "basic_integration_id" bigint NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_registries" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_registries_deleted_at" to table: "registries"
CREATE INDEX "idx_registries_deleted_at" ON "public"."registries" ("deleted_at");
-- Create "releases" table
CREATE TABLE "public"."releases" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "webhook_token" text NULL,
  "cluster_id" bigint NULL,
  "project_id" bigint NULL,
  "name" text NULL,
  "namespace" text NULL,
  "stack_resource_id" bigint NULL,
  "image_repo_uri" text NULL,
  "event_container" bigint NULL,
  "notification_config" bigint NULL,
  "build_config" bigint NULL,
  "canonical_name" text NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_releases_deleted_at" to table: "releases"
CREATE INDEX "idx_releases_deleted_at" ON "public"."releases" ("deleted_at");
-- Create index "releases_webhook_token_key" to table: "releases"
CREATE UNIQUE INDEX "releases_webhook_token_key" ON "public"."releases" ("webhook_token");
-- Create "git_action_configs" table
CREATE TABLE "public"."git_action_configs" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "release_id" bigint NULL,
  "git_repo" text NULL,
  "git_branch" text NULL,
  "image_repo_uri" text NULL,
  "github_installation_id" bigint NULL,
  "git_repo_id" bigint NULL,
  "gitlab_integration_id" bigint NULL,
  "dockerfile_path" text NULL,
  "folder_path" text NULL,
  "is_installation" boolean NULL,
  "version" text NULL DEFAULT 'v0.0.1',
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_releases_git_action_config" FOREIGN KEY ("release_id") REFERENCES "public"."releases" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_git_action_configs_deleted_at" to table: "git_action_configs"
CREATE INDEX "idx_git_action_configs_deleted_at" ON "public"."git_action_configs" ("deleted_at");
-- Create "git_repos" table
CREATE TABLE "public"."git_repos" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "repo_entity" text NULL,
  "o_auth_integration_id" bigint NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_git_repos" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_git_repos_deleted_at" to table: "git_repos"
CREATE INDEX "idx_git_repos_deleted_at" ON "public"."git_repos" ("deleted_at");
-- Create "helm_repos" table
CREATE TABLE "public"."helm_repos" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "name" text NULL,
  "project_id" bigint NULL,
  "repo_url" text NULL,
  "basic_auth_integration_id" bigint NULL,
  "gcp_integration_id" bigint NULL,
  "aws_integration_id" bigint NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_helm_repos" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_helm_repos_deleted_at" to table: "helm_repos"
CREATE INDEX "idx_helm_repos_deleted_at" ON "public"."helm_repos" ("deleted_at");
-- Create "event_containers" table
CREATE TABLE "public"."event_containers" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "release_id" bigint NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_event_containers_deleted_at" to table: "event_containers"
CREATE INDEX "idx_event_containers_deleted_at" ON "public"."event_containers" ("deleted_at");
-- Create "sub_events" table
CREATE TABLE "public"."sub_events" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "event_container_id" bigint NULL,
  "event_id" text NULL,
  "name" text NULL,
  "index" bigint NULL,
  "status" bigint NULL,
  "info" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_event_containers_steps" FOREIGN KEY ("event_container_id") REFERENCES "public"."event_containers" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_sub_events_deleted_at" to table: "sub_events"
CREATE INDEX "idx_sub_events_deleted_at" ON "public"."sub_events" ("deleted_at");
-- Create "cluster_candidates" table
CREATE TABLE "public"."cluster_candidates" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "auth_mechanism" text NULL,
  "project_id" bigint NULL,
  "created_cluster_id" bigint NULL,
  "name" text NULL,
  "server" text NULL,
  "context_name" text NULL,
  "aws_cluster_id_guess" bytea NULL,
  "kubeconfig" bytea NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_cluster_candidates" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_cluster_candidates_deleted_at" to table: "cluster_candidates"
CREATE INDEX "idx_cluster_candidates_deleted_at" ON "public"."cluster_candidates" ("deleted_at");
-- Create "cluster_resolvers" table
CREATE TABLE "public"."cluster_resolvers" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "cluster_candidate_id" bigint NULL,
  "name" text NULL,
  "resolved" boolean NULL,
  "data" bytea NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_cluster_candidates_resolvers" FOREIGN KEY ("cluster_candidate_id") REFERENCES "public"."cluster_candidates" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_cluster_resolvers_deleted_at" to table: "cluster_resolvers"
CREATE INDEX "idx_cluster_resolvers_deleted_at" ON "public"."cluster_resolvers" ("deleted_at");
-- Create "gcp_integrations" table
CREATE TABLE "public"."gcp_integrations" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "user_id" bigint NULL,
  "project_id" bigint NULL,
  "gcp_project_id" text NULL,
  "gcpsa_email" text NULL,
  "g_cpuser_email" text NULL,
  "gcp_region" text NULL,
  "gcp_key_data" bytea NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_gcp_integrations" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_gcp_integrations_deleted_at" to table: "gcp_integrations"
CREATE INDEX "idx_gcp_integrations_deleted_at" ON "public"."gcp_integrations" ("deleted_at");
-- Create "helm_repo_token_caches" table
CREATE TABLE "public"."helm_repo_token_caches" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "expiry" timestamptz NULL,
  "token" bytea NULL,
  "helm_repo_id" bigint NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_helm_repos_token_cache" FOREIGN KEY ("helm_repo_id") REFERENCES "public"."helm_repos" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_helm_repo_token_caches_deleted_at" to table: "helm_repo_token_caches"
CREATE INDEX "idx_helm_repo_token_caches_deleted_at" ON "public"."helm_repo_token_caches" ("deleted_at");
-- Create "stack_source_configs" table
CREATE TABLE "public"."stack_source_configs" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "stack_revision_id" bigint NULL,
  "name" text NULL,
  "display_name" text NULL,
  "uid" text NULL,
  "image_repo_uri" text NULL,
  "image_tag" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_stack_revisions_source_configs" FOREIGN KEY ("stack_revision_id") REFERENCES "public"."stack_revisions" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_stack_source_configs_deleted_at" to table: "stack_source_configs"
CREATE INDEX "idx_stack_source_configs_deleted_at" ON "public"."stack_source_configs" ("deleted_at");
-- Create "aws_assume_role_chains" table
CREATE TABLE "public"."aws_assume_role_chains" (
  "id" uuid NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "source_arn" text NULL,
  "target_arn" text NULL,
  "external_id" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "aws_assume_role_chains_project_id_source_arn_target_arn_key" to table: "aws_assume_role_chains"
CREATE UNIQUE INDEX "aws_assume_role_chains_project_id_source_arn_target_arn_key" ON "public"."aws_assume_role_chains" ("project_id", "source_arn", "target_arn");
-- Create index "aws_assume_role_chains_project_id_source_arn_target_arn_key1" to table: "aws_assume_role_chains"
CREATE UNIQUE INDEX "aws_assume_role_chains_project_id_source_arn_target_arn_key1" ON "public"."aws_assume_role_chains" ("project_id", "source_arn", "target_arn");
-- Create index "aws_assume_role_chains_project_id_source_arn_target_arn_key2" to table: "aws_assume_role_chains"
CREATE UNIQUE INDEX "aws_assume_role_chains_project_id_source_arn_target_arn_key2" ON "public"."aws_assume_role_chains" ("project_id", "source_arn", "target_arn");
-- Create index "aws_assume_role_chains_project_id_source_arn_target_arn_key3" to table: "aws_assume_role_chains"
CREATE UNIQUE INDEX "aws_assume_role_chains_project_id_source_arn_target_arn_key3" ON "public"."aws_assume_role_chains" ("project_id", "source_arn", "target_arn");
-- Create index "aws_assume_role_chains_project_id_source_arn_target_arn_key4" to table: "aws_assume_role_chains"
CREATE UNIQUE INDEX "aws_assume_role_chains_project_id_source_arn_target_arn_key4" ON "public"."aws_assume_role_chains" ("project_id", "source_arn", "target_arn");
-- Create index "idx_aws_assume_role_chains_deleted_at" to table: "aws_assume_role_chains"
CREATE INDEX "idx_aws_assume_role_chains_deleted_at" ON "public"."aws_assume_role_chains" ("deleted_at");
-- Create "tags" table
CREATE TABLE "public"."tags" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" bigint NULL,
  "name" text NULL,
  "color" text NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_tags_deleted_at" to table: "tags"
CREATE INDEX "idx_tags_deleted_at" ON "public"."tags" ("deleted_at");
-- Create "release_tags" table
CREATE TABLE "public"."release_tags" (
  "tag_id" bigint NOT NULL,
  "release_id" bigint NOT NULL,
  PRIMARY KEY ("tag_id", "release_id"),
  CONSTRAINT "fk_release_tags_release" FOREIGN KEY ("release_id") REFERENCES "public"."releases" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "fk_release_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "public"."tags" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create "roles" table
CREATE TABLE "public"."roles" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "kind" text NULL,
  "user_id" bigint NULL,
  "project_id" bigint NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_roles" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_roles_deleted_at" to table: "roles"
CREATE INDEX "idx_roles_deleted_at" ON "public"."roles" ("deleted_at");
-- Create "stack_env_groups" table
CREATE TABLE "public"."stack_env_groups" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "stack_revision_id" bigint NULL,
  "name" text NULL,
  "namespace" text NULL,
  "project_id" bigint NULL,
  "cluster_id" bigint NULL,
  "uid" text NULL,
  "env_group_version" bigint NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_stack_revisions_env_groups" FOREIGN KEY ("stack_revision_id") REFERENCES "public"."stack_revisions" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_stack_env_groups_deleted_at" to table: "stack_env_groups"
CREATE INDEX "idx_stack_env_groups_deleted_at" ON "public"."stack_env_groups" ("deleted_at");
-- Create "o_id_c_integrations" table
CREATE TABLE "public"."o_id_c_integrations" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "client" text NULL,
  "user_id" bigint NULL,
  "project_id" bigint NULL,
  "issuer_url" bytea NULL,
  "client_id" bytea NULL,
  "client_secret" bytea NULL,
  "certificate_authority_data" bytea NULL,
  "id_token" bytea NULL,
  "refresh_token" bytea NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_o_id_c_integrations" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_o_id_c_integrations_deleted_at" to table: "o_id_c_integrations"
CREATE INDEX "idx_o_id_c_integrations_deleted_at" ON "public"."o_id_c_integrations" ("deleted_at");
-- Create "reg_token_caches" table
CREATE TABLE "public"."reg_token_caches" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "expiry" timestamptz NULL,
  "token" bytea NULL,
  "registry_id" bigint NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_registries_token_cache" FOREIGN KEY ("registry_id") REFERENCES "public"."registries" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_reg_token_caches_deleted_at" to table: "reg_token_caches"
CREATE INDEX "idx_reg_token_caches_deleted_at" ON "public"."reg_token_caches" ("deleted_at");
-- Create "kube_integrations" table
CREATE TABLE "public"."kube_integrations" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "mechanism" text NULL,
  "user_id" bigint NULL,
  "project_id" bigint NULL,
  "client_certificate_data" bytea NULL,
  "client_key_data" bytea NULL,
  "token" bytea NULL,
  "username" bytea NULL,
  "password" bytea NULL,
  "kubeconfig" bytea NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_kube_integrations" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_kube_integrations_deleted_at" to table: "kube_integrations"
CREATE INDEX "idx_kube_integrations_deleted_at" ON "public"."kube_integrations" ("deleted_at");
-- Create "stack_resources" table
CREATE TABLE "public"."stack_resources" (
  "id" bigserial NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "name" text NULL,
  "uid" text NULL,
  "stack_revision_id" bigint NULL,
  "stack_source_config_uid" text NULL,
  "helm_revision_id" bigint NULL,
  "values" bytea NULL,
  "template_repo_url" text NULL,
  "template_name" text NULL,
  "template_version" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_stack_revisions_resources" FOREIGN KEY ("stack_revision_id") REFERENCES "public"."stack_revisions" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_stack_resources_deleted_at" to table: "stack_resources"
CREATE INDEX "idx_stack_resources_deleted_at" ON "public"."stack_resources" ("deleted_at");


-- Create "porter_app_revisions" table
CREATE TABLE "public"."porter_app_revisions" (
 "id" uuid NOT NULL,
 "created_at" timestamptz NOT NULL DEFAULT NOW(),
 "updated_at" timestamptz NOT NULL DEFAULT NOW(),
 "deleted_at" timestamptz NULL,
 "base64_contract" text NOT NULL DEFAULT '',
 "project_id" bigint NOT NULL,
 PRIMARY KEY ("id"), 
 CONSTRAINT "fk_projects_porter_app_revisions" FOREIGN KEY ("project_id") REFERENCES "public"."projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);