module github.com/porter-dev/porter

go 1.18

require (
	cloud.google.com/go v0.99.0
	github.com/AlecAivazis/survey/v2 v2.2.9
	github.com/Masterminds/semver/v3 v3.1.1
	github.com/aws/aws-sdk-go v1.35.4
	github.com/bradleyfalzon/ghinstallation/v2 v2.0.3
	github.com/buildpacks/pack v0.26.0
	github.com/cli/cli v1.11.0
	github.com/dgrijalva/jwt-go v3.2.0+incompatible
	github.com/digitalocean/godo v1.75.0
	github.com/docker/cli v20.10.14+incompatible
	github.com/docker/distribution v2.8.1+incompatible
	github.com/docker/docker v20.10.14+incompatible
	github.com/docker/docker-credential-helpers v0.6.4
	github.com/docker/go-connections v0.4.0
	github.com/fatih/color v1.13.0
	github.com/getsentry/sentry-go v0.11.0
	github.com/go-chi/chi v4.1.2+incompatible
	github.com/go-playground/validator/v10 v10.3.0
	github.com/go-redis/redis/v8 v8.11.0
	github.com/go-test/deep v1.0.7
	github.com/golang-jwt/jwt/v4 v4.2.0 // indirect
	github.com/golang/protobuf v1.5.2 // indirect
	github.com/google/go-github/v39 v39.2.0 // indirect
	github.com/google/go-github/v41 v41.0.0
	github.com/gorilla/schema v1.2.0
	github.com/gorilla/securecookie v1.1.1
	github.com/gorilla/sessions v1.2.1
	github.com/gorilla/websocket v1.4.2
	github.com/itchyny/gojq v0.12.1
	github.com/joeshaw/envdecode v0.0.0-20200121155833-099f1fc765bd
	github.com/kris-nova/logger v0.0.0-20181127235838-fd0d87064b06
	github.com/mitchellh/mapstructure v1.4.3
	github.com/moby/moby v20.10.6+incompatible
	github.com/moby/term v0.0.0-20210619224110-3f7ff695adc6
	github.com/opencontainers/image-spec v1.0.3-0.20211202183452-c5a74bcca799
	github.com/pkg/errors v0.9.1
	github.com/porter-dev/switchboard v0.0.0-20220416181342-416fc450addb
	github.com/rs/zerolog v1.26.0
	github.com/sendgrid/sendgrid-go v3.8.0+incompatible
	github.com/spf13/cobra v1.4.0
	github.com/spf13/pflag v1.0.5
	github.com/spf13/viper v1.10.0
	github.com/stretchr/testify v1.7.0
	golang.org/x/crypto v0.0.0-20220411220226-7b82a4e95df4
	golang.org/x/net v0.0.0-20220425223048-2871e0cb64e4
	golang.org/x/oauth2 v0.0.0-20211104180415-d3ed0bb246c8
	google.golang.org/api v0.62.0
	google.golang.org/genproto v0.0.0-20220422154200-b37d22cd5731
	google.golang.org/grpc v1.46.0
	google.golang.org/protobuf v1.28.0
	gorm.io/driver/sqlite v1.1.3
	gorm.io/gorm v1.22.3
	helm.sh/helm/v3 v3.8.0
	k8s.io/api v0.23.1
	k8s.io/apimachinery v0.23.5
	k8s.io/cli-runtime v0.23.1
	k8s.io/client-go v0.23.1
	k8s.io/helm v2.17.0+incompatible
	k8s.io/kubectl v0.23.1
	sigs.k8s.io/aws-iam-authenticator v0.5.2
	sigs.k8s.io/yaml v1.3.0
)

require (
	github.com/briandowns/spinner v1.18.1
	gopkg.in/segmentio/analytics-go.v3 v3.1.0
	gopkg.in/yaml.v2 v2.4.0
	gorm.io/driver/postgres v1.2.3
)

require (
	github.com/Azure/azure-sdk-for-go v63.4.0+incompatible // indirect
	github.com/Azure/azure-sdk-for-go/sdk/azcore v0.23.1 // indirect
	github.com/Azure/azure-sdk-for-go/sdk/internal v0.9.1 // indirect
	github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/containerregistry/armcontainerregistry v0.5.0 // indirect
	github.com/AzureAD/microsoft-authentication-library-for-go v0.4.0 // indirect
	github.com/golang-jwt/jwt v3.2.1+incompatible // indirect
	github.com/kylelemons/godebug v1.1.0 // indirect
	github.com/pkg/browser v0.0.0-20210115035449-ce105d075bb4 // indirect
)

