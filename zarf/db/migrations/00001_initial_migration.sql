-- +goose Up
-- +goose StatementBegin
--
-- PostgreSQL database dump
--
--
-- PostgreSQL database dump
--

-- Dumped from database version 15.2
-- Dumped by pg_dump version 15.2 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: porter
--

CREATE SCHEMA if not exists public;


ALTER SCHEMA public OWNER TO porter;

SET default_tablespace = '';

SET default_table_access_method = heap;


SELECT 'CREATE DATABASE porter'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'porter');

--
-- Name: allowlists; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.allowlists (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    user_email text NOT NULL
);


ALTER TABLE public.allowlists OWNER TO porter;

--
-- Name: allowlists_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.allowlists_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.allowlists_id_seq OWNER TO porter;

--
-- Name: allowlists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.allowlists_id_seq OWNED BY public.allowlists.id;


--
-- Name: api_contract_revisions; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.api_contract_revisions (
    id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    base64_contract text,
    cluster_id bigint,
    project_id bigint,
    condition text,
    condition_metadata jsonb
);


ALTER TABLE public.api_contract_revisions OWNER TO porter;

--
-- Name: api_tokens; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.api_tokens (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    unique_id text,
    project_id bigint,
    created_by_user_id bigint,
    expiry timestamp with time zone,
    revoked boolean,
    policy_uid text,
    policy_name text,
    name text,
    secret_key bytea
);


ALTER TABLE public.api_tokens OWNER TO porter;

--
-- Name: api_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.api_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.api_tokens_id_seq OWNER TO porter;

--
-- Name: api_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.api_tokens_id_seq OWNED BY public.api_tokens.id;


--
-- Name: auth_codes; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.auth_codes (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    token text,
    authorization_code text,
    expiry timestamp with time zone
);


ALTER TABLE public.auth_codes OWNER TO porter;

--
-- Name: auth_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.auth_codes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.auth_codes_id_seq OWNER TO porter;

--
-- Name: auth_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.auth_codes_id_seq OWNED BY public.auth_codes.id;


--
-- Name: aws_assume_role_chains; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.aws_assume_role_chains (
    id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    source_arn text,
    target_arn text,
    external_id text
);


ALTER TABLE public.aws_assume_role_chains OWNER TO porter;

--
-- Name: aws_integrations; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.aws_integrations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    user_id bigint,
    project_id bigint,
    aws_arn text,
    aws_region text,
    aws_assume_role_arn text,
    aws_cluster_id bytea,
    aws_access_key_id bytea,
    aws_secret_access_key bytea,
    aws_session_token bytea
);


ALTER TABLE public.aws_integrations OWNER TO porter;

--
-- Name: aws_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.aws_integrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.aws_integrations_id_seq OWNER TO porter;

--
-- Name: aws_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.aws_integrations_id_seq OWNED BY public.aws_integrations.id;


--
-- Name: azure_integrations; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.azure_integrations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    user_id bigint,
    project_id bigint,
    azure_client_id text,
    azure_subscription_id text,
    azure_tenant_id text,
    acr_token_name text,
    acr_resource_group_name text,
    acr_name text,
    service_principal_secret bytea,
    acr_password1 bytea,
    acr_password2 bytea,
    aks_password bytea
);


ALTER TABLE public.azure_integrations OWNER TO porter;

--
-- Name: azure_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.azure_integrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.azure_integrations_id_seq OWNER TO porter;

--
-- Name: azure_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.azure_integrations_id_seq OWNED BY public.azure_integrations.id;


--
-- Name: basic_integrations; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.basic_integrations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    user_id bigint,
    project_id bigint,
    username bytea,
    password bytea
);


ALTER TABLE public.basic_integrations OWNER TO porter;

--
-- Name: basic_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.basic_integrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.basic_integrations_id_seq OWNER TO porter;

--
-- Name: basic_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.basic_integrations_id_seq OWNED BY public.basic_integrations.id;


--
-- Name: build_configs; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.build_configs (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    name text,
    builder text,
    buildpacks text,
    config bytea
);


ALTER TABLE public.build_configs OWNER TO porter;

--
-- Name: build_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.build_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.build_configs_id_seq OWNER TO porter;

--
-- Name: build_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.build_configs_id_seq OWNED BY public.build_configs.id;


--
-- Name: cluster_candidates; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.cluster_candidates (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    auth_mechanism text,
    project_id bigint,
    created_cluster_id bigint,
    name text,
    server text,
    context_name text,
    aws_cluster_id_guess bytea,
    kubeconfig bytea
);


ALTER TABLE public.cluster_candidates OWNER TO porter;

--
-- Name: cluster_candidates_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.cluster_candidates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.cluster_candidates_id_seq OWNER TO porter;

--
-- Name: cluster_candidates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.cluster_candidates_id_seq OWNED BY public.cluster_candidates.id;


--
-- Name: cluster_resolvers; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.cluster_resolvers (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    cluster_candidate_id bigint,
    name text,
    resolved boolean,
    data bytea
);


ALTER TABLE public.cluster_resolvers OWNER TO porter;

--
-- Name: cluster_resolvers_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.cluster_resolvers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.cluster_resolvers_id_seq OWNER TO porter;

--
-- Name: cluster_resolvers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.cluster_resolvers_id_seq OWNED BY public.cluster_resolvers.id;


--
-- Name: cluster_token_caches; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.cluster_token_caches (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    expiry timestamp with time zone,
    token bytea,
    cluster_id bigint
);


ALTER TABLE public.cluster_token_caches OWNER TO porter;

--
-- Name: cluster_token_caches_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.cluster_token_caches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.cluster_token_caches_id_seq OWNER TO porter;

--
-- Name: cluster_token_caches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.cluster_token_caches_id_seq OWNED BY public.cluster_token_caches.id;


--
-- Name: clusters; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.clusters (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    auth_mechanism text,
    project_id bigint,
    agent_integration_enabled boolean,
    name text,
    vanity_name text,
    server text,
    cluster_location_of_origin text,
    tls_server_name text,
    insecure_skip_tls_verify boolean,
    proxy_url text,
    user_location_of_origin text,
    user_impersonate text,
    user_impersonate_groups text,
    infra_id bigint,
    notifications_disabled boolean,
    preview_envs_enabled boolean,
    aws_cluster_id text,
    status text,
    provisioned_by text,
    cloud_provider text,
    cloud_provider_credential_identifier text,
    kube_integration_id bigint,
    o_id_c_integration_id bigint,
    gcp_integration_id bigint,
    aws_integration_id bigint,
    do_integration_id bigint,
    azure_integration_id bigint,
    token_cache_id bigint,
    certificate_authority_data bytea,
    monitor_helm_releases boolean
);


ALTER TABLE public.clusters OWNER TO porter;

--
-- Name: clusters_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.clusters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.clusters_id_seq OWNER TO porter;

--
-- Name: clusters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.clusters_id_seq OWNED BY public.clusters.id;


--
-- Name: credentials_exchange_tokens; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.credentials_exchange_tokens (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    token bytea,
    expiry timestamp with time zone,
    do_credential_id bigint,
    aws_credential_id bigint,
    gcp_credential_id bigint,
    azure_credential_id bigint
);


ALTER TABLE public.credentials_exchange_tokens OWNER TO porter;

--
-- Name: credentials_exchange_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.credentials_exchange_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.credentials_exchange_tokens_id_seq OWNER TO porter;

--
-- Name: credentials_exchange_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.credentials_exchange_tokens_id_seq OWNED BY public.credentials_exchange_tokens.id;


--
-- Name: databases; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.databases (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    cluster_id bigint,
    infra_id bigint,
    instance_id text,
    instance_endpoint text,
    instance_name text,
    status text
);


ALTER TABLE public.databases OWNER TO porter;

--
-- Name: databases_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.databases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.databases_id_seq OWNER TO porter;

--
-- Name: databases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.databases_id_seq OWNED BY public.databases.id;


--
-- Name: db_migrations; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.db_migrations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    version bigint
);


ALTER TABLE public.db_migrations OWNER TO porter;

--
-- Name: db_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.db_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.db_migrations_id_seq OWNER TO porter;

--
-- Name: db_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.db_migrations_id_seq OWNED BY public.db_migrations.id;


--
-- Name: deployments; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.deployments (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    environment_id bigint,
    namespace text,
    status text,
    subdomain text,
    pull_request_id bigint,
    gh_deployment_id bigint,
    ghpr_comment_id bigint,
    pr_name text,
    repo_name text,
    repo_owner text,
    commit_sha text,
    pr_branch_from text,
    pr_branch_into text,
    last_errors text
);


ALTER TABLE public.deployments OWNER TO porter;

--
-- Name: deployments_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.deployments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.deployments_id_seq OWNER TO porter;

--
-- Name: deployments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.deployments_id_seq OWNED BY public.deployments.id;


--
-- Name: dns_records; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.dns_records (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    subdomain_prefix text,
    root_domain text,
    endpoint text,
    hostname text,
    cluster_id bigint
);


ALTER TABLE public.dns_records OWNER TO porter;

