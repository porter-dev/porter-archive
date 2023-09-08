Setup kind cluster with 2 projects, both pointing to the same cluster. 1 project with simplified view and validate featureflag enabled, 1 with non-simplified view

Setup SQL:

```sql
INSERT INTO projects (name, simplified_view_enabled, validate_apply_v2) values ('simplified', TRUE, TRUE), ('legacy', FALSE, FALSE);
INSERT INTO roles (kind, user_id, project_id) values('admin', 1, 1),('admin', 1, 2);

INSERT INTO "public"."kube_integrations"("created_at","updated_at","deleted_at","mechanism","user_id","project_id","client_certificate_data","client_key_data","token","username","password","kubeconfig")
SELECT
"created_at","updated_at","deleted_at","mechanism","user_id","project_id","client_certificate_data","client_key_data","token","username","password","kubeconfig"
FROM kube_integrations where id = 1;
UPDATE kube_integrations set project_id=1 where id = 2;
INSERT INTO "public"."kube_integrations"("created_at","updated_at","deleted_at","mechanism","user_id","project_id","client_certificate_data","client_key_data","token","username","password","kubeconfig")
SELECT
"created_at","updated_at","deleted_at","mechanism","user_id","project_id","client_certificate_data","client_key_data","token","username","password","kubeconfig"
FROM kube_integrations where id = 1;
UPDATE kube_integrations set project_id=2 where id = 3;

INSERT INTO "public"."clusters"("created_at","updated_at","deleted_at","auth_mechanism","project_id","agent_integration_enabled","name","vanity_name","server","cluster_location_of_origin","tls_server_name","insecure_skip_tls_verify","proxy_url","user_location_of_origin","user_impersonate","user_impersonate_groups","infra_id","notifications_disabled","preview_envs_enabled","aws_cluster_id","status","provisioned_by","cloud_provider","cloud_provider_credential_identifier","kube_integration_id","o_id_c_integration_id","gcp_integration_id","aws_integration_id","do_integration_id","azure_integration_id","token_cache_id","certificate_authority_data","monitor_helm_releases")
SELECT "created_at","updated_at","deleted_at","auth_mechanism","project_id","agent_integration_enabled","name","vanity_name","server","cluster_location_of_origin","tls_server_name","insecure_skip_tls_verify","proxy_url","user_location_of_origin","user_impersonate","user_impersonate_groups","infra_id","notifications_disabled","preview_envs_enabled","aws_cluster_id","status","provisioned_by","cloud_provider","cloud_provider_credential_identifier","kube_integration_id","o_id_c_integration_id","gcp_integration_id","aws_integration_id","do_integration_id","azure_integration_id","token_cache_id","certificate_authority_data","monitor_helm_releases"
from clusters where id = 1;
update clusters set project_id = 2, kube_integration_id = 3 where id = 2;

INSERT INTO "public"."clusters"("created_at","updated_at","deleted_at","auth_mechanism","project_id","agent_integration_enabled","name","vanity_name","server","cluster_location_of_origin","tls_server_name","insecure_skip_tls_verify","proxy_url","user_location_of_origin","user_impersonate","user_impersonate_groups","infra_id","notifications_disabled","preview_envs_enabled","aws_cluster_id","status","provisioned_by","cloud_provider","cloud_provider_credential_identifier","kube_integration_id","o_id_c_integration_id","gcp_integration_id","aws_integration_id","do_integration_id","azure_integration_id","token_cache_id","certificate_authority_data","monitor_helm_releases")
SELECT "created_at","updated_at","deleted_at","auth_mechanism","project_id","agent_integration_enabled","name","vanity_name","server","cluster_location_of_origin","tls_server_name","insecure_skip_tls_verify","proxy_url","user_location_of_origin","user_impersonate","user_impersonate_groups","infra_id","notifications_disabled","preview_envs_enabled","aws_cluster_id","status","provisioned_by","cloud_provider","cloud_provider_credential_identifier","kube_integration_id","o_id_c_integration_id","gcp_integration_id","aws_integration_id","do_integration_id","azure_integration_id","token_cache_id","certificate_authority_data","monitor_helm_releases"
from clusters where id = 1;
update clusters set project_id = 1, kube_integration_id = 2 where id = 1;

insert into deployment_targets (id, cluster_id, project_id, selector, selector_type) values (gen_random_uuid(), 1, 1, 'default', 'NAMESPACE'),(gen_random_uuid(), 2, 2, 'default', 'NAMESPACE');

/** connect registry **/
INSERT INTO "public"."aws_assume_role_chains"(id, "project_id","source_arn","target_arn","external_id")
VALUES
(gen_random_uuid(), 1,E'arn:aws:iam::026281491146:role/OrganizationAccountAccessRole',E'arn:aws:iam::026281491146:role/porter-manager',E'f4dfb0ab-2120-4ca1-a78b-d0fe07f38daa'),
(gen_random_uuid(), 1,E'arn:aws:iam::975032674314:user/stefan',E'arn:aws:iam::026281491146:role/OrganizationAccountAccessRole',E''),
(gen_random_uuid(), 2,E'arn:aws:iam::026281491146:role/OrganizationAccountAccessRole',E'arn:aws:iam::026281491146:role/porter-manager',E'f4dfb0ab-2120-4ca1-a78b-d0fe07f38daa'),
(gen_random_uuid(), 2,E'arn:aws:iam::975032674314:user/stefan',E'arn:aws:iam::026281491146:role/OrganizationAccountAccessRole',E'');

INSERT INTO registries(name, url, project_id) values ('first', 'https://026281491146.dkr.ecr.us-east-1.amazonaws.com', 1), ('second', 'https://026281491146.dkr.ecr.us-east-1.amazonaws.com', 2);

```

