import React from "react";
import styled from "styled-components";

import { ActionConfigType } from "shared/types";

import RepoList from "./RepoList";
import InputRow from "../form-components/InputRow";
import Input from "components/porter/Input";

type Props = {
  actionConfig: ActionConfigType | null;
  setActionConfig: (x: ActionConfigType) => void;
  setBranch?: (x: string) => void;
  setDockerfilePath?: (x: string) => void;
  setFolderPath?: (x: string) => void;
  setBuildView?: (x: string) => void;
  setPorterYamlPath?: (x: string) => void;
};

const defaultActionConfig: ActionConfigType = {
  git_repo: null,
  image_repo_uri: null,
  git_branch: null,
  git_repo_id: 0,
  kind: "github",
};

const ActionConfEditorStack: React.FC<Props> = ({
  actionConfig,
  setBranch,
  setActionConfig,
  setFolderPath,
  setDockerfilePath,
  setBuildView,
  setPorterYamlPath,
}) => {
  if (!actionConfig.git_repo) {
    return (
      <ExpandedWrapperAlt>
        <RepoList
          actionConfig={actionConfig}
          setActionConfig={(x: ActionConfigType) => setActionConfig(x)}
          readOnly={false}
        />
      </ExpandedWrapperAlt>
    );
  } else {
    return (
      <>
        <Input
          disabled={true}
          label="GitHub repository:"
          width="100%"
          value={actionConfig?.git_repo}
          setValue={() => {}}
          placeholder=""
        />
        <BackButton
          width="135px"
          onClick={() => {
            setActionConfig({ ...defaultActionConfig });
            setBranch ? setBranch("") : null;
            setFolderPath ? setFolderPath("") : null;
            setDockerfilePath ? setDockerfilePath("") : null;
            setBuildView ? setBuildView("buildpacks") : null;
            setPorterYamlPath("");
          }}
        >
          <i className="material-icons">keyboard_backspace</i>
          Select repo
        </BackButton>
      </>
    );
  }
};

export default ActionConfEditorStack;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
`;

const ExpandedWrapperAlt = styled(ExpandedWrapper)`
  border: 0;
`;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 22px;
  cursor: pointer;
  font-size: 13px;
  height: 35px;
  padding: 5px 13px;
  margin-bottom: -7px;
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
  }
`;
