import React from "react";
import { capitalize } from "shared/string_utils";
import styled from "styled-components";
import { Environment } from "../types";
import Options from "components/OptionsDropdown";

type Props = {
  environment: Environment;
};

const EnvironmentCard = ({ environment }: Props) => {
  const {
    name,
    deployment_count,
    git_repo_owner,
    git_repo_name,
    last_deployment_status,
    mode,
  } = environment;

  return (
    <EnvironmentCardWrapper>
      <DataContainer>
        <RepoName>{name}</RepoName>
        <Status>
          <StatusDot status={last_deployment_status} />
          {capitalize(last_deployment_status || "")}
        </Status>
      </DataContainer>
      <Options.Dropdown>
        <Options.Option>Delete</Options.Option>
      </Options.Dropdown>
    </EnvironmentCardWrapper>
  );
};

export default EnvironmentCard;

const EnvironmentCardWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #ffffff44;
  background: #ffffff08;
  margin-bottom: 5px;
  border-radius: 10px;
  padding: 14px;
  overflow: hidden;
  height: 80px;
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
  font-size: 20px;
`;

const Status = styled.span`
  font-size: 13px;
  display: flex;
  align-items: center;
  min-height: 17px;
  color: #a7a6bb;
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
