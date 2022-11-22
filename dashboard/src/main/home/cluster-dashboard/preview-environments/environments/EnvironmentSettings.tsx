import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";
import React, { useContext, useEffect, useMemo, useState } from "react";
import api from "shared/api";
import styled from "styled-components";
import { useParams } from "react-router";
import DashboardHeader from "../../DashboardHeader";
import PullRequestIcon from "assets/pull_request_icon.svg";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import CheckboxRow from "components/form-components/CheckboxRow";
import { Environment, EnvironmentDeploymentMode } from "../types";
import SaveButton from "components/SaveButton";
import _ from "lodash";
import { Context } from "shared/Context";
import PageNotFound from "components/PageNotFound";
import Banner from "components/Banner";
import InputRow from "components/form-components/InputRow";
import Modal from "main/home/modals/Modal";
import { useRouting } from "shared/routing";
import NamespaceLabels, { KeyValueType } from "../components/NamespaceLabels";
import BranchFilterSelector from "../components/BranchFilterSelector";

const EnvironmentSettings = () => {
  const router = useRouting();
  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(false);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationPrompt, setDeleteConfirmationPrompt] = useState("");
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [environment, setEnvironment] = useState<Environment>();
  const [saveStatus, setSaveStatus] = useState("");
  const [newCommentsDisabled, setNewCommentsDisabled] = useState(false);
  const [
    deploymentMode,
    setDeploymentMode,
  ] = useState<EnvironmentDeploymentMode>("manual");
  const [namespaceLabels, setNamespaceLabels] = useState<KeyValueType[]>([]);
  const {
    environment_id: environmentId,
    repo_name: repoName,
    repo_owner: repoOwner,
  } = useParams<{
    environment_id: string;
    repo_name: string;
    repo_owner: string;
  }>();

  const selectedRepo = `${repoOwner}/${repoName}`;

  useEffect(() => {
    const getPreviewEnvironmentSettings = async () => {
      const { data: environment } = await api.getEnvironment<Environment>(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          environment_id: parseInt(environmentId),
        }
      );

      setEnvironment(environment);
      setSelectedBranches(environment.git_repo_branches);
      setNewCommentsDisabled(environment.new_comments_disabled);
      setDeploymentMode(environment.mode);

      if (environment.namespace_labels) {
        const labels: KeyValueType[] = Object.entries(
          environment.namespace_labels
        ).map(([key, value]) => ({
          key,
          value,
        }));

        setNamespaceLabels(labels);
      }
    };

    try {
      getPreviewEnvironmentSettings();
    } catch (err) {
      setCurrentError(err);
    }
  }, []);

  useEffect(() => {
    if (!environment) {
      return;
    }

    const repoName = environment.git_repo_name;
    const repoOwner = environment.git_repo_owner;
    setIsLoadingBranches(true);
    api
      .getBranches<string[]>(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          kind: "github",
          name: repoName,
          owner: repoOwner,
          git_repo_id: environment.git_installation_id,
        }
      )
      .then(({ data }) => {
        setIsLoadingBranches(false);
        setAvailableBranches(data);
      })
      .catch(() => {
        setIsLoadingBranches(false);
        setCurrentError(
          "Couldn't load branches for this repository, using all branches by default."
        );
      });
  }, [environment]);

  const handleSave = async () => {
    let labels: Record<string, string> = {};

    setSaveStatus("loading");

    namespaceLabels
      .filter((elem: KeyValueType, index: number, self: KeyValueType[]) => {
        // remove any collisions that are duplicates
        let numCollisions = self.reduce((n, _elem: KeyValueType) => {
          return n + (_elem.key === elem.key ? 1 : 0);
        }, 0);

        if (numCollisions == 1) {
          return true;
        } else {
          return (
            index ===
            self.findIndex((_elem: KeyValueType) => _elem.key === elem.key)
          );
        }
      })
      .forEach((elem: KeyValueType) => {
        if (elem.key !== "" && elem.value !== "") {
          labels[elem.key] = elem.value;
        }
      });

    try {
      await api.updateEnvironment(
        "<token>",
        {
          mode: deploymentMode,
          disable_new_comments: newCommentsDisabled,
          git_repo_branches: selectedBranches,
          namespace_labels: labels,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          environment_id: Number(environmentId),
        }
      );
    } catch (err) {
      setCurrentError(err);
    }

    setSaveStatus("");
  };

  const closeDeleteConfirmationModal = () => {
    setShowDeleteModal(false);
    setDeleteConfirmationPrompt("");
  };

  const canDelete = useMemo(() => {
    return deleteConfirmationPrompt === `${repoOwner}/${repoName}`;
  }, [deleteConfirmationPrompt]);

  const handleDelete = async () => {
    if (!canDelete) {
      return;
    }

    try {
      await api.deleteEnvironment(
        "<token>",
        {
          name: environment?.name,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          git_installation_id: environment?.git_installation_id,
          git_repo_owner: repoOwner,
          git_repo_name: repoName,
        }
      );

      closeDeleteConfirmationModal();
      router.push(`/preview-environments`);
    } catch (err) {
      setCurrentError(JSON.stringify(err));
      closeDeleteConfirmationModal();
    }
  };

  return (
    <>
      {showDeleteModal ? (
        <DeletePreviewEnvironmentModal
          repoOwner={repoOwner}
          repoName={repoName}
          onClose={closeDeleteConfirmationModal}
          prompt={deleteConfirmationPrompt}
          setPrompt={setDeleteConfirmationPrompt}
          onDelete={handleDelete}
          disabled={!canDelete}
        />
      ) : null}
      <BreadcrumbRow>
        <Breadcrumb to={`/preview-environments/deployments/settings`}>
          <ArrowIcon src={PullRequestIcon} />
          <Wrap>Preview environments</Wrap>
        </Breadcrumb>
        <Slash>/</Slash>
        <Breadcrumb
          to={`/preview-environments/deployments/${environmentId}/${selectedRepo}`}
        >
          <Icon src="https://git-scm.com/images/logos/downloads/Git-Icon-1788C.png" />
          <Wrap>{selectedRepo}</Wrap>
        </Breadcrumb>
      </BreadcrumbRow>
      <DashboardHeader
        image={PullRequestIcon}
        title="Preview environment settings"
        description={`Preview environment settings for the ${selectedRepo} repository.`}
        disableLineBreak
        capitalize={false}
      />
      <WarningBannerWrapper>
        <Banner type="warning">
          Changes made here will not affect existing deployments in this preview
          environment.
        </Banner>
      </WarningBannerWrapper>
      <StyledPlaceholder>
        <Heading isAtTop>Pull request comment settings</Heading>
        <Helper>
          Update the most recent PR comment on every deploy. If disabled, a new
          PR comment is made per deploy.
        </Helper>
        <CheckboxRow
          label="Update the most recent PR comment"
          checked={newCommentsDisabled}
          toggle={() => setNewCommentsDisabled(!newCommentsDisabled)}
        />
        <Br />
        <Heading>Automatic preview deployments</Heading>
        <Helper>
          When enabled, preview deployments are automatically created for all
          new pull requests.
        </Helper>
        <CheckboxRow
          label="Automatically create preview deployments"
          checked={deploymentMode === "auto"}
          toggle={() =>
            setDeploymentMode((deploymentMode) =>
              deploymentMode === "auto" ? "manual" : "auto"
            )
          }
        />
        <Br />
        <Heading>Select allowed branches</Heading>
        <Helper>
          If the pull request has a base branch included in this list, it will
          be allowed to be deployed.
          <br />
          (Leave empty to allow all branches)
        </Helper>
        <BranchFilterSelector
          onChange={setSelectedBranches}
          options={availableBranches}
          value={selectedBranches}
          showLoading={isLoadingBranches}
        />
        <Br />
        <Heading>Namespace labels</Heading>
        <Helper>
          Custom labels to be injected into the Kubernetes namespace created for
          each deployment.
        </Helper>
        <NamespaceLabels
          values={namespaceLabels}
          setValues={(x: KeyValueType[]) => {
            const labels: KeyValueType[] = x.map((entry) => ({
              key: entry.key,
              value: entry.value,
            }));

            setNamespaceLabels(labels);
          }}
        />
        <SavePreviewEnvironmentSettings
          text={"Save"}
          status={saveStatus}
          clearPosition={true}
          statusPosition={"right"}
          onClick={handleSave}
        />
        <Br />
        <Heading>Delete preview environment</Heading>
        <Helper>
          Delete the Porter preview environment integration for this repo. All
          preview deployments will also be destroyed.
        </Helper>
        <DeleteButton
          disabled={saveStatus === "loading"}
          onClick={() => {
            setShowDeleteModal(true);
          }}
        >
          Delete preview environment
        </DeleteButton>
      </StyledPlaceholder>
    </>
  );
};

