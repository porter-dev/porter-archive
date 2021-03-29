import ImageSelector from "components/image-selector/ImageSelector";
import React, { Component } from "react";
import styled from "styled-components";

import { integrationList } from "shared/common";
import { Context } from "../../shared/Context";
import api from "../../shared/api";
import Loading from "components/Loading";
import { ActionConfigType } from "../../shared/types";
import InputRow from "../values-form/InputRow";
import InfoTooltip from "components/InfoTooltip";

type PropsType = {
  actionConfig: ActionConfigType | null;
  setActionConfig: (x: ActionConfigType) => void;
  branch: string;
  dockerfilePath: string;
  folderPath: string;
  setSelectedRegistry: (x: any) => void;
  selectedRegistry: any;
  setDockerfilePath: (x: string) => void;
  setFolderPath: (x: string) => void;
};

type StateType = {
  dockerRepo: string;
  error: boolean;
  registries: any[] | null;
  loading: boolean;
};

const dummyRegistries = [
  { id: 1, service: "ecr", url: "https://idfkasdfasdf" },
  { id: 12, service: "ecr", url: "https://dfasdfidfkasdfasdf" },
  { id: 11, service: "gcr", url: "https://idfkasdfasdf" },
] as any[];

export default class ActionDetails extends Component<PropsType, StateType> {
  state = {
    dockerRepo: "",
    error: false,
    registries: null as any[] | null,
    loading: true,
  };

  componentDidMount() {
    // TODO: Handle custom registry case (unroll repos?)
    api
      .getProjectRegistries(
        "<token>",
        {},
        { id: this.context.currentProject.id }
      )
      .then((res: any) => {
        this.setState({ registries: res.data, loading: false });
        if (res.data.length === 1) {
          this.props.setSelectedRegistry(res.data[0]);
        }
      })
      .catch((err: any) => console.log(err));
  }

  renderIntegrationList = () => {
    let { loading, registries } = this.state;
    if (loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    }

    return registries.map((registry: any, i: number) => {
      let icon =
        integrationList[registry.service] &&
        integrationList[registry.service].icon;
      if (!icon) {
        icon = integrationList["docker"].icon;
      }
      return (
        <RegistryItem
          key={i}
          isSelected={
            this.props.selectedRegistry &&
            registry.id === this.props.selectedRegistry.id
          }
          lastItem={i === registries.length - 1}
          onClick={() => this.props.setSelectedRegistry(registry)}
        >
          <img src={icon && icon} />
          {registry.url}
        </RegistryItem>
      );
    });
  };

  renderRegistrySection = () => {
    let { registries } = this.state;
    if (!registries || registries.length === 0 || registries.length === 1) {
      return;
    } else {
      return (
        <>
          <Subtitle>
            Select an Image Destination
            <Required>*</Required>
          </Subtitle>
          <ExpandedWrapper>{this.renderIntegrationList()}</ExpandedWrapper>
        </>
      );
    }
  };

  render() {
    return (
      <>
        <DarkMatter />
        <InputRow
          disabled={true}
          label="Git Repository"
          type="text"
          width="100%"
          value={this.props.actionConfig.git_repo}
        />
        {this.props.dockerfilePath ? (
          <InputRow
            disabled={true}
            label="Dockerfile Path"
            type="text"
            width="100%"
            value={this.props.dockerfilePath}
          />
        ) : (
          <InputRow
            disabled={true}
            label="Folder Path"
            type="text"
            width="100%"
            value={this.props.folderPath}
          />
        )}
        {this.renderRegistrySection()}
        <SubtitleAlt>
          <Bold>Note:</Bold> To auto-deploy each time you push changes, Porter
          will write Github Secrets and a GitHub Actions file to your repo.
          <Highlight
            href="https://docs.getporter.dev/docs/auto-deploy-requirements#cicd-with-github-actions"
            target="_blank"
          >
            Learn more
          </Highlight>
        </SubtitleAlt>
        <Br />

        <Flex>
          <BackButton
            width="140px"
            onClick={() => {
              this.props.setDockerfilePath(null);
              this.props.setFolderPath(null);
            }}
          >
            <i className="material-icons">keyboard_backspace</i>
            Select Folder
          </BackButton>
          {this.props.selectedRegistry ? (
            <StatusWrapper successful={true}>
              <i className="material-icons">done</i> Source selected
            </StatusWrapper>
          ) : (
            <StatusWrapper>
              <i className="material-icons">error_outline</i>A connected
              container registry is required
            </StatusWrapper>
          )}
        </Flex>
      </>
    );
  }
}

ActionDetails.contextType = Context;

const Highlight = styled.a`
  color: #949eff;
  text-decoration: none;
  margin-left: 5px;
  cursor: pointer;
`;

const Bold = styled.div`
  font-weight: 800;
  color: #ffffff;
  margin-right: 5px;
`;

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
  display: inline-block;
`;

const Subtitle = styled.div`
  margin-top: 21px;
`;

const SubtitleAlt = styled.div`
  padding: 11px 0px 16px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  line-height: 1.6em;
  display: flex;
  align-items: center;
  margin-top: -3px;
  margin-bottom: -7px;
  font-weight: 400;
`;

const RegistryItem = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid
    ${(props: { lastItem: boolean; isSelected: boolean }) =>
      props.lastItem ? "#00000000" : "#606166"};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: ${(props: { isSelected: boolean; lastItem: boolean }) =>
    props.isSelected ? "#ffffff11" : ""};
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
    filter: grayscale(100%);
  }
`;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  display: flex;
  align-items: center;
  font-size: 13px;
  justify-content: center;
  color: #ffffff44;
`;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
  background: #ffffff11;
  overflow-y: auto;
  margin-bottom: 15px;
`;

const StatusWrapper = styled.div<{ successful?: boolean }>`
  display: flex;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #ffffff55;
  margin-right: 25px;
  margin-left: 20px;
  margin-top: 26px;

  > i {
    font-size: 18px;
    margin-right: 10px;
    color: ${(props) => (props.successful ? "#4797ff" : "#fcba03")};
  }

  animation: statusFloatIn 0.5s;
  animation-fill-mode: forwards;

  @keyframes statusFloatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
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
  border-radius: 3px;
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

const AdvancedHeader = styled.div`
  margin-top: 15px;
`;

const Br = styled.div`
  width: 100%;
  height: 1px;
  margin-bottom: -8px;
`;

const DarkMatter = styled.div`
  width: 100%;
  margin-bottom: -18px;
`;

const Holder = styled.div`
  padding: 0px 12px 24px 12px;
`;
