import React, {
  FormEvent,
  FormEventHandler,
  useContext,
  useState,
} from "react";
import { capitalize } from "shared/string_utils";
import styled from "styled-components";
import { Environment } from "../types";
import Options from "components/OptionsDropdown";
import { useRouting } from "shared/routing";
import api from "shared/api";
import { Context } from "shared/Context";
import Modal from "main/home/modals/Modal";

type Props = {
  environment: Environment;
  onDelete: (env: Environment) => void;
};

const EnvironmentCard = ({ environment, onDelete }: Props) => {
  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );
  const { pushFiltered } = useRouting();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteFormError, setDeleteFormError] = useState(false);

  const {
    id,
    name,
    deployment_count,
    git_repo_owner,
    git_repo_name,
    git_installation_id,
    last_deployment_status,
    mode,
  } = environment;

  const showOpenPrs = () => {
    pushFiltered("/preview-environments", [], {
      selected_tab: "pull_requests",
      environment_id: id,
    });
  };

  const handleDelete = () => {
    api
      .deleteEnvironment(
        "<token>",
        {
          name: name,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          git_installation_id: git_installation_id,
          git_repo_owner: git_repo_owner,
          git_repo_name: git_repo_name,
        }
      )
      .then(() => {
        onDelete(environment);
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
      });
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.persist();
    e.preventDefault();
    // @ts-ignore
    const repoName = e.target.elements?.repo_name?.value;

    if (repoName === `${git_repo_owner}/${git_repo_name}`) {
      handleDelete();
    } else {
      setDeleteFormError(true);
    }
  };

  return (
    <>
      {showDeleteModal ? (
        <Modal
          title={`Are you sure you wanna remove preview environments for ${git_repo_owner}/${git_repo_name}`}
          width="fit-content"
          height="400px"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <form onSubmit={handleSubmit}>
            <input type="text" name="repo_name" />
            <button type="submit">Delete</button>
          </form>
        </Modal>
      ) : null}
      <EnvironmentCardWrapper>
        <DataContainer>
          <RepoName>
            <Icon
              src="https://git-scm.com/images/logos/downloads/Git-Icon-1788C.png"
              alt="git repository icon"
            />
            {git_repo_owner}/{git_repo_name}
          </RepoName>
          <Status>
            <StatusDot status={last_deployment_status} />
            {capitalize(last_deployment_status || "")}
          </Status>
        </DataContainer>
        <Options.Dropdown expandIcon="more_vert" shrinkIcon="more_vert">
          <Options.Option onClick={showOpenPrs}>View opened PRs</Options.Option>
          <Options.Option onClick={() => setShowDeleteModal(true)}>
            Delete
          </Options.Option>
        </Options.Dropdown>
      </EnvironmentCardWrapper>
    </>
  );
};

export default EnvironmentCard;

const EnvironmentCardWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #ffffff44;
  background: #ffffff08;
  border-radius: 10px;
  padding: 14px;
  min-height: 80px;
  font-size: 13px;
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const DataContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const RepoName = styled.div`
  display: flex;
  font-size: 16px;
  align-items: center;
`;

const Status = styled.span`
  font-size: 13px;
  display: flex;
  align-items: center;
  min-height: 17px;
  color: #a7a6bb;
  margin-top: 10px;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  margin-right: 15px;
  background: ${(props: { status: string }) =>
    props.status === "created"
      ? "#4797ff"
      : props.status === "failed"
      ? "#ed5f85"
      : props.status === "completed"
      ? "#00d12a"
      : "#f5cb42"};
  border-radius: 20px;
  margin-left: 3px;
`;

const Icon = styled.img`
  width: 20px;
  height: 20px;
  margin-right: 5px;
`;
