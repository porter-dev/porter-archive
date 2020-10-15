import React, { Component } from 'react';
import styled from 'styled-components';

import Node from './Node';
import Edge from './Edge';
import { ResourceType } from '../../../../../shared/types';

const zoomConstant = 0.01;
const panConstant = 0.8;

type NodeType = {
  id: number,
  name: string,
  kind: string,
  x: number,
  y: number,
  w: number,
  h: number,
  toCursorX?: number,
  toCursorY?: number,
}

type EdgeType = {
  type: string,
  source: number,
  target: number,
}

type PropsType = {
  components: ResourceType[]
};

type StateType = {
  nodes: NodeType[],
  edges: EdgeType[],
  activeIds: number[],
  originX: number | null,
  originY: number | null,
  cursorX: number | null,
  cursorY: number | null,
  deltaX: number | null,
  deltaY: number | null,
  panX: number | null,
  panY: number | null,
  dragBg: boolean,
  preventDrag: boolean,
  scale: number,
};

export default class GraphDisplay extends Component<PropsType, StateType> {
  state = {
    nodes: [] as NodeType[],
    edges: [] as EdgeType[],
    activeIds: [] as number[],
    originX: null as (number | null),
    originY: null as (number | null),
    cursorX: null as (number | null),
    cursorY: null as (number | null),
    deltaX: null as (number | null),
    deltaY: null as (number | null),
    panX: null as (number | null),
    panY: null as (number | null),
    dragBg: false,
    preventDrag: false,
    scale: 0.5
  }

  spaceRef: any = React.createRef();

  componentDidMount() {
    let { components } = this.props;
    let height = this.spaceRef.offsetHeight;
    let width = this.spaceRef.offsetWidth;
    this.setState({
      originX: Math.round(width / 2),
      originY: Math.round(height / 2)
    });

    // Suppress trackpad gestures
    this.spaceRef.addEventListener("touchmove", (e: any) => e.preventDefault());
    this.spaceRef.addEventListener("mousewheel", (e: any) => e.preventDefault());
    let nodes = components.map((c: ResourceType) => {
      return {id: c.ID, name: c.Name, kind: c.Kind, x:0, y:0, w:40, h:40}
    })

    let edges = [] as EdgeType[]
    components.map((c: ResourceType) => {
      c.Relations.ControlRels.map((rel: any) => {
        if (rel.Source == c.ID) {
          edges.push({type: "ControlRel", source: rel.Source, target: rel.Target})
        }
      })
      c.Relations.LabelRels.map((rel: any) => {
        if (rel.Source == c.ID) {
          edges.push({type: "LabelRel", source: rel.Source, target: rel.Target})
        }
      })

      this.setState({edges})
    })
    this.setState({nodes})
  }

  componentWillUnmount() {
    this.spaceRef.removeEventListener("touchmove", (e: any) => e.preventDefault());
    this.spaceRef.removeEventListener("mousewheel", (e: any) => e.preventDefault());
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
    let { originX, originY, dragBg, preventDrag, scale, panX, panY } = this.state;
    
    // Suppress navigation gestures
    if (scale !== 1 || panX !== 0 || panY !== 0) {
      this.setState({ scale: 1, panX: 0, panY: 0 });
    }

    // Update origin-centered cursor coordinates
    let bounds = this.spaceRef.getBoundingClientRect();
    let cursorX = e.clientX - bounds.left - originX;
    let cursorY = -(e.clientY - bounds.top - originY);
    this.setState({ cursorX, cursorY });

    // Track delta for dragging background
    if (dragBg && !preventDrag) {
      this.setState({ deltaX: e.movementX, deltaY: e.movementY });
    }
  }

  // Handle pan XOR zoom (two-finger gestures count as onWheel)
  handleOnWheel = (e: any) => {

    // Pinch/zoom sets e.ctrlKey to true
    if (e.ctrlKey) {
      var scale = 1;
      scale -= e.deltaY * zoomConstant;
      this.setState({ scale, panX: 0, panY: 0 });
    } else {
      this.setState({ panX: e.deltaX, panY: e.deltaY, scale: 1 });
    }
  };

  // Pass origin to node for offset
  renderNodes = () => {
    let { activeIds, originX, originY, cursorX, cursorY, scale, panX, panY } = this.state;

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

      // Apply cursor-centered zoom
      if (this.state.scale !== 1) {
        node.x = cursorX + scale * (node.x - cursorX);
        node.y = cursorY + scale * (node.y - cursorY);
      }

      // Apply pan 
      node.x -= panConstant * panX;
      node.y += panConstant * panY;
      
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
    return this.state.edges.map((edge: EdgeType, i: number) => {
      return (
        <Edge
          key={i}
          originX={this.state.originX}
          originY={this.state.originY}
          x1={this.state.nodes[edge.source].x}
          y1={this.state.nodes[edge.source].y}
          x2={this.state.nodes[edge.target].x}
          y2={this.state.nodes[edge.target].y}
        />
      );
    });
  }

  render() {
    console.log('rendering graph display')
    return (
      <StyledGraphDisplay
        ref={element => this.spaceRef = element}
        onMouseMove={this.onMouseMove}
        onMouseDown={() => this.setState({ dragBg: true })}
        onMouseUp={() => this.setState({ dragBg: false })}
        onWheel={this.handleOnWheel}
      >
        {this.renderNodes()}
        {this.renderEdges()}
      </StyledGraphDisplay>
    );
  }
}

const StyledGraphDisplay = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: move;
  background: #202227;
`;