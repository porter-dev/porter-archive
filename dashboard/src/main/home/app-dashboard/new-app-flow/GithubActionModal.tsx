import { RouteComponentProps, withRouter } from "react-router";
import styled from "styled-components";
import React from "react";

import Modal from "components/porter/Modal";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import ExpandableSection from "components/porter/ExpandableSection";
import Fieldset from "components/porter/Fieldset";
import Button from "components/porter/Button";
import Select from "components/porter/Select";
import api from "shared/api";
import { getGithubAction } from "./utils";
import AceEditor from "react-ace";
import YamlEditor from "components/YamlEditor";
import Error from "components/porter/Error";


type Props = RouteComponentProps & {
  closeModal: () => void;
  githubAppInstallationID?: number;
  githubRepoOwner?: string;
  githubRepoName?: string;
  branch?: string;
  stackName?: string;
  projectId?: number;
  clusterId?: number;
  deployPorterApp: () => Promise<boolean>;
  deploymentError?: string;
}

type Choice = "open_pr" | "copy";

const GithubActionModal: React.FC<Props> = ({
  closeModal,
  githubAppInstallationID,
  githubRepoOwner,
  githubRepoName,
  branch,
  stackName,
  projectId,
  clusterId,
  deployPorterApp,
  deploymentError,
  ...props
}) => {
  const [choice, setChoice] = React.useState<Choice>("open_pr");
  const [loading, setLoading] = React.useState<boolean>(false);

  const submit = async () => {
    if (githubAppInstallationID && githubRepoOwner && githubRepoName && branch && stackName) {
      try {
        setLoading(true)
        // this creates the dummy chart

        const success = await deployPorterApp();

        if (success) {
          // this creates the secret and possibly the PR
          const res = await api.createSecretAndOpenGitHubPullRequest(
            "<token>",
            {
              github_app_installation_id: githubAppInstallationID,
              github_repo_owner: githubRepoOwner,
              github_repo_name: githubRepoName,
              branch,
              open_pr: choice === "open_pr",
            },
            {
              project_id: projectId,
              cluster_id: clusterId,
              stack_name: stackName,
            }
          );
          if (res?.data?.url) {
            window.open(res.data.url, "_blank", "noreferrer");
            props.history.push(`/apps/${stackName}`);
          }
        }
      } catch (error) {
        console.log(error)
      } finally {
        setLoading(false)
      }
    } else {
      console.log("missing information");
    }
  }
  return (
    <Modal closeModal={closeModal}>
      <Text size={16}>
        Continuous Integration (CI) with GitHub Actions
      </Text>
      <Spacer height="15px" />
      <Text color="helper">
        In order to automatically update your services every time new code is pushed to your GitHub branch, the following file must exist in your GitHub repository:
      </Text>
      <Spacer y={1} />
      <ExpandableSection
        noWrapper
        expandText="[+] Show code"
        collapseText="[-] Hide code"
        Header={
          <ModalHeader>.github/workflows/porter.yml</ModalHeader>
        }
        isInitiallyExpanded
        spaced
        copy={getGithubAction(projectId, clusterId, stackName)}
        ExpandedSection={
          <YamlEditor
            value={getGithubAction(projectId, clusterId, stackName)}
            readOnly={true}
            height="300px"
          />
        }
      />
      <Spacer y={1} />
      <Text color="helper">
        Porter can open a PR for you to approve and merge this file into your repository, or you can add it yourself. If you allow Porter to open a PR, you will be redirected to the PR in a new tab after submitting below.
      </Text>
      <Spacer y={1} />
      <Select
        options={[
          { label: "I authorize Porter to open a PR on my behalf (recommended)", value: "open_pr" },
          { label: "I will copy the file into my repository myself", value: "copy" },
        ]}
        setValue={(x: string) => setChoice(x as Choice)}
        width="100%"
      />
      <StyledButton>
        <Button
          onClick={submit}
          width={"150px"}
          loadingText={"Submitting..."}
          status={loading ? "loading" : deploymentError ? (
            <Error message={deploymentError} />
          ) : undefined}
        >
          Deploy app
        </Button>
      </StyledButton>
    </Modal>
  )
}

export default withRouter(GithubActionModal);

const Tab = styled.span`
  margin-left: 20px;
  height: 1px;
`;

const ModalHeader = styled.div`
  font-weight: 600;
  font-size: 1.5vw;
  font-family: monospace; ;
`;

const StyledButton = styled.div`
  margin-top: 10px;
`;
