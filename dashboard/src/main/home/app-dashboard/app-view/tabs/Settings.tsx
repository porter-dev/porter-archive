import React, { useCallback, useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { useHistory } from "react-router";

import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Button from "components/porter/Button";
import DeleteApplicationModal from "../../expanded-app/DeleteApplicationModal";

import { useLatestRevision } from "../LatestRevisionContext";
import api from "shared/api";
import { useAppAnalytics } from "lib/hooks/useAppAnalytics";
import { useQueryClient } from "@tanstack/react-query";
import { Context } from "shared/Context";
import PreviewEnvironmentSettings from "./preview-environments/PreviewEnvironmentSettings";
import { Controller, useFormContext } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";
import Checkbox from "components/porter/Checkbox";

const Settings: React.FC = () => {
  const { currentProject, currentCluster } = useContext(Context);
  const queryClient = useQueryClient();
  const history = useHistory();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { porterApp, clusterId, projectId, latestProto } = useLatestRevision();
  const { updateAppStep } = useAppAnalytics();
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    control,
    setValue,
    watch
  } = useFormContext<PorterAppFormData>();
  const [githubWorkflowFilename, setGithubWorkflowFilename] = useState(
    `porter_stack_${porterApp.name}.yml`
  );

  const workflowFileExists = useCallback(async () => {
    try {
      if (
        !porterApp.git_branch ||
        !porterApp.repo_name ||
        !porterApp.git_repo_id
      ) {
        return false;
      }

      await api.getBranchContents(
        "<token>",
        {
          dir: `./.github/workflows/porter_stack_${porterApp.name}.yml`,
        },
        {
          project_id: projectId,
          git_repo_id: porterApp.git_repo_id,
          kind: "github",
          owner: porterApp.repo_name.split("/")[0],
          name: porterApp.repo_name.split("/")[1],
          branch: porterApp.git_branch,
        }
      );

      return true;
    } catch (err) {
      return false;
    }
  }, [porterApp.name, clusterId, projectId]);

  useEffect(() => {
    const checkWorkflowExists = async () => {
      const exists = await workflowFileExists();
      if (!exists) {
        setGithubWorkflowFilename("");
      }
    };

    checkWorkflowExists();
  }, [workflowFileExists]);

  const onDelete = useCallback(
    async (deleteWorkflow?: boolean) => {
      try {
        setIsDeleting(true);
        await api.deletePorterApp(
          "<token>",
          {},
          {
            cluster_id: clusterId,
            project_id: projectId,
            name: porterApp.name,
          }
        );
        void queryClient.invalidateQueries();

        if (!deleteWorkflow) {
          return;
        }

        const exists = await workflowFileExists();
        if (
          exists &&
          porterApp.git_branch &&
          porterApp.repo_name &&
          porterApp.git_repo_id
        ) {
          const res = await api.createSecretAndOpenGitHubPullRequest(
            "<token>",
            {
              github_app_installation_id: porterApp.git_repo_id,
              github_repo_owner: porterApp.repo_name.split("/")[0],
              github_repo_name: porterApp.repo_name.split("/")[1],
              branch: porterApp.git_branch,
              delete_workflow_filename: githubWorkflowFilename,
            },
            {
              project_id: projectId,
              cluster_id: clusterId,
              stack_name: porterApp.name,
            }
          );
          if (res.data?.url) {
            window.open(res.data.url, "_blank", "noreferrer");
          }

          updateAppStep({
            step: "stack-deletion",
            deleteWorkflow: true,
            appName: porterApp.name,
          });
          history.push("/apps");
          return;
        }

        updateAppStep({
          step: "stack-deletion",
          deleteWorkflow: false,
          appName: porterApp.name,
        });
        history.push("/apps");
      } catch (err) {
      } finally {
        setIsDeleting(false);
      }
    },
    [githubWorkflowFilename, porterApp.name, clusterId, projectId]
  );

  return (
    <StyledSettingsTab>
      {currentProject?.preview_envs_enabled && !!latestProto.build ? (
        <PreviewEnvironmentSettings />
      ) : null}

      {currentCluster?.cloud_provider == "AWS" && <>
        <Text size={16}>Enable shared storage across services for "{porterApp.name}"</Text>
        <Spacer y={0.5} />
        <Spacer y={.5} />
        <Controller
          name={`app.efsStorage`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Checkbox
              checked={value.enabled}
              toggleChecked={() => {
                onChange({
                  ...value,
                  enabled: !value.enabled,
                },
                );
              }}
              disabled={value.readOnly}
              disabledTooltip={
                "You may only edit this field in your porter.yaml."
              }
            >
              <Text color="helper">
                Enable EFS Storage
              </Text>
            </Checkbox>
          )} />
        <Spacer y={1} />
      </>}
      <Text size={16}>Delete "{porterApp.name}"</Text>
      <Spacer y={.5} />
      <Text color="helper">
        Delete this application and all of its resources.
      </Text>
      <Spacer y={0.5} />
      <Button
        type="button"
        onClick={() => {
          setIsDeleteModalOpen(true);
        }}
        color="#b91133"
      >
        Delete
      </Button>
      {isDeleteModalOpen && (
        <DeleteApplicationModal
          closeModal={() => setIsDeleteModalOpen(false)}
          githubWorkflowFilename={githubWorkflowFilename}
          deleteApplication={onDelete}
          loading={isDeleting}
        />
      )}
    </StyledSettingsTab>
  );
};

export default Settings;

const StyledSettingsTab = styled.div`
  width: 100%;
`;
