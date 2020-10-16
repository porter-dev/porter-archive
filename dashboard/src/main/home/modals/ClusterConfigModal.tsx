import React, { Component } from 'react';
import styled from 'styled-components';
import close from '../../../assets/close.png';

import api from '../../../shared/api';
import { Context } from '../../../shared/Context';
import { KubeContextConfig } from '../../../shared/types';

import YamlEditor from '../../../components/YamlEditor';
import SaveButton from '../../../components/SaveButton';
import TabSelector from '../../../components/TabSelector';

type PropsType = {
};

type StateType = {
  currentTab: string,
  kubeContexts: KubeContextConfig[],
  rawKubeconfig: string,
  saveKubeconfigStatus: string | null,
  saveSelectedStatus: string | null
};

const tabOptions = [
  { label: 'Raw Kubeconfig', value: 'kubeconfig' },
  { label: 'Select Clusters', value: 'select' }
]

export default class ClusterConfigModal extends Component<PropsType, StateType> {
  state = {
    currentTab: 'kubeconfig',
    kubeContexts: [] as KubeContextConfig[],
    rawKubeconfig: '# If you are using certificate files, include those explicitly',
    saveKubeconfigStatus: null as (string | null),
    saveSelectedStatus: null as (string | null),
  };
  
  updateChecklist = () => {
    let { setCurrentError, userId } = this.context;

    // Parse kubeconfig to retrieve all possible clusters
    api.getContexts('<token>', {}, { id: userId }, (err: any, res: any) => {
      if (err) {
        // setCurrentError(JSON.stringify(err));
      } else {
        this.setState({ kubeContexts: res.data });
      }
    });
  }

  componentDidMount() {
    let { setCurrentError, userId, currentModalData } = this.context;

    if (currentModalData && currentModalData.currentTab) {
      this.setState({ currentTab: 'select' });
    }

    api.getUser('<token>', {}, { id: userId }, (err: any, res: any) => {
      if (err) {
        // setCurrentError(JSON.stringify(err));
      } else if (res.data.rawKubeConfig !== '') {
        this.setState({ rawKubeconfig: res.data.rawKubeConfig });
      }
    });

    this.updateChecklist();
  }

  toggleCluster = (i: number): void => {
    let newKubeContexts = this.state.kubeContexts;
    newKubeContexts[i].selected = !newKubeContexts[i].selected;
    this.setState({ kubeContexts: newKubeContexts });
  };

  renderClusterList = (): JSX.Element[] | JSX.Element => {
    let { kubeContexts } = this.state;

    if (kubeContexts && kubeContexts.length > 0) {
      return kubeContexts.map((kubeContext: KubeContextConfig, i) => {
        return (
          <Row key={i} onClick={() => this.toggleCluster(i)}>
            <Checkbox checked={kubeContext.selected}>
              <i className="material-icons">done</i>
            </Checkbox>
            {kubeContext.name}
          </Row>
        );
      })
    }

    return (
      <Placeholder>
        You need to 
        <LinkText onClick={() => this.setState({ currentTab: 'kubeconfig'})}>
          supply a kubeconfig
        </LinkText>
        first
      </Placeholder>
    );
  };

  handleSaveKubeconfig = () => {
    let { rawKubeconfig } = this.state;
    let { userId } = this.context;

    this.setState({ saveKubeconfigStatus: 'loading' });
    api.updateUser(
      '<token>',
      { rawKubeConfig: rawKubeconfig },
      { id: userId },
      (err: any, res: any) => {
        if (err) {
          this.setState({ saveKubeconfigStatus: 'error' });
        } else {
          this.setState({ 
            rawKubeconfig: res.data.rawKubeConfig,
            saveKubeconfigStatus: 'successful'
          });

          this.updateChecklist();
          this.context.currentModalData.updateClusters();
        }
      }
    );
  }

  handleSaveSelected = () => {
    let { kubeContexts } = this.state;
    let { userId } = this.context;

    this.setState({ saveSelectedStatus: 'loading' });
    let allowedContexts: string[] = [];
    kubeContexts.forEach((x, i) => {
      if (x.selected) {
        allowedContexts.push(x.name);
      }
    });
    
    api.updateUser(
      '<token>',
      { allowedContexts },
      { id: userId },
      (err: any, res: any) => {
        if (err) {
          this.setState({ saveSelectedStatus: 'error' });
        } else {
          this.setState({ saveSelectedStatus: 'successful' });
          this.updateChecklist();
          this.context.currentModalData.updateClusters();
        }
      }
    );
  }
  
