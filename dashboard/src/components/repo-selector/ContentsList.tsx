import React, { Component } from "react";
import styled from "styled-components";
import file from "assets/file.svg";
import folder from "assets/folder.svg";
import info from "assets/info.svg";
import close from "assets/close.png";

import api from "../../shared/api";
import { Context } from "../../shared/Context";
import { ActionConfigType, FileType } from "../../shared/types";

import Loading from "../Loading";

interface AutoBuildpack {
  name?: string;
  valid: boolean;
}

type PropsType = {
  actionConfig: ActionConfigType | null;
  branch: string;
  dockerfilePath?: string;
  folderPath: string;
  procfilePath?: string;
  setActionConfig: (x: ActionConfigType) => void;
  setProcfileProcess?: (x: string) => void;
  setDockerfilePath: (x: string) => void;
  setProcfilePath: (x: string) => void;
  setFolderPath: (x: string) => void;
};

type StateType = {
  loading: boolean;
  error: boolean;
  contents: FileType[];
  currentDir: string;
  dockerfiles: string[];
  processes: Record<string, string>;
  autoBuildpack: AutoBuildpack;
  showingBuildContextPrompt: boolean;
};

export default class ContentsList extends Component<PropsType, StateType> {
  state = {
    loading: true,
    error: false,
    contents: [] as FileType[],
    currentDir: "",
    dockerfiles: [] as string[],
    processes: null as Record<string, string>,
    autoBuildpack: {
      valid: false,
      name: "",
    },
    showingBuildContextPrompt: true,
  };

  componentDidMount() {
    this.updateContents();
  }

  setSubdirectory = (x: string) => {
    this.setState({ currentDir: x }, () => this.updateContents());
  };

