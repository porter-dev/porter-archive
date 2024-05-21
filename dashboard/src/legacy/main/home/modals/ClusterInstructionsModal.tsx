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
            1. To install the Porter CLI, run the following in your terminal:
            <Code>/bin/bash -c "$(curl -fsSL https://install.porter.run)"</Code>
            Alternatively, on macOS you can use Homebrew:
            <Code>brew install porter-dev/porter/porter</Code>
            2. Log in to the Porter CLI:
            <Code>
              porter config set-host {location.protocol + "//" + location.host}
              <br />
              porter auth login
            </Code>
            3. Configure the Porter CLI and link your current context:
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
      <>
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
      </>
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
