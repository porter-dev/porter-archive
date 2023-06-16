import React from "react";
import styled from "styled-components";

import Input from "components/porter/Input";
import RepositorySelector from "main/home/app-dashboard/build-settings/RepositorySelector";
import { PorterApp } from "main/home/app-dashboard/types/porterApp";

type Props = {
  git_repo: string;
  setBuildView?: (x: string) => void;
  updatePorterApp: (attrs: Partial<PorterApp>) => void;
};

const ActionConfEditorStack: React.FC<Props> = ({
  git_repo,
  setBuildView,
  updatePorterApp,
}) => {
  if (git_repo === "") {
    return (
      <ExpandedWrapper>
        <RepositorySelector
          readOnly={false}
          updatePorterApp={updatePorterApp}
          git_repo={git_repo}
        />
      </ExpandedWrapper>
    );
  } else {
    return (
      <>
        <Input
          disabled={true}
          label="GitHub repository:"
          width="100%"
          value={git_repo}
          setValue={() => { }}
          placeholder=""
        />
        <BackButton
          width="135px"
          onClick={() => {
            setBuildView ? setBuildView("buildpacks") : null;
            updatePorterApp({
              repo_name: "",
              git_branch: "",
              dockerfile: "",
              build_context: "",
              porter_yaml_path: "",
            })
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
  max-height: 275px;
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