  renderTabContents = (): JSX.Element => {
    if (this.state.currentTab === 'kubeconfig') {
      return (
        <div>
          <Subtitle>Copy and paste your kubeconfig below</Subtitle>
          <YamlEditor 
            value={this.state.rawKubeconfig}
            onChange={(e: any) => this.setState({ rawKubeconfig: e })}
            height='295px'
            border={true}
          />
          <UploadButton>
            <i className="material-icons">cloud_upload</i> Upload Kubeconfig
          </UploadButton>
          <SaveButton
            text='Save Kubeconfig'
            onClick={this.handleSaveKubeconfig}
            status={this.state.saveKubeconfigStatus}
          />
        </div>
      )
    }

    return (
      <div>
        <Subtitle>Select the contexts you want Porter to use</Subtitle>
        <ClusterList>
          {this.renderClusterList()}
        </ClusterList>
        <SaveButton
          text='Save Selected'
          disabled={this.state.kubeContexts.length === 0}
          onClick={this.handleSaveSelected}
          status={this.state.saveSelectedStatus}
        />
      </div>
    )
  };

  render() {
    return (
      <StyledClusterConfigModal>
        <CloseButton onClick={() => {
          this.context.setCurrentModal(null);
          this.context.setCurrentModalData(null);
        }}>
          <CloseButtonImg src={close} />
        </CloseButton>

        <Header>
          <Plus>+</Plus>
          Manage Clusters
        </Header>
        <ModalTitle>Connect from Kubeconfig</ModalTitle>
        <TabSelector
          currentTab={this.state.currentTab}
          options={tabOptions}
          setCurrentTab={(value: string) => this.setState({ currentTab: value })}
          tabWidth='120px'
        />
        {this.renderTabContents()}
      </StyledClusterConfigModal>
    );
  }
}

ClusterConfigModal.contextType = Context;

const UploadButton = styled.button`
  display: flex;
  align-items: center;
  position: absolute;
  bottom: 25px;
  left: 30px;
  height: 40px;
  font-size: 13px;
  font-weight: 500;
  font-family: 'Work Sans', sans-serif;
  color: white;
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: 5px;
  background: #ffffff11;
  box-shadow: 0 2px 5px 0 #00000030;
  cursor: not-allowed;
  user-select: none;
  :focus { outline: 0 }
  :hover {
    background: #ffffff22;
  }

  > i {
    font-size: 18px;
    margin-right: 12px;
  }
`;

const Checkbox = styled.div`
  width: 16px;
  height: 16px;
  border: 1px solid #ffffff44;
  margin: 1px 15px 0px 12px;
  border-radius: 3px;
  background: ${(props: { checked: boolean }) => props.checked ? '#ffffff22' : ''};
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 12px;
    padding-left: 0px;
    display: ${(props: { checked: boolean }) => props.checked ? '' : 'none'};
  }
`;

const Row = styled.div`
  width: 100%;
  height: 40px;
  border-bottom: 1px solid #ffffff22;
  display: flex;
  align-items: center;
  color: #ffffff;
  font-size: 13px;
  font-family: 'Work Sans', sans-serif;
  cursor: pointer;
  
  :hover {
    background: #ffffff11;
  }
`;

const LinkText = styled.span`
  font-weight: 500;
  text-decoration: underline;
  color: #949effcc;
  cursor: pointer;
  margin: 0px 5px;
`;

const Placeholder = styled.div`
  color: #ffffff44;
  font-family: 'Work Sans', sans-serif;
  font-size: 13px;
  width: 100%;
  height: 100%;
  display: flex;
  margin-top: -13px;
  align-items: center;
  justify-content: center;
  user-select: none;
`;

const ClusterList = styled.div`
  width: 100%;
  height: 295px;
  border-radius: 5px;
  background: #ffffff06;
  border: 1px solid #ffffff22;
`;

const Subtitle = styled.div`
  padding: 15px 0px;
  font-family: 'Work Sans', sans-serif;
  font-size: 13px;
  color: #aaaabb;
  margin-top: 8px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const ModalTitle = styled.div`
  margin: 21px 2px 23px;
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
  background: #202227;
`;