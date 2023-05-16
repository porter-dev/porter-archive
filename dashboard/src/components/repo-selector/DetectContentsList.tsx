import React, { useState, useEffect, useContext, useCallback } from "react";
import styled from "styled-components";
import file from "assets/file.svg";
import folder from "assets/folder.svg";
import info from "assets/info.svg";
import close from "assets/close.png";
import Button from "components/porter/Button";
import api from "../../shared/api";
import { Context } from "../../shared/Context";
import { ActionConfigType, BuildConfig, FileType } from "../../shared/types";

import Loading from "../Loading";
import Spacer from "components/porter/Spacer";
import AdvancedBuildSettings from "main/home/app-dashboard/new-app-flow/AdvancedBuildSettings";
import { render } from "react-dom";
import Modal from "components/porter/Modal";
import Input from "components/porter/Input";
import Text from "components/porter/Text";
import { set } from "lodash";

interface AutoBuildpack {
  name?: string;
  valid: boolean;
}

type PropsType = {
  actionConfig: ActionConfigType | null;
  branch: string;
  dockerfilePath?: string;
  folderPath: string;
  porterYaml?: string;
  setActionConfig: (x: ActionConfigType) => void;
  setDockerfilePath: (x: string) => void;
  setFolderPath: (x: string) => void;
  setBuildConfig: (x: any) => void;
  setPorterYaml: (x: any) => void;
  buildView: string;
  setBuildView: (x: string) => void;
  porterYamlPath: string;
  setPorterYamlPath: (x: string) => void;
};

