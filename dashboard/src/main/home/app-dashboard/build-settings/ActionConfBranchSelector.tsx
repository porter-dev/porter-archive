import React from "react";
import styled from "styled-components";

import Input from "components/porter/Input";
import { PorterApp } from "../types/porterApp";
import RepositorySelector from "./RepositorySelector";
import BranchSelector from "./BranchSelector";

type Props = {
  git_repo: string;
  git_repo_id: number;
  branch: string;
  setBuildView?: (x: string) => void;
  updatePorterApp: (attrs: Partial<PorterApp>) => void;
};

const ActionConfEditorStack: React.FC<Props> = ({
  git_repo,
  git_repo_id,
  branch,
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
  } else if (branch === "") {
    return (
      <>
        <ExpandedWrapper>
          <BranchSelector
            setBranch={(branch: string) => updatePorterApp({ git_branch: branch })}
            repo_name={git_repo}
            git_repo_id={git_repo_id}
          />
        </ExpandedWrapper>
        <Br />
      </>
    );
  }
  return (
    <>
      <Input
        disabled={true}
        label="GitHub branch:"
        type="text"
        width="100%"
        value={branch}
        setValue={() => { }}
        placeholder=""
      />
      <BackButton
        width="145px"
        onClick={() => {
          setBuildView ? setBuildView("buildpacks") : null;
          updatePorterApp({
            git_branch: "",
            dockerfile: "",
            build_context: "",
            porter_yaml_path: "",
          })
        }}
      >
        <i className="material-icons">keyboard_backspace</i>
        Select branch
      </BackButton>
    </>
  );
};

export default ActionConfEditorStack;

const Br = styled.div`
  width: 100%;
  height: 8px;
`;

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
