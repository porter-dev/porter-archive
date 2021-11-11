module github.com/porter-dev/porter

go 1.16

require (
	cloud.google.com/go v0.81.0
	github.com/AlecAivazis/survey/v2 v2.2.9
	github.com/Masterminds/semver/v3 v3.1.1
	github.com/aws/aws-sdk-go v1.35.4
	github.com/bradleyfalzon/ghinstallation v1.1.1
	github.com/buildpacks/pack v0.19.0
	github.com/cli/cli v1.11.0
	github.com/dgrijalva/jwt-go v3.2.0+incompatible
	github.com/digitalocean/godo v1.56.0
	github.com/docker/cli v20.10.7+incompatible
	github.com/docker/distribution v2.7.1+incompatible
	github.com/docker/docker v20.10.7+incompatible
	github.com/docker/docker-credential-helpers v0.6.3
	github.com/docker/go-connections v0.4.0
	github.com/fatih/color v1.10.0
	github.com/getsentry/sentry-go v0.11.0
	github.com/go-chi/chi v4.1.2+incompatible
	github.com/go-playground/validator/v10 v10.3.0
	github.com/go-redis/redis/v8 v8.11.0
	github.com/go-test/deep v1.0.7
	github.com/google/go-github v17.0.0+incompatible
	github.com/google/go-github/v29 v29.0.3 // indirect
	github.com/google/go-github/v33 v33.0.0
	github.com/google/go-querystring v1.1.0 // indirect
	github.com/gorilla/mux v1.8.0 // indirect
	github.com/gorilla/schema v1.2.0
	github.com/gorilla/securecookie v1.1.1
	github.com/gorilla/sessions v1.2.1
	github.com/gorilla/websocket v1.4.2
	github.com/itchyny/gojq v0.12.1
	github.com/joeshaw/envdecode v0.0.0-20200121155833-099f1fc765bd
	github.com/kris-nova/logger v0.0.0-20181127235838-fd0d87064b06
	github.com/kris-nova/lolgopher v0.0.0-20180921204813-313b3abb0d9b // indirect
	github.com/moby/moby v20.10.6+incompatible
	github.com/moby/term v0.0.0-20201216013528-df9cb8a40635
	github.com/opencontainers/image-spec v1.0.1
	github.com/paketo-buildpacks/conda-env-update v0.2.2
	github.com/paketo-buildpacks/dep-ensure v0.1.1
	github.com/paketo-buildpacks/go-mod-vendor v0.3.1
	github.com/paketo-buildpacks/node-engine v0.10.0
	github.com/paketo-buildpacks/node-run-script v0.2.0
	github.com/paketo-buildpacks/node-start v0.5.0
	github.com/paketo-buildpacks/npm-install v0.5.0
	github.com/paketo-buildpacks/packit v1.3.0
	github.com/paketo-buildpacks/pipenv-install v0.2.3
	github.com/paketo-buildpacks/python-start v0.7.0
	github.com/paketo-buildpacks/rackup v0.1.0
	github.com/paketo-buildpacks/rails-assets v0.3.0
	github.com/paketo-buildpacks/rake v0.1.0
	github.com/paketo-buildpacks/yarn-install v0.5.0
	github.com/pelletier/go-toml v1.9.4
	github.com/pkg/errors v0.9.1
	github.com/rogpeppe/go-internal v1.5.2 // indirect
	github.com/rs/zerolog v1.20.0
	github.com/segmentio/backo-go v0.0.0-20200129164019-23eae7c10bd3 // indirect
	github.com/sendgrid/rest v2.6.3+incompatible // indirect
	github.com/sendgrid/sendgrid-go v3.8.0+incompatible
	github.com/spf13/cobra v1.2.1
	github.com/spf13/pflag v1.0.5
	github.com/spf13/viper v1.8.1
	github.com/stretchr/testify v1.7.0
	github.com/xtgo/uuid v0.0.0-20140804021211-a0b114877d4c // indirect
	golang.org/x/crypto v0.0.0-20210322153248-0c34fe9e7dc2
	golang.org/x/mod v0.5.0 // indirect
	golang.org/x/oauth2 v0.0.0-20210402161424-2e8d93401602
	golang.org/x/sys v0.0.0-20210819135213-f52c844e1c1c // indirect
	google.golang.org/api v0.44.0
	google.golang.org/genproto v0.0.0-20210602131652-f16073e35f0c
	gopkg.in/segmentio/analytics-go.v3 v3.1.0
	gopkg.in/yaml.v2 v2.4.0
	gorm.io/driver/postgres v1.0.2
	gorm.io/driver/sqlite v1.1.3
	gorm.io/gorm v1.20.2
	helm.sh/helm/v3 v3.6.0
	k8s.io/api v0.21.0
	k8s.io/apimachinery v0.21.0
	k8s.io/cli-runtime v0.21.0
	k8s.io/client-go v0.21.0
	k8s.io/helm v2.16.12+incompatible
	k8s.io/kubectl v0.21.0
	rsc.io/letsencrypt v0.0.3 // indirect
	sigs.k8s.io/aws-iam-authenticator v0.5.2
	sigs.k8s.io/yaml v1.2.0
)
