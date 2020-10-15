import React, { Component } from 'react';
import styled from 'styled-components';

type NodeType = {
  id: number,
  x: number,
  y: number,
  w: number,
  h: number
}

type PropsType = {
  node: NodeType,
  originX: number,
  originY: number,
  nodeMouseDown: () => void,
  nodeMouseUp: () => void,
  isActive: boolean
};

type StateType = {
};

export default class Node extends Component<PropsType, StateType> {
  state = {
  }

  render() {
    let { x, y, w, h } = this.props.node;
    let { originX, originY, nodeMouseDown, nodeMouseUp, isActive } = this.props;
    return (
      <StyledNode
        x={Math.round(originX + x - (w / 2))}
        y={Math.round(originY - y - (h / 2))}
        w={Math.round(w)}
        h={Math.round(h)}
        onMouseDown={nodeMouseDown}
        onMouseUp={nodeMouseUp}
        isActive={isActive}
      >
        <i className="material-icons">category</i>
        <NodeLabel>some-object-name</NodeLabel>
      </StyledNode>
    );
  }
}

const NodeLabel = styled.div`
  position: absolute;
  bottom: -25px;
  color: #aaaabb;
  width: 200px;
  left: -80px;
  font-size: 13px;
  font-family: 'Work Sans', sans-serif;
  text-align: center;
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
  background: #444446;
  box-shadow: ${(props: any) => props.isActive ? '0 0 10px #ffffff66' : '0px 0px 10px 2px #00000022'};
  cursor: pointer;
  border-radius: 5px;
  color: #ffffff22;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;

  > i {
    color: white;
    font-size: 18px;
  }
`;