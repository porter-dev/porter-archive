# Frontend roadmap status

In this page you will be able to see how the roadmap status is going! Right now we have a work in progress list of components that needs to be tested and worked on!

Keep in mind that this is still not the final version, and this document will be updated to also divide the components by their correspondant module to wich they have to be migrated to!

| Component                     | Current path                                                                        | Migrated to functional | Tested up | Cleaned up |
| ----------------------------- | ----------------------------------------------------------------------------------- | ---------------------- | --------- | ---------- |
| App                           | `dashboard/src/App.tsx`                                                             |                        |           |            |
| MainWrapper                   | `dashboard/src/main/MainWrapper.tsx`                                                |                        |           |            |
| ContextProvider               | `dashboard/src/shared/Context.tsx`                                                  |                        |           |            |
| Main                          | `dashboard/src/main/Main.tsx`                                                       |                        |           |            |
| Login                         | `dashboard/src/main/auth/Login.tsx`                                                 |                        |           |            |
| Register                      | `dashboard/src/main/auth/Register.tsx`                                              |                        |           |            |
| ResetPasswordFinalize         | `dashboard/src/main/auth/ResetPasswordFinalize.tsx`                                 |                        |           |            |
| ResetPasswordInit             | `dashboard/src/main/auth/ResetPasswordInit.tsx`                                     |                        |           |            |
| VerifyEmail                   | `dashboard/src/main/auth/VerifyEmail.tsx`                                           |                        |           |            |
| CurrentError                  | `dashboard/src/main/CurrentError.tsx`                                               |                        |           |            |
| Home                          | `dashboard/src/main/home/Home.tsx`                                                  |                        |           |            |
| NoClusterPlaceholder          | `dashboard/src/main/home/NoClusterPlaceholder.tsx`                                  |                        |           |            |
| ClusterSection                | `dashboard/src/main/home/sidebar/ClusterSection.tsx`                                |                        |           |            |
| Drawer                        | `dashboard/src/main/home/sidebar/Drawer.tsx`                                        |                        |           |            |
| ProjectSection                | `dashboard/src/main/home/sidebar/ProjectSection.tsx`                                |                        |           |            |
| ProjectSectionContainer       | `dashboard/src/main/home/sidebar/ProjectSectionContainer.tsx`                       |                        |           |            |
| Sidebar                       | `dashboard/src/main/home/sidebar/Sidebar.tsx`                                       |                        |           |            |
| AWSFormSection                | `dashboard/src/main/home/provisioner/AWSFormSection.tsx`                            |                        |           |            |
| DOFormSection                 | `dashboard/src/main/home/provisioner/DOFormSection.tsx`                             |                        |           |            |
| ExistingClusterSection        | `dashboard/src/main/home/provisioner/ExistingClusterSection.tsx`                    |                        |           |            |
| GCPFormSection                | `dashboard/src/main/home/provisioner/GCPFormSection.tsx`                            |                        |           |            |
| InfraStatuses                 | `dashboard/src/main/home/provisioner/InfraStatuses.tsx`                             |                        |           |            |
| Provisioner                   | `dashboard/src/main/home/provisioner/Provisioner.tsx`                               |                        |           |            |
| ProvisionerLogs               | `dashboard/src/main/home/provisioner/ProvisionerLogs.tsx`                           |                        |           |            |
| ProvisionerSettings           | `dashboard/src/main/home/provisioner/ProvisionerSettings.tsx`                       |                        |           |            |
| InvitePage                    | `dashboard/src/main/home/project-settings/InviteList.tsx`                           | ✅                     |           |            |
| ProjectSettings               | `dashboard/src/main/home/project-settings/ProjectSettings.tsx`                      |                        |           |            |
| NewProject                    | `dashboard/src/main/home/new-project/NewProject.tsx`                                |                        |           |            |
| Feedback                      | `dashboard/src/main/home/navbar/Feedback.tsx`                                       |                        |           |            |
| Navbar                        | `dashboard/src/main/home/navbar/Navbar.tsx`                                         |                        |           |            |
| AccountSettingsModal          | `dashboard/src/main/home/modals/AccountSettingsModal.tsx`                           |                        |           |            |
| ClusterInstructionsModal      | `dashboard/src/main/home/modals/ClusterInstructionsModal.tsx`                       |                        |           |            |
| DeleteNamespaceModal          | `dashboard/src/main/home/modals/DeleteNamespaceModal.tsx`                           |                        |           |            |
| EditInviteOrCollaboratorModal | `dashboard/src/main/home/modals/EditInviteOrCollaboratorModal.tsx`                  |                        |           |            |
| EnvEditorModal                | `dashboard/src/main/home/modals/EnvEditorModal.tsx`                                 |                        |           |            |
| IntegrationsInstructionsModal | `dashboard/src/main/home/modals/IntegrationsInstructionsModal.tsx`                  |                        |           |            |
| IntegrationsModal             | `dashboard/src/main/home/modals/IntegrationsModal.tsx`                              |                        |           |            |
| LoadEnvGroupModal             | `dashboard/src/main/home/modals/LoadEnvGroupModal.tsx`                              |                        |           |            |
| Modal                         | `dashboard/src/main/home/modals/Modal.tsx`                                          |                        |           |            |
| NamespaceModal                | `dashboard/src/main/home/modals/NamespaceModal.tsx`                                 |                        |           |            |
| UpdateClusterModal            | `dashboard/src/main/home/modals/UpdateClusterModal.tsx`                             |                        |           |            |
| Launch                        | `dashboard/src/main/home/launch/Launch.tsx`                                         |                        |           |            |
| LaunchFlow                    | `dashboard/src/main/home/launch/launch-flow/LaunchFlow.tsx`                         |                        |           |            |
| SettingsPage                  | `dashboard/src/main/home/launch/launch-flow/SettingsPage.tsx`                       |                        |           |            |
| SourcePage                    | `dashboard/src/main/home/launch/launch-flow/SourcePage.tsx`                         |                        |           |            |
| ExpandedTemplate              | `dashboard/src/main/home/launch/expanded-template/ExpandedTemplate.tsx`             |                        |           |            |
| TemplateInfo                  | `dashboard/src/main/home/launch/expanded-template/TemplateInfo.tsx`                 |                        |           |            |
| SlackIntegrationList          | `dashboard/src/main/home/integrations/SlackIntegrationList.tsx`                     | ✅                     |           |            |
| Integrations                  | `dashboard/src/main/home/integrations/Integrations.tsx`                             | ✅                     |           |            |
| IntegrationRow                | `dashboard/src/main/home/integrations/IntegrationRow.tsx`                           |                        |           |            |
| IntegrationList               | `dashboard/src/main/home/integrations/IntegrationList.tsx`                          |                        |           |            |
| IntegrationCategories         | `dashboard/src/main/home/integrations/IntegrationCategories.tsx`                    | ✅                     |           |            |
| DockerHubForm                 | `dashboard/src/main/home/integrations/edit-integration/DockerHubForm.tsx`           |                        |           |            |
| ECRForm                       | `dashboard/src/main/home/integrations/edit-integration/ECRForm.tsx`                 |                        |           |            |
| EditIntegrationForm           | `dashboard/src/main/home/integrations/edit-integration/EditIntegrationForm.tsx`     |                        |           |            |
| EKSForm                       | `dashboard/src/main/home/integrations/edit-integration/EKSForm.tsx`                 |                        |           |            |
| GCRForm                       | `dashboard/src/main/home/integrations/edit-integration/GCRForm.tsx`                 |                        |           |            |
| GKEForm                       | `dashboard/src/main/home/integrations/edit-integration/GKEForm.tsx`                 |                        |           |            |
| CreateIntegrationForm         | `dashboard/src/main/home/integrations/create-integration/CreateIntegrationForm.tsx` |                        |           |            |
| DockerHubForm                 | `dashboard/src/main/home/integrations/create-integration/DockerHubForm.tsx`         |                        |           |            |
| ECRForm                       | `dashboard/src/main/home/integrations/create-integration/ECRForm.tsx`               |                        |           |            |
| EKSForm                       | `dashboard/src/main/home/integrations/create-integration/EKSForm.tsx`               |                        |           |            |
| GCRForm                       | `dashboard/src/main/home/integrations/create-integration/GCRForm.tsx`               |                        |           |            |
| GKEForm                       | `dashboard/src/main/home/integrations/create-integration/GKEForm.tsx`               |                        |           |            |
| ClusterList                   | `dashboard/src/main/home/dashboard/ClusterList.tsx`                                 |                        |           |            |
| ClusterPlaceholder            | `dashboard/src/main/home/dashboard/ClusterPlaceholder.tsx`                          |                        |           |            |
| ClusterPlaceholderContainer   | `dashboard/src/main/home/dashboard/ClusterPlaceholderContainer.tsx`                 |                        |           |            |
| Dashboard                     | `dashboard/src/main/home/dashboard/Dashboard.tsx`                                   |                        |           |            |
| PipelinesSection              | `dashboard/src/main/home/dashboard/PipelinesSection.tsx`                            |                        |           |            |
| ExpandedChartWrapper          | `dashboard/src/main/home/cluster-dashboard/expanded-chart/ExpandedChartWrapper.tsx` | ✅                     |           |            |
| ExpandedChart                 | `dashboard/src/main/home/cluster-dashboard/expanded-chart/ExpandedChart.tsx`        | ✅                     |           |            |