--
-- Name: dns_records_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.dns_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.dns_records_id_seq OWNER TO porter;

--
-- Name: dns_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.dns_records_id_seq OWNED BY public.dns_records.id;


--
-- Name: environments; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.environments (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    cluster_id bigint,
    git_installation_id bigint,
    git_repo_owner text,
    git_repo_name text,
    git_repo_branches text,
    name text,
    mode text,
    new_comments_disabled boolean,
    namespace_labels bytea,
    namespace_annotations bytea,
    git_deploy_branches text,
    webhook_id text,
    github_webhook_id bigint
);


ALTER TABLE public.environments OWNER TO porter;

--
-- Name: environments_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.environments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.environments_id_seq OWNER TO porter;

--
-- Name: environments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.environments_id_seq OWNED BY public.environments.id;


--
-- Name: event_containers; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.event_containers (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    release_id bigint
);


ALTER TABLE public.event_containers OWNER TO porter;

--
-- Name: event_containers_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.event_containers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.event_containers_id_seq OWNER TO porter;

--
-- Name: event_containers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.event_containers_id_seq OWNED BY public.event_containers.id;


--
-- Name: gcp_integrations; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.gcp_integrations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    user_id bigint,
    project_id bigint,
    gcp_project_id text,
    gcpsa_email text,
    g_cpuser_email text,
    gcp_region text,
    gcp_key_data bytea
);


ALTER TABLE public.gcp_integrations OWNER TO porter;

--
-- Name: gcp_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.gcp_integrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.gcp_integrations_id_seq OWNER TO porter;

--
-- Name: gcp_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.gcp_integrations_id_seq OWNED BY public.gcp_integrations.id;


--
-- Name: git_action_configs; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.git_action_configs (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    release_id bigint,
    git_repo text,
    git_branch text,
    image_repo_uri text,
    github_installation_id bigint,
    git_repo_id bigint,
    gitlab_integration_id bigint,
    dockerfile_path text,
    folder_path text,
    is_installation boolean,
    version text DEFAULT 'v0.0.1'::text
);


ALTER TABLE public.git_action_configs OWNER TO porter;

--
-- Name: git_action_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.git_action_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.git_action_configs_id_seq OWNER TO porter;

--
-- Name: git_action_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.git_action_configs_id_seq OWNED BY public.git_action_configs.id;


--
-- Name: git_repos; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.git_repos (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    repo_entity text,
    o_auth_integration_id bigint
);


ALTER TABLE public.git_repos OWNER TO porter;

--
-- Name: git_repos_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.git_repos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.git_repos_id_seq OWNER TO porter;

--
-- Name: git_repos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.git_repos_id_seq OWNED BY public.git_repos.id;


--
-- Name: github_app_installations; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.github_app_installations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    account_id bigint,
    installation_id bigint
);


ALTER TABLE public.github_app_installations OWNER TO porter;

--
-- Name: github_app_installations_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.github_app_installations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.github_app_installations_id_seq OWNER TO porter;

--
-- Name: github_app_installations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.github_app_installations_id_seq OWNED BY public.github_app_installations.id;


--
-- Name: github_app_o_auth_integrations; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.github_app_o_auth_integrations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    client_id bytea,
    access_token bytea,
    refresh_token bytea,
    expiry timestamp with time zone,
    user_id bigint
);


ALTER TABLE public.github_app_o_auth_integrations OWNER TO porter;

--
-- Name: github_app_o_auth_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.github_app_o_auth_integrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.github_app_o_auth_integrations_id_seq OWNER TO porter;

--
-- Name: github_app_o_auth_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.github_app_o_auth_integrations_id_seq OWNED BY public.github_app_o_auth_integrations.id;


--
-- Name: gitlab_app_o_auth_integrations; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.gitlab_app_o_auth_integrations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    o_auth_integration_id bigint,
    gitlab_integration_id bigint
);


ALTER TABLE public.gitlab_app_o_auth_integrations OWNER TO porter;

--
-- Name: gitlab_app_o_auth_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.gitlab_app_o_auth_integrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.gitlab_app_o_auth_integrations_id_seq OWNER TO porter;

--
-- Name: gitlab_app_o_auth_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.gitlab_app_o_auth_integrations_id_seq OWNED BY public.gitlab_app_o_auth_integrations.id;


--
-- Name: gitlab_integrations; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.gitlab_integrations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    instance_url text,
    app_client_id bytea,
    app_client_secret bytea
);


ALTER TABLE public.gitlab_integrations OWNER TO porter;

--
-- Name: gitlab_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.gitlab_integrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.gitlab_integrations_id_seq OWNER TO porter;

--
-- Name: gitlab_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.gitlab_integrations_id_seq OWNED BY public.gitlab_integrations.id;

--
-- Name: helm_repo_token_caches; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.helm_repo_token_caches (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    expiry timestamp with time zone,
    token bytea,
    helm_repo_id bigint
);


ALTER TABLE public.helm_repo_token_caches OWNER TO porter;

--
-- Name: helm_repo_token_caches_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.helm_repo_token_caches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.helm_repo_token_caches_id_seq OWNER TO porter;

--
-- Name: helm_repo_token_caches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.helm_repo_token_caches_id_seq OWNED BY public.helm_repo_token_caches.id;


--
-- Name: helm_repos; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.helm_repos (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    name text,
    project_id bigint,
    repo_url text,
    basic_auth_integration_id bigint,
    gcp_integration_id bigint,
    aws_integration_id bigint
);


ALTER TABLE public.helm_repos OWNER TO porter;

--
-- Name: helm_repos_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.helm_repos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.helm_repos_id_seq OWNER TO porter;

--
-- Name: helm_repos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.helm_repos_id_seq OWNED BY public.helm_repos.id;


--
-- Name: infras; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.infras (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    kind text,
    api_version text,
    source_link text,
    source_version text,
    suffix text,
    project_id bigint,
    created_by_user_id bigint,
    parent_cluster_id bigint,
    status text,
    aws_integration_id bigint,
    azure_integration_id bigint,
    gcp_integration_id bigint,
    do_integration_id bigint,
    database_id bigint,
    last_applied bytea
);


ALTER TABLE public.infras OWNER TO porter;

--
-- Name: infras_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.infras_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.infras_id_seq OWNER TO porter;

--
-- Name: infras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.infras_id_seq OWNED BY public.infras.id;


--
-- Name: invites; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.invites (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    token text,
    expiry timestamp with time zone,
    email text,
    kind text,
    project_id bigint,
    user_id bigint
);


ALTER TABLE public.invites OWNER TO porter;

--
-- Name: invites_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.invites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.invites_id_seq OWNER TO porter;

--
-- Name: invites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.invites_id_seq OWNED BY public.invites.id;


--
-- Name: job_notification_configs; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.job_notification_configs (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    name text,
    namespace text,
    project_id bigint,
    cluster_id bigint,
    last_notified_time timestamp with time zone
);


ALTER TABLE public.job_notification_configs OWNER TO porter;

--
-- Name: job_notification_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.job_notification_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.job_notification_configs_id_seq OWNER TO porter;

--
-- Name: job_notification_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.job_notification_configs_id_seq OWNED BY public.job_notification_configs.id;


--
-- Name: kube_events; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.kube_events (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    cluster_id bigint,
    name text,
    resource_type text,
    owner_type text,
    owner_name text,
    namespace text
);


ALTER TABLE public.kube_events OWNER TO porter;

--
-- Name: kube_events_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.kube_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.kube_events_id_seq OWNER TO porter;

--
-- Name: kube_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.kube_events_id_seq OWNED BY public.kube_events.id;


--
-- Name: kube_integrations; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.kube_integrations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    mechanism text,
    user_id bigint,
    project_id bigint,
    client_certificate_data bytea,
    client_key_data bytea,
    token bytea,
    username bytea,
    password bytea,
    kubeconfig bytea
);


ALTER TABLE public.kube_integrations OWNER TO porter;

--
-- Name: kube_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.kube_integrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.kube_integrations_id_seq OWNER TO porter;

--
-- Name: kube_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.kube_integrations_id_seq OWNED BY public.kube_integrations.id;


--
-- Name: kube_sub_events; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.kube_sub_events (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    kube_event_id bigint,
    message text,
    reason text,
    "timestamp" timestamp with time zone,
    event_type text
);


ALTER TABLE public.kube_sub_events OWNER TO porter;

--
-- Name: kube_sub_events_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.kube_sub_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.kube_sub_events_id_seq OWNER TO porter;

--
-- Name: kube_sub_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.kube_sub_events_id_seq OWNED BY public.kube_sub_events.id;


--
-- Name: monitor_test_results; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.monitor_test_results (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    cluster_id bigint,
    category text,
    object_id text,
    last_status_change timestamp with time zone,
    last_tested timestamp with time zone,
    last_run_result text,
    last_run_result_enum bigint,
    last_recommender_run_id text,
    archived boolean,
    title text,
    message text,
    severity text,
    severity_enum bigint
);


ALTER TABLE public.monitor_test_results OWNER TO porter;