interface DeletePreviewEnvironmentModalProps {
  repoName: string;
  repoOwner: string;
  prompt: string;
  setPrompt: (prompt: string) => void;
  onDelete: () => void;
  onClose: () => void;
  disabled: boolean;
}

const DeletePreviewEnvironmentModal = (
  props: DeletePreviewEnvironmentModalProps
) => {
  return (
    <Modal
      height="fit-content"
      title={`Remove Preview Envs for ${props.repoOwner}/${props.repoName}`}
      onRequestClose={props.onClose}
    >
      <DeletePreviewEnvironmentModalContentsWrapper>
        <Banner type="warning">
          All Preview Environment deployments associated with this repo will be
          deleted.
        </Banner>
        <InputRow
          type="text"
          label={`Enter ${props.repoOwner}/${props.repoName} to delete Preview Environments:`}
          value={props.prompt}
          placeholder={`${props.repoOwner}/${props.repoName}`}
          setValue={(x: string) => props.setPrompt(x)}
          width={"500px"}
        />
        <Flex justifyContent="center" alignItems="center">
          <DeleteButton
            onClick={() => props.onDelete()}
            disabled={props.disabled}
          >
            Delete
          </DeleteButton>
        </Flex>
      </DeletePreviewEnvironmentModalContentsWrapper>
    </Modal>
  );
};

