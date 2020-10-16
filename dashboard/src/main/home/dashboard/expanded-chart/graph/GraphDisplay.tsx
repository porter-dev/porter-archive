import React, { Component } from 'react';
import styled from 'styled-components';

import { ResourceType, NodeType, EdgeType } from '../../../../../shared/types';

import Node from './Node';
import Edge from './Edge';
import InfoPanel from './InfoPanel';
import SelectRegion from './SelectRegion';

const zoomConstant = 0.01;
const panConstant = 0.8;

type PropsType = {
  components: ResourceType[],
  isExpanded: boolean,
  setSidebar: (x: boolean) => void,
  currentChartName: string
};

type StateType = {
  nodes: NodeType[],
  edges: EdgeType[],
  activeIds: number[], // IDs of all currently selected nodes
  originX: number | null, 
  originY: number | null,
  cursorX: number | null,
  cursorY: number | null,
  deltaX: number | null, // Dragging bg x-displacement
  deltaY: number | null, // Dragging y-displacement
  panX: number | null, // Two-finger pan x-displacement 
  panY: number | null, // Two-finger pan y-displacement
  anchorX: number | null, // Initial cursorX during region select
  anchorY: number | null, // Initial cursorY during region select
  dragBg: boolean, // Boolean to track if all nodes should move with mouse (bg drag)
  preventBgDrag: boolean, // Prevents bg drag when moving selected with mouse down
  relocateAllowed: boolean, // Suppresses movement of selected when drawing select region
  scale: number,
  showKindLabels: boolean,
  currentNode: NodeType | null,
  currentEdge: EdgeType | null,
  isExpanded: boolean
};

