import React, { Component } from 'react';
import styled from 'styled-components';

import { ResourceType } from '../../../../shared/types';
import YamlEditor from '../../../../components/YamlEditor';

const kindToIcon: any = {
  'deployment': 'category',
  'pod': 'fiber_manual_record',
  'service': 'alt_route',
  'ingress': 'sensor_door',
  'statefulset': 'location_city',
  'secret': 'vpn_key',
}

type PropsType = {
  resource: ResourceType,
  toggleKindLabels: () => void,
  showKindLabels: boolean
};

type StateType = {
  expanded: boolean,
  rawYaml: string
};

// A single resource block in the expanded chart list view
export default class ResourceItem extends Component<PropsType, StateType> {
  state = {
    expanded: false,
    rawYaml: '# this is placeholder yaml'
  }

  renderIcon = (kind: string) => {

    let icon = 'tonality';
    if (Object.keys(kindToIcon).includes(kind)) {
      icon = kindToIcon[kind]; 
    }
    
    return (
      <IconWrapper>
        <i className="material-icons">{icon}</i>
      </IconWrapper>
    );
  }

  renderExpanded = () => {
    if (this.state.expanded) {
      return (
        <ExpandWrapper>
          <YamlEditor
            value={this.state.rawYaml}
            onChange={(e: any) => this.setState({ rawYaml: e })}
            height='300px'
          />
        </ExpandWrapper>
      );
    }
  }

  render() {
    let { resource, showKindLabels, toggleKindLabels } = this.props;
    return (
      <StyledResourceItem>
        <ResourceHeader
          expanded={this.state.expanded}
          onClick={() => this.setState({ expanded: !this.state.expanded })}
        >
          <i className="material-icons">arrow_right</i>

          <ClickWrapper onClick={toggleKindLabels}>
            {this.renderIcon(resource.kind)}
            {showKindLabels ? `${resource.kind}` : null}
          </ClickWrapper>

          <ResourceName
            showKindLabels={showKindLabels}
          >
            {resource.name}
          </ResourceName>
        </ResourceHeader>
        {this.renderExpanded()}
      </StyledResourceItem>
    );
  }
}

const ExpandWrapper = styled.div`
  padding: 12px;
  animation: expandResource 0.3s;
  animation-timing-function: ease-out;
  overflow: hidden;
  @keyframes expandResource {
    from { height: 0px }
    to { height: 300px }
  }
`;

const StyledResourceItem = styled.div`
  border-bottom: 1px solid #606166;
`;

const BigPlaceholder = styled.div`
  height: 200px;
  width: 100%;
  background: blue;
`;

const ClickWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const ResourceName = styled.div`
  color: #ffffff;
  margin-left: ${(props: { showKindLabels: boolean }) => props.showKindLabels ? '10px' : ''};
  text-transform: none;
`;

const IconWrapper = styled.div`
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 16px;
    color: #ffffff;
    margin-right: 14px;
  }
`;

const ResourceHeader = styled.div`
  width: 100%;
  height: 60px;
  display: flex;
  color: #ffffff66;
  align-items: center;
  padding: 15px 13px;
  text-transform: capitalize;
  cursor: pointer;
  background: ${(props: { expanded: boolean }) => props.expanded ? '#ffffff11' : ''};
  :hover {
    background: #ffffff18;

    > i {
      background: #ffffff22;
    }
  }

  > i {
    margin-right: 13px;
    font-size: 20px;
    color: #ffffff66;
    cursor: pointer;
    border-radius: 20px;
    background: ${(props: { expanded: boolean }) => props.expanded ? '#ffffff18' : ''};
    transform: ${(props: { expanded: boolean }) => props.expanded ? 'rotate(180deg)' : ''};
    animation: ${(props: { expanded: boolean }) => props.expanded ? 'quarterTurn 0.3s' : ''};
    animation-fill-mode: forwards;

    @keyframes quarterTurn {
      from { transform: rotate(0deg) }
      to { transform: rotate(90deg) }
    }
  }
`;
