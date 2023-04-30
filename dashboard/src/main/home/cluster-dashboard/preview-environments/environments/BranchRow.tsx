import React, { useContext } from "react";
import styled from "styled-components";
import { EllipsisTextWrapper } from "../components/styled";
import pr_icon from "assets/pull_request_icon.svg";
import { Context } from "shared/Context";
import { useQuery } from "@tanstack/react-query";
import { Branch, Environment } from "../types";
import api from "shared/api";
import dayjs from "dayjs";

interface Props {
  branch: string;
  onClick: () => void;
  isLast?: boolean;
  isSelected?: boolean;
  environment?: Environment;
}

const BranchRow = ({
  branch,
  onClick,
  isLast,
  isSelected,
  environment,
}: Props) => {
  const { currentProject, currentCluster } = useContext(Context);

  // Get metadata for branch
  const { isLoading, data } = useQuery<Branch>(
    ["branch", currentProject.id, currentCluster.id, environment?.id, branch],
    async () => {
      try {
        const res = await api.getBranchMetadata<Branch>(
          "<token>",
          {},
          {
            project_id: currentProject.id,
            kind: "github",
            name: environment.git_repo_name,
            owner: environment.git_repo_owner,
            git_repo_id: environment.git_installation_id,
            branch,
          }
        );
        return res.data;
      } catch (err) {
        // Do nothing
      }
    },
    {
      enabled: !!environment,
    }
  );

  return (
    <Row onClick={onClick} isLast={isLast} isSelected={isSelected}>
      <BranchName>
        <BranchIcon src={pr_icon} alt="branch icon" />
        <EllipsisTextWrapper tooltipText={branch}>{branch}</EllipsisTextWrapper>
        <Flex>
          <DeploymentImageContainer>
            {!isLoading ? (
              <InfoWrapper>
                <Info>{data.commit_sha}</Info>
                <SepDot>•</SepDot>
                <LastUpdated>
                  Last updated{" "}
                  {dayjs(data.last_updated_at).format("hh:mma on MM/DD/YYYY")}
                </LastUpdated>
              </InfoWrapper>
            ) : null}
          </DeploymentImageContainer>
        </Flex>
      </BranchName>
    </Row>
  );
};

export default BranchRow;

const Row = styled.div<{ isLast?: boolean; isSelected?: boolean }>`
  width: 100%;
  padding: 15px;
  cursor: pointer;
  background: ${(props) => (props.isSelected ? "#ffffff11" : "#26292e")};
  border-bottom: ${(props) => (props.isLast ? "" : "1px solid #494b4f")};
  :hover {
    background: #ffffff11;
  }
`;

const BranchName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
  display: flex;
  font-size: 14px;
  align-items: center;
  margin-bottom: 10px;
`;

const BranchIcon = styled.img`
  font-size: 20px;
  height: 16px;
  margin-right: 10px;
  color: #aaaabb;
  opacity: 50%;
`;

const SepDot = styled.div`
  color: #aaaabb66;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const DeploymentImageContainer = styled.div`
  height: 20px;
  font-size: 13px;
  position: relative;
  display: flex;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff66;
  padding-left: 10px;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-right: 8px;
  position: relative;
  margin-left: 10px;
  gap: 8px;
`;

const Info = styled.div`
  font-size: 13px;
  align-items: center;
  color: #aaaabb66;
  white-space: nowrap;
  display: flex;
  align-items: center;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 300px;

  > i {
    font-size: 16px;
    margin: 0 2px;
  }
`;

const LastUpdated = styled.div`
  font-size: 13px;
  margin-top: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;
