import React, { useState, useEffect, useContext, useCallback } from "react";
import styled from "styled-components";
import Button from "components/porter/Button";
import api from "shared/api";
import Error from "components/porter/Error";

import { Context } from "shared/Context";
import { ActionConfigType, FileType } from "shared/types";

import Spacer from "components/porter/Spacer";
import AdvancedBuildSettings from "main/home/app-dashboard/build-settings/AdvancedBuildSettings";
import Modal from "components/porter/Modal";
import Input from "components/porter/Input";
import Text from "components/porter/Text";
import Link from "components/porter/Link";

interface AutoBuildpack {
  name?: string;
  valid: boolean;
}

type PropsType = {
  actionConfig: ActionConfigType | null;
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
  git_repo_id: number;
  git_repo_name: string;
  branch: string;
};

const DetectContentsList: React.FC<PropsType> = ({
  git_repo_id,
  git_repo_name,
  branch,
  setPorterYamlPath,
  porterYamlPath,
  setPorterYaml,
  setDockerfilePath,
  setBuildView,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [contents, setContents] = useState<FileType[]>([]);
  const [currentDir, setCurrentDir] = useState("");
  const [changedPorterYaml, setChangedPorterYaml] = useState(true);
  const [displayInput, setDisplayInput] = useState(false);
  const [buttonStatus, setButtonStatus] = useState<React.ReactNode>("");

  const [autoBuildpack, setAutoBuildpack] = useState<AutoBuildpack>({
    valid: false,
    name: "",
  });
  const { currentProject } = useContext(Context);
  const fetchAndSetPorterYaml = useCallback(async (fileName: string) => {
    try {
      setButtonStatus("loading");
      const response = await fetchPorterYamlContent(fileName);
      setPorterYaml(atob(response.data));
      setButtonStatus("success");
    } catch (error) {
      setButtonStatus(<Error message="Unable to detect porter.yaml" />);
      console.error("Error fetching porter.yaml content:", error);
    }
  }, []);

  const toggleModal = async () => {
    if (!showModal) {
      const porterYamlItem = contents.find((item: FileType) =>
        item.path.includes(porterYamlPath + "porter.yaml")
      );
      if (porterYamlItem) {
        fetchAndSetPorterYaml(porterYamlPath + "porter.yaml");
        setPorterYamlPath("porter.yaml");
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
      setDockerfilePath(dockerFileItem.path);
      setBuildView("docker");
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
    return api.getBranchContents(
      "<token>",
      { dir: currentDir || "./" },
      {
        project_id: currentProject.id,
        git_repo_id,
        kind: "github",
        owner: git_repo_name.split("/")[0],
        name: git_repo_name.split("/")[1],
        branch,
      }
    );
  };

  const fetchPorterYamlContent = async (porterYaml: string) => {
    try {
      const res = await api.getPorterYamlContents(
        "<token>",
        {
          path: porterYaml,
        },
        {
          project_id: currentProject.id,
          git_repo_id: git_repo_id,
          kind: "github",
          owner: git_repo_name.split("/")[0],
          name: git_repo_name.split("/")[1],
          branch: branch,
        }
      );
      return res;
    } catch (err) {
      // console.log(err);
    }

  };
  const detectBuildpacks = () => {
    return api.detectBuildpack(
      "<token>",
      {
        dir: currentDir || ".",
      },
      {
        project_id: currentProject.id,
        git_repo_id: git_repo_id,
        kind: "github",
        owner: git_repo_name.split("/")[0],
        name: git_repo_name.split("/")[1],
        branch: branch,
      }
    );
  };

  const handleInputChange = (newValue: string) => {
    setPorterYamlPath(newValue);
    setChangedPorterYaml(newValue === "");
    if (!displayInput && newValue !== "") {
      setDisplayInput(true);
    }
  };
  const handleUpdatePorterYamlPath = () => {
    setPorterYamlPath(porterYamlPath);
    fetchAndSetPorterYaml(porterYamlPath);
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

    fetchAndSetPorterYaml(porterYamlPath);
  };
  const ignoreModal = () => {
    toggleModal();

    setPorterYamlPath("");
  };

  const NoPorterYamlContent = () => (
    <div>
      <Text size={16}>No porter.yaml detected</Text>
      <Spacer y={1} />
      <span>
        <Text color="helper">
          We were unable to find <Code>porter.yaml</Code> in your root directory. We
          recommend that you add a <Code>porter.yaml</Code> file to your root directory
          or specify the path here.
        </Text>
        <Link
          to="https://docs.porter.run/standard/deploying-applications/writing-porter-yaml"
          target="_blank"
          hasunderline
        >
          Using porter.yaml
        </Link>
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
            value={porterYamlPath}
            width="100%"
            setValue={setPorterYamlPath}
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
          {porterYamlPath != "porter.yaml" &&
            (displayInput || porterYamlPath) && (
              <>
                <Text color="helper">Porter.yaml path:</Text>
                <Spacer y={0.5} />
                <Input
                  disabled={false}
                  placeholder="ex: ./"
                  value={porterYamlPath}
                  width="100%"
                  onValueChange={handleInputChange}
                />
                <Spacer y={0.5} />
                <Button
                  onClick={handleUpdatePorterYamlPath}
                  loadingText="Submitting..."
                  color={changedPorterYaml ? "#ffffff11" : "#616fee"}
                  status={buttonStatus}
                  disabled={changedPorterYaml}
                >
                  Update Path
                </Button>
                <Spacer y={1} />
              </>
            )}
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

const Code = styled.span`
  font-family: monospace;
`;
