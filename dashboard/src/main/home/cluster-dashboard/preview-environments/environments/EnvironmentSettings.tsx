import DocsHelper from "components/DocsHelper";
import CheckboxRow from "components/form-components/CheckboxRow";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import Loading from "components/Loading";
import SaveButton from "components/SaveButton";
import Modal from "main/home/modals/Modal";
import React, { useContext, useReducer, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled, { css, keyframes } from "styled-components";
import BranchFilterSelector from "../components/BranchFilterSelector";
import { Environment } from "../types";

const EnvironmentSettings = ({ environmentId }: { environmentId: string }) => {
  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );

  const [show, toggle] = useReducer((prev) => !prev, false);

  const [environment, setEnvironment] = useState<Environment>();

  const [isNewCommentsDisabled, setIsNewCommentsDisabled] = useState(false);

  const [deploymentMode, setDeploymentMode] = useState<Environment["mode"]>(
    "auto"
  );
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);

  const [saveStatus, setSaveStatus] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const getEnvironment = async () => {
    return api.getEnvironment<Environment>(
      "<token>",
      {},
      {
        project_id: currentProject.id,
        cluster_id: currentCluster.id,
        environment_id: Number(environmentId),
      }
    );
  };

  const getBranches = async () => {
    return api.getBranches<string[]>(
      "<token>",
      {},
      {
        project_id: environment.project_id,
        git_repo_id: environment.git_installation_id,
        kind: "github",
        owner: environment.git_repo_owner,
        name: environment.git_repo_name,
      }
    );
  };

  const handleToggleCommentStatus = async (currentlyDisabled: boolean) => {
    setIsNewCommentsDisabled(!currentlyDisabled);
  };

  const handleOpen = async () => {
    setIsLoading(true);

    try {
      const [environmentResponse, branchesResponse] = await Promise.allSettled([
        getEnvironment(),
        getBranches(),
      ]);

      if (environmentResponse.status === "fulfilled") {
        const environment = environmentResponse.value.data;

        setEnvironment(environment);
        setIsNewCommentsDisabled(environment.disable_new_comments);
        setDeploymentMode(environment.mode);
        setSelectedBranches(environment.git_repo_branches.filter(Boolean));
      } else {
        throw new Error("Failed to get environment");
      }

      if (branchesResponse.status === "fulfilled") {
        const branches = branchesResponse.value.data;
        setAvailableBranches(branches);
      } else {
        throw new Error("Failed to get branches");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      toggle();
    }
  };

  const handleSave = () => {
    setSaveStatus("loading");

    api
      .updateEnvironment(
        "<token>",
        {
          mode: deploymentMode,
          new_comment_enabled: !isNewCommentsDisabled,
          git_repo_branches: selectedBranches,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          environment_id: Number(environmentId),
        }
      )
      .then(() => {
        setSaveStatus("successful");
        setTimeout(() => {
          setSaveStatus(""), toggle();
        }, 2000);
        toggle();
      })
      .catch((error) => {
        setCurrentError(error);
        setSaveStatus("Couldn't update the environment, please try again.");
      })
      .finally(() => {
        setSaveStatus("");
      });
  };

  return (
    <>
      <SettingsButton type="button" onClick={handleOpen} isLoading={isLoading}>
        <i className="material-icons">settings</i>
      </SettingsButton>
      {show && (
        <Modal
          height="fit-content"
          onRequestClose={toggle}
          title={`Settings for ${environment.git_repo_owner}/${environment.git_repo_name}`}
        >
          <>
            {/* Add branch selector (probably will have to create a new component that lets the user pick multiple) */}
            <Heading>Allowed Branches</Heading>
            <Helper>
              If the pull request has a base branch included in this list, it
              will be allowed to be deployed.
            </Helper>
            <BranchFilterSelector
              value={selectedBranches}
              onChange={setSelectedBranches}
              options={availableBranches}
            />

            <Heading>Automatic pull request deployments</Heading>
            <Helper>
              If you enable this option, the new pull requests will be
              automatically deployed.
            </Helper>
            {/* Add checkbox to change deployment mode (auto | manaul) */}
            <CheckboxWrapper>
              <CheckboxRow
                label="Enable automatic deploys"
                checked={deploymentMode === "auto"}
                toggle={() =>
                  setDeploymentMode((prev) =>
                    prev === "auto" ? "manual" : "auto"
                  )
                }
                wrapperStyles={{
                  disableMargin: true,
                }}
              />
              <DocsHelper
                disableMargin
                tooltipText="Automatically create a Preview Environment for each new pull request in the repository. By default, preview environments must be manually created per-PR."
              />
            </CheckboxWrapper>

            <Heading>Disable new comments for new deployments</Heading>
            <Helper>
              When enabled new comments will not be created for new deployments.
              Instead the last comment will be updated.
            </Helper>
            <CheckboxWrapper>
              <CheckboxRow
                label="Disable new comments for deployments"
                checked={isNewCommentsDisabled}
                toggle={() => handleToggleCommentStatus(isNewCommentsDisabled)}
                wrapperStyles={{
                  disableMargin: true,
                }}
              />
              <DocsHelper
                disableMargin
                tooltipText="When checked, comments for every new deployment are disabled. Instead, the most recent comment is updated each time."
                placement="top-end"
              />
            </CheckboxWrapper>
            <SubmitButton
              onClick={handleSave}
              clearPosition
              text="Save"
              statusPosition="right"
              status={saveStatus}
            />
          </>
        </Modal>
      )}
    </>
  );
};

export default EnvironmentSettings;

const rotatingAnimation = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const iconAnimation = css`
  animation: ${rotatingAnimation} 1s linear infinite;
`;

const SettingsButton = styled.button<{ isLoading: boolean }>`
  background: none;
  color: white;
  border: none;
  margin-left: 10px;
  cursor: pointer;
  > i {
    font-size: 20px;
    ${({ isLoading }) => (isLoading ? iconAnimation : "")}
  }
`;

const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 20px;
`;

const SubmitButton = styled(SaveButton)`
  margin-top: 20px;
  align-items: flex-end;
`;
