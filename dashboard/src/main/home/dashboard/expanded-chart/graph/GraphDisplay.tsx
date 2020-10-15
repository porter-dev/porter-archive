import React, { Component } from 'react';
import styled from 'styled-components';

import Node from './Node';
import Edge from './Edge';

const nodes = [
  { id: 0, x: 0, y: 0, w: 40, h: 40 },
  { id: 1, x: 200, y: 50, w: 40, h: 40 },
  { id: 2, x: -230, y: -250, w: 40, h: 40 },
  { id: 3, x: -200, y: 150, w: 40, h: 40 },
];

const edges = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3]
];

type NodeType = {
  id: number,
  x: number,
  y: number,
  w: number,
  h: number,
  toCursorX?: number,
  toCursorY?: number,
}

type PropsType = {
};

type StateType = {
  nodes: NodeType[],
  edges: [number, number][],
  originX: number | null,
  originY: number | null,
  activeIds: number[],
  cursorX: number | null,
  cursorY: number | null,
  deltaX: number | null,
  deltaY: number | null,
  dragBg: boolean,
  preventDrag: boolean
};

export default class GraphDisplay extends Component<PropsType, StateType> {
  state = {
    nodes: nodes as NodeType[],
    edges: edges as [number, number][],
    originX: null as (number | null),
    originY: null as (number | null),
    activeIds: [] as number[],
    cursorX: null as (number | null),
    cursorY: null as (number | null),
    deltaX: null as (number | null),
    deltaY: null as (number | null),
    dragBg: false,
    preventDrag: false
  }

  myRef: any = React.createRef();

  componentDidMount() {
    let height = this.myRef.offsetHeight;
    let width = this.myRef.offsetWidth;
    this.setState({
      originX: Math.round(width / 2),
      originY: Math.round(height / 2)
    });
  }

  // Push to activeIds if not already present
  handleClickNode = (id: number) => {
    let holding = this.state.activeIds;
    if (!holding.includes(id)) {
      holding.push(id);
    }

    // Track and store offset to grab node from anywhere (must store)
    let node = this.state.nodes[id];
    if (!node.toCursorX && !node.toCursorY) {
      node.toCursorX = node.x - this.state.cursorX;
      node.toCursorY = node.y - this.state.cursorY;
    } else {
      node.toCursorX = 0;
      node.toCursorY = 0;
    }

    this.setState({ activeIds: holding, preventDrag: true });
  }

  handleReleaseNode = () => {
    this.setState({ activeIds: [], preventDrag: false });

    // Only update dot position state on release for all active
    let { activeIds, nodes} = this.state;
    for (var i=0; i < activeIds.length; i++) {
      var a = activeIds[i];
      nodes[a].toCursorX = 0;
      nodes[a].toCursorY = 0;
    }
  }

  onMouseMove = (e: any) => {
    let { originX, originY, dragBg, preventDrag } = this.state;

    // Update origin-centered cursor coordinates
    let bounds = this.myRef.getBoundingClientRect();
    let cursorX = e.clientX - bounds.left - originX;
    let cursorY = -(e.clientY - bounds.top - originY);
    this.setState({ cursorX, cursorY });

    // Track delta for dragging background
    if (dragBg && !preventDrag) {
      this.setState({ deltaX: e.movementX, deltaY: e.movementY });
    }
  }

  // Pass origin to node for offset
  renderNodes = () => {
    let { activeIds, originX, originY, cursorX, cursorY } = this.state;

    return this.state.nodes.map((node: NodeType, i: number) => {

      // Update dot position if currently selected
      if (activeIds.includes(node.id)) {
        node.x = cursorX + node.toCursorX;
        node.y = cursorY + node.toCursorY;
      }

      // Apply movement from dragging background
      if (this.state.dragBg && !this.state.preventDrag) {
        node.x += this.state.deltaX;
        node.y -= this.state.deltaY;
      }
      
      return (
        <Node
          key={i}
          node={node}
          originX={originX}
          originY={originY}
          nodeMouseDown={() => this.handleClickNode(node.id)}
          nodeMouseUp={this.handleReleaseNode}
          isActive={activeIds.includes(node.id)}
        />
      );
    });
  }

  renderEdges = () => {
    return this.state.edges.map((edge: [number, number], i: number) => {
      return (
        <Edge
          originX={this.state.originX}
          originY={this.state.originY}
          x1={this.state.nodes[edge[0]].x}
          y1={this.state.nodes[edge[0]].y}
          x2={this.state.nodes[edge[1]].x}
          y2={this.state.nodes[edge[1]].y}
        />
      );
    });
  }

  render() {
    return (
      <StyledGraphDisplay
        ref={element => this.myRef = element}
        onMouseMove={this.onMouseMove}
        onMouseDown={() => this.setState({ dragBg: true })}
        onMouseUp={() => this.setState({ dragBg: false })}
      >
        {this.renderEdges()}
        {this.renderNodes()}
      </StyledGraphDisplay>
    );
  }
}

const StyledGraphDisplay = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #202227;
`;