// TODO: region-based unselect, shift-click, multi-region
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
    anchorX: null as (number | null),
    anchorY: null as (number | null),
    dragBg: false,
    preventBgDrag: false,
    scale: 0.5,
    showKindLabels: true,
    currentNode: null as (NodeType | null),
    currentEdge: null as (EdgeType | null),
    relocateAllowed: false,
    isExpanded: false
  }

  spaceRef: any = React.createRef();

  getRandomIntBetweenRange = (min: number, max: number) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);  
  }

  componentDidMount() {
    let { components } = this.props;

    // Initialize origin
    let height = this.spaceRef.offsetHeight;
    let width = this.spaceRef.offsetWidth;
    this.setState({
      originX: Math.round(width / 2),
      originY: Math.round(height / 2)
    });

    // Suppress trackpad gestures
    this.spaceRef.addEventListener("touchmove", (e: any) => e.preventDefault());
    this.spaceRef.addEventListener("mousewheel", (e: any) => e.preventDefault());

    let graph = localStorage.getItem(`charts.${this.props.currentChartName}`)
    let nodes = [] as NodeType[]
    let edges = [] as EdgeType[]

    if (!graph) {
      nodes = this.createNodes(components)
      edges = this.createEdges(components)
      this.setState({ nodes, edges });
    } else {
      let storedState = JSON.parse(localStorage.getItem(`charts.${this.props.currentChartName}`))
      this.setState(storedState)
    }

    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
  }

  createNodes = (components: ResourceType[]) => {
    return components.map((c: ResourceType) => {
      switch(c.Kind) {
        case "ClusterRoleBinding":
        case "ClusterRole":
        case "RoleBinding":
        case "Role":
          return { id: c.ID, name: c.Name, kind: c.Kind, x: this.getRandomIntBetweenRange(-1000, 0), y: this.getRandomIntBetweenRange(0, 500), w: 40, h: 40 };
        case "Deployment":
        case "StatefulSet":
        case "Pod":
        case "ServiceAccount":
          return { id: c.ID, name: c.Name, kind: c.Kind, x: this.getRandomIntBetweenRange(0, 1000), y: this.getRandomIntBetweenRange(0, 500), w: 40, h: 40 };
        case "Service":
        case "Ingress":
        case "ServiceAccount":
            return { id: c.ID, name: c.Name, kind: c.Kind, x: this.getRandomIntBetweenRange(0, 1000), y: this.getRandomIntBetweenRange(-500, 0), w: 40, h: 40 };
        default:
          return { id: c.ID, name: c.Name, kind: c.Kind, x: this.getRandomIntBetweenRange(-700, 0), y: this.getRandomIntBetweenRange(-500, 0), w: 40, h: 40 };
        }
    });
  }

  createEdges = (components: ResourceType[]) => {
    let edges = [] as EdgeType[]
    components.map((c: ResourceType) => {
      c.Relations?.ControlRels?.map((rel: any) => {
        if (rel.Source == c.ID) {
          edges.push({ type: "ControlRel", source: rel.Source, target: rel.Target });
        }
      })
      c.Relations?.LabelRels?.map((rel: any) => {
        if (rel.Source == c.ID) {
          edges.push({ type: "LabelRel", source: rel.Source, target: rel.Target });
        }
      })
      c.Relations?.SpecRels?.map((rel: any) => {
        if (rel.Source == c.ID) {
          edges.push({ type: "SpecRel", source: rel.Source, target: rel.Target });
        }
      })
    });
    return edges
  }

  componentWillUnmount() {
    let graph = this.state;
    console.log("unmounting...", graph)
    // flush non-persistent data
    graph.activeIds = [];
    graph.currentNode = null;
    graph.currentEdge = null;
    graph.isExpanded = false;

    localStorage.setItem(`charts.${this.props.currentChartName}`, JSON.stringify(graph))
    this.spaceRef.removeEventListener("touchmove", (e: any) => e.preventDefault());
    this.spaceRef.removeEventListener("mousewheel", (e: any) => e.preventDefault());
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
  }

  // Handle shift key for multi-select
  handleKeyDown = (e: any) => {
    if (e.key === 'Shift') {
      this.setState({
        anchorX: this.state.cursorX,
        anchorY: this.state.cursorY,
        relocateAllowed: false
      });
    }
  }

  handleKeyUp = (e: any) => {
    if (e.key === 'Shift') {
      this.setState({ anchorX: null, anchorY: null });
    }
  }

  // Push to activeIds if not already present
  handleClickNode = (clickedId: number) => {
    let holding = this.state.activeIds;
    if (!holding.includes(clickedId)) {
      holding.push(clickedId);
    }

    // Track and store offset to grab node from anywhere (must store)
    this.state.nodes.forEach((node: NodeType) => {
      if (this.state.activeIds.includes(node.id)) {
        if (!node.toCursorX && !node.toCursorY) {
          node.toCursorX = node.x - this.state.cursorX;
          node.toCursorY = node.y - this.state.cursorY;
        } else {
          node.toCursorX = 0;
          node.toCursorY = 0;
        }
      }
    });

    this.setState({ activeIds: holding, preventBgDrag: true, relocateAllowed: true });
  }

  handleReleaseNode = () => {
    this.setState({ activeIds: [], preventBgDrag: false });

    // Only update dot position state on release for all active
    let { activeIds, nodes} = this.state;
    for (var i=0; i < activeIds.length; i++) {
      var a = activeIds[i];
      nodes[a].toCursorX = 0;
      nodes[a].toCursorY = 0;
    }
  }

  handleMouseMove = (e: any) => {
    let { originX, originY, dragBg, preventBgDrag, scale, panX, panY, anchorX, anchorY, nodes, activeIds, relocateAllowed } = this.state;
    
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
    if (dragBg && !preventBgDrag) {
      this.setState({ deltaX: e.movementX, deltaY: e.movementY });
    }

    // Check if within select region 
    if (anchorX && anchorY) {
      nodes.forEach((node: NodeType) => {
        if (node.x > Math.min(anchorX, cursorX) && node.x < Math.max(anchorX, cursorX)
          && node.y > Math.min(anchorY, cursorY) && node.y < Math.max(anchorY, cursorY)
        ) {
          activeIds.push(node.id);
          this.setState({ activeIds });
        }
      });
    } 
  }

  // Handle pan XOR zoom (two-finger gestures count as onWheel)
  handleWheel = (e: any) => {

    // Pinch/zoom sets e.ctrlKey to true
    if (e.ctrlKey) {
      var scale = 1;
      scale -= e.deltaY * zoomConstant;
      this.setState({ scale, panX: 0, panY: 0 });
    } else {
      this.setState({ panX: e.deltaX, panY: e.deltaY, scale: 1 });
    }
  };

  toggleExpanded = () => {
    this.setState({ isExpanded: !this.state.isExpanded }, () => {
      this.props.setSidebar(!this.state.isExpanded);

      // Update origin on expand/collapse
      let height = this.spaceRef.offsetHeight;
      let width = this.spaceRef.offsetWidth;
      let nudge = 0;
      if (!this.state.isExpanded) {
        nudge = 100;
      }
      this.setState({
        originX: Math.round(width / 2) - nudge,
        originY: Math.round(height / 2)
      });  
    });
  }

  // Pass origin to node for offset
  renderNodes = () => {
    let { activeIds, originX, originY, cursorX, cursorY, scale, panX, panY, anchorX, anchorY, relocateAllowed } = this.state;

    return this.state.nodes.map((node: NodeType, i: number) => {

      // Update position if not highlighting and active
      if (activeIds.includes(node.id) && relocateAllowed && !anchorX && !anchorY) {
        node.x = cursorX + node.toCursorX;
        node.y = cursorY + node.toCursorY;
      }

      // Apply movement from dragging background
      if (this.state.dragBg && !this.state.preventBgDrag) {
        node.x += this.state.deltaX;
        node.y -= this.state.deltaY;
      }

      // Apply cursor-centered zoom
      if (this.state.scale !== 1) {
        node.x = cursorX + scale * (node.x - cursorX);
        node.y = cursorY + scale * (node.y - cursorY);
      }

      // Apply pan 
      if (this.state.panX !== 0 || this.state.panY !== 0) {
        node.x -= panConstant * panX;
        node.y += panConstant * panY;
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
          showKindLabels={this.state.showKindLabels}
          setCurrentNode={(node: NodeType) => this.setState({ currentNode: node })}
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
          edge={edge}
          setCurrentEdge={(edge: EdgeType) => this.setState({ currentEdge: edge })}
        />
      );
    });
  }

  renderSelectRegion = () => {
    if (this.state.anchorX && this.state.anchorY) {
      return (
        <SelectRegion
          anchorX={this.state.anchorX}
          anchorY={this.state.anchorY}
          originX={this.state.originX}
          originY={this.state.originY}
          cursorX={this.state.cursorX}
          cursorY={this.state.cursorY}
        />
      );
    }
  }

  render() {
    return (
      <StyledGraphDisplay
        isExpanded={this.state.isExpanded}
        ref={element => this.spaceRef = element}
        onMouseMove={this.handleMouseMove}
        onMouseDown={() => this.setState({
          dragBg: true,

          // Suppress drifting on repeated click
          deltaX: null,
          deltaY: null,
          panX: null,
          panY: null,
          scale: 1
        })}
        onMouseUp={() => this.setState({ dragBg: false, activeIds: [] })}
        onWheel={this.handleWheel}
      >
        {this.renderNodes()}
        {this.renderEdges()}
        {this.renderSelectRegion()}

        <ButtonSection>
          <ToggleLabel
            onClick={() => this.setState({ showKindLabels: !this.state.showKindLabels })}
          >
            <Checkbox checked={this.state.showKindLabels}>
                <i className="material-icons">done</i>
            </Checkbox>
            Show Type
          </ToggleLabel>
          <ExpandButton
            onClick={this.toggleExpanded}
          >
            <i className="material-icons">
              {this.state.isExpanded ? 'close_fullscreen' : 'open_in_full'}
            </i>
          </ExpandButton>
        </ButtonSection>
        <InfoPanel
          currentNode={this.state.currentNode}
          currentEdge={this.state.currentEdge}
        />
      </StyledGraphDisplay>
    );
  }
}

