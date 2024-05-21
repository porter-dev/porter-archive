import React, { useState } from "react";
import styled from "styled-components";

import { integrationList } from "shared/common";
import { ChartType } from "shared/types";

type Props = {
  currentChart: ChartType;
};

const DeploymentType: React.FC<Props> = ({ currentChart }) => {
  const [showRepoTooltip, setShowRepoTooltip] = useState(false);

  const githubRepository = currentChart?.git_action_config?.git_repo;
  const icon = githubRepository
    ? integrationList.repo.icon
    : integrationList.registry.icon;

  const repository =
    githubRepository ||
    currentChart?.image_repo_uri ||
    currentChart?.config?.image?.repository;

  if (repository?.includes("hello-porter")) {
    return null;
  }

  return (
    <DeploymentImageContainer>
      <DeploymentTypeIcon src={icon} />
      <RepositoryName
        onMouseOver={() => {
          setShowRepoTooltip(true);
        }}
        onMouseOut={() => {
          setShowRepoTooltip(false);
        }}
      >
        {repository}
      </RepositoryName>
      {showRepoTooltip && <Tooltip>{repository}</Tooltip>}
    </DeploymentImageContainer>
  );
};

export default DeploymentType;

const DeploymentImageContainer = styled.div`
  height: 20px;
  font-size: 13px;
  position: relative;
  display: flex;
  margin-left: 15px;
  margin-bottom: -3px;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff66;
  padding-left: 5px;
`;

const Icon = styled.img`
  width: 100%;
`;

const DeploymentTypeIcon = styled(Icon)`
  width: 20px;
  margin-right: 10px;
`;

const RepositoryName = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 390px;
  position: relative;
  margin-right: 3px;
`;

const Tooltip = styled.div`
  position: absolute;
  left: -40px;
  top: 28px;
  min-height: 18px;
  max-width: calc(700px);
  padding: 5px 7px;
  background: #272731;
  z-index: 999;
  color: white;
  font-size: 12px;
  font-family: "Work Sans", sans-serif;
  outline: 1px solid #ffffff55;
  opacity: 0;
  animation: faded-in 0.2s 0.15s;
  animation-fill-mode: forwards;
  @keyframes faded-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
