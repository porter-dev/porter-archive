import React, { useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useFormContext } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";
import { z } from "zod";

import UploadArea from "components/form-components/UploadArea";
import Button from "components/porter/Button";
import Checkbox from "components/porter/Checkbox";
import Container from "components/porter/Container";
import { ControlledInput } from "components/porter/ControlledInput";
import Input from "components/porter/Input";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import { useAppAnalytics } from "lib/hooks/useAppAnalytics";
import { useCloudSqlSecret } from "lib/hooks/useCloudSqlSecret";
import { type PorterAppFormData } from "lib/porter-apps";

import api from "shared/api";
import { Context } from "shared/Context";
import { useDeploymentTarget } from "shared/DeploymentTargetContext";
import document from "assets/document.svg";

import DeleteApplicationModal from "../../expanded-app/DeleteApplicationModal";
import { useLatestRevision } from "../LatestRevisionContext";
import ExportAppModal from "./ExportAppModal";
import Webhooks from "./Webhooks";

const Settings: React.FC = () => {
  const { currentProject, currentCluster } = useContext(Context);
  const queryClient = useQueryClient();
  const history = useHistory();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const { porterApp, clusterId, projectId } = useLatestRevision();
  const { updateAppStep } = useAppAnalytics();
  const [isDeleting, setIsDeleting] = useState(false);
  const { control, register, watch } = useFormContext<PorterAppFormData>();
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
    const checkWorkflowExists = async (): Promise<void> => {
      const exists = await workflowFileExists();
      if (!exists) {
        setGithubWorkflowFilename("");
      }
    };

    checkWorkflowExists().catch(() => {});
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
          }).catch(() => {});
          history.push("/apps");
          return;
        }

        updateAppStep({
          step: "stack-deletion",
          deleteWorkflow: false,
          appName: porterApp.name,
        }).catch(() => {});
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
      <Text size={16}>Enable application auto-rollback</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        If enabled, Porter will automatically trigger a rollback to the last
        successful deployment if any services of the new deployment fail to
        deploy.
      </Text>
      <Spacer y={0.5} />
      <Controller
        name={`app.autoRollback`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            checked={value.enabled}
            toggleChecked={() => {
              onChange({
                ...value,
                enabled: !value.enabled,
              });
            }}
            disabled={value.readOnly}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
          >
            <Text color="helper">Auto-rollback enabled</Text>
          </Checkbox>
        )}
      />
      {currentCluster?.cloud_provider === "GCP" && <CloudSql />}
      <Spacer y={1} />
      {currentCluster?.cloud_provider === "AWS" &&
        currentProject?.efs_enabled && (
          <>
            <Text size={16}>Enable shared storage (EFS)</Text>
            <Spacer y={0.5} />
            <Text color="helper">
              If enabled, Porter will mount a shared storage drive in your
              cluster, accessible by all services of this app. This drive is
              accessible at /data/efs/{porterApp.name}
            </Text>
            <Spacer y={0.5} />
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
                    });
                  }}
                  disabled={value.readOnly}
                  disabledTooltip={
                    "You may only edit this field in your porter.yaml."
                  }
                >
                  <Text color="helper">EFS Storage enabled</Text>
                </Checkbox>
              )}
            />
            <Spacer y={1} />
          </>
        )}
      <Text size={16}>Application webhooks</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Configure custom webhooks to trigger on different deployment events.
      </Text>
      <Spacer y={1} />
      <Webhooks />
      <Spacer y={1} />
      <Text size={16}>Export &quot;{porterApp.name}&quot;</Text>
      <Spacer y={0.5} />
      <Text color="helper">Export this application as Porter YAML.</Text>
      <a
        href="https://docs.porter.run/deploy/configuration-as-code/overview"
        target="_blank"
        rel="noreferrer"
      >
        &nbsp;(?)
      </a>
      <Spacer y={0.5} />
      <div
        style={{ width: "fit-content", fontSize: "14px" }}
        onClick={() => {
          setIsExportModalOpen(true);
        }}
      >
        <Tag>
          <TagIcon src={document} />
          Export
        </Tag>
      </div>
      {isExportModalOpen && (
        <ExportAppModal
          closeModal={() => {
            setIsExportModalOpen(false);
          }}
        />
      )}
      <Spacer y={0.75} />
      <Text size={16}>Delete &quot;{porterApp.name}&quot;</Text>
      <Spacer y={0.5} />
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
          closeModal={() => {
            setIsDeleteModalOpen(false);
          }}
          githubWorkflowFilename={githubWorkflowFilename}
          deleteApplication={onDelete}
          loading={isDeleting}
        />
      )}
    </StyledSettingsTab>
  );
};

