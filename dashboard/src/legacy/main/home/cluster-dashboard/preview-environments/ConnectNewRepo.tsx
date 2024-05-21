import React, { useContext, useEffect, useState } from "react";
import PullRequestIcon from "legacy/assets/pull_request_icon.svg";
import DocsHelper from "legacy/components/DocsHelper";
import DynamicLink from "legacy/components/DynamicLink";
import CheckboxRow from "legacy/components/form-components/CheckboxRow";
import Heading from "legacy/components/form-components/Heading";
import Helper from "legacy/components/form-components/Helper";
import Back from "legacy/components/porter/Back";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import VerticalSteps from "legacy/components/porter/VerticalSteps";
import RepoList from "legacy/components/repo-selector/RepoList";
import SaveButton from "legacy/components/SaveButton";
import api from "legacy/shared/api";
import { useRouting } from "legacy/shared/routing";
import {
  GithubActionConfigType,
  type ActionConfigType,
} from "legacy/shared/types";
import AnimateHeight from "react-animate-height";
import styled from "styled-components";

import { Context } from "shared/Context";

import DashboardHeader from "../DashboardHeader";
import BranchFilterSelector from "./components/BranchFilterSelector";
import NamespaceLabels, {
  type KeyValueType,
} from "./components/NamespaceLabels";
import ConnectNewRepoActionConfEditor from "./ConnectNewRepoActionConfEditor";
import { type Environment } from "./types";

