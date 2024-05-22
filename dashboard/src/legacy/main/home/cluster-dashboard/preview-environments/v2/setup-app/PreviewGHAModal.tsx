import React, { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Button from "legacy/components/porter/Button";
import Checkbox from "legacy/components/porter/Checkbox";
import Error from "legacy/components/porter/Error";
import ExpandableSection from "legacy/components/porter/ExpandableSection";
import Input from "legacy/components/porter/Input";
import Modal from "legacy/components/porter/Modal";
import Select from "legacy/components/porter/Select";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import YamlEditor from "legacy/components/YamlEditor";
import api from "legacy/shared/api";
import { Controller, useForm } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";
import { z } from "zod";

import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import RepositorySelector from "main/home/app-dashboard/build-settings/RepositorySelector";
import { getPreviewGithubAction } from "main/home/app-dashboard/new-app-flow/utils";
import FileSelector from "main/home/app-dashboard/validate-apply/build-settings/FileSelector";
import { Code } from "main/home/managed-addons/tabs/shared";

import { type RepoOverrides } from "../EnvTemplateContextProvider";

type PreviewGHAModalProps = {
  onClose: () => void;
  savePreviewConfig: ({ repo }: { repo?: RepoOverrides }) => Promise<void>;
  error: string;
};

const previewActionFormValidator = z.object({
  repository: z.string(),
  repoID: z.number(),
  baseBranchName: z.string(),
  porterYamlPath: z.string(),
  openPRChoice: z.enum(["open_pr", "copy", "skip"]),
});
type PreviewActionForm = z.infer<typeof previewActionFormValidator>;

export const PreviewGHAModal: React.FC<PreviewGHAModalProps> = ({
  onClose,
  savePreviewConfig,
  error,
}) => {
  const history = useHistory();
  const {
    projectId,
    clusterId,
    latestSource,
    porterApp: { name: appName },
  } = useLatestRevision();

  const [step, setStep] = useState<"repo" | "confirm">(
    latestSource.type === "github" ? "confirm" : "repo"
  );
  const [showFileSelector, setShowFileSelector] = useState<boolean>(false);
  const [changePorterYamlPath, setChangePorterYamlPath] = useState(false);

  const queryClient = useQueryClient();
  const {
    watch,
    control,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PreviewActionForm>({
    resolver: zodResolver(previewActionFormValidator),
    defaultValues: {
      repository: latestSource.git_repo_name ?? "",
      repoID: latestSource.type === "github" ? latestSource.git_repo_id : 0,
      baseBranchName: latestSource.git_branch ?? "main",
      porterYamlPath:
        latestSource.type === "github"
          ? latestSource.porter_yaml_path
          : "./porter.yaml",
      openPRChoice: "open_pr",
    },
  });

  const selectedBranch = watch("baseBranchName", "");
  const yamlPath = watch("porterYamlPath", "");

  const repository = watch("repository", "");
  const repoId = watch("repoID", 0);
  const openPRChoice = watch("openPRChoice", "open_pr");

  const { owner, name } = useMemo(() => {
    if (!repository) {
      return { owner: "", name: "" };
    }
    const [owner, name] = repository.split("/");
    return { owner, name };
  }, [repository]);

  const actionYAMLContents = useMemo(() => {
    if (!selectedBranch) {
      return "";
    }
    return getPreviewGithubAction({
      projectId,
      clusterId,
      appName,
      branch: selectedBranch,
      porterYamlPath: yamlPath,
    });
  }, [projectId, clusterId, appName, selectedBranch, yamlPath]);

  const originalSourceIsRepo = latestSource.type === "github";

  useEffect(() => {
    if (repository) {
      setStep("confirm");
    }
  }, [repository]);

  const confirmUpdate = handleSubmit(async (data) => {
    try {
      await savePreviewConfig({
        ...(data.repository && {
          repo: {
            id: data.repoID,
            fullName: data.repository,
          },
        }),
      });

      if (openPRChoice === "skip") {
        await queryClient.invalidateQueries([
          "getAppTemplate",
          projectId,
          clusterId,
          appName,
        ]);

        history.push("/preview-environments");

        return;
      }

      const res = await api.createSecretAndOpenGitHubPullRequest(
        "<token>",
        {
          github_app_installation_id: data.repoID,
          github_repo_owner: owner,
          github_repo_name: name,
          branch: selectedBranch,
          open_pr: openPRChoice === "open_pr",
          porter_yaml_path: yamlPath,
          previews_workflow_filename: `.github/workflows/porter_preview_${appName}.yml`,
        },
        {
          project_id: projectId,
          cluster_id: clusterId,
          stack_name: appName,
        }
      );

      if (res.data?.url) {
        window.open(res.data.url, "_blank");
      }

      await queryClient.invalidateQueries([
        "getAppTemplate",
        projectId,
        clusterId,
        appName,
      ]);

      history.push("/preview-environments");
    } finally {
      onClose();
    }
  });

  const renderForm = (): React.ReactNode => {
    if (openPRChoice === "skip") {
      return null;
    }

    if (step === "repo") {
      return (
        <Controller
          name="repository"
          control={control}
          render={({ field: { onChange } }) => (
            <>
              <ExpandedWrapper>
                <RepositorySelector
                  readOnly={false}
                  updatePorterApp={(pa) => {
                    onChange(pa.repo_name);
                    setValue("repoID", pa.git_repo_id ? pa.git_repo_id : 0);
                  }}
                  git_repo_name={repository}
                />
              </ExpandedWrapper>
              <DarkMatter antiHeight="-4px" />
              <Spacer y={0.5} />
            </>
          )}
        />
      );
    }

    return (
      <div style={{ height: "400px", overflowY: "auto" }}>
        <Checkbox
          checked={changePorterYamlPath}
          toggleChecked={() => {
            setChangePorterYamlPath((prev) => !prev);
          }}
        >
          <Text size={14} additionalStyles="margin-top: 1px;">
            Set new porter.yaml filepath
          </Text>
        </Checkbox>
        <Spacer y={0.5} />
        {changePorterYamlPath && (
          <>
            <Text color="helper">
              Path to <Code>porter.yaml</Code> from repository root:
            </Text>
            <Spacer y={0.5} />
            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowFileSelector(true);
              }}
            >
              <Input
                placeholder="ex: ./subdirectory/porter.yaml"
                value={yamlPath}
                width="100%"
                setValue={() => {}}
                hideCursor={true}
              />
            </div>
            {Boolean(repoId && name && showFileSelector) && (
              <Controller
                name="porterYamlPath"
                control={control}
                render={({ field: { onChange } }) => (
                  <FileSelector
                    projectId={projectId}
                    repoId={repoId}
                    repoOwner={owner}
                    repoName={name}
                    branch={selectedBranch}
                    onFileSelect={(path: string) => {
                      onChange(`./${path}`);
                      setShowFileSelector(false);
                    }}
                    isFileSelectable={(path: string) => path.endsWith(".yaml")}
                    headerText={"Select your porter.yaml:"}
                  />
                )}
              />
            )}
          </>
        )}
        <ExpandableSection
          noWrapper
          expandText="[+] Show code"
          collapseText="[-] Hide code"
          Header={
            <ModalHeader>{`./github/workflows/porter_preview_${appName}.yml`}</ModalHeader>
          }
          isInitiallyExpanded
          spaced
          copy={actionYAMLContents}
          ExpandedSection={
            <YamlEditor
              value={actionYAMLContents}
              readOnly={true}
              height="300px"
            />
          }
        />
      </div>
    );
  };

  return (
    <Modal closeModal={onClose} width="750px">
      <Text size={16}>Continuous Integration (CI) with GitHub Actions</Text>
      <Spacer height="15px" />
      <Text color="helper">
        Use the following GitHub action to automatically deploy new preview apps
        for {appName} every time a pull request is opened or updated.
      </Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Porter can open a PR for you to approve and merge this file into your
        repository, or you can add it yourself. If you allow Porter to open a
        PR, you will be redirected to the PR in a new tab after submitting
        below.
      </Text>
      <Spacer y={1} />
      {step === "repo" || originalSourceIsRepo ? (
        <>
          <Controller
            name="openPRChoice"
            control={control}
            render={({ field: { onChange } }) => (
              <Select
                options={[
                  {
                    label: originalSourceIsRepo
                      ? "I authorize Porter to open a PR on my behalf (recommended)"
                      : "Setup previews for an existing repository by opening a PR",
                    value: "open_pr",
                  },
                  {
                    label:
                      "Setup previews but I will copy the file into my repository myself",
                    value: "copy",
                  },
                  {
                    label: "Save preview configuration and skip CI setup",
                    value: "skip",
                  },
                ]}
                setValue={(x: string) => {
                  if (x === "open_pr") {
                    onChange("open_pr");
                  }
                  if (x === "copy") {
                    onChange("copy");
                  }
                  if (x === "skip") {
                    onChange("skip");
                  }
                }}
                value={openPRChoice}
                width="100%"
              />
            )}
          />
          <Spacer y={0.5} />
        </>
      ) : null}
      {renderForm()}
      <Spacer y={1} />

      <div
        style={{ width: "100%", display: "flex", justifyContent: "flex-end" }}
      >
        <div
          style={{ display: "flex", alignItems: "center", columnGap: "5px" }}
        >
          {step === "confirm" && !originalSourceIsRepo ? (
            <Button
              onClick={() => {
                setStep("repo");
              }}
              width={"110px"}
              color="#b91133"
            >
              Back
            </Button>
          ) : null}
          <Button
            onClick={() => {
              if (step === "repo" && openPRChoice !== "skip") {
                setStep("confirm");
                return;
              }

              void confirmUpdate();
            }}
            width={"110px"}
            loadingText={"Submitting..."}
            status={
              isSubmitting ? (
                "loading"
              ) : error ? (
                <Error message={error} />
              ) : undefined
            }
            disabled={
              (openPRChoice !== "skip" && step === "repo" && !repository) ||
              isSubmitting
            }
          >
            {step === "repo" && openPRChoice !== "skip" ? "Continue" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const ModalHeader = styled.div`
  font-weight: 500;
  font-size: 14px;
  font-family: monospace;
  height: 40px;
  display: flex;
  align-items: center;
`;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  max-height: 275px;
`;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-15px"};
`;
