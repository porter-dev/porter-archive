import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import styled from "styled-components";
import { CellProps } from "react-table";
import { Context } from "shared/Context";
import { useParams } from "react-router";
import { PRDeployment } from "../types";
import DashboardHeader from "../../DashboardHeader";
import PullRequestIcon from "assets/pull_request_icon.svg";
import Helper from "components/form-components/Helper";
import Table from "components/Table";
import pr_icon from "assets/pull_request_icon.svg";
import { EllipsisTextWrapper, RepoLink } from "../components/styled";

const dummyData: any = [
  {
    name: "this is a name",
    branches: "asdf",
  },
  {
    name: "this is a name",
    branches: "asdf",
  },
  {
    name: "this is a name",
    branches: "asdf",
  },
];

const CreateEnvironment: React.FC = () => {
  const { environment_id, repo_name, repo_owner } = useParams<{
    environment_id: string;
    repo_name: string;
    repo_owner: string;
  }>();

  const selectedRepo = `${repo_owner}/${repo_name}`;

  const columns = React.useMemo(
    () => [
      {
        Header: "Monitors",
        columns: [
          {
            Header: "Open pull requests",
            accessor: "name",
            width: 140,
            Cell: ({ row }: CellProps<any>) => {
              return (
                <div style={{
                  cursor: 'pointer',
                }} onClick={() => alert("Hello world")}>
                  <PRName>
                    <PRIcon src={pr_icon} alt="pull request icon" />
                    <EllipsisTextWrapper tooltipText="test">
                      "test"
                    </EllipsisTextWrapper>
                    <Spacer />
                    <RepoLink to="" target="_blank">
                      <i className="material-icons">open_in_new</i>
                      View last workflow
                    </RepoLink>
                  </PRName>

                  <Flex>
                    <DeploymentImageContainer>
                      <InfoWrapper>
                        <LastDeployed>Last updated xyz</LastDeployed>
                      </InfoWrapper>
                      <SepDot>•</SepDot>
                      <MergeInfoWrapper>
                        <MergeInfo>
                          from-this-branch
                          <i className="material-icons">arrow_forward</i>
                          to-this-branch
                        </MergeInfo>
                      </MergeInfoWrapper>
                    </DeploymentImageContainer>
                  </Flex>
                </div>
              );
            },
          },
        ],
      },
    ],
    []
  );

  return (
    <>
      <BreadcrumbRow>
        <Breadcrumb to={`/preview-environments/deployments/settings`}>
          <ArrowIcon src={PullRequestIcon} />
          <Wrap>Preview environments</Wrap>
        </Breadcrumb>
        <Slash>/</Slash>
        <Breadcrumb
          to={`/preview-environments/deployments/${environment_id}/${selectedRepo}`}
        >
          <Icon src="https://git-scm.com/images/logos/downloads/Git-Icon-1788C.png" />
          <Wrap>{selectedRepo}</Wrap>
        </Breadcrumb>
      </BreadcrumbRow>
      <DashboardHeader
        title="Create a preview deployment"
        disableLineBreak
        capitalize={false}
      />
      <DarkMatter />
      <Helper>
        Select an open pull request to preview. Pull requests must contain a{" "}
        <Code>porter.yaml</Code> file.
      </Helper>
      <Br height="10px" />
      <Table
        columns={columns}
        data={dummyData}
        placeholder="No open pull requests found."
      />
      <SubmitButton>Create preview deployment</SubmitButton>
    </>
  );
};

export default CreateEnvironment;

const Code = styled.span`
  font-family: monospace; ;
`;

const Spacer = styled.div`
  width: 5px;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
  margin-left: 7px;
`;

const LastDeployed = styled.div`
  font-size: 13px;
  margin-top: -1px;
  margin-left: 10px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

const MergeInfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-right: 8px;
  position: relative;
  margin-left: 10px;
`;

const MergeInfo = styled.div`
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

const PRIcon = styled.img`
  font-size: 20px;
  height: 17px;
  margin-right: 10px;
  color: #aaaabb;
  opacity: 50%;
`;

const PRName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
  display: flex;
  font-size: 14px;
  align-items: center;
  margin-bottom: 10px;
`;

const SubmitButton = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 5px;
  font-weight: 500;
  color: white;
  height: 30px;
  padding: 0 8px;
  width: 200px;
  margin-top: 30px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -15px;
`;

const DeleteButton = styled.div`
  height: 30px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  display: flex;
  width: 210px;
  align-items: center;
  padding: 0 15px;
  margin-top: 20px;
  text-align: left;
  border-radius: 5px;
  cursor: pointer;
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: brightness(120%);
  }
  background: #b91133;
  border: none;
  :hover {
    filter: brightness(120%);
  }
`;

const Br = styled.div<{ height: string }>`
  width: 100%;
  height: ${(props) => props.height || "2px"};
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
  margin-top: -10px;
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

const Relative = styled.div`
  position: relative;
`;

const EnvironmentsGrid = styled.div`
  padding-bottom: 150px;
  display: grid;
  grid-row-gap: 15px;
`;

const ControlRow = styled.div`
  display: flex;
  margin-left: auto;
  justify-content: space-between;
  align-items: center;
  margin: 35px 0 30px;
  padding-left: 0px;
`;

const Button = styled(DynamicLink)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 20px;
  color: white;
  height: 35px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-right: 10px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;