const ConnectNewRepo: React.FC = () => {
  const { currentProject, currentCluster, setCurrentError } =
    useContext(Context);
  const [repo, setRepo] = useState(null);
  const [enableAutomaticDeployments, setEnableAutomaticDeployments] =
    useState(false);
  const [filteredRepos, setFilteredRepos] = useState<string[]>([]);

  const [status, setStatus] = useState(null);
  const { pushFiltered } = useRouting();
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);

  // NOTE: git_repo_id is a misnomer as this actually refers to the github app's installation id.
  const [actionConfig, setActionConfig] = useState<ActionConfigType>({
    git_repo: null,
    image_repo_uri: null,
    git_branch: null,
    git_repo_id: 0,
    kind: "github",
  });

  // Branch selector data
  const [baseBranches, setBaseBranches] = useState<string[]>([]);
  const [deployBranches, setDeployBranches] = useState<string[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  // Disable new comments data
  const [isNewCommentsDisabled, setIsNewCommentsDisabled] = useState(false);

  // Namespace labels
  const [namespaceLabels, setNamespaceLabels] = useState<KeyValueType[]>([]);

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

  useEffect(() => {
    if (!actionConfig.git_repo || !actionConfig.git_repo_id) {
      return;
    }

    const isSubscribed = true;
    const repoName = actionConfig.git_repo.split("/")[1];
    const repoOwner = actionConfig.git_repo.split("/")[0];
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
          git_repo_id: actionConfig.git_repo_id,
        }
      )
      .then(({ data }) => {
        if (isSubscribed) {
          setIsLoadingBranches(false);
          setAvailableBranches(data);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setIsLoadingBranches(false);
          setCurrentError(
            "Couldn't load branches for this repository, using all branches by default."
          );
        }
      });
  }, [actionConfig]);

  const addRepo = () => {
    const [owner, repoName] = actionConfig.git_repo.split("/");
    const labels: Record<string, string> = {};

    setStatus("loading");

    namespaceLabels
      .filter((elem: KeyValueType, index: number, self: KeyValueType[]) => {
        // remove any collisions that are duplicates
        const numCollisions = self.reduce((n, _elem: KeyValueType) => {
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

    api
      .createEnvironment(
        "<token>",
        {
          name: `preview`,
          mode: enableAutomaticDeployments ? "auto" : "manual",
          disable_new_comments: isNewCommentsDisabled,
          git_repo_branches: baseBranches,
          namespace_labels: labels,
          git_deploy_branches: deployBranches,
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

  if (currentProject?.simplified_view_enabled) {
    return (
      <CenterWrapper>
        <Div>
          <Back to="/preview-environments" />
          <DashboardHeader
            image={PullRequestIcon}
            title="Preview environments"
            capitalize={false}
            description="Create full-stack preview environments for your pull requests."
          />
          <VerticalSteps
            currentStep={currentStep}
            steps={[
              <>
                <Text size={16}>Choose a repository</Text>
                <ConnectNewRepoActionConfEditor
                  actionConfig={actionConfig}
                  setActionConfig={(actionConfig: ActionConfigType) => {
                    setActionConfig(
                      (currentActionConfig: ActionConfigType) => ({
                        ...currentActionConfig,
                        ...actionConfig,
                      })
                    );

                    if (actionConfig.git_repo) {
                      setCurrentStep((prev) => {
                        if (prev > 0) {
                          return prev;
                        }

                        return prev + 1;
                      });
                    }
                  }}
                />
                <HelperContainer>
                  Note: you will need to add a{" "}
                  <CodeBlock>porter.yaml</CodeBlock> file to create a preview
                  environment.
                  <DocsHelper
                    disableMargin
                    tooltipText="A Porter YAML file is a declarative set of resources that Porter uses to build and update your preview environment deployments."
                    link="https://docs.porter.run/preview-environments/porter-yaml-reference"
                  />
                </HelperContainer>
              </>,

              <>
                <Text size={16}>Automatic pull request deployments</Text>
                <Helper style={{ marginTop: "10px", marginBottom: "10px" }}>
                  If you enable this option, the new pull requests will be
                  automatically deployed.
                </Helper>
                <CheckboxWrapper>
                  <CheckboxRow
                    label="Enable automatic deploys"
                    checked={enableAutomaticDeployments}
                    toggle={() => {
                      setEnableAutomaticDeployments(
                        !enableAutomaticDeployments
                      );
                    }}
                    wrapperStyles={{
                      disableMargin: true,
                    }}
                  />
                </CheckboxWrapper>
              </>,
            ]}
          />
          <ActionContainer>
            <SaveButton
              text="Add repository"
              disabled={!actionConfig.git_repo_id}
              onClick={addRepo}
              makeFlush={true}
              clearPosition={true}
              status={status}
              statusPosition={"left"}
            />
          </ActionContainer>
        </Div>
      </CenterWrapper>
    );
  }

  return (
    <>
      <DashboardHeader
        image={PullRequestIcon}
        title="Preview environments"
        capitalize={false}
        description="Create full-stack preview environments for your pull requests."
      />

      <HeaderSection>
        <Button to={`/preview-environments`}>
          <i className="material-icons">keyboard_backspace</i>
          Back
        </Button>
        <Title>
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            Enable Preview Environments on a Repository
            <DocsHelper
              tooltipText="Learn more about preview environments"
              link="https://docs.porter.run/preview-environments/overview/"
              placement="top-end"
            />
          </div>
        </Title>
      </HeaderSection>

      <Heading>Select a Repository</Heading>
      <br />
      {/* <RepoList
        actionConfig={actionConfig}
        setActionConfig={(a: GithubActionConfigType) => {
          setActionConfig(a);
          setRepo(a.git_repo);
        }}
        readOnly={false}
        filteredRepos={filteredRepos}
      /> */}
      <ConnectNewRepoActionConfEditor
        actionConfig={actionConfig}
        setActionConfig={(actionConfig: ActionConfigType) => {
          setActionConfig((currentActionConfig: ActionConfigType) => ({
            ...currentActionConfig,
            ...actionConfig,
          }));
        }}
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

      {/* <StyledAdvancedBuildSettings
        showSettings={showSettings}
        isCurrent={true}
        onClick={() => {
          setShowSettings(!showSettings);
        }}
      > */}
      <StyledAdvancedBuildSettings
        showSettings={showSettings}
        isCurrent={true}
        onClick={() => {
          setShowSettings(!showSettings);
        }}
      >
        <AdvancedBuildTitle>
          <i className="material-icons dropdown">arrow_drop_down</i>
          Configure Additonal settings
        </AdvancedBuildTitle>
      </StyledAdvancedBuildSettings>
      <AnimateHeight height={showSettings ? "auto" : 0} duration={1000}>
        <StyledSourceBox>
          <Text size={16}>Deploy from branches</Text>
          <Helper style={{ marginTop: "10px", marginBottom: "10px" }}>
            {" "}
            Choose the list of branches that you want to deploy changes from.
          </Helper>
          <BranchFilterSelector
            onChange={setDeployBranches}
            options={availableBranches}
            value={deployBranches}
            showLoading={isLoadingBranches}
          />

          <Text size={16}>Select allowed branches</Text>
          <Helper style={{ marginTop: "10px", marginBottom: "10px" }}>
            {" "}
            If the pull request has a base branch included in this list, it will
            be allowed to be deployed.
            <br />
            (Leave empty to allow all branches)
          </Helper>
          <BranchFilterSelector
            onChange={setBaseBranches}
            options={availableBranches}
            value={baseBranches}
            showLoading={isLoadingBranches}
          />
          <Text size={16}>Automatic pull request deployments</Text>
          <Helper style={{ marginTop: "10px", marginBottom: "10px" }}>
            If you enable this option, the new pull requests will be
            automatically deployed.
          </Helper>
          <CheckboxWrapper>
            <CheckboxRow
              label="Enable automatic deploys"
              checked={enableAutomaticDeployments}
              toggle={() => {
                setEnableAutomaticDeployments(!enableAutomaticDeployments);
              }}
              wrapperStyles={{
                disableMargin: true,
              }}
            />
          </CheckboxWrapper>
          <Spacer y={2} />
          <Text size={16}>Disable new comments for new deployments</Text>
          <Helper style={{ marginTop: "10px", marginBottom: "10px" }}>
            When enabled new comments will not be created for new deployments.
            Instead the last comment will be updated.
          </Helper>
          <CheckboxWrapper>
            <CheckboxRow
              label="Disable new comments for deployments"
              checked={isNewCommentsDisabled}
              toggle={() => {
                setIsNewCommentsDisabled(!isNewCommentsDisabled);
              }}
              wrapperStyles={{
                disableMargin: true,
              }}
            />
          </CheckboxWrapper>
          <Spacer y={2} />

          <Text size={16}>Namespace labels</Text>
          <Helper style={{ marginTop: "10px", marginBottom: "10px" }}>
            Custom labels to be injected into the Kubernetes namespace created
            for each deployment.
          </Helper>
          <NamespaceLabels
            values={namespaceLabels}
            setValues={(x: KeyValueType[]) => {
              const labels: KeyValueType[] = [];
              x.forEach((entry) => {
                labels.push({ key: entry.key, value: entry.value });
              });
              setNamespaceLabels(labels);
            }}
          />
        </StyledSourceBox>
      </AnimateHeight>

      <ActionContainer>
        <SaveButton
          text="Add repository"
          disabled={!actionConfig.git_repo_id}
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

const CenterWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Div = styled.div`
  width: 100%;
  max-width: 900px;
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

const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 20px;
`;
const StyledSourceBox = styled.div`
  width: 100%;
  color: #ffffff;
  padding: 25px 35px 25px;
  position: relative;
  font-size: 13px;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  border-top: 0px;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
`;
const StyledAdvancedBuildSettings = styled.div`
  color: ${({ showSettings }) => (showSettings ? "white" : "#aaaabb")};
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
    color: white;
  }
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  border-radius: 5px;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 10px;
  cursor: pointer;
  border-bottom-left-radius: ${({ showSettings }) => showSettings && "0px"};
  border-bottom-right-radius: ${({ showSettings }) => showSettings && "0px"};

  .dropdown {
    margin-right: 8px;
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    transform: ${(props: { showSettings: boolean; isCurrent: boolean }) =>
      props.showSettings ? "" : "rotate(-90deg)"};
  }
`;
const AdvancedBuildTitle = styled.div`
  display: flex;
  align-items: center;
`;
