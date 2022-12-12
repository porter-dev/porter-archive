import DynamicLink from "components/DynamicLink";
import React, { useState } from "react";
import styled from "styled-components";
import { useParams } from "react-router";
import DashboardHeader from "../../DashboardHeader";
import PullRequestIcon from "assets/pull_request_icon.svg";
import CreatePREnvironment from "./CreatePREnvironment";
import TabSelector from "components/TabSelector";
import CreateBranchEnvironment from "./CreateBranchEnvironment";

const TAB_OPTIONS = [
  { label: "Pull Requests", value: "pull_requests" },
  { label: "Branches", value: "branches" },
];

const CreateEnvironment: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<typeof TAB_OPTIONS[0]>(
    TAB_OPTIONS[0]
  );
  const { environment_id, repo_name, repo_owner } = useParams<{
    environment_id: string;
    repo_name: string;
    repo_owner: string;
  }>();

  const selectedRepo = `${repo_owner}/${repo_name}`;

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
      {/* <TabSelector
        options={TAB_OPTIONS}
        currentTab={currentTab.value}
        setCurrentTab={(value: string) =>
          setCurrentTab(TAB_OPTIONS.find((tab) => tab.value === value))
        }
      /> */}

      {currentTab.value === "pull_requests" ? (
        <CreatePREnvironment environmentID={environment_id} />
      ) : (
        <CreateBranchEnvironment environmentID={environment_id} />
      )}
    </>
  );
};

export default CreateEnvironment;

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -15px;
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