const DetectContentsList: React.FC<PropsType> = (props) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [contents, setContents] = useState<FileType[]>([]);
  const [currentDir, setCurrentDir] = useState("");

  const [autoBuildpack, setAutoBuildpack] = useState<AutoBuildpack>({
    valid: false,
    name: "",
  });
  const [showingBuildContextPrompt, setShowingBuildContextPrompt] = useState(
    "buildpacks"
  );
  const context = useContext(Context);
  const fetchAndSetPorterYaml = useCallback(async (fileName: string) => {
    try {
      const response = await fetchPorterYamlContent(fileName);
      props.setPorterYaml(atob(response.data));
    } catch (error) {
      console.error("Error fetching porter.yaml content:", error);
    }
  }, []);

  const toggleModal = async () => {
    if (!showModal) {
      const porterYamlItem = contents.find((item: FileType) =>
        item.path.includes(props.porterYamlPath + "porter.yaml")
      );
      if (porterYamlItem) {
        fetchAndSetPorterYaml(props.porterYamlPath + "porter.yaml");
        props.setPorterYamlPath("porter.yaml");
        return;
      }
    }
    setShowModal(!showModal);
  };

  useEffect(() => {
    if (!loading) {
      toggleModal();
    }
  }, [loading]);

  useEffect(() => {
    updateContents();
  }, []);
  useEffect(() => {
    const dockerFileItem = contents.find((item: FileType) =>
      item.path.includes("Dockerfile")
    );

    if (dockerFileItem) {
      props.setDockerfilePath(dockerFileItem.path);
      props.setBuildView("docker");
    }
  }, [contents]);

  useEffect(() => {
    detectBuildpacks().then(({ data }) => {
      setAutoBuildpack(data);
    });
  }, [contents]);

  const renderContentList = () => {
    contents.map((item: FileType, i: number) => {
      let splits = item.path.split("/");
      let fileName = splits[splits.length - 1];
      if (fileName.includes("Dockerfile")) {
        return false;
      }
    });

    return true;
  };

  const fetchContents = () => {
    let { currentProject } = context;
    const { actionConfig, branch } = props;

    if (actionConfig.kind === "gitlab") {
      return api
        .getGitlabFolderContent(
          "<token>",
          { dir: currentDir || "./" },
          {
            project_id: currentProject.id,
            integration_id: actionConfig.gitlab_integration_id,
            repo_owner: actionConfig.git_repo.split("/")[0],
            repo_name: actionConfig.git_repo.split("/")[1],
            branch: branch,
          }
        )
        .then((res) => {
          const { data } = res;

          return {
            data: data.map((x: FileType) => ({
              ...x,
              type: x.type === "tree" ? "dir" : "file",
            })),
          };
        });
    }
    return api.getBranchContents(
      "<token>",
      { dir: currentDir || "./" },
      {
        project_id: currentProject.id,
        git_repo_id: actionConfig.git_repo_id,
        kind: "github",
        owner: actionConfig.git_repo.split("/")[0],
        name: actionConfig.git_repo.split("/")[1],
        branch: branch,
      }
    );
  };

  const fetchPorterYamlContent = async (porterYaml: string) => {
    let { currentProject } = context;
    let { actionConfig, branch } = props;

    try {
      const res = await api.getPorterYamlContents(
        "<token>",
        {
          path: porterYaml,
        },
        {
          project_id: currentProject.id,
          git_repo_id: actionConfig.git_repo_id,
          kind: "github",
          owner: actionConfig.git_repo.split("/")[0],
          name: actionConfig.git_repo.split("/")[1],
          branch: branch,
        }
      );
      return res;
    } catch (err) {
      console.log(err);
    }
  };
  const detectBuildpacks = () => {
    let { currentProject } = context;
    let { actionConfig, branch } = props;

    if (actionConfig.kind === "github") {
      return api.detectBuildpack(
        "<token>",
        {
          dir: currentDir || ".",
        },
        {
          project_id: currentProject.id,
          git_repo_id: actionConfig.git_repo_id,
          kind: "github",
          owner: actionConfig.git_repo.split("/")[0],
          name: actionConfig.git_repo.split("/")[1],
          branch: branch,
        }
      );
    }
  };

  const updateContents = async () => {
    try {
      const res = await fetchContents();
      let files = [] as FileType[];
      let folders = [] as FileType[];
      res.data.map((x: FileType, i: number) => {
        x.type === "dir" ? folders.push(x) : files.push(x);
      });

      folders.sort((a: FileType, b: FileType) => {
        return a.path < b.path ? 1 : 0;
      });
      files.sort((a: FileType, b: FileType) => {
        return a.path < b.path ? 1 : 0;
      });
      let contents = folders.concat(files);

      setContents(contents);
      setLoading(false);
      setError(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
      setError(true);
    }

    try {
      const { data } = await detectBuildpacks();
      setAutoBuildpack(data);
    } catch (err) {
      console.log(err);
      setAutoBuildpack({
        valid: false,
      });
    }
  };
  const updatePorterYamlPath = () => {
    toggleModal();

    fetchAndSetPorterYaml(props.porterYamlPath);
  };
  const ignoreModal = () => {
    toggleModal();

    props.setPorterYamlPath("");
  };

  const NoPorterYamlContent = () => (
    <div>
      <Text size={16}>No porter.yaml detected</Text>
      <Spacer y={1} />
      <span>
        <Text color="helper">
          We were unable to find porter.yaml in your root directory. We recommend that you
        </Text>{" "}<a
          href="https://docs.porter.run/deploying-applications/application-porter-yaml-reference"
          target="_blank"
          rel="noopener noreferrer"
        >
          add porter.yaml
        </a>{" "}<Text color="helper">
          to your root directory or specify the subdirectory path here.
        </Text>
      </span>
    </div>
  );
  return (
    <>
      {showModal && (
        <Modal closeModal={toggleModal}>
          <NoPorterYamlContent />
          <Spacer y={0.5} />
          <Text color="helper">Porter.yaml path:</Text>
          <Spacer y={0.5} />
          <Input
            disabled={false}
            placeholder="ex: ./subdirectory/porter.yaml"
            value={props.porterYamlPath}
            width="100%"
            setValue={props.setPorterYamlPath}
          />
          <Spacer y={1} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Button
              onClick={ignoreModal}
              loadingText="Submitting..."
              color="#ffffff11"
              status={loading ? "loading" : undefined}
            >
              Ignore
            </Button>
            <Button
              onClick={updatePorterYamlPath}
              loadingText="Submitting..."
              color="#616fee"
              status={loading ? "loading" : undefined}
            >
              Update Path
            </Button>
          </div>
        </Modal>
      )}
      {renderContentList() && (
        <>
          <AdvancedBuildSettings
            dockerfilePath={props.dockerfilePath}
            setDockerfilePath={props.setDockerfilePath}
            setBuildConfig={props.setBuildConfig}
            autoBuildPack={autoBuildpack}
            showSettings={false}
            actionConfig={props.actionConfig}
            branch={props.branch}
            folderPath={props.folderPath}
            buildView={props.buildView}
            setBuildView={props.setBuildView}
          />
        </>
      )}
    </>
  );
};