const Checkbox = styled.div`
  width: 16px;
  height: 16px;
  border: 1px solid #ffffff44;
  margin: 0px 8px 0px 3px;
  border-radius: 3px;
  background: ${(props: { checked: boolean }) => props.checked ? '#ffffff22' : ''};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;

  > i {
    font-size: 12px;
    padding-left: 0px;
    display: ${(props: { checked: boolean }) => props.checked ? '' : 'none'};
  }
`;

const ToggleLabel = styled.div`
  font: 12px 'Work Sans';
  color: #ffffff;
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 3px;
  padding-right: 5px;
  cursor: pointer;
  border: 1px solid #ffffff44;
  :hover {
    background: #ffffff22;

    > div {
      background: #ffffff22;
    }
  }
`;

const ButtonSection = styled.div`
  position: absolute;
  top: 17px;
  right: 15px;
  display: flex;
  align-items: center;
`;

const ExpandButton = styled.div`
  width: 24px;
  height: 24px;
  cursor: pointer;
  margin-left: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 3px;
  border: 1px solid #ffffff44;

  :hover {
    background: #ffffff44; 
  }

  > i {
    font-size: 14px;
  }
`;

const StyledGraphDisplay = styled.div`
  overflow: hidden;
  cursor: move;
  width: ${(props: { isExpanded: boolean }) => props.isExpanded ? '100vw' : '100%'};
  height: ${(props: { isExpanded: boolean }) => props.isExpanded ? '100vh' : '100%'};
  background: #202227;
  position: ${(props: { isExpanded: boolean }) => props.isExpanded ? 'fixed' : 'relative'};
  top: ${(props: { isExpanded: boolean }) => props.isExpanded ? '-25px' : ''};
  right: ${(props: { isExpanded: boolean }) => props.isExpanded ? '-25px' : ''};
`;