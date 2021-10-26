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
            <Bold>Elastic Container Registry (ECR):</Bold>
            1. Run the following command on the Porter CLI.
            <Code>porter connect ecr</Code>
            2. Enter the region your ECR instance belongs to. For example:
            <Code>AWS Region: us-west-2</Code>
            3. Porter will automatically set up an IAM user in your AWS account
            to grant ECR access. Once this is done, it will prompt you to enter
            a name for the registry. Here you may enter any name you'd like.
            <Code>Give this registry a name: my-awesome-registry</Code>
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
      </>
    );
  }
}

ClusterInstructionsModal.contextType = Context;

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
