import React, { useCallback, useState } from "react";
import styled from "styled-components";

import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Button from "components/porter/Button";
import DeleteApplicationModal from "../../expanded-app/DeleteApplicationModal";

import { useLatestRevision } from "../LatestRevisionContext";
import api from "shared/api";
import { useAppAnalytics } from "lib/hooks/useAppAnalytics";

const Settings: React.FC = () => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { porterApp, clusterId, projectId } = useLatestRevision();
  const { updateAppStep } = useAppAnalytics(porterApp.name);

  const githubWorkflowFilename = `porter_stack_${porterApp.name}.yml`;

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
  }, [githubWorkflowFilename, porterApp.name, clusterId, projectId]);

  const onDelete = useCallback(
    async (deleteWorkflow?: boolean) => {
      try {
        await api.deletePorterApp(
          "<token>",
          {},
          {
            cluster_id: clusterId,
            project_id: projectId,
            name: porterApp.name,
          }
        );

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

          updateAppStep({ step: "stack-deletion", deleteWorkflow: true });
          return;
        }

        updateAppStep({ step: "stack-deletion", deleteWorkflow: false });
      } catch (err) {}
    },
    [githubWorkflowFilename, porterApp.name, clusterId, projectId]
  );

  return (
    <StyledSettingsTab>
      <Text size={16}>Delete "{porterApp.name}"</Text>
      <Spacer y={1} />
      <Text color="helper">
        Delete this application and all of its resources.
      </Text>
      <Spacer y={1} />
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
        />
      )}
    </StyledSettingsTab>
  );
};

export default Settings;

const StyledSettingsTab = styled.div`
  width: 100%;
`;