  fetchContents = () => {
    let { currentProject } = this.context;
    const { actionConfig, branch } = this.props;

    if (actionConfig.kind === "gitlab") {
      return api
        .getGitlabFolderContent(
          "<token>",
          { dir: this.state.currentDir || "./" },
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
      { dir: this.state.currentDir || "./" },
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

  detectBuildpacks = () => {
    let { currentProject } = this.context;
    let { actionConfig, branch } = this.props;

    if (actionConfig.kind === "github") {
      return api.detectBuildpack(
        "<token>",
        {
          dir: this.state.currentDir || ".",
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

    return api.detectGitlabBuildpack(
      "<token>",
      { dir: this.state.currentDir || "." },
      {
        project_id: currentProject.id,
        integration_id: actionConfig.gitlab_integration_id,

        repo_owner: actionConfig.git_repo.split("/")[0],
        repo_name: actionConfig.git_repo.split("/")[1],
        branch: branch,
      }
    );
  };

  fetchProcfileContent = (procfilePath: string) => {
    let { currentProject } = this.context;
    let { actionConfig, branch } = this.props;
    if (actionConfig.kind === "github") {
      return api.getProcfileContents(
        "<token>",
        {
          path: procfilePath,
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

    return api.getGitlabProcfileContents(
      "<token>",
      { path: procfilePath },
      {
        project_id: currentProject.id,
        integration_id: actionConfig.gitlab_integration_id,
        owner: actionConfig.git_repo.split("/")[0],
        name: actionConfig.git_repo.split("/")[1],
        branch: branch,
      }
    );
  };

  updateContents = () => {
    // Get branch contents
    this.fetchContents()
      .then((res) => {
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

        this.setState({ contents, loading: false, error: false });
      })
      .catch((err) => {
        console.log(err);

        this.setState({ loading: false, error: true });
      });

    this.detectBuildpacks()
      .then(({ data }) => {
        this.setState({
          autoBuildpack: data,
        });
      })
      .catch((err) => {
        console.log(err);
        this.setState({
          autoBuildpack: {
            valid: false,
          },
        });
      });

    let ppath =
      this.props.procfilePath ||
      `${this.state.currentDir ? this.state.currentDir : "."}/Procfile`;
    this.fetchProcfileContent(ppath)
      .then(({ data }) => {
        this.setState({ processes: data });
      })
      .catch((err) => {
        console.log(err);
      });
  };

  renderContentList = () => {
    let { contents, loading, error } = this.state;
    if (loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (error || !contents) {
      return <LoadingWrapper>Error loading repo contents.</LoadingWrapper>;
    }
    return contents.map((item: FileType, i: number) => {
      let splits = item.path.split("/");
      let fileName = splits[splits.length - 1];
      if (item.type === "dir") {
        return (
          <Item
            key={i}
            isSelected={item.path === this.state.currentDir}
            lastItem={i === contents.length - 1}
            onClick={() => this.setSubdirectory(item.path)}
          >
            <img src={folder} />
            {fileName}
          </Item>
        );
      }

      if (fileName.includes("Dockerfile") && !this.props.dockerfilePath) {
        return (
          <FileItem
            key={i}
            lastItem={i === contents.length - 1}
            isADocker
            onClick={() => this.props.setDockerfilePath(item.path)}
          >
            <img src={file} />
            {fileName}
          </FileItem>
        );
      }

      return (
        <FileItem key={i} lastItem={i === contents.length - 1}>
          <img src={file} />
          {fileName}
        </FileItem>
      );
    });
  };

  renderJumpToParent = () => {
    if (this.state.currentDir !== "") {
      let splits = this.state.currentDir.split("/");
      let subdir = "";
      if (splits.length !== 1) {
        subdir = this.state.currentDir.replace(splits[splits.length - 1], "");
        if (subdir.charAt(subdir.length - 1) === "/") {
          subdir = subdir.slice(0, subdir.length - 1);
        }
      }

      return (
        <Item lastItem={false} onClick={() => this.setSubdirectory(subdir)}>
          <BackLabel>..</BackLabel>
        </Item>
      );
    }

    return (
      <FileItem lastItem={false}>
        <img src={info} />
        Select{" "}
        {this.props.dockerfilePath
          ? "Docker Build Context"
          : "Application Folder"}
      </FileItem>
    );
  };

  handleContinue = () => {
    if (this.props.dockerfilePath) {
      this.props.setFolderPath(this.state.currentDir || "./");
      return;
    }

    let dockerfiles = [] as string[];
    this.state.contents.forEach((item: FileType, i: number) => {
      let splits = item.path.split("/");
      let fileName = splits[splits.length - 1];
      if (fileName.includes("Dockerfile")) {
        dockerfiles.push(fileName);
      }
      if (fileName == "Procfile") {
        this.props.setProcfilePath(`${this.state.currentDir || "."}/Procfile`);
      }
    });
    if (dockerfiles.length > 0) {
      this.setState({ dockerfiles });
    } else {
      if (this.state.currentDir !== "") {
        this.props.setFolderPath(this.state.currentDir);
      } else {
        this.props.setFolderPath("./");
      }
    }
  };

  renderOverlay = () => {
    if (this.props.procfilePath) {
      let processes = this.state.processes
        ? Object.keys(this.state.processes)
        : [];
      if (this.state.processes == null) {
        return (
          <Overlay>
            <BgOverlay>
              <LoadingWrapper>
                <Loading />
              </LoadingWrapper>
            </BgOverlay>
          </Overlay>
        );
      }

      if (processes.length == 0) {
        this.props.setProcfilePath("");
      }

      return (
        <Overlay>
          <BgOverlay
            onClick={() =>
              this.setState({ dockerfiles: [] }, () => {
                this.props.setFolderPath("");
                this.props.setProcfilePath("");
              })
            }
          />
          <CloseButton
            onClick={() =>
              this.setState({ dockerfiles: [] }, () => {
                this.props.setProcfilePath("");
              })
            }
          >
            <CloseButtonImg src={close} />
          </CloseButton>
          <Label>
            Porter has detected a Procfile in this folder. Which process would
            you like to run?
          </Label>
          <DockerfileList>
            {processes.map((process: string, i: number) => {
              return (
                <Row
                  key={i}
                  onClick={() => {
                    if (
                      !this.props.folderPath ||
                      this.props.folderPath === ""
                    ) {
                      this.props.setFolderPath("./");
                    }
                    this.props.setProcfileProcess(process);
                  }}
                  isLast={processes.length - 1 === i}
                >
                  <Indicator selected={false} />
                  {process}
                </Row>
              );
            })}
          </DockerfileList>
        </Overlay>
      );
    }
    if (this.state.dockerfiles.length > 0 && !this.props.dockerfilePath) {
      return (
        <Overlay>
          <BgOverlay onClick={() => this.setState({ dockerfiles: [] })} />
          <CloseButton onClick={() => this.setState({ dockerfiles: [] })}>
            <CloseButtonImg src={close} />
          </CloseButton>
          <Label>
            Porter has detected at least one Dockerfile in this folder. Would
            you like to use an existing Dockerfile?
          </Label>
          <DockerfileList>
            {this.state.dockerfiles.map((dockerfile: string, i: number) => {
              return (
                <Row
                  key={i}
                  onClick={() =>
                    this.props.setDockerfilePath(
                      `${this.state.currentDir || "."}/${dockerfile}`
                    )
                  }
                  isLast={this.state.dockerfiles.length - 1 === i}
                >
                  <Indicator selected={false}></Indicator>
                  {dockerfile}
                </Row>
              );
            })}
          </DockerfileList>
          <ConfirmButton
            onClick={() => {
              this.props.setFolderPath(this.state.currentDir || "./");
              if (
                this.state.processes &&
                Object.keys(this.state.processes).length > 0
              ) {
                this.props.setProcfilePath("./Procfile");
              }
            }}
          >
            No, I don't want to use a Dockerfile
          </ConfirmButton>
        </Overlay>
      );
    }
    if (
      this.props.dockerfilePath &&
      !this.props.folderPath &&
      this.state.showingBuildContextPrompt
    ) {
      return (
        <Overlay>
          <BgOverlay onClick={() => this.props.setDockerfilePath("")} />
          <CloseButton
            onClick={() =>
              this.props.setFolderPath(this.state.currentDir || "./")
            }
          >
            <CloseButtonImg src={close} />
          </CloseButton>
          <Label>
            Would you like to set the Docker build context to a different
            directory?
          </Label>
          <MultiSelectRow>
            <ConfirmButton
              onClick={() => {
                this.setState({ showingBuildContextPrompt: false });
                this.setSubdirectory("");
              }}
            >
              Yes
            </ConfirmButton>
            <ConfirmButton
              onClick={() =>
                this.props.setFolderPath(this.state.currentDir || "./")
              }
            >
              No
            </ConfirmButton>
          </MultiSelectRow>
        </Overlay>
      );
    }
  };

  render() {
    return (
      <>
        {this.state.autoBuildpack && this.state.autoBuildpack.valid && (
          <Banner>
            <i className="material-icons">info</i>{" "}
            <p>
              <b>{this.state.autoBuildpack.name}</b> buildpack was{" "}
              <a
                href="https://docs.porter.run/deploying-applications/deploying-from-github/selecting-application-and-build-method#customizing-buildpacks"
                target="_blank"
              >
                detected automatically
              </a>
              . Alternatively, select an application folder below:
            </p>
          </Banner>
        )}
        <ExpandedWrapperAlt>
          {this.renderJumpToParent()}
          {this.renderContentList()}
          <FlexWrapper>
            <UseButton onClick={this.handleContinue}>Continue</UseButton>
            <StatusWrapper
              href="https://docs.porter.run/deploying-applications/deploying-from-github/selecting-application-and-build-method#customizing-buildpacks"
              target="_blank"
            >
              <i className="material-icons">help_outline</i>
              <div>Auto build requirements</div>
            </StatusWrapper>
          </FlexWrapper>
          {this.renderOverlay()}
        </ExpandedWrapperAlt>
      </>
    );
  }
}

ContentsList.contextType = Context;

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
  box-shadow: 0 2px 5px 0 #00000030;
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
