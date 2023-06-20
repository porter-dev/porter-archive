import React, { useState, useEffect, useContext, useCallback } from "react";
import styled from "styled-components";
import Button from "components/porter/Button";
import api from "shared/api";
import Error from "components/porter/Error";

import { Context } from "shared/Context";
import { FileType } from "shared/types";

import Spacer from "components/porter/Spacer";
import Modal from "components/porter/Modal";
import Input from "components/porter/Input";
import Text from "components/porter/Text";
import Link from "components/porter/Link";
import { PorterApp } from "../types/porterApp";
import AdvancedBuildSettings from "./AdvancedBuildSettings";

type PropsType = {
  setPorterYaml: (x: any) => void;
  porterApp: PorterApp;
  updatePorterApp: (attrs: Partial<PorterApp>) => void;
};

const DetectContentsList: React.FC<PropsType> = ({
  setPorterYaml,
  porterApp,
  updatePorterApp,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [contents, setContents] = useState<FileType[]>([]);
  const [changedPorterYaml, setChangedPorterYaml] = useState(true);
  const [displayInput, setDisplayInput] = useState(false);
  const [buttonStatus, setButtonStatus] = useState<React.ReactNode>("");

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
        item.path.includes(porterApp.porter_yaml_path + "porter.yaml")
      );
      if (porterYamlItem) {
        fetchAndSetPorterYaml(porterApp.porter_yaml_path + "porter.yaml");
        updatePorterApp({ porter_yaml_path: "porter.yaml" });
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
      updatePorterApp({ dockerfile: dockerFileItem.path });
    }
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
    if (currentProject == null) {
      return;
    }

    return api.getBranchContents(
      "<token>",
      { dir: porterApp.build_context || "./" },
      {
        project_id: currentProject.id,
        git_repo_id: porterApp.git_repo_id,
        kind: "github",
        owner: porterApp.repo_name.split("/")[0],
        name: porterApp.repo_name.split("/")[1],
        branch: porterApp.git_branch,
      }
    );
  };

  const fetchPorterYamlContent = async (porterYamlPath: string) => {
    try {
      if (currentProject == null) {
        return;
      }
      const res = await api.getPorterYamlContents(
        "<token>",
        {
          path: porterYamlPath,
        },
        {
          project_id: currentProject.id,
          git_repo_id: porterApp.git_repo_id,
          kind: "github",
          owner: porterApp.repo_name.split("/")[0],
          name: porterApp.repo_name.split("/")[1],
          branch: porterApp.git_branch,
        }
      );
      return res;
    } catch (err) {
      // console.log(err);
    }

  };

  const handleInputChange = (newValue: string) => {
    updatePorterApp({ porter_yaml_path: newValue });
    setChangedPorterYaml(newValue === "");
    if (!displayInput && newValue !== "") {
      setDisplayInput(true);
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
  };

  const ignoreModal = () => {
    toggleModal();
    updatePorterApp({ porter_yaml_path: "" });
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
            value={porterApp.porter_yaml_path}
            width="100%"
            setValue={(val: string) => updatePorterApp({ porter_yaml_path: val })}
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
              onClick={() => fetchAndSetPorterYaml(porterApp.porter_yaml_path)}
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
          {porterApp.porter_yaml_path !== "porter.yaml" &&
            (displayInput || porterApp.porter_yaml_path) && (
              <>
                <Text color="helper">Porter.yaml path:</Text>
                <Spacer y={0.5} />
                <Input
                  disabled={false}
                  placeholder="ex: ./"
                  value={porterApp.porter_yaml_path}
                  width="100%"
                  onValueChange={handleInputChange}
                />
                <Spacer y={0.5} />
                <Button
                  onClick={() => fetchAndSetPorterYaml(porterApp.porter_yaml_path)}
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
            porterApp={porterApp}
            updatePorterApp={updatePorterApp}
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
