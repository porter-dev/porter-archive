import React, { Component } from 'react';
import styled from 'styled-components';
import { textChangeRangeIsUnchanged } from 'typescript';
import close from '../../../assets/close.png';

import { Context } from '../../../Context';
import YamlEditor from '../../../lib/YamlEditor';

type PropsType = {
};

type StateType = {
  currentTab: string
};

export default class ClusterConfigModal extends Component<PropsType, StateType> {
  state = {
    currentTab: 'kubeconfig'
  }

  renderLine = (tab: string) => {
    if (this.state.currentTab == tab) {
      return <Highlight />
    }
  }
  
  renderTabContents = () => {
    if (this.state.currentTab === 'kubeconfig') {
      return (
        <div>
          <Subtitle>Copy and paste your kubeconfig below.</Subtitle>
          <YamlEditor />
          <Button>Save Kubeconfig</Button>
        </div>
      )
    }
  }

  render() {
    return (
      <StyledClusterConfigModal>
        <CloseButton onClick={() => { this.context.setCurrentModal(null) }}>
          <CloseButtonImg src={close} />
        </CloseButton>

        <Header>
          <Plus>+</Plus>
          Manage Clusters
        </Header>
        <ModalTitle>Connect from Kubeconfig</ModalTitle>
        <TabSelector>
          <Tab onClick={() => this.setState({ currentTab: 'kubeconfig' })}>
            Raw Kubeconfig
            {this.renderLine('kubeconfig')}
          </Tab>
          <Tab onClick={() => this.setState({ currentTab: 'select' })}>
            Select Clusters
            {this.renderLine('select')}
          </Tab>
        </TabSelector>
        {this.renderTabContents()}
      </StyledClusterConfigModal>
    );
  }
}

ClusterConfigModal.contextType = Context;

const Button = styled.button`
  position: absolute;
  bottom: 25px;
  right: 27px;
  height: 40px;
  font-size: 13px;
  font-weight: 500;
  font-family: 'Work Sans', sans-serif;
  color: white;
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: 5px;
  background: ${(props) => (!props.disabled ? '#616FEEcc' : '#ddd')};
  box-shadow: ${(props) => (!props.disabled ? '0 2px 5px 0 #00000030' : 'none')};
  cursor: ${(props) => (!props.disabled ? 'pointer' : 'default')};
  user-select: none;
  :focus { outline: 0 }
  :hover {
    background: ${(props) => (!props.disabled ? '#616FEEff' : '#ddd')};
  }
`;

const Subtitle = styled.div`
  padding: 15px 0px;
  font-family: 'Work Sans', sans-serif;
  font-size: 13px;
  color: #aaa;
  margin-top: 8px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Highlight = styled.div`
  width: 80%;
  height: 1px;
  margin-top: 5px;
  background: #949EFFcc;

  opacity: 0;
  animation: lineEnter 0.5s 0s;
  animation-fill-mode: forwards;
  @keyframes lineEnter {
    from { width: 0%; opacity: 0; }
    to   { width: 80%; opacity: 1; }
  }
`; 

const Tab = styled.div`
  width: 180px;
  height: 30px;
  padding: 0 10px;
  margin-right: 15px;
  display: flex;
  font-family: 'Work Sans', sans-serif;
  font-size: 13px;
  user-select: none;
  color: #949effcc;
  flex-direction: column;
  padding-top: 7px;
  align-items: center;
  cursor: pointer;
  white-space: nowrap;
  
  :hover {
    background: #949EFF22;
    border-radius: 5px;
  }
`;

const TabSelector = styled.div`
  display: flex;
  width: 260px;
  max-width: 100%;
  margin-left: 0px;
  justify-content: space-between;
  margin-top: 23px;
`;

const ModalTitle = styled.div`
  margin-top: 21px;
  display: flex;
  flex: 1;
  font-family: 'Assistant';
  font-size: 18px;
  color: #ffffff;
  font-weight: 700;
  align-items: center;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Header = styled.div`
  display: inline-block;
  width: 100%;
  font-size: 14px;
  color: #7A838Faa;
  font-family: 'Work Sans', sans-serif;
`;

const Plus = styled.span`
  margin-right: 10px;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
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

const StyledClusterConfigModal= styled.div`
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  padding: 25px 30px;
  overflow: hidden;
  border-radius: 6px;
  background: #24272a;
`;