--
-- Name: monitor_test_results_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.monitor_test_results_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.monitor_test_results_id_seq OWNER TO porter;

--
-- Name: monitor_test_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.monitor_test_results_id_seq OWNED BY public.monitor_test_results.id;


--
-- Name: notification_configs; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.notification_configs (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    enabled boolean,
    success boolean,
    failure boolean,
    last_notified_time timestamp with time zone,
    notif_limit text
);


ALTER TABLE public.notification_configs OWNER TO porter;

--
-- Name: notification_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.notification_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notification_configs_id_seq OWNER TO porter;

--
-- Name: notification_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.notification_configs_id_seq OWNED BY public.notification_configs.id;


--
-- Name: o_auth_integrations; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.o_auth_integrations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    client_id bytea,
    access_token bytea,
    refresh_token bytea,
    expiry timestamp with time zone,
    client text,
    user_id bigint,
    project_id bigint,
    target_email text,
    target_name text
);


ALTER TABLE public.o_auth_integrations OWNER TO porter;

--
-- Name: o_auth_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.o_auth_integrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.o_auth_integrations_id_seq OWNER TO porter;

--
-- Name: o_auth_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.o_auth_integrations_id_seq OWNED BY public.o_auth_integrations.id;


--
-- Name: o_id_c_integrations; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.o_id_c_integrations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    client text,
    user_id bigint,
    project_id bigint,
    issuer_url bytea,
    client_id bytea,
    client_secret bytea,
    certificate_authority_data bytea,
    id_token bytea,
    refresh_token bytea
);


ALTER TABLE public.o_id_c_integrations OWNER TO porter;

--
-- Name: o_id_c_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.o_id_c_integrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.o_id_c_integrations_id_seq OWNER TO porter;

--
-- Name: o_id_c_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.o_id_c_integrations_id_seq OWNED BY public.o_id_c_integrations.id;


--
-- Name: onboardings; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.onboardings (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    current_step text,
    connected_source text,
    skip_registry_connection boolean,
    skip_resource_provision boolean,
    registry_connection_id bigint,
    registry_connection_credential_id bigint,
    registry_connection_provider text,
    registry_infra_id bigint,
    registry_infra_credential_id bigint,
    registry_infra_provider text,
    cluster_infra_id bigint,
    cluster_infra_credential_id bigint,
    cluster_infra_provider text
);


ALTER TABLE public.onboardings OWNER TO porter;

--
-- Name: onboardings_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.onboardings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.onboardings_id_seq OWNER TO porter;

--
-- Name: onboardings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.onboardings_id_seq OWNED BY public.onboardings.id;


--
-- Name: operations; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.operations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    uid text,
    infra_id bigint,
    type text,
    status text,
    errored boolean,
    error text,
    template_version text,
    last_applied bytea
);


ALTER TABLE public.operations OWNER TO porter;

--
-- Name: operations_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.operations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.operations_id_seq OWNER TO porter;

--
-- Name: operations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.operations_id_seq OWNED BY public.operations.id;


--
-- Name: policies; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.policies (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    unique_id text,
    project_id bigint,
    created_by_user_id bigint,
    name text,
    policy_bytes bytea
);


ALTER TABLE public.policies OWNER TO porter;

--
-- Name: policies_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.policies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.policies_id_seq OWNER TO porter;

--
-- Name: policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.policies_id_seq OWNED BY public.policies.id;


--
-- Name: project_billings; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.project_billings (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    billing_team_id text
);


ALTER TABLE public.project_billings OWNER TO porter;

--
-- Name: project_billings_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.project_billings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.project_billings_id_seq OWNER TO porter;

--
-- Name: project_billings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.project_billings_id_seq OWNED BY public.project_billings.id;


--
-- Name: project_usage_caches; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.project_usage_caches (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    resource_cpu bigint,
    resource_memory bigint,
    clusters bigint,
    users bigint,
    exceeded boolean,
    exceeded_since timestamp with time zone
);


ALTER TABLE public.project_usage_caches OWNER TO porter;

--
-- Name: project_usage_caches_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.project_usage_caches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.project_usage_caches_id_seq OWNER TO porter;

--
-- Name: project_usage_caches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.project_usage_caches_id_seq OWNED BY public.project_usage_caches.id;


--
-- Name: project_usages; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.project_usages (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    resource_cpu bigint,
    resource_memory bigint,
    clusters bigint,
    users bigint
);


ALTER TABLE public.project_usages OWNER TO porter;

--
-- Name: project_usages_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.project_usages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.project_usages_id_seq OWNER TO porter;

--
-- Name: project_usages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.project_usages_id_seq OWNED BY public.project_usages.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.projects (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    name text,
    project_usage_id bigint,
    project_usage_cache_id bigint,
    preview_envs_enabled boolean,
    rds_databases_enabled boolean,
    managed_infra_enabled boolean,
    stacks_enabled boolean,
    api_tokens_enabled boolean,
    capi_provisioner_enabled boolean
);


ALTER TABLE public.projects OWNER TO porter;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.projects_id_seq OWNER TO porter;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: pw_reset_tokens; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.pw_reset_tokens (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    email text,
    is_valid boolean,
    expiry timestamp with time zone,
    token text
);


ALTER TABLE public.pw_reset_tokens OWNER TO porter;

--
-- Name: pw_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.pw_reset_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pw_reset_tokens_id_seq OWNER TO porter;

--
-- Name: pw_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.pw_reset_tokens_id_seq OWNED BY public.pw_reset_tokens.id;


--
-- Name: reg_token_caches; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.reg_token_caches (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    expiry timestamp with time zone,
    token bytea,
    registry_id bigint
);


ALTER TABLE public.reg_token_caches OWNER TO porter;

--
-- Name: reg_token_caches_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.reg_token_caches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.reg_token_caches_id_seq OWNER TO porter;

--
-- Name: reg_token_caches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.reg_token_caches_id_seq OWNED BY public.reg_token_caches.id;


--
-- Name: registries; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.registries (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    name text,
    url text,
    project_id bigint,
    infra_id bigint,
    gcp_integration_id bigint,
    aws_integration_id bigint,
    azure_integration_id bigint,
    do_integration_id bigint,
    basic_integration_id bigint
);


ALTER TABLE public.registries OWNER TO porter;

--
-- Name: registries_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.registries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.registries_id_seq OWNER TO porter;

--
-- Name: registries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.registries_id_seq OWNED BY public.registries.id;


--
-- Name: release_tags; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.release_tags (
    tag_id bigint NOT NULL,
    release_id bigint NOT NULL
);


ALTER TABLE public.release_tags OWNER TO porter;

--
-- Name: releases; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.releases (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    webhook_token text,
    cluster_id bigint,
    project_id bigint,
    name text,
    namespace text,
    stack_resource_id bigint,
    image_repo_uri text,
    event_container bigint,
    notification_config bigint,
    build_config bigint,
    canonical_name text
);


ALTER TABLE public.releases OWNER TO porter;

--
-- Name: releases_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.releases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.releases_id_seq OWNER TO porter;

--
-- Name: releases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.releases_id_seq OWNED BY public.releases.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.roles (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    kind text,
    user_id bigint,
    project_id bigint
);


ALTER TABLE public.roles OWNER TO porter;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.roles_id_seq OWNER TO porter;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.sessions (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    key text,
    data bytea,
    expires_at timestamp with time zone
);


ALTER TABLE public.sessions OWNER TO porter;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sessions_id_seq OWNER TO porter;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: slack_integrations; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.slack_integrations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    client_id bytea,
    access_token bytea,
    refresh_token bytea,
    expiry timestamp with time zone,
    client text,
    user_id bigint,
    project_id bigint,
    team_id text,
    team_name text,
    team_icon_url text,
    channel text,
    channel_id text,
    configuration_url text,
    webhook bytea
);


ALTER TABLE public.slack_integrations OWNER TO porter;

--
-- Name: slack_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.slack_integrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.slack_integrations_id_seq OWNER TO porter;

--
-- Name: slack_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.slack_integrations_id_seq OWNED BY public.slack_integrations.id;


--
-- Name: stack_env_groups; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.stack_env_groups (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    stack_revision_id bigint,
    name text,
    namespace text,
    project_id bigint,
    cluster_id bigint,
    uid text,
    env_group_version bigint
);


ALTER TABLE public.stack_env_groups OWNER TO porter;

--
-- Name: stack_env_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.stack_env_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.stack_env_groups_id_seq OWNER TO porter;

--
-- Name: stack_env_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.stack_env_groups_id_seq OWNED BY public.stack_env_groups.id;


--
-- Name: stack_resources; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.stack_resources (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    name text,
    uid text,
    stack_revision_id bigint,
    stack_source_config_uid text,
    helm_revision_id bigint,
    "values" bytea,
    template_repo_url text,
    template_name text,
    template_version text
);


ALTER TABLE public.stack_resources OWNER TO porter;

--
-- Name: stack_resources_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.stack_resources_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.stack_resources_id_seq OWNER TO porter;

