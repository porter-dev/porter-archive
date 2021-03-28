import React, { Component } from "react";
import styled from "styled-components";
import close from "assets/close.png";
import TabSelector from "components/TabSelector";

import { Context } from "shared/Context";

type PropsType = {};

type StateType = {
  currentTab: string;
  currentPage: number;
};

const tabOptions = [{ label: "MacOS", value: "mac" }];

export default class ClusterInstructionsModal extends Component<
  PropsType,
  StateType
> {
  state = {
    currentTab: "mac",
    currentPage: 0,
  };

  renderPage = () => {
    switch (this.state.currentPage) {
      case 0:
        return (
          <Placeholder>
            1. To install the Porter CLI, first retrieve the latest binary:
            <Code>
              &#123;
              <br />
              name=$(curl -s
              https://api.github.com/repos/porter-dev/porter/releases/latest |
              grep "browser_download_url.*porter_.*_Darwin_x86_64\.zip" | cut -d
              ":" -f 2,3 | tr -d \")
              <br />
              name=$(basename $name)
              <br />
              curl -L
              https://github.com/porter-dev/porter/releases/latest/download/$name
              --output $name
              <br />
              unzip -a $name
              <br />
              rm $name
              <br />
              &#125;
            </Code>
            2. Move the file into your bin:
            <Code>
              chmod +x ./porter
              <br />
              sudo mv ./porter /usr/local/bin/porter
            </Code>
            3. Log in to the Porter CLI:
            <Code>
              porter config set-host {location.protocol + "//" + location.host}
              <br />
              porter auth login
            </Code>
            4. Configure the Porter CLI and link your current context:
            <Code>
              porter config set-project {this.context.currentProject.id}
              <br />
              porter connect kubeconfig
            </Code>
          </Placeholder>
        );
      case 1:
        return (
          <Placeholder>
            <Bold>Passing a kubeconfig explicitly</Bold>
            You can pass a path to a kubeconfig file explicitly via:
            <Code>
              porter connect kubeconfig --kubeconfig path/to/kubeconfig
            </Code>
            <Bold>Passing a context list</Bold>
            You can initialize Porter with a set of contexts by passing a
            context list to start. The contexts that Porter will be able to
            access are the same as kubectl config get-contexts. For example, if
            there are two contexts named minikube and staging, you could connect
            both of them via:
            <Code>
              porter connect kubeconfig --context minikube --context staging
            </Code>
          </Placeholder>
        );
      default:
        return;
    }
  };

  render() {
    let { currentPage, currentTab } = this.state;
    return (
      <StyledClusterInstructionsModal>
        <CloseButton
          onClick={() => {
            this.context.setCurrentModal(null, null);
          }}
        >
          <CloseButtonImg src={close} />
        </CloseButton>

        <ModalTitle>Connecting to an Existing Cluster</ModalTitle>

        <TabSelector
          options={tabOptions}
          currentTab={currentTab}
          setCurrentTab={(value: string) =>
            this.setState({ currentTab: value })
          }
        />

        {this.renderPage()}
        <PageSection>
          <PageCount>{currentPage + 1}/2</PageCount>
          <i
            className="material-icons"
            onClick={() =>
              currentPage > 0
                ? this.setState({ currentPage: currentPage - 1 })
                : null
            }
          >
            arrow_back
          </i>
          <i
            className="material-icons"
            onClick={() =>
              currentPage < 1
                ? this.setState({ currentPage: currentPage + 1 })
                : null
            }
          >
            arrow_forward
          </i>
        </PageSection>
      </StyledClusterInstructionsModal>
    );
  }
}

ClusterInstructionsModal.contextType = Context;

const PageCount = styled.div`
  margin-right: 9px;
  user-select: none;
  letter-spacing: 2px;
`;

const PageSection = styled.div`
  position: absolute;
  bottom: 22px;
  right: 20px;
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #ffffff;
  justify-content: flex-end;
  user-select: none;

  > i {
    font-size: 18px;
    margin-left: 2px;
    cursor: pointer;
    border-radius: 20px;
    padding: 5px;
    :hover {
      background: #ffffff11;
    }
  }
`;

const Code = styled.div`
  background: #181b21;
  padding: 10px 15px;
  border: 1px solid #ffffff44;
  border-radius: 5px;
  margin: 10px 0px 15px;
  color: #ffffff;
  font-size: 13px;
  user-select: text;
  line-height: 1em;
  font-family: monospace;
`;

const A = styled.a`
  color: #ffffff;
  text-decoration: underline;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
`;

const Placeholder = styled.div`
  color: #aaaabb;
  font-size: 13px;
  margin-left: 0px;
  margin-top: 25px;
  line-height: 1.6em;
  user-select: none;
`;

const Bold = styled.div`
  font-weight: 600;
  margin-bottom: 7px;
`;

const Subtitle = styled.div`
  padding: 17px 0px 25px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  margin-top: 3px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const ModalTitle = styled.div`
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: "Assistant";
  font-size: 18px;
  color: #ffffff;
  user-select: none;
  font-weight: 700;
  align-items: center;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
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

const StyledClusterInstructionsModal = styled.div`
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  padding: 25px 32px;
  overflow: hidden;
  border-radius: 6px;
  background: #202227;
`;
