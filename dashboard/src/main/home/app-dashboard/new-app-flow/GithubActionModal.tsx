import Modal from "components/porter/Modal";
import React, { useContext } from "react";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import ExpandableSection from "components/porter/ExpandableSection";
import Fieldset from "components/porter/Fieldset";
import styled from "styled-components";
import Button from "components/porter/Button";
import Select from "components/porter/Select";
import api from "shared/api";
import { CopyBlock } from "react-code-blocks";
import { getGithubAction } from "./utils";
import AceEditor from "react-ace";
import YamlEditor from "components/YamlEditor";


interface GithubActionModalProps {
  closeModal: () => void;
  githubAppInstallationID?: number;
  githubRepoOwner?: string;
  githubRepoName?: string;
  branch?: string;
  stackName?: string;
  projectId?: number;
  clusterId?: number;
  deployPorterApp: () => void;
}

type Choice = "open_pr" | "copy";

const GithubActionModal: React.FC<GithubActionModalProps> = ({
  closeModal,
  githubAppInstallationID,
  githubRepoOwner,
  githubRepoName,
  branch,
  stackName,
  projectId,
  clusterId,
  deployPorterApp,
}) => {
  const [choice, setChoice] = React.useState<Choice>("open_pr");
  const [loading, setLoading] = React.useState<boolean>(false);

  const submit = async () => {
    if (githubAppInstallationID && githubRepoOwner && githubRepoName && branch && stackName) {
      try {
        setLoading(true)
        // this creates the dummy chart
        deployPorterApp();

        // this creates the secret and possily the PR
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
          window.open(res.data.url, "_blank", "noreferrer")
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
        Porter can open a PR for you to approve and merge this file into your repository, or you can add it yourself. If you allow Porter to open a PR, you will be redirected to the PR in a new tab after hitting Complete below.
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
      <Button
        onClick={submit}
        width={"100%"}
        status={loading ? "loading" : undefined}
        loadingText="Opening PR..."
      >
        Complete
      </Button>
    </Modal>
  )
}

export default GithubActionModal;

const Tab = styled.span`
  margin-left: 20px;
  height: 1px;
`;

const ModalHeader = styled.div`
  font-weight: 600;
  font-size: 1.5vw;
  font-family: monospace; ;
`;