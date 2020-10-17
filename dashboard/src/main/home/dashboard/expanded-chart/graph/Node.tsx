import React, { Component } from 'react';
import styled from 'styled-components';

import { kindToIcon } from '../../../../../shared/rosettaStone';
import { NodeType } from '../../../../../shared/types';

type PropsType = {
  node: NodeType,
  originX: number,
  originY: number,
  nodeMouseDown: () => void,
  nodeMouseUp: () => void,
  isActive: boolean,
  showKindLabels: boolean,
  setCurrentNode: (node: NodeType) => void,
};

type StateType = {
};

export default class Node extends Component<PropsType, StateType> {
  state = {
  }

  render() {
    let { x, y, w, h, name, kind } = this.props.node;
    let { originX, originY, nodeMouseDown, nodeMouseUp, isActive } = this.props;

    let icon = 'tonality';
    if (Object.keys(kindToIcon).includes(kind)) {
      icon = kindToIcon[kind]; 
    }

    return (
      <StyledNode
        x={Math.round(originX + x - (w / 2))}
        y={Math.round(originY - y - (h / 2))}
        w={Math.round(w)}
        h={Math.round(h)}
        isActive={isActive}
      >
        <Kind>
          {this.props.showKindLabels ? kind : null}
        </Kind>
        <NodeBlock 
          onMouseDown={nodeMouseDown}
          onMouseUp={nodeMouseUp}
          onMouseEnter={() => this.props.setCurrentNode(this.props.node)}
          onMouseLeave={() => this.props.setCurrentNode(null)}
        >
          <i className="material-icons">{icon}</i>
        </NodeBlock>
        <NodeLabel>
          {name}
        </NodeLabel>
      </StyledNode>
    );
  }
}

const Kind = styled.div`
  color: #ffffff33;
  position: relative;
  margin-top: -25px;
  padding-bottom: 10px;
  max-width: 140px;
  text-align: center;
  min-width: 1px;
  height: 25px;
  font-size: 13px;
  font-family: 'Work Sans', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const NodeLabel = styled.div`
  position: relative;
  margin-bottom: -25px;
  padding-top: 10px;
  color: #aaaabb;
  max-width: 140px;
  font-size: 13px;
  font-family: 'Work Sans', sans-serif;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const NodeBlock = styled.div`
  background: #444446;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 100px;
  cursor: pointer;
  :hover {
    background: #555556;
  }
  > i {
    color: white;
    font-size: 18px;
  }
`;

const StyledNode: any = styled.div.attrs((props: NodeType) => ({
  style: {
    top: props.y + 'px',
    left: props.x + 'px',
    },
}))`
  position: absolute;
  width: ${(props: NodeType) => props.w + 'px'};;
  height: ${(props: NodeType) => props.h + 'px'};;
  box-shadow: ${(props: any) => props.isActive ? '0 0 10px #ffffff66' : '0px 0px 10px 2px #00000022'};
  color: #ffffff22;
  border-radius: 100px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
`;