import DynamicLink from "components/DynamicLink";
import Heading from "components/form-components/Heading";
import RepoList from "components/repo-selector/RepoList";
import SaveButton from "components/SaveButton";
import DocsHelper from "components/DocsHelper";
import { ActionConfigType } from "shared/types";
import TitleSection from "components/TitleSection";
import { useRouteMatch } from "react-router";
import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import api from "shared/api";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import { Environment } from "./types";
import DashboardHeader from "../DashboardHeader";
import PullRequestIcon from "assets/pull_request_icon.svg";
import CheckboxRow from "components/form-components/CheckboxRow";

const ConnectNewRepo: React.FC = () => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [repo, setRepo] = useState(null);
  const [enableAutomaticDeployments, setEnableAutomaticDeployments] = useState(
    false
  );
  const [filteredRepos, setFilteredRepos] = useState<string[]>([]);

  const [status, setStatus] = useState(null);
  const { pushFiltered } = useRouting();

  // NOTE: git_repo_id is a misnomer as this actually refers to the github app's installation id.
  const [actionConfig, setActionConfig] = useState<ActionConfigType>({
    git_repo: null,
    image_repo_uri: null,
    git_branch: null,
    git_repo_id: 0,
  });

  useEffect(() => {}, [repo]);

  const { url } = useRouteMatch();

  useEffect(() => {
    api
      .listEnvironments<Environment[]>(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then(({ data }) => {
        // console.log("github account", data);

        if (!Array.isArray(data)) {
          throw Error("Data is not an array");
        }
        const newFilteredRepos = data.map((env) => {
          return `${env.git_repo_owner}/${env.git_repo_name}`;
        });
        setFilteredRepos(newFilteredRepos || []);
      })
      .catch(() => {});
  }, []);

  const addRepo = () => {
    let [owner, repoName] = repo.split("/");
    setStatus("loading");
    api
      .createEnvironment(
        "<token>",
        {
          name: `preview`,
          mode: enableAutomaticDeployments ? "auto" : "manual",
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          git_installation_id: actionConfig.git_repo_id,
          git_repo_name: repoName,
          git_repo_owner: owner,
        }
      )
      .then(() => {
        setStatus("successful");
        pushFiltered(`/preview-environments`, []);
      })
      .catch((err) => {
        err = JSON.stringify(err);
        setStatus("error");
        setCurrentError(err);
      });
  };

  return (
    <>
      <DashboardHeader
        image={PullRequestIcon}
        title="Preview Environments"
        description="Create full-stack preview environments for your pull requests."
      />

      <HeaderSection>
        <Button to={`/preview-environments`}>
          <i className="material-icons">keyboard_backspace</i>
          Back
        </Button>
        <Title>Enable Preview Environments on a Repository</Title>
      </HeaderSection>

      <Heading>Select a Repository</Heading>
      <br />
      <RepoList
        actionConfig={actionConfig}
        setActionConfig={(a: ActionConfigType) => {
          setActionConfig(a);
          setRepo(a.git_repo);
        }}
        readOnly={false}
        filteredRepos={filteredRepos}
      />
      <HelperContainer>
        Note: you will need to add a <CodeBlock>porter.yaml</CodeBlock> file to
        create a preview environment.
        <DocsHelper
          disableMargin
          tooltipText="A Porter YAML file is a declarative set of resources that Porter uses to build and update your preview environment deployments."
          link="https://docs.porter.run/preview-environments/porter-yaml-reference"
        />
      </HelperContainer>

      <FlexWrap>
        <CheckboxRow
          label="Enable automatic deployments"
          checked={enableAutomaticDeployments}
          toggle={() => setEnableAutomaticDeployments((prev) => !prev)}
        />
        <Div>
          <DocsHelper
            disableMargin
            tooltipText="Automatically create a Preview Environment for each new pull request in the repository. By default, preview environments must be manually created per-PR."
            placement="top-start"
          />
        </Div>
      </FlexWrap>

      <ActionContainer>
        <SaveButton
          text="Add repository"
          disabled={actionConfig.git_repo_id ? false : true}
          onClick={addRepo}
          makeFlush={true}
          clearPosition={true}
          status={status}
          statusPosition={"left"}
        ></SaveButton>
      </ActionContainer>
    </>
  );
};

export default ConnectNewRepo;

const Div = styled.div`
  margin-bottom: -7px;
`;

const FlexWrap = styled.div`
  display: flex;
  align-items: center;
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
  margin-left: -2px;
  padding: 0px 8px;
  padding-bottom: 1px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  border: 2px solid #969fbbaa;
  :hover {
    background: #ffffff11;
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    color: #969fbbaa;
    font-weight: 600;
    font-size: 14px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const ActionContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-bottom: 100px;
`;

const CodeBlock = styled.span`
  display: inline-block;
  background-color: #1b1d26;
  color: white;
  border-radius: 8px;
  font-family: monospace;
  padding: 2px 3px;
  user-select: text;
  margin: 0 6px;
`;

const HelperContainer = styled.div`
  margin-top: 24px;
  width: 555px;
  display: flex;
  justify-content: start;
  align-items: center;
  color: #aaaabb;
  line-height: 1.6em;
  font-size: 13px;
`;

const Title = styled.div`
  font-size: 20px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  margin-left: 15px;
  border-radius: 2px;
  color: #ffffff;
`;

const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 40px;

  > i {
    cursor: pointer;
    font-size: 20px;
    color: #969fbbaa;
    padding: 2px;
    border: 2px solid #969fbbaa;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }

  > img {
    width: 20px;
    margin-left: 17px;
    margin-right: 7px;
  }
`;