export default Settings;

const CloudSql: React.FC = () => {
  const { register, control, watch, setValue } =
    useFormContext<PorterAppFormData>();
  const { currentDeploymentTarget } = useDeploymentTarget();
  const [created, setCreated] = useState(false);

  if (!currentDeploymentTarget) {
    return null;
  }

  const cloudSqlEnabled = watch(`app.cloudSql.enabled`);
  const appName = watch(`app.name.value`);

  const secretExists = useCloudSqlSecret({
    projectId: currentDeploymentTarget.project_id,
    deploymentTargetId: currentDeploymentTarget.id,
    appName,
  });

  const handleLoadJSON = async (data: string): Promise<void> => {
    try {
      await api.createCloudSqlSecret(
        "<token>",
        {
          b64_service_account_json: btoa(data),
        },
        {
          project_id: currentDeploymentTarget.project_id,
          deployment_target_id: currentDeploymentTarget.id,
          app_name: appName,
        }
      );
      setCreated(true);
    } catch (err) {}
  };

  const enabled = watch(`app.cloudSql.enabled`);

  useEffect(() => {
    if (enabled) {
      setValue(
        `app.cloudSql.serviceAccountJsonSecret`,
        `cloudsql-secret-${appName}`
      );
    }
  }, [enabled]);

  return (
    <>
      <Spacer y={1} />
      <Text>CloudSQL proxy</Text>
      <Spacer y={0.25} />
      <Text color="helper">
        When enabled, Porter will automatically deploy a CloudSQL proxy with
        your application, allowing all your services to securely access your
        CloudSQL instance.
      </Text>
      <Spacer y={0.5} />
      <Controller
        name={`app.cloudSql.enabled`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            checked={value}
            toggleChecked={() => {
              onChange(!value);
            }}
          >
            <Text color="helper">Enable CloudSQL Proxy</Text>
          </Checkbox>
        )}
      />
      {cloudSqlEnabled && (
        <>
          <Spacer y={0.75} />
          <Text color="helper">Connection Name</Text>
          <Spacer y={0.25} />
          <ControlledInput
            type="text"
            placeholder="ex: project:us-east1:instance"
            {...register(`app.cloudSql.connectionName`)}
          />
          <Spacer y={0.5} />
          <Text color="helper">Port</Text>
          <Spacer y={0.25} />
          <Controller
            name={`app.cloudSql.dbPort`}
            control={control}
            render={({ field: { value, onChange } }) => (
              <Input
                placeholder={"ex: 5432"}
                value={value.toString()}
                setValue={(x: string) => {
                  onChange(z.coerce.number().parse(x));
                }}
              />
            )}
          />
          <Spacer y={0.5} />
          <Container row>
            <Text color={"helper"}>Service Account JSON</Text>
            <Spacer inline x={0.5} />
            {secretExists && created && (
              <i className="material-icons">done</i>
            )}{" "}
          </Container>
          <UploadArea
            setValue={(x: string) => {
              handleLoadJSON(x).catch(() => {});
            }}
            label=""
            placeholder={
              (secretExists
                ? "To update your credentials, "
                : "To enable the CloudSql Proxy, ") +
              "drag a GCP Service Account JSON here, or click to browse."
            }
            width="100%"
            height="100%"
            isRequired={false}
          />
        </>
      )}
    </>
  );
};

const StyledSettingsTab = styled.div`
  width: 100%;
`;

const TagIcon = styled.img`
  margin-top: 2px;
  height: 12px;
  margin-right: 3px;
`;
