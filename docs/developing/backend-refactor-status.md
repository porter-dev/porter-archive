| Path                                                                                                                        | Assigned To | Changed schema? | CLI Updated | Frontend Updated |
| --------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------- | ----------- | ---------------- |
| <li>- [x] `GET /api/auth/check`                                                                                             | AB          | yes             |             | yes              |
| <li>- [x] `GET /api/capabilities`                                                                                           | AB          |                 |             | yes              |
| <li>- [x] `GET /api/cli/login`                                                                                              | AB          |                 | yes         |                  |
| <li>- [x] `GET /api/cli/login/exchange`                                                                                     | AB          |                 | yes         |                  |
| <li>- [x] `GET /api/email/verify/finalize`                                                                                  | AB          |                 |             |                  |
| <li>- [x] `POST /api/email/verify/initiate`                                                                                 | AB          |                 |             | yes              |
| <li>- [ ] `GET /api/integrations/cluster`                                                                                   |             |                 |             |                  |
| <li>- [ ] `GET /api/integrations/github-app/access`                                                                         |             |                 |             |                  |
| <li>- [ ] `GET /api/integrations/github-app/authorize`                                                                      |             |                 |             |                  |
| <li>- [ ] `GET /api/integrations/github-app/install`                                                                        |             |                 |             |                  |
| <li>- [ ] `GET /api/integrations/github-app/oauth`                                                                          |             |                 |             |                  |
| <li>- [ ] `POST /api/integrations/github-app/webhook`                                                                       |             |                 |             |                  |
| <li>- [ ] `GET /api/integrations/helm`                                                                                      |             |                 |             |                  |
| <li>- [ ] `GET /api/integrations/registry`                                                                                  |             |                 |             |                  |
| <li>- [ ] `GET /api/integrations/repo`                                                                                      |             |                 |             |                  |
| <li>- [ ] `GET /api/livez`                                                                                                  |             |                 |             |                  |
| <li>- [x] `POST /api/login`                                                                                                 | AB          |                 |             | yes              |
| <li>- [x] `POST /api/logout`                                                                                                | AB          |                 |             | yes              |
| <li>- [ ] `GET /api/oauth/digitalocean/callback`                                                                            |             |                 |             |                  |
| <li>- [ ] `GET /api/oauth/github-app/callback`                                                                              |             |                 |             |                  |
| <li>- [ ] `GET /api/oauth/github/callback`                                                                                  |             |                 |             |                  |
| <li>- [ ] `GET /api/oauth/google/callback`                                                                                  |             |                 |             |                  |
| <li>- [ ] `GET /api/oauth/login/github`                                                                                     |             |                 |             |                  |
| <li>- [ ] `GET /api/oauth/login/google`                                                                                     |             |                 |             |                  |
| <li>- [ ] `GET /api/oauth/projects/{project_id}/digitalocean`                                                               |             |                 |             |                  |
| <li>- [ ] `GET /api/oauth/projects/{project_id}/github`                                                                     |             |                 |             |                  |
| <li>- [ ] `GET /api/oauth/projects/{project_id}/slack`                                                                      |             |                 |             |                  |
| <li>- [ ] `GET /api/oauth/slack/callback`                                                                                   |             |                 |             |                  |
| <li>- [x] `POST /api/password/reset/finalize`                                                                               | AB          |                 |             | yes              |
| <li>- [x] `POST /api/password/reset/initiate`                                                                               | AB          |                 |             | yes              |
| <li>- [x] `POST /api/password/reset/verify`                                                                                 | AB          |                 |             | yes              |
| <li>- [x] `POST /api/projects`                                                                                              | AB          |                 |             | yes              |
| <li>- [ ] `DELETE /api/projects/{project_id}`                                                                               |             |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}`                                                                                  | AB          |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/ci/actions/create`                                                               |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/ci/actions/generate`                                                             |             |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/clusters`                                                                         | AB          |                 |             | yes              |
| <li>- [ ] `POST /api/projects/{project_id}/clusters`                                                                        |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/clusters/candidates`                                                             |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/clusters/candidates`                                                              |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/clusters/candidates/{candidate_id}/resolve`                                      |             |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/clusters/{cluster_id}`                                                            | AB          |                 |             | yes              |
| <li>- [ ] `POST /api/projects/{project_id}/clusters/{cluster_id}`                                                           |             |                 |             |                  |
| <li>- [ ] `DELETE /api/projects/{project_id}/clusters/{cluster_id}`                                                         |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/clusters/{cluster_id}/node/{node_name}`                                           |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/clusters/{cluster_id}/nodes`                                                      |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/collaborators`                                                                    |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/delete/{name}`                                                                   |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/deploy/addon/{name}/{version}`                                                   |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/deploy/{name}/{version}`                                                         |             |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/gitrepos`                                                                         | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/gitrepos/{installation_id}/repos`                                                 | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/branches`                  | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/buildpack/detect` | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/contents`         | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/procfile`         | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/gitrepos/{installation_id}/repos/{kind}/{owner}/{name}/{branch}/tarball_url`      | AB          |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/helmrepos`                                                                        |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/helmrepos`                                                                       |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/helmrepos/{helm_id}/charts`                                                       |             |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/infra`                                                                            | AS          |                 |             | yes              |
| <li>- [ ] `POST /api/projects/{project_id}/infra/{infra_id}/docr/destroy`                                                   |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/infra/{infra_id}/doks/destroy`                                                   |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/infra/{infra_id}/ecr/destroy`                                                    |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/infra/{infra_id}/eks/destroy`                                                    |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/infra/{infra_id}/gke/destroy`                                                    |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/infra/{infra_id}/test/destroy`                                                   |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/integrations/aws`                                                                |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/integrations/aws/{aws_integration_id}/overwrite`                                 |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/integrations/basic`                                                              |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/integrations/gcp`                                                                |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/integrations/oauth`                                                               |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/invites`                                                                          |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/invites`                                                                         |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/invites/{invite_id}`                                                             |             |                 |             |                  |
| <li>- [ ] `DELETE /api/projects/{project_id}/invites/{invite_id}`                                                           |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/invites/{token}`                                                                  |             |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/k8s/configmap`                                                                    | AS          | yes             |             | yes              |
| <li>- [x] `POST /api/projects/{project_id}/k8s/configmap/create`                                                            | AS          | yes             |             | yes              |
| <li>- [x] `DELETE /api/projects/{project_id}/k8s/configmap/delete`                                                          | AS          | yes             |             | yes              |
| <li>- [x] `GET /api/projects/{project_id}/k8s/configmap/list`                                                               | AS          | yes             |             | yes              |
| <li>- [x] `POST /api/projects/{project_id}/k8s/configmap/rename`                                                            | AS          | yes             |             | yes              |
| <li>- [x] `POST /api/projects/{project_id}/k8s/configmap/update`                                                            | AS          | yes             |             | yes              |
| <li>- [X] `GET /api/projects/{project_id}/k8s/helm_releases`                                                                | AB          | yes             |             |                  |
| <li>- [ ] `DELETE /api/projects/{project_id}/k8s/jobs/{namespace}/{name}`                                                   |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/k8s/jobs/{namespace}/{name}/pods`                                                 |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/k8s/jobs/{namespace}/{name}/stop`                                                |             |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/k8s/kubeconfig`                                                                   | AS          | yes             | yes         |                  |
| <li>- [x] `GET /api/projects/{project_id}/k8s/metrics`                                                                      | AS          | yes             |             | yes              |
| <li>- [x] `GET /api/projects/{project_id}/k8s/namespaces`                                                                   | AS          | yes             |             | yes              |
| <li>- [x] `POST /api/projects/{project_id}/k8s/namespaces/create`                                                           | AS          | yes             |             | yes              |
| <li>- [x] `DELETE /api/projects/{project_id}/k8s/namespaces/delete`                                                         | AS          | yes             |             | yes              |
| <li>- [ ] `GET /api/projects/{project_id}/k8s/pods`                                                                         |             |                 |             |                  |
| <li>- [ ] `DELETE /api/projects/{project_id}/k8s/pods/{namespace}/{name}`                                                   |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/k8s/pods/{namespace}/{name}/events/list`                                          |             |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/k8s/prometheus/detect`                                                            | AS          | yes             |             | yes              |
| <li>- [x] `GET /api/projects/{project_id}/k8s/prometheus/ingresses`                                                         | AS          | yes             |             | yes              |
| <li>- [ ] `POST /api/projects/{project_id}/k8s/subdomain`                                                                   |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/k8s/{namespace}/ingress/{name}`                                                   |             |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/k8s/{namespace}/pod/{name}/logs`                                                  | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/k8s/{kind}/status`                                                                | AB          | yes             |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/k8s/{namespace}/{name}/jobs/status`                                               |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/k8s/{namespace}/{chart}/{release_name}/jobs`                                      |             |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/policy`                                                                           | AS          |                 |             | yes              |
| <li>- [ ] `POST /api/projects/{project_id}/provision/docr`                                                                  |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/provision/doks`                                                                  |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/provision/ecr`                                                                   |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/provision/eks`                                                                   |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/provision/gcr`                                                                   |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/provision/gke`                                                                   |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/provision/test`                                                                  |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/provision/{kind}/{infra_id}/logs`                                                 |             |                 |             |                  |
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
| <li>- [ ] `POST /api/projects/{project_id}/releases/image/update/batch`                                                     |             |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/releases/{name}/history`                                                          | AB          |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/releases/{name}/notifications`                                                   |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/releases/{name}/notifications`                                                    |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/releases/{name}/rollback`                                                        |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/releases/{name}/upgrade`                                                         |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/releases/{name}/webhook_token`                                                    |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/releases/{name}/webhook_token`                                                   |             |                 |             |                  |
| <li>- [x] `GET /api/projects/{project_id}/releases/{name}/{revision}`                                                       | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/releases/{name}/{revision}/components`                                            | AB          |                 |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/releases/{name}/{revision}/controllers`                                           | AB          | yes             |             |                  |
| <li>- [X] `GET /api/projects/{project_id}/releases/{name}/{revision}/pods/all`                                              | AB          |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/roles`                                                                            |             |                 |             |                  |
| <li>- [ ] `POST /api/projects/{project_id}/roles/{user_id}`                                                                 |             |                 |             |                  |
| <li>- [ ] `DELETE /api/projects/{project_id}/roles/{user_id}`                                                               |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/slack_integrations`                                                               |             |                 |             |                  |
| <li>- [ ] `GET /api/projects/{project_id}/slack_integrations/exists`                                                        |             |                 |             |                  |
| <li>- [ ] `DELETE /api/projects/{project_id}/slack_integrations/{slack_integration_id}`                                     |             |                 |             |                  |
| <li>- [ ] `GET /api/readyz`                                                                                                 |             |                 |             |                  |
| <li>- [X] `GET /api/templates`                                                                                              | AB          |                 |             |                  |
| <li>- [X] `GET /api/templates/upgrade_notes/{name}/{version}`                                                               | AB          | yes             |             |                  |
| <li>- [X] `GET /api/templates/{name}/{version}`                                                                             | AB          |                 |             |                  |
| <li>- [x] `POST /api/users`                                                                                                 | AB          | yes             |             | yes              |
| <li>- [x] `GET /api/users/{user_id}`                                                                                        | AB          | yes             |             | yes              |
| <li>- [x] `DELETE /api/users/{user_id}`                                                                                     | AB          | yes             |             |                  |
| <li>- [x] `GET /api/users/{user_id}/projects`                                                                               | AB          | yes             |             | yes              |
| <li>- [ ] `POST /api/webhooks/deploy/{token}`                                                                               |             |                 |             |                  |
