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

type PropsType = {
  setPorterYaml: (yaml: string, filename: string) => void;
  porterApp: PorterApp;
  updatePorterApp: (attrs: Partial<PorterApp>) => void;
};

const DetectDockerfileAndPorterYaml: React.FC<PropsType> = ({
  setPorterYaml,
  porterApp,
  updatePorterApp,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [contents, setContents] = useState<FileType[]>([]);
  const [buttonStatus, setButtonStatus] = useState<React.ReactNode>("");
  const [possiblePorterYamlPath, setPossiblePorterYamlPath] = useState<string>("");

  const { currentProject } = useContext(Context);
  const fetchAndSetPorterYaml = async (fileName: string) => {
    setButtonStatus("loading");
    const response = await fetchPorterYamlContent(fileName);
    if (response == null) {
      setButtonStatus(<Error message="Unable to detect porter.yaml. Please check your path and try again, or continue without using porter.yaml." />);
    } else {
      setPorterYaml(atob(response.data), fileName);
      setButtonStatus("success");
    }
    setShowModal(false);
  };

  useEffect(() => {
    const fetchOnRender = async () => {
      try {
        const response = await fetchPorterYamlContent("./porter.yaml");
        setPorterYaml(atob(response.data), "./porter.yaml");
      } catch (error) {
        setShowModal(true);
      }
    };
    fetchOnRender();
  }, []);

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

  const NoPorterYamlContent = () => (
    <div>
      <Text size={16}>No <Code>porter.yaml</Code> detected</Text>
      <Spacer y={0.5} />
      <span>
        <Text color="helper">
          We were unable to find a <Code>porter.yaml</Code> file in your root directory. We
          recommend that you add a <Code>porter.yaml</Code> file to your root directory
          or specify the path here.
        </Text>
        <Spacer y={0.5} />
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
        <Modal closeModal={() => setShowModal(false)}>
          <NoPorterYamlContent />
          <Spacer y={0.5} />
          <Text color="helper">Path to <Code>porter.yaml</Code> from repository root:</Text>
          <Spacer y={0.5} />
          <Input
            disabled={false}
            placeholder="ex: ./subdirectory/porter.yaml"
            value={possiblePorterYamlPath}
            width="100%"
            setValue={setPossiblePorterYamlPath}
          />
          <Spacer y={1} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Button
              onClick={() => {
                setShowModal(false);
                updatePorterApp({ porter_yaml_path: "" });
              }}
              loadingText="Submitting..."
              color="#ffffff11"
              status={loading ? "loading" : undefined}
            >
              Ignore
            </Button>
            <Button
              onClick={() => fetchAndSetPorterYaml(possiblePorterYamlPath)}
              loadingText="Submitting..."
              color="#616fee"
              status={loading ? "loading" : undefined}
            >
              Update path
            </Button>
          </div>
        </Modal>
      )}
      {renderContentList() && (
        <>
          {possiblePorterYamlPath !== "" && (
            <>
              <Text color="helper">Porter.yaml path:</Text>
              <Spacer y={0.5} />
              <Input
                disabled={false}
                placeholder="ex: ./"
                value={possiblePorterYamlPath}
                width="100%"
                onValueChange={setPossiblePorterYamlPath}
              />
              <Spacer y={1} />
              <Button
                onClick={() => fetchAndSetPorterYaml(possiblePorterYamlPath)}
                loadingText="Submitting..."
                status={buttonStatus}
              >
                Update Path
              </Button>
              <Spacer y={1} />
            </>
          )}

        </>
      )}
    </>
  );
};

export default DetectDockerfileAndPorterYaml;

const Code = styled.span`
  font-family: monospace;
`;