export default EnvironmentSettings;

const DeletePreviewEnvironmentModalContentsWrapper = styled.div`
  margin-block-start: 25px;
`;

const SavePreviewEnvironmentSettings = styled(SaveButton)`
  margin-top: 30px;
`;

const Flex = styled.div<{
  justifyContent?: string;
  alignItems?: string;
}>`
  display: flex;
  align-items: ${({ alignItems }) => alignItems || "flex-start"};
  justify-content: ${({ justifyContent }) => justifyContent || "flex-start"};
`;

const DeleteButton = styled.button<{ disabled?: boolean }>`
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  display: flex;
  align-items: center;
  padding: 10px 15px;
  margin-top: 20px;
  text-align: left;
  border-radius: 5px;
  user-select: none;
  background: #b91133;
  border: none;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  filter: ${({ disabled }) => (disabled ? "brightness(0.8)" : "none")};

  &:focus {
    outline: 0;
  }
  &:hover {
    filter: ${({ disabled }) => (disabled ? "brightness(0.8)" : "none")};
  }
`;

const Br = styled.div`
  width: 100%;
  height: 2px;
`;

const StyledPlaceholder = styled.div`
  width: 100%;
  padding: 30px;
  font-size: 13px;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
`;

const Slash = styled.div`
  margin: 0 4px;
  color: #aaaabb88;
`;

const Wrap = styled.div`
  z-index: 999;
`;

const ArrowIcon = styled.img`
  width: 15px;
  margin-right: 8px;
  opacity: 50%;
`;

const Icon = styled.img`
  width: 15px;
  margin-right: 8px;
`;

const BreadcrumbRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-start;
  margin-bottom: 15px;
  margin-top: -5px;
  align-items: center;
`;

const Breadcrumb = styled(DynamicLink)`
  color: #aaaabb88;
  font-size: 13px;
  display: flex;
  align-items: center;
  z-index: 999;
  padding: 5px;
  padding-right: 7px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
  }
`;

const WarningBannerWrapper = styled.div`
  margin-block: 20px;
`;