--
-- Name: stack_resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.stack_resources_id_seq OWNED BY public.stack_resources.id;


--
-- Name: stack_revisions; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.stack_revisions (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    revision_number bigint,
    stack_id bigint,
    status text,
    reason text,
    message text
);


ALTER TABLE public.stack_revisions OWNER TO porter;

--
-- Name: stack_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.stack_revisions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.stack_revisions_id_seq OWNER TO porter;

--
-- Name: stack_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.stack_revisions_id_seq OWNED BY public.stack_revisions.id;


--
-- Name: stack_source_configs; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.stack_source_configs (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    stack_revision_id bigint,
    name text,
    display_name text,
    uid text,
    image_repo_uri text,
    image_tag text
);


ALTER TABLE public.stack_source_configs OWNER TO porter;

--
-- Name: stack_source_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.stack_source_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.stack_source_configs_id_seq OWNER TO porter;

--
-- Name: stack_source_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.stack_source_configs_id_seq OWNED BY public.stack_source_configs.id;


--
-- Name: stacks; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.stacks (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    cluster_id bigint,
    namespace text,
    name text,
    uid text
);


ALTER TABLE public.stacks OWNER TO porter;

--
-- Name: stacks_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.stacks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.stacks_id_seq OWNER TO porter;

--
-- Name: stacks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.stacks_id_seq OWNED BY public.stacks.id;


--
-- Name: sub_events; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.sub_events (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    event_container_id bigint,
    event_id text,
    name text,
    index bigint,
    status bigint,
    info text
);


ALTER TABLE public.sub_events OWNER TO porter;

--
-- Name: sub_events_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.sub_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sub_events_id_seq OWNER TO porter;

--
-- Name: sub_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.sub_events_id_seq OWNED BY public.sub_events.id;


--
-- Name: tags; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.tags (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    name text,
    color text
);


ALTER TABLE public.tags OWNER TO porter;

--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tags_id_seq OWNER TO porter;

--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- Name: token_caches; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.token_caches (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    expiry timestamp with time zone,
    token bytea
);


ALTER TABLE public.token_caches OWNER TO porter;

--
-- Name: token_caches_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.token_caches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.token_caches_id_seq OWNER TO porter;

--
-- Name: token_caches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.token_caches_id_seq OWNED BY public.token_caches.id;


--
-- Name: user_billings; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.user_billings (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    project_id bigint,
    user_id bigint,
    teammate_id text,
    token bytea
);


ALTER TABLE public.user_billings OWNER TO porter;

--
-- Name: user_billings_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.user_billings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_billings_id_seq OWNER TO porter;

--
-- Name: user_billings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.user_billings_id_seq OWNED BY public.user_billings.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: porter
--

CREATE TABLE IF NOT EXISTS public.users (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    email text,
    password text,
    email_verified boolean,
    first_name text,
    last_name text,
    company_name text,
    github_app_integration_id bigint,
    github_user_id bigint,
    google_user_id text
);


ALTER TABLE public.users OWNER TO porter;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: porter
--

CREATE SEQUENCE IF NOT EXISTS public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO porter;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: porter
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: allowlists id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.allowlists ALTER COLUMN id SET DEFAULT nextval('public.allowlists_id_seq'::regclass);


--
-- Name: api_tokens id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.api_tokens ALTER COLUMN id SET DEFAULT nextval('public.api_tokens_id_seq'::regclass);


--
-- Name: auth_codes id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.auth_codes ALTER COLUMN id SET DEFAULT nextval('public.auth_codes_id_seq'::regclass);


--
-- Name: aws_integrations id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.aws_integrations ALTER COLUMN id SET DEFAULT nextval('public.aws_integrations_id_seq'::regclass);


--
-- Name: azure_integrations id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.azure_integrations ALTER COLUMN id SET DEFAULT nextval('public.azure_integrations_id_seq'::regclass);


--
-- Name: basic_integrations id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.basic_integrations ALTER COLUMN id SET DEFAULT nextval('public.basic_integrations_id_seq'::regclass);


--
-- Name: build_configs id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.build_configs ALTER COLUMN id SET DEFAULT nextval('public.build_configs_id_seq'::regclass);


--
-- Name: cluster_candidates id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.cluster_candidates ALTER COLUMN id SET DEFAULT nextval('public.cluster_candidates_id_seq'::regclass);


--
-- Name: cluster_resolvers id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.cluster_resolvers ALTER COLUMN id SET DEFAULT nextval('public.cluster_resolvers_id_seq'::regclass);


--
-- Name: cluster_token_caches id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.cluster_token_caches ALTER COLUMN id SET DEFAULT nextval('public.cluster_token_caches_id_seq'::regclass);


--
-- Name: clusters id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.clusters ALTER COLUMN id SET DEFAULT nextval('public.clusters_id_seq'::regclass);


--
-- Name: credentials_exchange_tokens id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.credentials_exchange_tokens ALTER COLUMN id SET DEFAULT nextval('public.credentials_exchange_tokens_id_seq'::regclass);


--
-- Name: databases id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.databases ALTER COLUMN id SET DEFAULT nextval('public.databases_id_seq'::regclass);


--
-- Name: db_migrations id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.db_migrations ALTER COLUMN id SET DEFAULT nextval('public.db_migrations_id_seq'::regclass);


--
-- Name: deployments id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.deployments ALTER COLUMN id SET DEFAULT nextval('public.deployments_id_seq'::regclass);


--
-- Name: dns_records id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.dns_records ALTER COLUMN id SET DEFAULT nextval('public.dns_records_id_seq'::regclass);


--
-- Name: environments id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.environments ALTER COLUMN id SET DEFAULT nextval('public.environments_id_seq'::regclass);


--
-- Name: event_containers id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.event_containers ALTER COLUMN id SET DEFAULT nextval('public.event_containers_id_seq'::regclass);


--
-- Name: gcp_integrations id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.gcp_integrations ALTER COLUMN id SET DEFAULT nextval('public.gcp_integrations_id_seq'::regclass);


--
-- Name: git_action_configs id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.git_action_configs ALTER COLUMN id SET DEFAULT nextval('public.git_action_configs_id_seq'::regclass);


--
-- Name: git_repos id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.git_repos ALTER COLUMN id SET DEFAULT nextval('public.git_repos_id_seq'::regclass);


--
-- Name: github_app_installations id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.github_app_installations ALTER COLUMN id SET DEFAULT nextval('public.github_app_installations_id_seq'::regclass);


--
-- Name: github_app_o_auth_integrations id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.github_app_o_auth_integrations ALTER COLUMN id SET DEFAULT nextval('public.github_app_o_auth_integrations_id_seq'::regclass);


--
-- Name: gitlab_app_o_auth_integrations id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.gitlab_app_o_auth_integrations ALTER COLUMN id SET DEFAULT nextval('public.gitlab_app_o_auth_integrations_id_seq'::regclass);


--
-- Name: gitlab_integrations id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.gitlab_integrations ALTER COLUMN id SET DEFAULT nextval('public.gitlab_integrations_id_seq'::regclass);



--
-- Name: helm_repo_token_caches id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.helm_repo_token_caches ALTER COLUMN id SET DEFAULT nextval('public.helm_repo_token_caches_id_seq'::regclass);


--
-- Name: helm_repos id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.helm_repos ALTER COLUMN id SET DEFAULT nextval('public.helm_repos_id_seq'::regclass);


--
-- Name: infras id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.infras ALTER COLUMN id SET DEFAULT nextval('public.infras_id_seq'::regclass);


--
-- Name: invites id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.invites ALTER COLUMN id SET DEFAULT nextval('public.invites_id_seq'::regclass);


--
-- Name: job_notification_configs id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.job_notification_configs ALTER COLUMN id SET DEFAULT nextval('public.job_notification_configs_id_seq'::regclass);


--
-- Name: kube_events id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.kube_events ALTER COLUMN id SET DEFAULT nextval('public.kube_events_id_seq'::regclass);


--
-- Name: kube_integrations id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.kube_integrations ALTER COLUMN id SET DEFAULT nextval('public.kube_integrations_id_seq'::regclass);


--
-- Name: kube_sub_events id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.kube_sub_events ALTER COLUMN id SET DEFAULT nextval('public.kube_sub_events_id_seq'::regclass);


--
-- Name: monitor_test_results id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.monitor_test_results ALTER COLUMN id SET DEFAULT nextval('public.monitor_test_results_id_seq'::regclass);


--
-- Name: notification_configs id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.notification_configs ALTER COLUMN id SET DEFAULT nextval('public.notification_configs_id_seq'::regclass);


--
-- Name: o_auth_integrations id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.o_auth_integrations ALTER COLUMN id SET DEFAULT nextval('public.o_auth_integrations_id_seq'::regclass);


--
-- Name: o_id_c_integrations id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.o_id_c_integrations ALTER COLUMN id SET DEFAULT nextval('public.o_id_c_integrations_id_seq'::regclass);


--
-- Name: onboardings id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.onboardings ALTER COLUMN id SET DEFAULT nextval('public.onboardings_id_seq'::regclass);


