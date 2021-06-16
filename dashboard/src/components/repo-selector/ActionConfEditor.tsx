import React, { useState, useEffect, useContext } from "react";
import styled from "styled-components";

import { ActionConfigType } from "shared/types";

import api from "shared/api";
import { Context } from "shared/Context";

import RepoList from "./RepoList";
import BranchList from "./BranchList";
import ContentsList from "./ContentsList";
import ActionDetails from "./ActionDetails";
import Loading from "../Loading";
import { act } from "react-dom/test-utils";

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
};

const defaultActionConfig: ActionConfigType = {
  git_repo: "",
  image_repo_uri: "",
  branch: "",
  git_repo_id: 0,
};

interface AutoBuildpack {
  name?: string;
  valid: boolean;
}

const ActionConfEditor: React.FC<Props> = (props) => {
  const [buildpackLoading, setBuildpackLoading] = useState(false);
  const [autoBuildpack, setAutoBuildpack] = useState<AutoBuildpack>({
    valid: false,
  });
  const { currentProject } = useContext(Context);

  const { actionConfig, setBranch, setActionConfig, branch } = props;

  useEffect(() => {
    if (
      !actionConfig.git_repo ||
      !branch ||
      props.dockerfilePath ||
      props.folderPath
    ) {
      return;
    }
    api
      .detectBuildpack(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          git_repo_id: actionConfig.git_repo_id,
          kind: "github",
          owner: actionConfig.git_repo.split("/")[0],
          name: actionConfig.git_repo.split("/")[1],
          branch: branch,
        }
      )
      .then(({ data }) => {
        setAutoBuildpack(data);
        setBuildpackLoading(false);
      })
      .catch((_) => {
        setBuildpackLoading(false);
      });
  }, [actionConfig.git_repo, branch, props.dockerfilePath, props.folderPath]);

  if (!actionConfig.git_repo) {
    return (
      <ExpandedWrapper>
        <RepoList
          actionConfig={actionConfig}
          setActionConfig={(x: ActionConfigType) => setActionConfig(x)}
          readOnly={false}
        />
      </ExpandedWrapper>
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
  } else if (!props.dockerfilePath && !props.folderPath) {
    if (buildpackLoading) {
      return <Loading />;
    }

    return (
      <>
        {autoBuildpack && autoBuildpack.valid && (
          <Banner>
            <i className="material-icons">info</i>{" "}
            <p>
              <b>{autoBuildpack.name}</b> buildpack was{" "}
              <a
                href="https://docs.getporter.dev/docs/auto-deploy-requirements#auto-build-with-cloud-native-buildpacks"
                target="_blank"
              >
                detected automatically
              </a>
              . Alternatively, select an application folder below:
            </p>
          </Banner>
        )}
        <ExpandedWrapperAlt>
          <ContentsList
            actionConfig={actionConfig}
            branch={branch}
            setActionConfig={setActionConfig}
            setDockerfilePath={(x: string) => props.setDockerfilePath(x)}
            setProcfilePath={(x: string) => props.setProcfilePath(x)}
            setFolderPath={(x: string) => props.setFolderPath(x)}
          />
        </ExpandedWrapperAlt>
        <Br />
        <BackButton
          width="145px"
          onClick={() => {
            setBranch("");
          }}
        >
          <i className="material-icons">keyboard_backspace</i>
          Select Branch
        </BackButton>
      </>
    );
  }

  if (
    props.procfilePath &&
    props.folderPath &&
    !props.dockerfilePath &&
    !props.procfileProcess
  ) {
    return (
      <>
        <ExpandedWrapperAlt>
          <ContentsList
            actionConfig={actionConfig}
            branch={branch}
            setActionConfig={setActionConfig}
            procfilePath={props.procfilePath}
            setDockerfilePath={(x: string) => props.setDockerfilePath(x)}
            setProcfilePath={(x: string) => props.setProcfilePath(x)}
            setProcfileProcess={(x: string) => props.setProcfileProcess(x)}
            setFolderPath={(x: string) => props.setFolderPath(x)}
          />
        </ExpandedWrapperAlt>
        <Br />
        <BackButton
          width="145px"
          onClick={() => {
            setBranch("");
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
  overflow-y: auto;
`;

const ExpandedWrapperAlt = styled(ExpandedWrapper)``;

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

const Banner = styled.div`
  height: 40px;
  width: 100%;
  margin: 5px 0 10px;
  font-size: 13px;
  display: flex;
  border-radius: 5px;
  padding-left: 15px;
  align-items: center;
  background: #ffffff11;
  > i {
    margin-right: 10px;
    font-size: 18px;
  }
`;
