import React from "react";
import styled from "styled-components";

import { ActionConfigType } from "shared/types";

import RepoList from "./RepoList";
import BranchList from "./BranchList";
import ContentsList from "./ContentsList";
import ActionDetails from "./ActionDetails";

type Props = {
  actionConfig: ActionConfigType | null;
  branch: string;
  setActionConfig: (x: ActionConfigType) => void;
  setBranch: (x: string) => void;
  reset: any;
  dockerfilePath: string;
  procfilePath: string;
  procfileProcess: string;
  setDockerfilePath: (x: string) => void;
  setProcfileProcess: (x: string) => void;
  setProcfilePath: (x: string) => void;
  folderPath: string;
  setFolderPath: (x: string) => void;
  setSelectedRegistry: (x: any) => void;
  selectedRegistry: any;
  setBuildConfig: (x: any) => void;
};

const defaultActionConfig: ActionConfigType = {
  git_repo: "",
  image_repo_uri: "",
  git_branch: "",
  git_repo_id: 0,
  kind: "github",
};

const ActionConfEditor: React.FC<Props> = (props) => {
  const { actionConfig, setBranch, setActionConfig, branch } = props;

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
  } else if (!branch) {
    return (
      <>
        <ExpandedWrapperAlt>
          <BranchList
            actionConfig={actionConfig}
            setBranch={(branch: string) => setBranch(branch)}
          />
        </ExpandedWrapperAlt>
        <Br />
        <BackButton
          width="135px"
          onClick={() => {
            setActionConfig({ ...defaultActionConfig });
          }}
        >
          <i className="material-icons">keyboard_backspace</i>
          Select Repo
        </BackButton>
      </>
    );
  } else if (
    // select dockerfile or buildpack build context
    (!props.dockerfilePath && !props.folderPath) ||
    // select procfile process
    (props.procfilePath &&
      props.folderPath &&
      !props.dockerfilePath &&
      !props.procfileProcess) ||
    // select docker build context
    (props.dockerfilePath && !props.folderPath)
  ) {
    return (
      <>
        <ContentsList
          actionConfig={actionConfig}
          branch={branch}
          dockerfilePath={props.dockerfilePath}
          procfilePath={props.procfilePath}
          folderPath={props.folderPath}
          setActionConfig={setActionConfig}
          setDockerfilePath={(x: string) => props.setDockerfilePath(x)}
          setProcfilePath={(x: string) => props.setProcfilePath(x)}
          setProcfileProcess={(x: string) => props.setProcfileProcess(x)}
          setFolderPath={(x: string) => props.setFolderPath(x)}
        />
        <Br />
        <BackButton
          width="145px"
          onClick={() => {
            setBranch("");
            props.setDockerfilePath("");
          }}
        >
          <i className="material-icons">keyboard_backspace</i>
          Select Branch
        </BackButton>
      </>
    );
  }

  return (
    <ActionDetails
      branch={branch}
      setDockerfilePath={props.setDockerfilePath}
      setFolderPath={props.setFolderPath}
      setProcfilePath={props.setProcfilePath}
      setProcfileProcess={props.setProcfileProcess}
      actionConfig={actionConfig}
      setActionConfig={setActionConfig}
      dockerfilePath={props.dockerfilePath}
      procfilePath={props.procfilePath}
      folderPath={props.folderPath}
      setSelectedRegistry={props.setSelectedRegistry}
      selectedRegistry={props.selectedRegistry}
      setBuildConfig={props.setBuildConfig}
    />
  );
};

export default ActionConfEditor;

const Br = styled.div`
  width: 100%;
  height: 8px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const HeaderButton = styled.div`
  margin-bottom: 5px;
  padding: 5px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  margin-right: 10px;
`;

const RepoHeader = styled.div`
  display: flex;
  align-items: center;
`;

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
