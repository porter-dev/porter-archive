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
            1. Run the following command on the Omni CLI.
            <Code>omni connect ecr</Code>
            2. Enter the region your ECR instance belongs to. For example:
            <Code>AWS Region: us-west-2</Code>
            3. Omni will automatically set up an IAM user in your AWS account
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
      <StyledClusterInstructionsModal>
        <CloseButton
          onClick={() => {
            this.context.setCurrentModal(null, null);
          }}
        >
          <CloseButtonImg src={close} />
        </CloseButton>

        <ModalTitle>Connecting to an Image Registry</ModalTitle>

        <TabSelector
          options={tabOptions}
          currentTab={currentTab}
          setCurrentTab={(value: string) =>
            this.setState({ currentTab: value })
          }
        />

        {this.renderPage()}
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
  padding: 10px 0px 20px;
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
  font-family: Work Sans, sans-serif;
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
