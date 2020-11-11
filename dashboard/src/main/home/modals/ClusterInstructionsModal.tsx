import React, { Component } from 'react';
import styled from 'styled-components';
import close from '../../../assets/close.png';
import TabSelector from '../../../components/TabSelector';

import { Context } from '../../../shared/Context';

type PropsType = {
};

type StateType = {
  currentTab: string,
};

const tabOptions = [
  { label: 'MacOS', value: 'mac' }
];

export default class ClusterInstructionsModal extends Component<PropsType, StateType> {
  state = {
    currentTab: 'mac'
  }
 
  render() {
    return (
      <StyledClusterInstructionsModal>
        <CloseButton onClick={() => {
          this.context.setCurrentModal(null, null);
        }}>
          <CloseButtonImg src={close} />
        </CloseButton>

        <ModalTitle>Connecting to an Existing Cluster</ModalTitle>

        <TabSelector
          options={tabOptions}
          currentTab={this.state.currentTab}
          setCurrentTab={(value: string) => this.setState({ currentTab: value })}
        />

        <Placeholder>
          1. Run the following command to retrieve the latest binary:
          <Code>
            &#123;<br />
            name=$(curl -s https://api.github.com/repos/porter-dev/porter/releases/latest | grep "browser_download_url.*_Darwin_x86_64\.zip" | cut -d ":" -f 2,3 | tr -d \")<br />
            name=$(basename $name)<br />
            curl -L https://github.com/porter-dev/porter/releases/latest/download/$name --output $name<br />
            unzip -a $name<br />
            rm $name<br />
            &#125;
          </Code>
          2. Move the file into your bin:
          <Code>
            chmod +x ./porter<br />
            sudo mv ./porter /usr/local/bin/porter
          </Code>
          3. Log in to the Porter CLI:
          <Code>
            porter auth login
          </Code>
          4. Configure the Porter CLI and link your current context:
          <Code>
            porter config set-project {this.context.currentProject.id}<br/>
            porter config set-host {location.protocol + '//' + location.host}<br/>
            porter connect kubeconfig
          </Code>
        </Placeholder>
        
      </StyledClusterInstructionsModal>
    );
  }
}

ClusterInstructionsModal.contextType = Context;

const Code = styled.div`
  background: #181B21;
  padding: 10px 15px;
  border: 1px solid #ffffff44;
  border-radius: 5px;
  margin: 10px 0px 15px;
  color: #ffffff;
  font-size: 13px;
  user-select: text;
  font-family: monospace;
`;

const A = styled.a`
  color: #ffffff;
  text-decoration: underline;
  cursor: ${(props: { disabled?: boolean }) => props.disabled ? 'not-allowed' : 'pointer'};
`;

const Placeholder = styled.div`
  color: #aaaabb;
  font-size: 13px;
  margin-left: 0px;
  margin-top: 25px;
  user-select: none;
`;

const Bold = styled.div`
  font-weight: bold;
  font-size: 20px;
`;

const Subtitle = styled.div`
  padding: 17px 0px 25px;
  font-family: 'Work Sans', sans-serif;
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
  font-family: 'Assistant';
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

const StyledClusterInstructionsModal= styled.div`
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