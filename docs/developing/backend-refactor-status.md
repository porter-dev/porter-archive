| Path                                                                                                                        | Assigned To | Changed schema? | CLI Updated | Frontend Updated |
| --------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------- | ----------- | ---------------- |
| <li>- [x] `GET /api/auth/check`                                                                                             | AB          | yes             |             | yes              |
| <li>- [x] `GET /api/capabilities`                                                                                           | AB          |                 |             | yes              |
| <li>- [x] `GET /api/cli/login`                                                                                              | AB          |                 | yes         |                  |
| <li>- [x] `GET /api/cli/login/exchange`                                                                                     | AB          |                 | yes         |                  |
| <li>- [x] `GET /api/email/verify/finalize`                                                                                  | AB          |                 |             |                  |
| <li>- [x] `POST /api/email/verify/initiate`                                                                                 | AB          |                 |             | yes              |
| <li>- [X] `GET /api/integrations/cluster`                                                                                   | AB          |                 |             |                  |
| <li>- [X] `GET /api/integrations/github-app/access`                                                                         | AB          |                 |             |                  |
| <li>- [X] `GET /api/integrations/github-app/authorize`                                                                      | AB          |                 |             |                  |
| <li>- [X] `GET /api/integrations/github-app/install`                                                                        | AB          |                 |             |                  |
| <li>- [X] `GET /api/integrations/github-app/oauth`                                                                          | AB          |                 |             |                  |
| <li>- [X] `POST /api/integrations/github-app/webhook`                                                                       | AB          |                 |             |                  |
| <li>- [X] `GET /api/integrations/helm`                                                                                      | AB          |                 |             |                  |
| <li>- [X] `GET /api/integrations/registry`                                                                                  | AB          |                 |             |                  |
| <li>- [X] `GET /api/integrations/repo`                                                                                      | N/A         |                 |             |                  |
| <li>- [X] `GET /api/livez`                                                                                                  | AB          |                 |             |                  |
| <li>- [x] `POST /api/login`                                                                                                 | AB          |                 |             | yes              |
| <li>- [x] `POST /api/logout`                                                                                                | AB          |                 |             | yes              |
| <li>- [X] `GET /api/oauth/digitalocean/callback`                                                                            | AB          |                 |             |                  |
| <li>- [X] `GET /api/oauth/github-app/callback`                                                                              | AB          |                 |             |                  |
| <li>- [X] `GET /api/oauth/github/callback`                                                                                  | AB          |                 |             |                  |
| <li>- [X] `GET /api/oauth/google/callback`                                                                                  | AB          |                 |             |                  |
| <li>- [X] `GET /api/oauth/login/github`                                                                                     | AB          |                 |             |                  |
| <li>- [X] `GET /api/oauth/login/google`                                                                                     | AB          |                 |             |                  |
| <li>- [X] `GET /api/oauth/projects/{project_id}/digitalocean`                                                               | AB          |                 |             |                  |
| <li>- [X] `GET /api/oauth/projects/{project_id}/github`                                                                     | N/A         |                 |             |                  |
| <li>- [x] `GET /api/oauth/projects/{project_id}/slack`                                                                      | AS          | yes             |             | yes              |
| <li>- [x] `GET /api/oauth/slack/callback`                                                                                   | AS          |                 |             | yes              |
| <li>- [x] `POST /api/password/reset/finalize`                                                                               | AB          |                 |             | yes              |
| <li>- [x] `POST /api/password/reset/initiate`                                                                               | AB          |                 |             | yes              |
| <li>- [x] `POST /api/password/reset/verify`                                                                                 | AB          |                 |             | yes              |
| <li>- [x] `POST /api/projects`                                                                                              | AB          |                 |             | yes              |
| <li>- [ ] `DELETE /api/projects/{project_id}`                                                                               |             |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}`                                                                                  | AB          |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/ci/actions/create`                                                               |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/ci/actions/generate`                                                             |             |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/clusters`                                                                         | AB          |                 |             | yes              |
| <li>- [X] `POST /api/projects/{project_id}/clusters`                                                                        | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/clusters/candidates`                                                             | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/clusters/candidates`                                                              | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/clusters/candidates/{candidate_id}/resolve`                                      | AB          |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/clusters/{cluster_id}`                                                            | AB          |                 |             | yes              |
| <li>- [X] `POST /api/projects/{project_id}/clusters/{cluster_id}`                                                           | AB          |                 |             |                  |
| <li>- [ ] `DELETE /api/projects/{project_id}/clusters/{cluster_id}`                                                         |             |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/clusters/{cluster_id}/node/{node_name}`                                           | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/clusters/{cluster_id}/nodes`                                                      | AB          |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/collaborators`                                                                    | AS          |                 |             | yes              |
| <li>- [X] `POST /api/projects/{project_id}/delete/{name}`                                                                   | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/deploy/addon/{name}/{version}`                                                   | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/deploy/{name}/{version}`                                                         | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/gitrepos`                                                                         | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/gitrepos/{installation_id}/repos`                                                 | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/branches`                  | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/buildpack/detect` | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/contents`         | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/procfile`         | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/tarball_url`      | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/helmrepos`                                                                        | N/A         |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/helmrepos`                                                                       | N/A         |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/helmrepos/{helm_id}/charts`                                                       | N/A         |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/infra`                                                                            | AS          |                 |             | yes              |
| <li>- [x] `POST /api/projects/{project_id}/integrations/aws`                                                                | AS          |                 | yes         | yes              |
| <li>- [x] `POST /api/projects/{project_id}/integrations/aws/{aws_integration_id}/overwrite`                                 | AS          | yes             |             | yes              |
| <li>- [x] `POST /api/projects/{project_id}/integrations/basic`                                                              | AS          |                 | yes         |                  |
| <li>- [x] `POST /api/projects/{project_id}/integrations/gcp`                                                                | AS          |                 | yes         | yes              |
| <li>- [x] `GET /api/projects/{project_id}/integrations/oauth`                                                               | AS          |                 | yes         | yes              |
| <li>- [X] `POST /api/projects/{project_id}/infra/{infra_id}/docr/destroy`                                                   | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/infra/{infra_id}/doks/destroy`                                                   | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/infra/{infra_id}/ecr/destroy`                                                    | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/infra/{infra_id}/eks/destroy`                                                    | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/infra/{infra_id}/gke/destroy`                                                    | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/infra/{infra_id}/test/destroy`                                                   | AB          |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/invites`                                                                          | AS          |                 |             | yes              |
| <li>- [x] `POST /api/projects/{project_id}/invites`                                                                         | AS          |                 |             | yes              |
| <li>- [x] `POST /api/projects/{project_id}/invites/{invite_id}`                                                             | AS          |                 |             | yes              |
| <li>- [x] `DELETE /api/projects/{project_id}/invites/{invite_id}`                                                           | AS          |                 |             | yes              |
| <li>- [x] `GET /api/projects/{project_id}/invites/{token}`                                                                  | AS          |                 |             | yes              |
| <li>- [x] `GET /api/projects/{project_id}/k8s/configmap`                                                                    | AS          | yes             |             | yes              |
| <li>- [x] `POST /api/projects/{project_id}/k8s/configmap/create`                                                            | AS          | yes             |             | yes              |
| <li>- [x] `DELETE /api/projects/{project_id}/k8s/configmap/delete`                                                          | AS          | yes             |             | yes              |
| <li>- [x] `GET /api/projects/{project_id}/k8s/configmap/list`                                                               | AS          | yes             |             | yes              |
| <li>- [x] `POST /api/projects/{project_id}/k8s/configmap/rename`                                                            | AS          | yes             |             | yes              |
| <li>- [x] `POST /api/projects/{project_id}/k8s/configmap/update`                                                            | AS          | yes             |             | yes              |
| <li>- [X] `GET /api/projects/{project_id}/k8s/helm_releases`                                                                | AB          | yes             |             |                  |
| <li>- [X] `DELETE /api/projects/{project_id}/k8s/jobs/{namespace}/{name}`                                                   | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/k8s/jobs/{namespace}/{name}/pods`                                                 | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/k8s/jobs/{namespace}/{name}/stop`                                                | AB          |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/k8s/kubeconfig`                                                                   | AS          | yes             | yes         |                  |
| <li>- [x] `GET /api/projects/{project_id}/k8s/metrics`                                                                      | AS          | yes             |             | yes              |
| <li>- [x] `GET /api/projects/{project_id}/k8s/namespaces`                                                                   | AS          | yes             |             | yes              |
| <li>- [x] `POST /api/projects/{project_id}/k8s/namespaces/create`                                                           | AS          | yes             |             | yes              |
| <li>- [x] `DELETE /api/projects/{project_id}/k8s/namespaces/delete`                                                         | AS          | yes             |             | yes              |
| <li>- [X] `GET /api/projects/{project_id}/k8s/pods`                                                                         | AB          | !removed        |             |                  |
| <li>- [X] `DELETE /api/projects/{project_id}/k8s/pods/{namespace}/{name}`                                                   | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/k8s/pods/{namespace}/{name}/events/list`                                          | AB          |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/k8s/prometheus/detect`                                                            | AS          | yes             |             | yes              |
| <li>- [x] `GET /api/projects/{project_id}/k8s/prometheus/ingresses`                                                         | AS          | yes             |             | yes              |
| <li>- [X] `POST /api/projects/{project_id}/k8s/subdomain`                                                                   | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/k8s/{namespace}/ingress/{name}`                                                   | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/k8s/{namespace}/pod/{name}/logs`                                                  | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/k8s/{kind}/status`                                                                | AB          | yes             |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/k8s/{namespace}/{name}/jobs/status`                                               | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/k8s/{namespace}/{chart}/{release_name}/jobs`                                      | AB          |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/policy`                                                                           | AS          |                 |             | yes              |
| <li>- [X] `POST /api/projects/{project_id}/provision/docr`                                                                  | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/provision/doks`                                                                  | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/provision/ecr`                                                                   | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/provision/eks`                                                                   | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/provision/gcr`                                                                   | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/provision/gke`                                                                   | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/provision/test`                                                                  | N/A         |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/provision/{kind}/{infra_id}/logs`                                                 | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/registries`                                                                      | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/registries`                                                                       | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/registries/dockerhub/token`                                                       | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/registries/docr/token`                                                            | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/registries/ecr/{region}/token`                                                    | AB          | yes             |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/registries/gcr/token`                                                             | AB          |                 |             |                  |
| <li>- [X] `DELETE /api/projects/{project_id}/registries/{registry_id}`                                                      | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/registries/{registry_id}`                                                        | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/registries/{registry_id}/repositories`                                            | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/registries/{registry_id}/repositories/*`                                          | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/registries/{registry_id}/repository`                                             | AB          |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/releases`                                                                         | AS          | yes             |             | yes              |
| <li>- [X] `POST /api/projects/{project_id}/releases/image/update/batch`                                                     | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/releases/{name}/history`                                                          | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/releases/{name}/notifications`                                                   | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/releases/{name}/notifications`                                                    | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/releases/{name}/rollback`                                                        | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/releases/{name}/upgrade`                                                         | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/releases/{name}/webhook_token`                                                    | AB          |                 |             |                  |
| <li>- [X] `POST /api/projects/{project_id}/releases/{name}/webhook_token`                                                   | AB          |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/releases/{name}/{revision}`                                                       | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/releases/{name}/{revision}/components`                                            | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/releases/{name}/{revision}/controllers`                                           | AB          | yes             |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/releases/{name}/{revision}/pods/all`                                              | AB          |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/roles`                                                                            | AS          |                 |             | yes              |
| <li>- [x] `POST /api/projects/{project_id}/roles/{user_id}`                                                                 | AS          | yes             |             | yes              |
| <li>- [x] `DELETE /api/projects/{project_id}/roles/{user_id}`                                                               | AS          | yes             |             | yes              |
| <li>- [x] `GET /api/projects/{project_id}/slack_integrations`                                                               | AS          |                 |             | yes              |
| <li>- [x] `GET /api/projects/{project_id}/slack_integrations/exists`                                                        | AS          |                 |             | yes              |
| <li>- [x] `DELETE /api/projects/{project_id}/slack_integrations/{slack_integration_id}`                                     | AS          |                 |             | yes              |
| <li>- [X] `GET /api/readyz`                                                                                                 | AB          |                 |             |                  |
| <li>- [X] `GET /api/templates`                                                                                              | AB          |                 |             |                  |
| <li>- [X] `GET /api/templates/upgrade_notes/{name}/{version}`                                                               | AB          | yes             |             |                  |
| <li>- [X] `GET /api/templates/{name}/{version}`                                                                             | AB          |                 |             |                  |
| <li>- [x] `POST /api/users`                                                                                                 | AB          | yes             |             | yes              |
| <li>- [x] `GET /api/users/{user_id}`                                                                                        | AB          | yes             |             | yes              |
| <li>- [x] `DELETE /api/users/{user_id}`                                                                                     | AB          | yes             |             |                  |
| <li>- [x] `GET /api/users/{user_id}/projects`                                                                               | AB          | yes             |             | yes              |
| <li>- [X] `POST /api/webhooks/deploy/{token}`                                                                               | AB          |                 |             |                  |