Pull helm values from existing helm chart (Run all in `porter/local`)

`helm get values nginxa > non-umbrella.yaml`

`porter apply -f porter.yaml`

## New Attempt: 1

- Create empty umbrella chart release `helm install -n porter-stack-appc appc ./chart` -> creates empty umbrella with a hello-porter charts
- Get values on `helm -n porter-stack-appc get values appc > umbrella-values.yaml`
- Create app with legacy chart `helm install porter porter/web -f non-umbrella.yaml --namespace porter-stack-appc`
- Get legacy chart's values `helm -n porter-stack-appc get values porter > legacy.yaml`
- Indent legacy values to match umbrella charts values (key should be the chart's name .i.e `porter-web`) into a new file called `umbrella-values.yaml`

- retag legacy chart
  `app.kubernetes.io/name` label should be web
  `meta.helm.sh/release-name` annotation needs to be the name of the app before web

example:

given an existing app called porter-web, we would need:
`app.kubernetes.io/name=web`
`meta.helm.sh/release-name=porter`
This means that when we create the new umbrella chart with no dependencies, it should be called a combination of these names

```
KIND=deployment
NAME=porter-web
RELEASE_NAME=appc
NAMESPACE=porter-stack-appc
kubectl annotate $KIND $NAME meta.helm.sh/release-name=$RELEASE_NAME -n $NAMESPACE --overwrite
kubectl annotate $KIND $NAME meta.helm.sh/release-namespace=$NAMESPACE -n $NAMESPACE --overwrite
kubectl label $KIND $NAME app.kubernetes.io/managed-by=Helm -n $NAMESPACE
```

- Add legacy web chart as a dependency to the Chart.yaml

```yaml
dependencies:
  - name: web
    version: "0.136.0"
    repository: "https://charts.getporter.dev"
    alias: "porter-web"
```

- Upgrade new umbrella chart with new values file `helm upgrade -n porter-stack-appc appc ./chart -f umbrella-values.yaml`

Outcome: created a new revision of the umbrella chart with all the same values in the same namespace, instantiating the legacy app under its control. Legacy app was left running still. Helm list still showed legacy app. Unable to change port on UI

## New Attempt: 2

- Create app with legacy chart `helm install porter porter/web -f non-umbrella.yaml --namespace porter-stack-appc`
- ensure no deps in chart.yaml, then create hello-world porter app `helm -n porter-stack-appc template new-umbrella chart --set addAnnotations=true,addLabels=true | k apply -n porter-stack-appc -f - `

```
helm -n porter-stack-appc template new-umbrella chart | k apply -n porter-stack-appc -f -

```

<!-- KIND=deployment
NAME=new-umbrella-web
RELEASE_NAME=new-umbrella
NAMESPACE=porter-stack-appc
kubectl annotate $KIND $NAME meta.helm.sh/release-name=$RELEASE_NAME -n $NAMESPACE --overwrite
kubectl annotate $KIND $NAME meta.helm.sh/release-namespace=$NAMESPACE -n $NAMESPACE --overwrite
kubectl label $KIND $NAME app.kubernetes.io/managed-by=Helm -n $NAMESPACE -->

## Attempt 3 - not using web and umbrella, trying only on pod for now

Install foo with kubectl, not helm, then import it into helm, then run a revision update.
Edit the chart templates before upgrade to see changes in the pod

```
KIND=deployment
NAME=foo
TARGET_RELEASE_NAME=foo
NAMESPACE=default

helm template $TARGET_RELEASE_NAME testchart | kubectl create -f -

kubectl annotate $KIND $NAME meta.helm.sh/release-name=$TARGET_RELEASE_NAME -n $NAMESPACE --overwrite
kubectl annotate $KIND $NAME meta.helm.sh/release-namespace=$NAMESPACE -n $NAMESPACE --overwrite
kubectl label $KIND $NAME app.kubernetes.io/managed-by=Helm -n $NAMESPACE

helm install foo testchart
helm upgrade foo testchart
```

Create `bar`, another helm chart, then attempt to import it into foo, and run an update on foo

```
helm install bar testchart
helm upgrade bar testchart

KIND=deployment
NAME=bar
TARGET_RELEASE_NAME=foo
NAMESPACE=default

kubectl annotate $KIND $NAME meta.helm.sh/release-name=$TARGET_RELEASE_NAME -n $NAMESPACE --overwrite
kubectl annotate $KIND $NAME meta.helm.sh/release-namespace=$NAMESPACE -n $NAMESPACE --overwrite
kubectl label $KIND $NAME app.kubernetes.io/managed-by=Helm -n $NAMESPACE

# Running upgrade bar here, reverts the changes to the labels and annotations

helm upgrade foo testchart
```

DOESNT WORK BECAUSE OF RELEASE NAMES (SUSPECTED).
Trying again with umbrella importing dependencies

```bash
helm dependency build testumbrella

KIND=deployment
NAME=foo
TARGET_RELEASE_NAME=foo
NAMESPACE=default

helm template $TARGET_RELEASE_NAME testumbrella --set foo.MyName=foo | kubectl create -f -

kubectl annotate $KIND $NAME meta.helm.sh/release-name=$TARGET_RELEASE_NAME -n $NAMESPACE --overwrite
kubectl annotate $KIND $NAME meta.helm.sh/release-namespace=$NAMESPACE -n $NAMESPACE --overwrite
kubectl label $KIND $NAME app.kubernetes.io/managed-by=Helm -n $NAMESPACE

helm install foo testumbrella --set foo.MyName=foo

# make changes to depchart

helm dependency update testumbrella
helm upgrade foo testumbrella

### foo can be updated within the umbrella chart. Lets try create and import bar
helm install bar testchart
helm upgrade bar testchart

KIND=deployment
NAME=bar
kubectl annotate $KIND $NAME meta.helm.sh/release-name=$TARGET_RELEASE_NAME -n $NAMESPACE --overwrite
kubectl annotate $KIND $NAME meta.helm.sh/release-namespace=$NAMESPACE -n $NAMESPACE --overwrite
kubectl label $KIND $NAME app.kubernetes.io/managed-by=Helm -n $NAMESPACE

# Add bar to the chart
helm upgrade foo testumbrella --set bar.MyName=bar --reuse-values
```

Custom script with web charts - change this

```bash
helm dependency build newumbrella

KIND=deployment
EXISTING_RELEASE_NAME=legacy
RELEASE_TYPE=web
NAME=$EXISTING_RELEASE_NAME-$RELEASE_TYPE
TARGET_RELEASE_NAME=umbrella-chart
NAMESPACE=default

# create umbrella chart which has hello-porter
helm install $TARGET_RELEASE_NAME newumbrella

# add exising chart as dep on Chart.yaml, with alias set as the old release name
helm dependency update newumbrella

# get existing values and indent the values to have the existing release name as a key which matches Chart.yaml
helm get values $EXISTING_RELEASE_NAME > existing_values.yaml


##### OTHER KINDS
# KIND=deployment
# kubectl annotate $KIND $NAME meta.helm.sh/release-name=$TARGET_RELEASE_NAME -n $NAMESPACE --overwrite
# kubectl annotate $KIND $NAME meta.helm.sh/release-namespace=$NAMESPACE -n $NAMESPACE --overwrite
# kubectl label $KIND $NAME app.kubernetes.io/managed-by=Helm -n $NAMESPACE

#### deployment selectors cant be changed. We need to create a new deployment which goes into the existing service, then delete the existing deployment, then run an update on helm, then delete the manually created deployment

KIND=svc
kubectl annotate $KIND $NAME meta.helm.sh/release-name=$TARGET_RELEASE_NAME -n $NAMESPACE --overwrite
kubectl annotate $KIND $NAME meta.helm.sh/release-namespace=$NAMESPACE -n $NAMESPACE --overwrite
kubectl label $KIND $NAME app.kubernetes.io/managed-by=Helm -n $NAMESPACE

KIND=sa
kubectl annotate $KIND $NAME meta.helm.sh/release-name=$TARGET_RELEASE_NAME -n $NAMESPACE --overwrite
kubectl annotate $KIND $NAME meta.helm.sh/release-namespace=$NAMESPACE -n $NAMESPACE --overwrite
kubectl label $KIND $NAME app.kubernetes.io/managed-by=Helm -n $NAMESPACE
##### OTHER KINDS END

# must delete deployments to scale up new ones as selectors are immutable

helm upgrade $TARGET_RELEASE_NAME newumbrella -f existing_values.yaml

```
