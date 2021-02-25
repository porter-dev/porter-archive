import React, { Component } from "react";
import styled from "styled-components";

import { kindToIcon } from "shared/rosettaStone";
import { NodeType } from "shared/types";

type PropsType = {
  node: NodeType;
  originX: number;
  originY: number;
  nodeMouseDown: () => void;
  nodeMouseUp: () => void;
  isActive: boolean;
  showKindLabels: boolean;
  setCurrentNode: (node: NodeType) => void;
  isOpen: boolean;
};

type StateType = {};

export default class Node extends Component<PropsType, StateType> {
  state = {};

  render() {
    let { x, y, w, h, name, kind } = this.props.node;
    let { originX, originY, nodeMouseDown, nodeMouseUp, isActive } = this.props;

    let icon = "tonality";
    if (Object.keys(kindToIcon).includes(kind)) {
      icon = kindToIcon[kind];
    }

    return (
      <StyledNode
        x={Math.round(originX + x - w / 2)}
        y={Math.round(originY - y - h / 2)}
        w={Math.round(w)}
        h={Math.round(h)}
      >
        <Kind>
          <StyledMark>{this.props.showKindLabels ? kind : null}</StyledMark>
        </Kind>
        <NodeBlock
          onMouseDown={nodeMouseDown}
          onMouseUp={nodeMouseUp}
          onMouseEnter={() => this.props.setCurrentNode(this.props.node)}
          onMouseLeave={() => this.props.setCurrentNode(null)}
          isActive={isActive}
          isOpen={this.props.isOpen}
        >
          <i className="material-icons">{icon}</i>
        </NodeBlock>
        <NodeLabel>
          <StyledMark>{name}</StyledMark>
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
  font-family: "Work Sans", sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 101;
`;

const NodeLabel = styled.div`
  position: relative;
  margin-bottom: -25px;
  padding-top: 10px;
  color: #aaaabb;
  max-width: 140px;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 101;
`;

const NodeBlock = styled.div`
  background: #444446;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 100px;
  border: ${(props: { isActive: boolean; isOpen: boolean }) =>
    props.isOpen ? "3px solid #ffffff" : ""};
  box-shadow: ${(props: { isActive: boolean; isOpen: boolean }) =>
    props.isActive ? "0 0 10px #ffffff66" : "0px 0px 10px 2px #00000022"};
  z-index: 100;
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
    top: props.y + "px",
    left: props.x + "px",
  },
}))`
  position: absolute;
  width: ${(props: NodeType) => props.w + "px"};
  height: ${(props: NodeType) => props.h + "px"};
  color: #ffffff22;
  border-radius: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StyledMark = styled.mark`
  background-color: #202227aa;
  color: #aaaabb;
`;
