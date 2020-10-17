import React, { Component } from 'react';
import styled from 'styled-components';

import { kindToIcon, edgeColors } from '../../../../../shared/rosettaStone';
import { NodeType, EdgeType} from '../../../../../shared/types';
import Edge from './Edge';

type PropsType = {
  currentNode: NodeType,
  currentEdge: EdgeType
};

type StateType = {
};

export default class InfoPanel extends Component<PropsType, StateType> {
  state = {
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

  renderColorBlock = (type: string) => {
    return <ColorBlock color={edgeColors[type]} />;
  }

  renderContents = () => {
    let { currentNode, currentEdge } = this.props;
    if (currentNode) {
      return (
        <Div>
          {this.renderIcon(currentNode.kind)}
          {currentNode.kind}
          <ResourceName>
            {currentNode.name}
          </ResourceName>
        </Div>
      );
    } else if (currentEdge) {
      return (
        <EdgeInfo>
          {this.renderColorBlock(currentEdge.type)}
          {this.renderEdgeMessage(currentEdge)}
        </EdgeInfo>
      )
    }

    return (
      <Div>
        <IconWrapper>
          <i className="material-icons">info</i>
        </IconWrapper>
        Hover over a node or edge to display info.
      </Div>
    )
  }

  renderEdgeMessage = (edge: EdgeType) => {
    // TODO: render more information about edges (labels, spec property field)
    switch(edge.type) {
      case "ControlRel":
        return "Controller Relation"
      case "LabelRel":
        return "Label Relation"
      case "SpecRel":
        return "Spec Relation"
    }
  }

  render() {
    return (
      <StyledInfoPanel>
        {this.renderContents()}
      </StyledInfoPanel>
    );
  }
}

const ColorBlock = styled.div`
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  margin-left: -2px;
  margin-right: 13px;
  background: ${(props: { color: string }) => props.color ? props.color : '#ffffff66'};
`;

const Div = styled.div`
  display: flex;
  align-items: center;
`;

const EdgeInfo = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;
`;

const ResourceName = styled.div`
  color: #ffffff;
  margin-left: 10px;
  text-transform: none;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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

const StyledInfoPanel = styled.div`
  position: absolute;
  right: 15px;
  bottom: 15px;
  color: #ffffff66;
  height: 40px;
  width: 400px;
  max-width: 600px;
  background: #44444699;
  border-radius: 3px;
  padding-left: 20px;
  display: inline-block;
  z-index: 999;
  padding-top: 7px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding-right: 13px;
`;