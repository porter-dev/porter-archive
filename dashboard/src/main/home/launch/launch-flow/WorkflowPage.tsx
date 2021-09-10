import React, { useContext, useEffect, useState } from "react";
import { RouteComponentProps } from "react-router";
import { FullActionConfigType } from "../../../../shared/types";
import api from "../../../../shared/api";
import { Context } from "../../../../shared/Context";
import styled from "styled-components";
import YamlEditor from "../../../../components/YamlEditor";
import Loading from "../../../../components/Loading";
import Helper from "../../../../components/form-components/Helper";
import CheckboxRow from "../../../../components/form-components/CheckboxRow";
import SaveButton from "../../../../components/SaveButton";

type PropsType = {
  name: string;
  namespace: string;
  fullActionConfig: FullActionConfigType;
  shouldCreateWorkflow: boolean;
  setShouldCreateWorkflow: (x: (prevState: boolean) => boolean) => void;
  setPage: (x: string) => void;
};

const WorkflowPage: React.FC<PropsType> = (props) => {
  const context = useContext(Context);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [workflowYAML, setWorkflowYAML] = useState("");

  useEffect(() => {
    const { currentCluster, currentProject } = context;

    api
      .getGHAWorkflowTemplate(
        "<token>",
        {
          name: props.name,
          github_action_config: props.fullActionConfig,
        },
        {
          namespace: props.namespace,
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      )
      .then((res) => {
        setWorkflowYAML(res.data);
        setIsLoading(false);
      })
      .catch((err) => setHasError(true))
      .finally(() => setIsLoading(false));
  }, []);

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
    return <YamlEditor value={workflowYAML} readOnly={true} />;
  };

  const getButtonHelper = () => {
    if (props.shouldCreateWorkflow) {
      return "Both secrets and workflow will be created";
    } else {
      return "Only secrets will be created";
    }
  };

  return (
    <StyledWorkflowPage>
      <BackButton width="155px" onClick={() => props.setPage("source")}>
        <i className="material-icons">first_page</i>
        Source Settings
      </BackButton>
      <Heading>GitHub Actions</Heading>
      <Helper>
        To auto-deploy each time you push changes, Porter will write GitHub
        Secrets and this GitHub Actions workflow to your repository.
      </Helper>
      {renderWorkflow()}
      <CheckboxRow
        toggle={() => props.setShouldCreateWorkflow((x: boolean) => !x)}
        checked={props.shouldCreateWorkflow}
        label="Create workflow file"
      />
      <Helper>
        You may copy the YAML to an existing workflow and uncheck this box to
        prevent Porter from creating a new workflow file.
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
      <SaveButton
        text="Continue"
        makeFlush={true}
        disabled={hasError}
        onClick={() => props.setPage("settings")}
        helper={getButtonHelper()}
      />
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

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 13px;
  margin-top: 25px;
  height: 35px;
  padding: 5px 13px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
    margin-left: -2px;
  }
`;

const GitHubActionLink = styled.p`
  visibility: ${(props: { show: boolean }) =>
    props.show ? "visible" : "hidden"};
`;