export default DetectContentsList;

const FlexWrapper = styled.div`
  position: absolute;
  bottom: 28px;
  left: 195px;
  display: flex;
  align-items: center;
`;

const StatusWrapper = styled.a<{ successful?: boolean }>`
  display: flex;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #949eff;
  margin-right: 25px;
  margin-left: 20px;
  cursor: pointer;
  text-decoration: none;

  > i {
    font-size: 18px;
    margin-right: 8px;
  }
`;

const BgOverlay = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: -1;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const Indicator = styled.div<{ selected: boolean }>`
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1px solid #ffffff55;
  margin: 1px 10px 0px 1px;
  margin-right: 13px;
  background: ${(props) => (props.selected ? "#ffffff22" : "#ffffff11")};
`;

const Label = styled.div`
  max-width: 500px;
  line-height: 1.5em;
  text-align: center;
  font-size: 14px;
`;

const MultiSelectRow = styled.div`
  display: flex;
  min-width: 150px;
  justify-content: space-between;
`;

const DockerfileList = styled.div`
  border-radius: 3px;
  margin-top: 20px;
  border: 1px solid #aaaabb;
  background: #ffffff22;
  width: 100%;
  max-width: 500px;
  max-height: 140px;
  overflow-y: auto;
`;

const Row = styled.div<{ isLast: boolean }>`
  height: 35px;
  padding-left: 10px;
  display: flex;
  align-items: center;
  border-bottom: ${(props) => !props.isLast && "1px solid #aaaabb"};
  cursor: pointer;
  :hover {
    background: #ffffff22;
  }
`;

const ConfirmButton = styled.div`
  font-size: 18px;
  padding: 7px 12px;
  outline: none;
  border: 1px solid white;
  margin-top: 25px;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  opacity: 0;
  font-family: "Work Sans", sans-serif;
  font-size: 14px;
  font-weight: 500;
  animation: linEnter 0.3s 0.1s;
  animation-fill-mode: forwards;
  @keyframes linEnter {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0px);
      opacity: 1;
    }
  }
  :hover {
    background: white;
    color: #232323;
  }
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 0 90px;
`;

const UseButton = styled.div`
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #616feecc;
  font-weight: 500;
  padding: 10px 15px;
  border-radius: 100px;
  cursor: pointer;
  :hover {
    filter: brightness(120%);
  }
`;

const BackLabel = styled.div`
  font-size: 16px;
  padding-left: 16px;
  margin-top: -4px;
  padding-bottom: 4px;
`;

const Item = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid
    ${(props: { lastItem: boolean; isSelected?: boolean }) =>
      props.lastItem ? "#00000000" : "#606166"};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: ${(props: { isSelected?: boolean; lastItem: boolean }) =>
    props.isSelected ? "#ffffff22" : "#ffffff11"};
  :hover {
    background: #ffffff22;

    > i {
      background: #ffffff22;
    }
  }

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
  }
`;

const FileItem = styled(Item)`
  cursor: ${(props: { isADocker?: boolean }) =>
    props.isADocker ? "pointer" : "default"};
  color: ${(props: { isADocker?: boolean }) =>
    props.isADocker ? "#fff" : "#ffffff55"};
  :hover {
    background: ${(props: { isADocker?: boolean }) =>
      props.isADocker ? "#ffffff22" : "#ffffff11"};
  }
`;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  background: #ffffff11;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
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

const Banner = styled.div`
  height: 40px;
  width: 100%;
  margin: 5px 0 10px;
  font-size: 13px;
  display: flex;
  border-radius: 8px;
  padding-left: 15px;
  align-items: center;
  background: #ffffff11;
  > i {
    margin-right: 10px;
    font-size: 18px;
  }
`;
const DetectedBuildMessage = styled.div`
  color: #0f872b;
  display: flex;
  align-items: center;
  border-radius: 5px;
  margin-right: 10px;

  > i {
    margin-right: 6px;
    font-size: 20px;
    border-radius: 20px;
    transform: none;
  }
`;
