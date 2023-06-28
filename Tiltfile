load('ext://restart_process', 'docker_build_with_restart')

secret_settings(disable_scrub=True)

if not os.path.exists("vendor"):
    local(command="go mod vendor")

if config.tilt_subcommand == "up":
    local(command="cd dashboard; npm i --legacy-peer-deps")

if config.tilt_subcommand == "down":
    local(command="rm -rf vendor")
    local(command="rm -rf dashboard/node_modules")

build_args = "GOOS=linux GOARCH=arm64"
if os.getenv("PLATFORM") == "amd64":
    build_args = "GOOS=linux GOARCH=amd64"

allow_k8s_contexts('kind-porter')
cluster = str(local('kubectl config current-context')).strip()
if (cluster.startswith("kind-")):
    install = kustomize('zarf/helm', flags=["--enable-helm"])
    decoded = decode_yaml_stream(install)
    for d in decoded:
        if d.get('kind') == 'Deployment':
            if "securityContext" in d['spec']['template']['spec']:
                d['spec']['template']['spec'].pop('securityContext')
            for c in d['spec']['template']['spec']['containers']:
                if "securityContext" in c:
                    c.pop('securityContext')

    updated_install = encode_yaml_stream(decoded)

    k8s_yaml(updated_install)

    k8s_resource(
        workload='porter-server-web',
        port_forwards="8080:8080",
        labels=["porter"],
        resource_deps=["porter-binary"],
    )
else:
    local("echo 'Be careful that you aren't connected to a staging or prod cluster' && exit 1")
    exit()

watch_file('zarf/helm/.server.env')
watch_file('zarf/helm/.dashboard.env')

## Build binary locally for faster devexp
local_resource(
  name='porter-binary',
  cmd='''GOWORK=off CGO_ENABLED=0 %s go build -mod vendor -gcflags '-N -l' -tags ee -o ./bin/porter ./cmd/app/main.go''' % build_args,
  deps=[
    "api",
    "build",
    "cli",
    "ee",
    "internal",
    "pkg",
  ],
  resource_deps=["postgresql"],
  labels=["z_binaries"]
)

local_resource(
    name="migrations-binary",
    cmd='''GOWORK=off CGO_ENABLED=0 %s go build -mod vendor -gcflags '-N -l' -tags ee -o ./bin/migrate ./cmd/migrate/main.go ./cmd/migrate/migrate_ee.go''' % build_args,
    resource_deps=["postgresql"],
    labels=["z_binaries"],
)

local_resource(
    name="disable-porter-helm-test",
    cmd='tilt disable porter-server-web-test-connection',
    resource_deps=["porter-server-web"]
)

docker_build_with_restart(
    ref="porter1/porter-server",
    context=".",
    dockerfile="zarf/docker/Dockerfile.server.tilt",
    # entrypoint='dlv --listen=:40000 --api-version=2 --headless=true --log=true exec /porter/bin/app',
    entrypoint='/app/migrate && /app/porter',
    build_args={},
    only=[
        "bin",
    ],
    live_update=[
        sync('./bin/porter', '/app/'),
        sync('./bin/migrate', '/app/'),
    ]
) 

local_resource(
  name='reload-server-config',
  cmd='kubectl rollout restart deployment porter-server-web',
  deps=[
    "zarf/helm/.server.env"
  ],
  labels=["porter"],
  resource_deps=["porter-server-web"]
)

# Frontend
local_resource(
    name="porter-dashboard",
    serve_cmd="npm start",
    serve_dir="dashboard",
    serve_env={
        "ENV_FILE": "../zarf/helm/.dashboard.env"
    },
    resource_deps=["postgresql"],
    labels=["porter"]
)
# local_resource('public-url', serve_cmd='lt --subdomain "$(whoami)" --port 8080', resource_deps=["porter-dashboard"], labels=["porter"])
# local_resource('public-url', serve_cmd='ngrok http 8081 --log=stdout', resource_deps=["porter-dashboard"], labels=["porter"])