require (
	github.com/Azure/azure-sdk-for-go/sdk/azidentity v0.14.0
	github.com/Azure/go-ansiterm v0.0.0-20210617225240-d185dfc1b5a1 // indirect
	github.com/Azure/go-autorest v14.2.0+incompatible // indirect
	github.com/Azure/go-autorest/autorest v0.11.20 // indirect
	github.com/Azure/go-autorest/autorest/adal v0.9.15 // indirect
	github.com/Azure/go-autorest/autorest/date v0.3.0 // indirect
	github.com/Azure/go-autorest/logger v0.2.1 // indirect
	github.com/Azure/go-autorest/tracing v0.6.0 // indirect
	github.com/BurntSushi/toml v1.1.0 // indirect
	github.com/MakeNowJust/heredoc v1.0.0 // indirect
	github.com/Masterminds/goutils v1.1.1 // indirect
	github.com/Masterminds/semver v1.5.0 // indirect
	github.com/Masterminds/sprig/v3 v3.2.2 // indirect
	github.com/Masterminds/squirrel v1.5.2 // indirect
	github.com/Microsoft/go-winio v0.5.2 // indirect
	github.com/Microsoft/hcsshim v0.9.2 // indirect
	github.com/PuerkitoBio/purell v1.1.1 // indirect
	github.com/PuerkitoBio/urlesc v0.0.0-20170810143723-de5bf2ad4578 // indirect
	github.com/apex/log v1.9.0 // indirect
	github.com/asaskevich/govalidator v0.0.0-20200428143746-21a406dcc535 // indirect
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/buildpacks/imgutil v0.0.0-20220425182719-2edb52457eb0 // indirect
	github.com/buildpacks/lifecycle v0.14.0 // indirect
	github.com/census-instrumentation/opencensus-proto v0.3.0 // indirect
	github.com/cespare/xxhash/v2 v2.1.2 // indirect
	github.com/chai2010/gettext-go v0.0.0-20160711120539-c6fed771bfd5 // indirect
	github.com/cli/safeexec v1.0.0 // indirect
	github.com/cncf/udpa/go v0.0.0-20210930031921-04548b0d99d4 // indirect
	github.com/cncf/xds/go v0.0.0-20211130200136-a8f946100490 // indirect
	github.com/containerd/cgroups v1.0.3 // indirect
	github.com/containerd/containerd v1.6.3 // indirect
	github.com/containerd/stargz-snapshotter/estargz v0.11.4 // indirect
	github.com/cyphar/filepath-securejoin v0.2.3 // indirect
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/docker/go-metrics v0.0.1 // indirect
	github.com/docker/go-units v0.4.0 // indirect
	github.com/dustin/go-humanize v1.0.0 // indirect
	github.com/emirpasic/gods v1.18.1 // indirect
	github.com/envoyproxy/go-control-plane v0.10.2-0.20220325020618-49ff273808a1 // indirect
	github.com/envoyproxy/protoc-gen-validate v0.6.2 // indirect
	github.com/evanphx/json-patch v4.12.0+incompatible // indirect
	github.com/exponent-io/jsonpath v0.0.0-20151013193312-d6023ce2651d // indirect
	github.com/fsnotify/fsnotify v1.5.1 // indirect
	github.com/fvbommel/sortorder v1.0.1 // indirect
	github.com/gdamore/encoding v1.0.0 // indirect
	github.com/gdamore/tcell/v2 v2.5.1 // indirect
	github.com/ghodss/yaml v1.0.0 // indirect
	github.com/go-errors/errors v1.0.1 // indirect
	github.com/go-logr/logr v1.2.2 // indirect
	github.com/go-openapi/jsonpointer v0.19.5 // indirect
	github.com/go-openapi/jsonreference v0.19.5 // indirect
	github.com/go-openapi/swag v0.19.14 // indirect
	github.com/go-playground/locales v0.13.0 // indirect
	github.com/go-playground/universal-translator v0.17.0 // indirect
	github.com/gobwas/glob v0.2.3 // indirect
	github.com/gofrs/flock v0.8.1 // indirect
	github.com/gogo/protobuf v1.3.2 // indirect
	github.com/golang/groupcache v0.0.0-20210331224755-41bb18bfe9da // indirect
	github.com/google/btree v1.0.1 // indirect
	github.com/google/go-cmp v0.5.8 // indirect
	github.com/google/go-containerregistry v0.8.0 // indirect
	github.com/google/go-querystring v1.1.0 // indirect
	github.com/google/gofuzz v1.2.0 // indirect
	github.com/google/shlex v0.0.0-20191202100458-e7afc7fbc510 // indirect
	github.com/google/uuid v1.2.0 // indirect
	github.com/googleapis/gax-go/v2 v2.1.1 // indirect
	github.com/googleapis/gnostic v0.5.5 // indirect
	github.com/gorilla/mux v1.8.0 // indirect
	github.com/gosuri/uitable v0.0.4 // indirect
	github.com/gregjones/httpcache v0.0.0-20180305231024-9cad4c3443a7 // indirect
	github.com/hashicorp/hcl v1.0.0 // indirect
	github.com/heroku/color v0.0.6 // indirect
	github.com/huandu/xstrings v1.3.2 // indirect
	github.com/imdario/mergo v0.3.12 // indirect
	github.com/inconshreveable/mousetrap v1.0.0 // indirect
	github.com/itchyny/astgen-go v0.0.0-20210113000433-0da0671862a3 // indirect
	github.com/itchyny/timefmt-go v0.1.1 // indirect
	github.com/jackc/chunkreader/v2 v2.0.1 // indirect
	github.com/jackc/pgconn v1.10.1 // indirect
	github.com/jackc/pgio v1.0.0 // indirect
	github.com/jackc/pgpassfile v1.0.0 // indirect
	github.com/jackc/pgproto3/v2 v2.2.0 // indirect
	github.com/jackc/pgservicefile v0.0.0-20200714003250-2b9c44734f2b // indirect
	github.com/jackc/pgtype v1.9.0 // indirect
	github.com/jackc/pgx/v4 v4.14.0 // indirect
	github.com/jbenet/go-context v0.0.0-20150711004518-d14ea06fba99 // indirect
	github.com/jinzhu/inflection v1.0.0 // indirect
	github.com/jinzhu/now v1.1.2 // indirect
	github.com/jmespath/go-jmespath v0.4.0 // indirect
	github.com/jmoiron/sqlx v1.3.4 // indirect
	github.com/josharian/intern v1.0.0 // indirect
	github.com/json-iterator/go v1.1.12 // indirect
	github.com/kballard/go-shellquote v0.0.0-20180428030007-95032a82bc51 // indirect
	github.com/kevinburke/ssh_config v1.2.0 // indirect
	github.com/klauspost/compress v1.15.2 // indirect
	github.com/kris-nova/lolgopher v0.0.0-20180921204813-313b3abb0d9b // indirect
	github.com/lann/builder v0.0.0-20180802200727-47ae307949d0 // indirect
	github.com/lann/ps v0.0.0-20150810152359-62de8c46ede0 // indirect
	github.com/leodido/go-urn v1.2.0 // indirect
	github.com/lib/pq v1.10.4 // indirect
	github.com/liggitt/tabwriter v0.0.0-20181228230101-89fcab3d43de // indirect
	github.com/lucasb-eyer/go-colorful v1.2.0 // indirect
	github.com/magiconair/properties v1.8.5 // indirect
	github.com/mailru/easyjson v0.7.6 // indirect
	github.com/mattn/go-colorable v0.1.12 // indirect
	github.com/mattn/go-isatty v0.0.14 // indirect
	github.com/mattn/go-runewidth v0.0.13 // indirect
	github.com/mattn/go-sqlite3 v1.14.6 // indirect
	github.com/matttproud/golang_protobuf_extensions v1.0.2-0.20181231171920-c182affec369 // indirect
	github.com/mgutz/ansi v0.0.0-20200706080929-d51e80ef957d // indirect
	github.com/mitchellh/copystructure v1.2.0 // indirect
	github.com/mitchellh/go-homedir v1.1.0 // indirect
	github.com/mitchellh/go-wordwrap v1.0.0 // indirect
	github.com/mitchellh/ioprogress v0.0.0-20180201004757-6a23b12fa88e // indirect
	github.com/mitchellh/reflectwalk v1.0.2 // indirect
	github.com/moby/locker v1.0.1 // indirect
	github.com/moby/spdystream v0.2.0 // indirect
	github.com/moby/sys/mount v0.3.2 // indirect
	github.com/moby/sys/mountinfo v0.6.1 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.2 // indirect
	github.com/monochromegane/go-gitignore v0.0.0-20200626010858-205db1a8cc00 // indirect
	github.com/morikuni/aec v1.0.0 // indirect
	github.com/onsi/ginkgo v1.16.4 // indirect
	github.com/opencontainers/go-digest v1.0.0 // indirect
	github.com/opencontainers/runc v1.1.1 // indirect
	github.com/opencontainers/selinux v1.10.1 // indirect
	github.com/pelletier/go-toml v1.9.5 // indirect
	github.com/peterbourgon/diskv v2.0.1+incompatible // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	github.com/prometheus/client_golang v1.11.1 // indirect
	github.com/prometheus/client_model v0.2.0 // indirect
	github.com/prometheus/common v0.30.0 // indirect
	github.com/prometheus/procfs v0.7.3 // indirect
	github.com/rivo/tview v0.0.0-20220307222120-9994674d60a8 // indirect
	github.com/rivo/uniseg v0.2.0 // indirect
	github.com/rubenv/sql-migrate v0.0.0-20210614095031-55d5740dbbcc // indirect
	github.com/russross/blackfriday v1.5.2 // indirect
	github.com/sabhiram/go-gitignore v0.0.0-20210923224102-525f6e181f06 // indirect
	github.com/segmentio/backo-go v0.0.0-20200129164019-23eae7c10bd3 // indirect
	github.com/sendgrid/rest v2.6.3+incompatible // indirect
	github.com/sergi/go-diff v1.2.0 // indirect
	github.com/shopspring/decimal v1.2.0 // indirect
	github.com/sirupsen/logrus v1.8.1 // indirect
	github.com/spf13/afero v1.6.0 // indirect
	github.com/spf13/cast v1.4.1 // indirect
	github.com/spf13/jwalterweatherman v1.1.0 // indirect
	github.com/src-d/gcfg v1.4.0 // indirect
	github.com/subosito/gotenv v1.2.0 // indirect
	github.com/vbatts/tar-split v0.11.2 // indirect
	github.com/xanzy/ssh-agent v0.3.1 // indirect
	github.com/xeipuuv/gojsonpointer v0.0.0-20180127040702-4e3ac2762d5f // indirect
	github.com/xeipuuv/gojsonreference v0.0.0-20180127040603-bd5ef7bd5415 // indirect
	github.com/xeipuuv/gojsonschema v1.2.0 // indirect
	github.com/xlab/treeprint v0.0.0-20181112141820-a009c3971eca // indirect
	github.com/xtgo/uuid v0.0.0-20140804021211-a0b114877d4c // indirect
	go.opencensus.io v0.23.0 // indirect
	go.starlark.net v0.0.0-20200306205701-8dd3e2ee1dd5 // indirect
	golang.org/x/mod v0.5.1 // indirect
	golang.org/x/sync v0.0.0-20210220032951-036812b2e83c // indirect
	golang.org/x/sys v0.0.0-20220422013727-9388b58f7150 // indirect
	golang.org/x/term v0.0.0-20220411215600-e5f449aeb171 // indirect
	golang.org/x/text v0.3.7 // indirect
	golang.org/x/time v0.0.0-20210723032227-1f47c861a9ac // indirect
	google.golang.org/appengine v1.6.7 // indirect
	gopkg.in/gorp.v1 v1.7.2 // indirect
	gopkg.in/inf.v0 v0.9.1 // indirect
	gopkg.in/ini.v1 v1.66.2 // indirect
	gopkg.in/src-d/go-billy.v4 v4.3.2 // indirect
	gopkg.in/src-d/go-git.v4 v4.13.1 // indirect
	gopkg.in/warnings.v0 v0.1.2 // indirect
	gopkg.in/yaml.v3 v3.0.0-20210107192922-496545a6307b // indirect
	k8s.io/apiextensions-apiserver v0.23.1 // indirect
	k8s.io/apiserver v0.23.1 // indirect
	k8s.io/component-base v0.23.1 // indirect
	k8s.io/klog/v2 v2.30.0 // indirect
	k8s.io/kube-openapi v0.0.0-20211115234752-e816edb12b65 // indirect
	k8s.io/utils v0.0.0-20211116205334-6203023598ed // indirect
	oras.land/oras-go v1.1.0 // indirect
	sigs.k8s.io/json v0.0.0-20211020170558-c049b76a60c6 // indirect
	sigs.k8s.io/kustomize/api v0.10.1 // indirect
	sigs.k8s.io/kustomize/kyaml v0.13.0 // indirect
	sigs.k8s.io/structured-merge-diff/v4 v4.2.1 // indirect
)
