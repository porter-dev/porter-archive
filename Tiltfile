load('ext://restart_process', 'docker_build_with_restart')

secret_settings(disable_scrub=True)

if not os.path.exists("vendor"):
    local(command="go mod vendor")

if config.tilt_subcommand == "down":
    local(command="rm -rf vendor")

## Build binary locally for faster devexp
local_resource(
  'porter',
  '''GOWORK=off CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -mod vendor -gcflags '-N -l' -o ./porter ./cmd/app/main.go''',
  deps=[
    "api",
    "build",
    "cli",
    "ee",
    "internal",
    "pkg",
  ],
  resource_deps=["postgresql"],
  labels=["porter"]
)

docker_build_with_restart(
    ref="porter1/porter-server",
    context=".",
    dockerfile="zarf/docker/Dockerfile.server.tilt",
    # entrypoint='dlv --listen=:40000 --api-version=2 --headless=true --log=true exec /porter/bin/app',
    entrypoint='/app/porter',
    build_args={},
    only=[
        "porter",
    ],
    live_update=[
        sync('./porter', '/app/'),
    ]
) 

# Frontend
# docker_build(
#     ref='porter1/porter-dashboard', 
#     context='.',
#     dockerfile="zarf/docker/Dockerfile.dashboard.tilt",
#     build_args={'node_env': 'development'},
#     entrypoint='npm start',
#     live_update=[
#         fall_back_on(['dashboard/package.json', 'dashboard/package-lock.json']),
#         sync('dashboard', '/app/'),
#     ]
# )
# local_resource(
#   'porter-dashboard',
#   '''cd dashboard && NODE_ENV=production webpack --config webpack.config.js''',
#   deps=[
#     "dashboard"
#   ],
#   ignore=[
#     "dashboard/node_modules"
#   ],
#   resource_deps=["postgresql"],
#   labels=["porter"]
# )

# docker_build_with_restart(
#     ref="porter1/porter-dashboard",
#     context=".",
#     dockerfile="zarf/docker/Dockerfile.dashboard.tilt",
#     entrypoint='serve -s /app/build -p 8081',
#     build_args={},
#     only=[
#         "dashboard/build",
#     ],
#     live_update=[
#         sync('./dashboard/build', '/app/build/'),
#     ]
# ) 
# docker_build_with_restart(
#     ref="porter1/porter-dashboard",
#     context=".",
#     dockerfile="zarf/docker/Dockerfile.dashboard.tilt",
#     entrypoint='webpack-dev-server --config webpack.config.js',
#     build_args={},
#     only=[
#         "dashboard",
#     ],
#     live_update=[
#         sync('./dashboard', '/app/'),
#     ]
# ) 
docker_build(
    ref="porter1/porter-dashboard",
    context=".",
    dockerfile="zarf/docker/Dockerfile.dashboard.tilt",
    entrypoint='webpack-dev-server --config webpack.config.js',
    live_update=[
        # when package.json changes, we need to do a full build
        fall_back_on(['dashboard/package.json', 'dashboard/package-lock.json']),
        # Map the local source code into the container under /src
        sync('dashboard', '/app/'),
    ]
)

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
    k8s_resource(workload='porter-server-web', port_forwards="8080:8080", labels=["porter"])
    k8s_resource(workload='porter-dashboard-web', port_forwards="8081:8081", labels=["porter"], resource_deps=["postgresql"])
else:
    local("echo 'Be careful that you aren't connected to a staging or prod cluster' && exit 1")
    exit()