--
-- Name: operations id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.operations ALTER COLUMN id SET DEFAULT nextval('public.operations_id_seq'::regclass);


--
-- Name: policies id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.policies ALTER COLUMN id SET DEFAULT nextval('public.policies_id_seq'::regclass);


--
-- Name: project_billings id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.project_billings ALTER COLUMN id SET DEFAULT nextval('public.project_billings_id_seq'::regclass);


--
-- Name: project_usage_caches id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.project_usage_caches ALTER COLUMN id SET DEFAULT nextval('public.project_usage_caches_id_seq'::regclass);


--
-- Name: project_usages id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.project_usages ALTER COLUMN id SET DEFAULT nextval('public.project_usages_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: pw_reset_tokens id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.pw_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.pw_reset_tokens_id_seq'::regclass);


--
-- Name: reg_token_caches id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.reg_token_caches ALTER COLUMN id SET DEFAULT nextval('public.reg_token_caches_id_seq'::regclass);


--
-- Name: registries id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.registries ALTER COLUMN id SET DEFAULT nextval('public.registries_id_seq'::regclass);


--
-- Name: releases id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.releases ALTER COLUMN id SET DEFAULT nextval('public.releases_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: slack_integrations id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.slack_integrations ALTER COLUMN id SET DEFAULT nextval('public.slack_integrations_id_seq'::regclass);


--
-- Name: stack_env_groups id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.stack_env_groups ALTER COLUMN id SET DEFAULT nextval('public.stack_env_groups_id_seq'::regclass);


--
-- Name: stack_resources id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.stack_resources ALTER COLUMN id SET DEFAULT nextval('public.stack_resources_id_seq'::regclass);


--
-- Name: stack_revisions id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.stack_revisions ALTER COLUMN id SET DEFAULT nextval('public.stack_revisions_id_seq'::regclass);


--
-- Name: stack_source_configs id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.stack_source_configs ALTER COLUMN id SET DEFAULT nextval('public.stack_source_configs_id_seq'::regclass);


--
-- Name: stacks id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.stacks ALTER COLUMN id SET DEFAULT nextval('public.stacks_id_seq'::regclass);


--
-- Name: sub_events id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.sub_events ALTER COLUMN id SET DEFAULT nextval('public.sub_events_id_seq'::regclass);


--
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- Name: token_caches id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.token_caches ALTER COLUMN id SET DEFAULT nextval('public.token_caches_id_seq'::regclass);


--
-- Name: user_billings id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.user_billings ALTER COLUMN id SET DEFAULT nextval('public.user_billings_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: allowlists allowlists_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.allowlists DROP CONSTRAINT IF EXISTS allowlists_pkey;

ALTER TABLE ONLY public.allowlists
    ADD CONSTRAINT allowlists_pkey PRIMARY KEY (id);


--
-- Name: allowlists allowlists_user_email_key; Type: CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.allowlists DROP CONSTRAINT IF EXISTS allowlists_user_email_key;

ALTER TABLE ONLY public.allowlists
    ADD CONSTRAINT allowlists_user_email_key UNIQUE (user_email);


--
-- Name: api_contract_revisions api_contract_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.api_contract_revisions DROP CONSTRAINT IF EXISTS api_contract_revisions_pkey;

ALTER TABLE ONLY public.api_contract_revisions
    ADD CONSTRAINT api_contract_revisions_pkey PRIMARY KEY (id);


--
-- Name: api_tokens api_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.api_tokens DROP CONSTRAINT IF EXISTS api_tokens_pkey;

ALTER TABLE ONLY public.api_tokens
    ADD CONSTRAINT api_tokens_pkey PRIMARY KEY (id);


--
-- Name: api_tokens api_tokens_unique_id_key; Type: CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.api_tokens DROP CONSTRAINT IF EXISTS api_tokens_unique_id_key;

ALTER TABLE ONLY public.api_tokens
    ADD CONSTRAINT api_tokens_unique_id_key UNIQUE (unique_id);


--
-- Name: auth_codes auth_codes_authorization_code_key; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.auth_codes DROP CONSTRAINT IF EXISTS auth_codes_authorization_code_key;

ALTER TABLE ONLY public.auth_codes
    ADD CONSTRAINT auth_codes_authorization_code_key UNIQUE (authorization_code);


--
-- Name: auth_codes auth_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.auth_codes DROP CONSTRAINT IF EXISTS auth_codes_pkey;

ALTER TABLE ONLY public.auth_codes
    ADD CONSTRAINT auth_codes_pkey PRIMARY KEY (id);


--
-- Name: auth_codes auth_codes_token_key; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.auth_codes DROP CONSTRAINT IF EXISTS auth_codes_token_key;

ALTER TABLE ONLY public.auth_codes
    ADD CONSTRAINT auth_codes_token_key UNIQUE (token);


--
-- Name: aws_assume_role_chains aws_assume_role_chains_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.aws_assume_role_chains DROP CONSTRAINT IF EXISTS aws_assume_role_chains_pkey;

ALTER TABLE ONLY public.aws_assume_role_chains
    ADD CONSTRAINT aws_assume_role_chains_pkey PRIMARY KEY (id);


--
-- Name: aws_assume_role_chains aws_assume_role_chains_project_id_source_arn_target_arn_key; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.aws_assume_role_chains DROP CONSTRAINT IF EXISTS aws_assume_role_chains_project_id_source_arn_target_arn_key;

ALTER TABLE ONLY public.aws_assume_role_chains
    ADD CONSTRAINT aws_assume_role_chains_project_id_source_arn_target_arn_key UNIQUE (project_id, source_arn, target_arn);

--
-- Name: aws_integrations aws_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.aws_integrations DROP CONSTRAINT IF EXISTS aws_integrations_pkey;

ALTER TABLE ONLY public.aws_integrations
    ADD CONSTRAINT aws_integrations_pkey PRIMARY KEY (id);


--
-- Name: azure_integrations azure_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.azure_integrations DROP CONSTRAINT IF EXISTS azure_integrations_pkey;

ALTER TABLE ONLY public.azure_integrations
    ADD CONSTRAINT azure_integrations_pkey PRIMARY KEY (id);


--
-- Name: basic_integrations basic_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.basic_integrations DROP CONSTRAINT IF EXISTS basic_integrations_pkey;

ALTER TABLE ONLY public.basic_integrations
    ADD CONSTRAINT basic_integrations_pkey PRIMARY KEY (id);


--
-- Name: build_configs build_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.build_configs DROP CONSTRAINT IF EXISTS build_configs_pkey;

ALTER TABLE ONLY public.build_configs
    ADD CONSTRAINT build_configs_pkey PRIMARY KEY (id);


--
-- Name: cluster_resolvers cluster_resolvers_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.cluster_resolvers DROP CONSTRAINT IF EXISTS cluster_resolvers_pkey;

ALTER TABLE ONLY public.cluster_resolvers
    ADD CONSTRAINT cluster_resolvers_pkey PRIMARY KEY (id);


--
-- Name: cluster_token_caches cluster_token_caches_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.cluster_token_caches DROP CONSTRAINT IF EXISTS cluster_token_caches_pkey;

ALTER TABLE ONLY public.cluster_token_caches
    ADD CONSTRAINT cluster_token_caches_pkey PRIMARY KEY (id);


--
-- Name: clusters clusters_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.clusters DROP CONSTRAINT IF EXISTS clusters_pkey;

ALTER TABLE ONLY public.clusters
    ADD CONSTRAINT clusters_pkey PRIMARY KEY (id);


--
-- Name: credentials_exchange_tokens credentials_exchange_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.credentials_exchange_tokens DROP CONSTRAINT IF EXISTS credentials_exchange_tokens_pkey;

ALTER TABLE ONLY public.credentials_exchange_tokens
    ADD CONSTRAINT credentials_exchange_tokens_pkey PRIMARY KEY (id);


--
-- Name: databases databases_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.databases DROP CONSTRAINT IF EXISTS databases_pkey;

ALTER TABLE ONLY public.databases
    ADD CONSTRAINT databases_pkey PRIMARY KEY (id);


--
-- Name: db_migrations db_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.db_migrations DROP CONSTRAINT IF EXISTS db_migrations_pkey;

ALTER TABLE ONLY public.db_migrations
    ADD CONSTRAINT db_migrations_pkey PRIMARY KEY (id);


--
-- Name: deployments deployments_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.deployments DROP CONSTRAINT IF EXISTS deployments_pkey;

ALTER TABLE ONLY public.deployments
    ADD CONSTRAINT deployments_pkey PRIMARY KEY (id);


--
-- Name: dns_records dns_records_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.dns_records DROP CONSTRAINT IF EXISTS dns_records_pkey;

ALTER TABLE ONLY public.dns_records
    ADD CONSTRAINT dns_records_pkey PRIMARY KEY (id);


--
-- Name: dns_records dns_records_subdomain_prefix_key; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.dns_records DROP CONSTRAINT IF EXISTS dns_records_subdomain_prefix_key;

ALTER TABLE ONLY public.dns_records
    ADD CONSTRAINT dns_records_subdomain_prefix_key UNIQUE (subdomain_prefix);


--
-- Name: environments environments_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.environments DROP CONSTRAINT IF EXISTS environments_pkey;

ALTER TABLE ONLY public.environments
    ADD CONSTRAINT environments_pkey PRIMARY KEY (id);


--
-- Name: environments environments_webhook_id_key; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.environments DROP CONSTRAINT IF EXISTS environments_webhook_id_key;

ALTER TABLE ONLY public.environments
    ADD CONSTRAINT environments_webhook_id_key UNIQUE (webhook_id);


--
-- Name: event_containers event_containers_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.event_containers DROP CONSTRAINT IF EXISTS event_containers_pkey CASCADE;

ALTER TABLE ONLY public.event_containers
    ADD CONSTRAINT event_containers_pkey PRIMARY KEY (id);


--
-- Name: gcp_integrations gcp_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.gcp_integrations DROP CONSTRAINT IF EXISTS gcp_integrations_pkey;

ALTER TABLE ONLY public.gcp_integrations
    ADD CONSTRAINT gcp_integrations_pkey PRIMARY KEY (id);


--
-- Name: git_action_configs git_action_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.git_action_configs DROP CONSTRAINT IF EXISTS git_action_configs_pkey;

ALTER TABLE ONLY public.git_action_configs
    ADD CONSTRAINT git_action_configs_pkey PRIMARY KEY (id);


--
-- Name: git_repos git_repos_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.git_repos DROP CONSTRAINT IF EXISTS git_repos_pkey;

ALTER TABLE ONLY public.git_repos
    ADD CONSTRAINT git_repos_pkey PRIMARY KEY (id);


--
-- Name: github_app_installations github_app_installations_account_id_key; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.github_app_installations DROP CONSTRAINT IF EXISTS github_app_installations_account_id_key;

ALTER TABLE ONLY public.github_app_installations
    ADD CONSTRAINT github_app_installations_account_id_key UNIQUE (account_id);


--
-- Name: github_app_installations github_app_installations_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.github_app_installations DROP CONSTRAINT IF EXISTS github_app_installations_pkey;

ALTER TABLE ONLY public.github_app_installations
    ADD CONSTRAINT github_app_installations_pkey PRIMARY KEY (id);


--
-- Name: github_app_o_auth_integrations github_app_o_auth_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.github_app_o_auth_integrations DROP CONSTRAINT IF EXISTS github_app_o_auth_integrations_pkey;

ALTER TABLE ONLY public.github_app_o_auth_integrations
    ADD CONSTRAINT github_app_o_auth_integrations_pkey PRIMARY KEY (id);


--
-- Name: gitlab_app_o_auth_integrations gitlab_app_o_auth_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.gitlab_app_o_auth_integrations DROP CONSTRAINT IF EXISTS gitlab_app_o_auth_integrations_pkey;

ALTER TABLE ONLY public.gitlab_app_o_auth_integrations
    ADD CONSTRAINT gitlab_app_o_auth_integrations_pkey PRIMARY KEY (id);


--
-- Name: gitlab_integrations gitlab_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.gitlab_integrations DROP CONSTRAINT IF EXISTS gitlab_integrations_pkey;

ALTER TABLE ONLY public.gitlab_integrations
    ADD CONSTRAINT gitlab_integrations_pkey PRIMARY KEY (id);


--
-- Name: helm_repo_token_caches helm_repo_token_caches_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.helm_repo_token_caches DROP CONSTRAINT IF EXISTS helm_repo_token_caches_pkey;

ALTER TABLE ONLY public.helm_repo_token_caches
    ADD CONSTRAINT helm_repo_token_caches_pkey PRIMARY KEY (id);


--
-- Name: helm_repos helm_repos_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.helm_repos DROP CONSTRAINT IF EXISTS helm_repos_pkey CASCADE;

ALTER TABLE ONLY public.helm_repos
    ADD CONSTRAINT helm_repos_pkey PRIMARY KEY (id);


--
-- Name: infras infras_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.infras DROP CONSTRAINT IF EXISTS infras_pkey CASCADE;

ALTER TABLE ONLY public.infras
    ADD CONSTRAINT infras_pkey PRIMARY KEY (id);


--
-- Name: invites invites_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.invites DROP CONSTRAINT IF EXISTS invites_pkey CASCADE;

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (id);


--
-- Name: invites invites_token_key; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.invites DROP CONSTRAINT IF EXISTS invites_token_key CASCADE;

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_token_key UNIQUE (token);


--
-- Name: job_notification_configs job_notification_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.job_notification_configs DROP CONSTRAINT IF EXISTS job_notification_configs_pkey CASCADE;

ALTER TABLE ONLY public.job_notification_configs
    ADD CONSTRAINT job_notification_configs_pkey PRIMARY KEY (id);


--
-- Name: kube_events kube_events_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.kube_events DROP CONSTRAINT IF EXISTS kube_events_pkey CASCADE;

ALTER TABLE ONLY public.kube_events
    ADD CONSTRAINT kube_events_pkey PRIMARY KEY (id);


--
-- Name: kube_integrations kube_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.kube_integrations DROP CONSTRAINT IF EXISTS kube_integrations_pkey CASCADE;

ALTER TABLE ONLY public.kube_integrations
    ADD CONSTRAINT kube_integrations_pkey PRIMARY KEY (id);


--
-- Name: kube_sub_events kube_sub_events_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.kube_sub_events DROP CONSTRAINT IF EXISTS kube_sub_events_pkey CASCADE;

ALTER TABLE ONLY public.kube_sub_events
    ADD CONSTRAINT kube_sub_events_pkey PRIMARY KEY (id);


--
-- Name: monitor_test_results monitor_test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.monitor_test_results DROP CONSTRAINT IF EXISTS monitor_test_results_pkey CASCADE;

ALTER TABLE ONLY public.monitor_test_results
    ADD CONSTRAINT monitor_test_results_pkey PRIMARY KEY (id);


--
-- Name: notification_configs notification_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.notification_configs DROP CONSTRAINT IF EXISTS notification_configs_pkey;

ALTER TABLE ONLY public.notification_configs
    ADD CONSTRAINT notification_configs_pkey PRIMARY KEY (id);


--
-- Name: o_auth_integrations o_auth_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.o_auth_integrations DROP CONSTRAINT IF EXISTS o_auth_integrations_pkey CASCADE;

ALTER TABLE ONLY public.o_auth_integrations
    ADD CONSTRAINT o_auth_integrations_pkey PRIMARY KEY (id);


--
-- Name: o_id_c_integrations o_id_c_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.o_id_c_integrations DROP CONSTRAINT IF EXISTS o_id_c_integrations_pkey CASCADE;

ALTER TABLE ONLY public.o_id_c_integrations
    ADD CONSTRAINT o_id_c_integrations_pkey PRIMARY KEY (id);


--
-- Name: onboardings onboardings_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.onboardings DROP CONSTRAINT IF EXISTS onboardings_pkey CASCADE;

ALTER TABLE ONLY public.onboardings
    ADD CONSTRAINT onboardings_pkey PRIMARY KEY (id);


--
-- Name: operations operations_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.operations DROP CONSTRAINT IF EXISTS operations_pkey CASCADE;

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_pkey PRIMARY KEY (id);


--
-- Name: operations operations_uid_key; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.operations DROP CONSTRAINT IF EXISTS operations_uid_key CASCADE;

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_uid_key UNIQUE (uid);


--
-- Name: policies policies_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.policies DROP CONSTRAINT IF EXISTS policies_pkey CASCADE;

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_pkey PRIMARY KEY (id);


--
-- Name: policies policies_unique_id_key; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.policies DROP CONSTRAINT IF EXISTS policies_unique_id_key CASCADE;

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_unique_id_key UNIQUE (unique_id);


--
-- Name: project_billings project_billings_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.project_billings DROP CONSTRAINT IF EXISTS project_billings_pkey CASCADE;

ALTER TABLE ONLY public.project_billings
    ADD CONSTRAINT project_billings_pkey PRIMARY KEY (id);


--
-- Name: project_usage_caches project_usage_caches_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.project_usage_caches DROP CONSTRAINT IF EXISTS project_usage_caches_pkey CASCADE;

ALTER TABLE ONLY public.project_usage_caches
    ADD CONSTRAINT project_usage_caches_pkey PRIMARY KEY (id);


--
-- Name: project_usages project_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.project_usages DROP CONSTRAINT IF EXISTS project_usages_pkey CASCADE;

ALTER TABLE ONLY public.project_usages
    ADD CONSTRAINT project_usages_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.projects DROP CONSTRAINT IF EXISTS projects_pkey CASCADE;

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: pw_reset_tokens pw_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.pw_reset_tokens DROP CONSTRAINT IF EXISTS pw_reset_tokens_pkey CASCADE;

ALTER TABLE ONLY public.pw_reset_tokens
    ADD CONSTRAINT pw_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: reg_token_caches reg_token_caches_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.reg_token_caches DROP CONSTRAINT IF EXISTS reg_token_caches_pkey CASCADE;

ALTER TABLE ONLY public.reg_token_caches
    ADD CONSTRAINT reg_token_caches_pkey PRIMARY KEY (id);


--
-- Name: registries registries_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.registries DROP CONSTRAINT IF EXISTS registries_pkey CASCADE;

ALTER TABLE ONLY public.registries
    ADD CONSTRAINT registries_pkey PRIMARY KEY (id);


--
-- Name: release_tags release_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.release_tags DROP CONSTRAINT IF EXISTS release_tags_pkey CASCADE;

ALTER TABLE ONLY public.release_tags
    ADD CONSTRAINT release_tags_pkey PRIMARY KEY (tag_id, release_id);


--
-- Name: releases releases_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.releases DROP CONSTRAINT IF EXISTS releases_pkey CASCADE;

ALTER TABLE ONLY public.releases
    ADD CONSTRAINT releases_pkey PRIMARY KEY (id);


--
-- Name: releases releases_webhook_token_key; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.releases DROP CONSTRAINT IF EXISTS releases_webhook_token_key CASCADE;

ALTER TABLE ONLY public.releases
    ADD CONSTRAINT releases_webhook_token_key UNIQUE (webhook_token);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey CASCADE;

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_key_key; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_key_key CASCADE;

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_key_key UNIQUE (key);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_pkey CASCADE;

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: slack_integrations slack_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.slack_integrations DROP CONSTRAINT IF EXISTS slack_integrations_pkey CASCADE;

ALTER TABLE ONLY public.slack_integrations
    ADD CONSTRAINT slack_integrations_pkey PRIMARY KEY (id);


--
-- Name: stack_env_groups stack_env_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.stack_env_groups DROP CONSTRAINT IF EXISTS stack_env_groups_pkey  CASCADE;

ALTER TABLE ONLY public.stack_env_groups
    ADD CONSTRAINT stack_env_groups_pkey PRIMARY KEY (id);


--
-- Name: stack_resources stack_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.stack_resources DROP CONSTRAINT IF EXISTS stack_resources_pkey CASCADE;

ALTER TABLE ONLY public.stack_resources
    ADD CONSTRAINT stack_resources_pkey PRIMARY KEY (id);


--
-- Name: stack_revisions stack_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.stack_revisions DROP CONSTRAINT IF EXISTS stack_revisions_pkey CASCADE;

ALTER TABLE ONLY public.stack_revisions
    ADD CONSTRAINT stack_revisions_pkey PRIMARY KEY (id);


--
-- Name: stack_source_configs stack_source_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.stack_source_configs DROP CONSTRAINT IF EXISTS stack_source_configs_pkey CASCADE;

ALTER TABLE ONLY public.stack_source_configs
    ADD CONSTRAINT stack_source_configs_pkey PRIMARY KEY (id);


--
-- Name: stacks stacks_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.stacks DROP CONSTRAINT IF EXISTS stacks_pkey CASCADE;

ALTER TABLE ONLY public.stacks
    ADD CONSTRAINT stacks_pkey PRIMARY KEY (id);


--
-- Name: stacks stacks_uid_key; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.stacks DROP CONSTRAINT IF EXISTS stacks_uid_key CASCADE;

ALTER TABLE ONLY public.stacks
    ADD CONSTRAINT stacks_uid_key UNIQUE (uid);


--
-- Name: sub_events sub_events_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.sub_events DROP CONSTRAINT IF EXISTS sub_events_pkey CASCADE;

ALTER TABLE ONLY public.sub_events
    ADD CONSTRAINT sub_events_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.tags DROP CONSTRAINT IF EXISTS tags_pkey CASCADE;

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: token_caches token_caches_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.token_caches DROP CONSTRAINT IF EXISTS token_caches_pkey CASCADE;

ALTER TABLE ONLY public.token_caches
    ADD CONSTRAINT token_caches_pkey PRIMARY KEY (id);


--
-- Name: user_billings user_billings_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.user_billings DROP CONSTRAINT IF EXISTS user_billings_pkey CASCADE;

ALTER TABLE ONLY public.user_billings
    ADD CONSTRAINT user_billings_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key CASCADE;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--
ALTER TABLE ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_allowlists_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_allowlists_deleted_at ON public.allowlists USING btree (deleted_at);


--
-- Name: idx_api_contract_revisions_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_api_contract_revisions_deleted_at ON public.api_contract_revisions USING btree (deleted_at);


--
-- Name: idx_api_tokens_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_api_tokens_deleted_at ON public.api_tokens USING btree (deleted_at);


--
-- Name: idx_auth_codes_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_auth_codes_deleted_at ON public.auth_codes USING btree (deleted_at);


--
-- Name: idx_aws_assume_role_chains_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_aws_assume_role_chains_deleted_at ON public.aws_assume_role_chains USING btree (deleted_at);


--
-- Name: idx_aws_integrations_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_aws_integrations_deleted_at ON public.aws_integrations USING btree (deleted_at);


--
-- Name: idx_azure_integrations_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_azure_integrations_deleted_at ON public.azure_integrations USING btree (deleted_at);


--
-- Name: idx_basic_integrations_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_basic_integrations_deleted_at ON public.basic_integrations USING btree (deleted_at);


--
-- Name: idx_build_configs_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_build_configs_deleted_at ON public.build_configs USING btree (deleted_at);


--
-- Name: idx_cluster_candidates_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_cluster_candidates_deleted_at ON public.cluster_candidates USING btree (deleted_at);


--
-- Name: idx_cluster_resolvers_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_cluster_resolvers_deleted_at ON public.cluster_resolvers USING btree (deleted_at);


--
-- Name: idx_cluster_token_caches_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_cluster_token_caches_deleted_at ON public.cluster_token_caches USING btree (deleted_at);


--
-- Name: idx_clusters_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_clusters_deleted_at ON public.clusters USING btree (deleted_at);


--
-- Name: idx_credentials_exchange_tokens_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_credentials_exchange_tokens_deleted_at ON public.credentials_exchange_tokens USING btree (deleted_at);


--
-- Name: idx_databases_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_databases_deleted_at ON public.databases USING btree (deleted_at);


--
-- Name: idx_db_migrations_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_db_migrations_deleted_at ON public.db_migrations USING btree (deleted_at);


--
-- Name: idx_deployments_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_deployments_deleted_at ON public.deployments USING btree (deleted_at);


--
-- Name: idx_dns_records_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_dns_records_deleted_at ON public.dns_records USING btree (deleted_at);


--
-- Name: idx_environments_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_environments_deleted_at ON public.environments USING btree (deleted_at);


--
-- Name: idx_event_containers_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_event_containers_deleted_at ON public.event_containers USING btree (deleted_at);


--
-- Name: idx_gcp_integrations_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_gcp_integrations_deleted_at ON public.gcp_integrations USING btree (deleted_at);


--
-- Name: idx_git_action_configs_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_git_action_configs_deleted_at ON public.git_action_configs USING btree (deleted_at);


--
-- Name: idx_git_repos_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_git_repos_deleted_at ON public.git_repos USING btree (deleted_at);


--
-- Name: idx_github_app_installations_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_github_app_installations_deleted_at ON public.github_app_installations USING btree (deleted_at);


--
-- Name: idx_github_app_o_auth_integrations_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_github_app_o_auth_integrations_deleted_at ON public.github_app_o_auth_integrations USING btree (deleted_at);


--
-- Name: idx_gitlab_app_o_auth_integrations_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_gitlab_app_o_auth_integrations_deleted_at ON public.gitlab_app_o_auth_integrations USING btree (deleted_at);


--
-- Name: idx_gitlab_integrations_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_gitlab_integrations_deleted_at ON public.gitlab_integrations USING btree (deleted_at);


--
-- Name: idx_helm_repo_token_caches_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_helm_repo_token_caches_deleted_at ON public.helm_repo_token_caches USING btree (deleted_at);


--
-- Name: idx_helm_repos_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_helm_repos_deleted_at ON public.helm_repos USING btree (deleted_at);


--
-- Name: idx_infras_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_infras_deleted_at ON public.infras USING btree (deleted_at);


--
-- Name: idx_invites_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_invites_deleted_at ON public.invites USING btree (deleted_at);


--
-- Name: idx_job_notification_configs_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_job_notification_configs_deleted_at ON public.job_notification_configs USING btree (deleted_at);


--
-- Name: idx_kube_events_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_kube_events_deleted_at ON public.kube_events USING btree (deleted_at);


--
-- Name: idx_kube_integrations_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_kube_integrations_deleted_at ON public.kube_integrations USING btree (deleted_at);


--
-- Name: idx_kube_sub_events_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_kube_sub_events_deleted_at ON public.kube_sub_events USING btree (deleted_at);


--
-- Name: idx_monitor_test_results_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_monitor_test_results_deleted_at ON public.monitor_test_results USING btree (deleted_at);


--
-- Name: idx_notification_configs_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_notification_configs_deleted_at ON public.notification_configs USING btree (deleted_at);


--
-- Name: idx_o_auth_integrations_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_o_auth_integrations_deleted_at ON public.o_auth_integrations USING btree (deleted_at);


--
-- Name: idx_o_id_c_integrations_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_o_id_c_integrations_deleted_at ON public.o_id_c_integrations USING btree (deleted_at);


--
-- Name: idx_onboardings_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_onboardings_deleted_at ON public.onboardings USING btree (deleted_at);


--
-- Name: idx_operations_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_operations_deleted_at ON public.operations USING btree (deleted_at);


--
-- Name: idx_policies_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_policies_deleted_at ON public.policies USING btree (deleted_at);


--
-- Name: idx_project_billings_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_project_billings_deleted_at ON public.project_billings USING btree (deleted_at);


--
-- Name: idx_project_usage_caches_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_project_usage_caches_deleted_at ON public.project_usage_caches USING btree (deleted_at);


--
-- Name: idx_project_usages_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_project_usages_deleted_at ON public.project_usages USING btree (deleted_at);


--
-- Name: idx_projects_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects USING btree (deleted_at);


--
-- Name: idx_pw_reset_tokens_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_pw_reset_tokens_deleted_at ON public.pw_reset_tokens USING btree (deleted_at);


--
-- Name: idx_reg_token_caches_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_reg_token_caches_deleted_at ON public.reg_token_caches USING btree (deleted_at);


--
-- Name: idx_registries_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_registries_deleted_at ON public.registries USING btree (deleted_at);


--
-- Name: idx_releases_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_releases_deleted_at ON public.releases USING btree (deleted_at);


--
-- Name: idx_roles_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_roles_deleted_at ON public.roles USING btree (deleted_at);


--
-- Name: idx_sessions_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON public.sessions USING btree (deleted_at);


--
-- Name: idx_slack_integrations_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_slack_integrations_deleted_at ON public.slack_integrations USING btree (deleted_at);


--
-- Name: idx_stack_env_groups_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_stack_env_groups_deleted_at ON public.stack_env_groups USING btree (deleted_at);


--
-- Name: idx_stack_resources_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_stack_resources_deleted_at ON public.stack_resources USING btree (deleted_at);


--
-- Name: idx_stack_revisions_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_stack_revisions_deleted_at ON public.stack_revisions USING btree (deleted_at);


--
-- Name: idx_stack_source_configs_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_stack_source_configs_deleted_at ON public.stack_source_configs USING btree (deleted_at);


--
-- Name: idx_stacks_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_stacks_deleted_at ON public.stacks USING btree (deleted_at);


--
-- Name: idx_sub_events_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_sub_events_deleted_at ON public.sub_events USING btree (deleted_at);


--
-- Name: idx_tags_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_tags_deleted_at ON public.tags USING btree (deleted_at);


--
-- Name: idx_token_caches_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_token_caches_deleted_at ON public.token_caches USING btree (deleted_at);


--
-- Name: idx_user_billings_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_user_billings_deleted_at ON public.user_billings USING btree (deleted_at);


--
-- Name: idx_users_deleted_at; Type: INDEX; Schema: public; Owner: porter
--

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users USING btree (deleted_at);


--
-- Name: cluster_resolvers fk_cluster_candidates_resolvers; Type: FK CONSTRAINT; Schema: public; Owner: porter
--
--
-- Name: cluster_candidates cluster_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.cluster_resolvers DROP CONSTRAINT IF EXISTS fk_cluster_candidates_resolvers;
ALTER TABLE ONLY public.cluster_candidates DROP CONSTRAINT IF EXISTS cluster_candidates_pkey;

ALTER TABLE ONLY public.cluster_candidates
    ADD CONSTRAINT cluster_candidates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cluster_resolvers
    ADD CONSTRAINT fk_cluster_candidates_resolvers FOREIGN KEY (cluster_candidate_id) REFERENCES public.cluster_candidates(id);


--
-- Name: sub_events fk_event_containers_steps; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.sub_events
    ADD CONSTRAINT fk_event_containers_steps FOREIGN KEY (event_container_id) REFERENCES public.event_containers(id);


--
-- Name: helm_repo_token_caches fk_helm_repos_token_cache; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.helm_repo_token_caches
    ADD CONSTRAINT fk_helm_repos_token_cache FOREIGN KEY (helm_repo_id) REFERENCES public.helm_repos(id);


--
-- Name: databases fk_infras_database; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.databases
    ADD CONSTRAINT fk_infras_database FOREIGN KEY (infra_id) REFERENCES public.infras(id);


--
-- Name: operations fk_infras_operations; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT fk_infras_operations FOREIGN KEY (infra_id) REFERENCES public.infras(id);


--
-- Name: kube_sub_events fk_kube_events_sub_events; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.kube_sub_events
    ADD CONSTRAINT fk_kube_events_sub_events FOREIGN KEY (kube_event_id) REFERENCES public.kube_events(id);


--
-- Name: aws_assume_role_chains fk_projects; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.aws_assume_role_chains
    ADD CONSTRAINT fk_projects FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: aws_integrations fk_projects_aws_integrations; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.aws_integrations
    ADD CONSTRAINT fk_projects_aws_integrations FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: azure_integrations fk_projects_azure_integrations; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.azure_integrations
    ADD CONSTRAINT fk_projects_azure_integrations FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: basic_integrations fk_projects_basic_integrations; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.basic_integrations
    ADD CONSTRAINT fk_projects_basic_integrations FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: cluster_candidates fk_projects_cluster_candidates; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.cluster_candidates
    ADD CONSTRAINT fk_projects_cluster_candidates FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: clusters fk_projects_clusters; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.clusters
    ADD CONSTRAINT fk_projects_clusters FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: databases fk_projects_databases; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.databases
    ADD CONSTRAINT fk_projects_databases FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: gcp_integrations fk_projects_gcp_integrations; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.gcp_integrations
    ADD CONSTRAINT fk_projects_gcp_integrations FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: git_repos fk_projects_git_repos; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.git_repos
    ADD CONSTRAINT fk_projects_git_repos FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: gitlab_integrations fk_projects_gitlab_integrations; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.gitlab_integrations
    ADD CONSTRAINT fk_projects_gitlab_integrations FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: helm_repos fk_projects_helm_repos; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.helm_repos
    ADD CONSTRAINT fk_projects_helm_repos FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: infras fk_projects_infras; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.infras
    ADD CONSTRAINT fk_projects_infras FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: invites fk_projects_invites; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT fk_projects_invites FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: kube_integrations fk_projects_kube_integrations; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.kube_integrations
    ADD CONSTRAINT fk_projects_kube_integrations FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: o_auth_integrations fk_projects_o_auth_integrations; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.o_auth_integrations
    ADD CONSTRAINT fk_projects_o_auth_integrations FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: o_id_c_integrations fk_projects_o_id_c_integrations; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.o_id_c_integrations
    ADD CONSTRAINT fk_projects_o_id_c_integrations FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: registries fk_projects_registries; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.registries
    ADD CONSTRAINT fk_projects_registries FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: roles fk_projects_roles; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT fk_projects_roles FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: reg_token_caches fk_registries_token_cache; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.reg_token_caches
    ADD CONSTRAINT fk_registries_token_cache FOREIGN KEY (registry_id) REFERENCES public.registries(id);


--
-- Name: release_tags fk_release_tags_release; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.release_tags
    ADD CONSTRAINT fk_release_tags_release FOREIGN KEY (release_id) REFERENCES public.releases(id);


--
-- Name: release_tags fk_release_tags_tag; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.release_tags
    ADD CONSTRAINT fk_release_tags_tag FOREIGN KEY (tag_id) REFERENCES public.tags(id);


--
-- Name: git_action_configs fk_releases_git_action_config; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.git_action_configs
    ADD CONSTRAINT fk_releases_git_action_config FOREIGN KEY (release_id) REFERENCES public.releases(id);


--
-- Name: stack_env_groups fk_stack_revisions_env_groups; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.stack_env_groups
    ADD CONSTRAINT fk_stack_revisions_env_groups FOREIGN KEY (stack_revision_id) REFERENCES public.stack_revisions(id);


--
-- Name: stack_resources fk_stack_revisions_resources; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.stack_resources
    ADD CONSTRAINT fk_stack_revisions_resources FOREIGN KEY (stack_revision_id) REFERENCES public.stack_revisions(id);


--
-- Name: stack_source_configs fk_stack_revisions_source_configs; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.stack_source_configs
    ADD CONSTRAINT fk_stack_revisions_source_configs FOREIGN KEY (stack_revision_id) REFERENCES public.stack_revisions(id);


--
-- Name: stack_revisions fk_stacks_revisions; Type: FK CONSTRAINT; Schema: public; Owner: porter
--

ALTER TABLE ONLY public.stack_revisions
    ADD CONSTRAINT fk_stacks_revisions FOREIGN KEY (stack_id) REFERENCES public.stacks(id);


--
-- PostgreSQL database dump complete
--
-- +goose StatementEnd

-- +goose Down
