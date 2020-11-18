import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../../shared/Context';
import api from '../../../../shared/api';

import { PorterChart, RepoType, Cluster } from '../../../../shared/types';
import Selector from '../../../../components/Selector';
import ImageSelector from '../../../../components/image-selector/ImageSelector';
import TabRegion from '../../../../components/TabRegion';

type PropsType = {
  currentTemplate: PorterChart,
  hideLaunch: () => void,
};

type StateType = {
  currentView: string,
  clusterOptions: { label: string, value: string }[],
  selectedCluster: string,
  selectedImageUrl: string | null,
};

const tabOptions = [
  { value: 'a', label: 'Tab A' },
  { value: 'b', label: 'Tab B' },
  { value: 'c', label: 'Tab C' },
  { value: 'd', label: 'Tab D' },
];

export default class LaunchTemplate extends Component<PropsType, StateType> {
  state = {
    currentView: 'repo',
    clusterOptions: [] as { label: string, value: string }[],
    selectedCluster: this.context.currentCluster.name,
    selectedImageUrl: '',
  };

  componentDidMount() {
    console.log('current template: ', this.props.currentTemplate);
    let { currentProject } = this.context;

    // TODO: query with selected filter once implemented
    api.getClusters('<token>', {}, { id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        // console.log(err)
      } else if (res.data) {
        let clusterOptions = res.data.map((x: Cluster) => { return { label: x.name, value: x.name } });
        if (res.data.length > 0) {
          this.setState({ clusterOptions });
        }
      }
    });
  }

  renderIcon = (icon: string) => {
    if (icon) {
      return <Icon src={icon} />
    }

    return (
      <Polymer><i className="material-icons">layers</i></Polymer>
    );
  }

  render() {
    let { Name, Icon, Description } = this.props.currentTemplate.Form;
    let { currentTemplate } = this.props;
    let name = Name ? Name : currentTemplate.Name;

    return (
      <StyledLaunchTemplate>
        <TitleSection>
          <Flex>
            <i className="material-icons" onClick={this.props.hideLaunch}>
              keyboard_backspace
            </i>
            <Title>Launch Template</Title>
          </Flex>
        </TitleSection>
        <ClusterSection>
          <Template>
            {Icon ? this.renderIcon(Icon) : this.renderIcon(currentTemplate.Icon)}
            {name}
          </Template>
          <i className="material-icons">arrow_right_alt</i>
          <ClusterLabel>
            <i className="material-icons">device_hub</i>Cluster
          </ClusterLabel>
          <Selector
            activeValue={this.state.selectedCluster}
            setActiveValue={(cluster: string) => this.setState({ selectedCluster: cluster })}
            options={this.state.clusterOptions}
            width='250px'
            dropdownWidth='335px'
            closeOverlay={true}
          />
        </ClusterSection>

        <Subtitle>Select the container image you would like to connect to this template.</Subtitle>
        <ImageSelector
          selectedImageUrl={this.state.selectedImageUrl}
          setSelectedImageUrl={(x: string) => this.setState({ selectedImageUrl: x })}
          forceExpanded={true}
        />

        <br />
        <Subtitle>Configure additional settings for this template (optional).</Subtitle>
        <TabRegion
          options={tabOptions}
          contents={[
            { value: 'a', component: <h1>test</h1> },
            { value: 'b', component: <h1>hello</h1> },
            { value: 'c', component: <h1>world</h1> },
            { value: 'd', component: <h1>hola</h1> },
          ]}
        />
      </StyledLaunchTemplate>
    );
  }
}

LaunchTemplate.contextType = Context;

const Subtitle = styled.div`
  padding: 12px 0px 25px;
  font-family: 'Work Sans', sans-serif;
  font-size: 13px;
  color: #aaaabb;
  margin-top: 3px;
  margin-bottom: 5px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const ClusterLabel = styled.div`
  margin-right: 10px;
  display: flex;
  align-items: center;
  > i {
    font-size: 16px;
    margin-right: 6px;
  }
`;

const Icon = styled.img`
  width: 21px;
  margin-right: 10px;
`;


const Polymer = styled.div`
  margin-bottom: -3px;

  > i {
    color: ${props => props.theme.containerIcon};
    font-size: 18px;
    margin-right: 10px;
  }
`;

const Template = styled.div`
  display: flex;
  align-items: center;
  margin-right: 13px;
`;

const ClusterSection = styled.div`
  display: flex;
  align-items: center;
  color: #ffffff;
  font-family: 'Work Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  margin-top: 20px;
  margin-bottom: 15px;

  > i {
    font-size: 25px;
    color: #ffffff44;
    margin-right: 13px;
  }
`;

const Flex = styled.div`
  display: flex;
  align-items: center;

  > i {
    cursor: pointer;
    font-size 24px;
    color: #969Fbbaa;
    padding: 3px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }
`;

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: 'Work Sans', sans-serif;
  margin-left: 11px;
  border-radius: 2px;
  color: #ffffff;
`;

const TitleSection = styled.div`
  display: flex;
  margin-left: -42px;
  height: 40px;
  flex-direction: row;
  justify-content: space-between;
  width: calc(100% + 42px);
  align-items: center;
`;

const StyledLaunchTemplate = styled.div`
  width: 100%;
`;