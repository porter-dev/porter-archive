import React, { useContext, useEffect, useState } from "react";
import { FullActionConfigType } from "../../../../shared/types";
import api from "../../../../shared/api";
import { Context } from "../../../../shared/Context";
import styled from "styled-components";
import YamlEditor from "../../../../components/YamlEditor";
import Loading from "../../../../components/Loading";
import Helper from "../../../../components/form-components/Helper";

type PropsType = {
  name: string;
  namespace: string;
  fullActionConfig: FullActionConfigType;
  shouldCreateWorkflow?: boolean;
  setShouldCreateWorkflow?: (x: (prevState: boolean) => boolean) => void;
  setPage?: (x: string) => void;
};

const WorkflowPage: React.FC<PropsType> = (props) => {
  const context = useContext(Context);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [workflowYAML, setWorkflowYAML] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const { currentCluster, currentProject } = context;
    let isSubscribed = true;
    api
      .getGHAWorkflowTemplate(
        "<token>",
        {
          release_name: props.name,
          github_action_config: props.fullActionConfig,
        },
        {
          namespace: props.namespace,
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      )
      .then((res) => {
        if (isSubscribed) {
          setWorkflowYAML(res.data);
          setIsLoading(false);
        }
      })
      .catch((err) => setHasError(true))
      .finally(() => setIsLoading(false));
    return () => {
      isSubscribed = false;
    };
  }, [props.name, props.namespace, props.fullActionConfig]);

  const renderWorkflow = () => {
    if (isLoading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (hasError) {
      return (
        <Placeholder>
          <i className="material-icons">error</i> Error retrieving workflow.
        </Placeholder>
      );
    }
    return <AnimatedYamlEditor value={workflowYAML} readOnly={true} />;
  };

  return (
    <StyledWorkflowPage>
      <Heading>GitHub Actions</Heading>
      <Helper>
        To auto-deploy each time you push changes, Porter will write GitHub
        Secrets and this GitHub Actions workflow to your repository.
      </Helper>
      <ExpandableButton onClick={() => setIsExpanded((prev) => !prev)}>
        Show Porter workflow{" "}
        <i className="material-icons-outlined">
          {isExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down"}
        </i>
      </ExpandableButton>
      {isExpanded && renderWorkflow()}
      <Helper>
        <GitHubActionLink show={!props.shouldCreateWorkflow}>
          If you want to create a custom workflow file for your deployments, we
          recommend you <b>deploy from docker instead</b>, and checkout this
          guide:{" "}
          <a
            href="https://docs.porter.run/docs/auto-deploy-requirements#cicd-with-github-actions"
            target="_blank"
          >
            CI/CD with GitHub Actions
          </a>
        </GitHubActionLink>
        <GitHubActionLink show={!props.shouldCreateWorkflow}>
          The GitHub Action can be found at{" "}
          <a
            href="https://github.com/porter-dev/porter-update-action"
            target="_blank"
          >
            porter-dev/porter-update-action
          </a>
        </GitHubActionLink>
      </Helper>
      <Buffer />
    </StyledWorkflowPage>
  );
};

export default WorkflowPage;

const StyledWorkflowPage = styled.div`
  position: relative;
  margin-top: -5px;
`;

const Heading = styled.div<{ isAtTop?: boolean }>`
  color: white;
  font-weight: 500;
  font-size: 16px;
  margin-bottom: 5px;
  margin-top: ${(props) => (props.isAtTop ? "10px" : "30px")};
  display: flex;
  align-items: center;
`;

const LoadingWrapper = styled.div`
  padding: 200px;
`;

const Placeholder = styled.div`
  padding: 200px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  font-size: 14px;

  > i {
    font-size: 18px;
    margin-right: 12px;
  }
`;

const Buffer = styled.div`
  width: 100%;
  height: 35px;
`;

const ExpandableButton = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 13px;
  margin-top: 25px;
  height: 40px;
  padding: 5px 13px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 5px;
  width: 100%;
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 24px;
    margin-right: 6px;
    margin-left: -2px;
  }
`;

// This should carry animations for the yaml editor to be more gently introduce into the page
const AnimatedYamlEditor = styled(YamlEditor)``;

const GitHubActionLink = styled.p`
  visibility: ${(props: { show: boolean }) =>
    props.show ? "visible" : "hidden"};
`;
