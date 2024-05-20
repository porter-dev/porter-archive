import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import { match, P } from "ts-pattern";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Image from "components/porter/Image";
import Input from "components/porter/Input";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import BranchSelector from "main/home/app-dashboard/build-settings/BranchSelector";
import { BackButton } from "main/home/infrastructure-dashboard/forms/CreateClusterForm";
import { type Environment } from "lib/environments/types";
import { useGithubInstallation } from "lib/hooks/useGithubInstallation";

import api from "shared/api";
import { Context } from "shared/Context";
import external from "assets/external-link.svg";

import { TemplateSelector } from "./setup-app/AppSelector";

type Props = {
  onClose: () => void;
};

export const DeployNewModal: React.FC<Props> = ({ onClose }) => {
  const { currentProject, currentCluster } = useContext(Context);

  const [step, setStep] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Environment | null>(
    null
  );
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const { installation } = useGithubInstallation();

  useEffect(() => {
    if (selectedTemplate) {
      setStep(1);
    }
    if (selectedBranch) {
      setStep(3);
    }
  }, [selectedTemplate, selectedBranch]);

  const repo = useMemo(() => {
    if (selectedTemplate?.apps[0]?.build?.repo) {
      return new URL(selectedTemplate?.apps[0]?.build?.repo).pathname.substring(
        1
      );
    }
    return "";
  }, [selectedTemplate]);

  const { data: exists, isLoading } = useQuery(
    ["getBranchContents", currentProject?.id, repo, selectedBranch],
    async () => {
      try {
        if (!currentProject || !repo || !selectedBranch) {
          return null;
        }

        const res = await api.getBranchContents(
          "<token",
          {
            dir: `./.github/workflows/porter_manual_preview_${selectedTemplate?.name}.yml`,
            force_default_branch: true,
          },
          {
            project_id: currentProject.id,
            git_repo_id: installation?.installation_id ?? 0,
            kind: "github",
            owner: repo.split("/")[0],
            name: repo.split("/")[1],
            branch: selectedBranch,
          }
        );

        if (res.data) {
          return true;
        }

        return false;
      } catch (err) {
        return false;
      }
    },
    {
      enabled: !!selectedBranch && !!repo,
      refetchInterval: 3000,
    }
  );

  console.log("exists", exists)

  const addActionToRepo = useCallback(async () => {
    try {
      setActionLoading(true);
      if (
        !currentProject ||
        !currentCluster ||
        !repo ||
        !selectedBranch ||
        !selectedTemplate
      ) {
        return;
      }

      const res = await api.createSecretAndOpenGitHubPullRequest(
        "<token>",
        {
          github_app_installation_id: installation?.installation_id ?? 0,
          github_repo_owner: repo.split("/")[0],
          github_repo_name: repo.split("/")[1],
          branch: selectedBranch,
          open_pr: true,
          manual_workflow_filename: `.github/workflows/porter_preview_manual_${selectedTemplate?.name}.yml`,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          stack_name: selectedTemplate?.name,
        }
      );

      if (res.data?.url) {
        window.open(res.data.url, "_blank");
      }
    } catch (err) {
    } finally {
      setActionLoading(false);
    }
  }, [
    currentProject,
    currentCluster,
    repo,
    selectedBranch,
    selectedTemplate,
    installation,
  ]);

  const buttonStatus = useMemo(() => {
    if (isLoading && selectedBranch) {
      return "loading";
    }

    return "";
  }, [isLoading, selectedBranch]);

  return (
    <Modal closeModal={onClose} width="750px">
      <Text size={16}>Manually Deploy Preview</Text>
      <Spacer height="15px" />
      <Text color="helper">
        Select the preview template and the branch you would like to spin up a
        new preview environment for. The manual deploy Github Action must be set
        up in your repository in order to proceed.
      </Text>
      <Spacer y={0.5} />
      <VerticalSteps
        currentStep={step}
        steps={[
          <>
            <Text size={16}>Choose a preview template</Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Select the preview template you would like to deploy
            </Text>
            <Spacer y={0.5} />
            {match(selectedTemplate)
              .with(P.nullish, () => {
                return (
                  <TemplateSelector
                    selectedTemplate={selectedTemplate}
                    setSelectedTemplate={setSelectedTemplate}
                  />
                );
              })
              .otherwise(() => (
                <>
                  <Input
                    disabled={true}
                    label="GitHub repository:"
                    width="100%"
                    value={repo}
                    setValue={() => {}}
                    placeholder=""
                  />
                  <Spacer y={0.5} />
                  <BackButton
                    width="155px"
                    onClick={() => {
                      setSelectedTemplate(null);
                      setStep(0);
                    }}
                  >
                    <i className="material-icons">keyboard_backspace</i>
                    Select template
                  </BackButton>
                </>
              ))}
          </>,
          <>
            <Text size={16}>Choose a branch</Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Select the branch you would like to deploy the preview environment
              for
            </Text>
            <Spacer y={0.5} />
            {selectedTemplate &&
              match(selectedBranch)
                .with(P.nullish, () => (
                  <ExpandedWrapper>
                    <BranchSelector
                      {...(selectedBranch && {
                        currentBranch: selectedBranch,
                      })}
                      setBranch={(b) => {
                        setSelectedBranch(b);
                      }}
                      repo_name={
                        selectedTemplate?.apps[0]?.build?.repo
                          ? new URL(
                              selectedTemplate?.apps[0]?.build?.repo
                            ).pathname.substring(1)
                          : ""
                      }
                      git_repo_id={installation?.installation_id ?? 0}
                    />
                  </ExpandedWrapper>
                ))
                .otherwise((b) => (
                  <>
                    <Input
                      disabled={true}
                      label="GitHub branch:"
                      type="text"
                      width="100%"
                      value={b}
                      setValue={() => {}}
                      placeholder=""
                    />
                    <Spacer y={0.5} />
                    <BackButton
                      width="150px"
                      onClick={() => {
                        setSelectedBranch(null);
                        setStep(1);
                      }}
                    >
                      <i className="material-icons">keyboard_backspace</i>
                      Select branch
                    </BackButton>
                  </>
                ))}
          </>,
          <>
            {!selectedBranch || isLoading || exists ? (
              <Button
                onClick={() => {
                  console.log("Deploying");
                }}
                status={buttonStatus}
                loadingText="Loading..."
              >
                Deploy
              </Button>
            ) : (
              <Container>
                <Text color="error">
                  The manual deploy Github Action must be set up in your
                  repository in order to proceed.
                </Text>
                <Spacer y={0.25} />
                <Text color="helper">
                  This action can be run against any branch in your repository
                  when triggered
                </Text>
                <Spacer y={0.5} />
                <Button
                  onClick={() => {
                    void addActionToRepo();
                  }}
                  status={actionLoading ? "loading" : ""}
                  loadingText="Loading..."
                >
                  <Container row>
                    <Image src={external} size={12} />
                    <Spacer inline x={0.5} />
                    <Text>Add Action</Text>
                  </Container>
                </Button>
              </Container>
            )}
          </>,
        ]}
      />
    </Modal>
  );
};

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  max-height: 275px;
`;
