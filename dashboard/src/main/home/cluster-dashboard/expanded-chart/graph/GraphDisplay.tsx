import React, { Component } from "react";
import styled from "styled-components";

import { ChartType, EdgeType, NodeType, ResourceType } from "shared/types";

import Node from "./Node";
import Edge from "./Edge";
import InfoPanel from "./InfoPanel";
import ZoomPanel from "./ZoomPanel";
import SelectRegion from "./SelectRegion";
import _ from "lodash";

const zoomConstant = 0.01;
const panConstant = 0.8;

type PropsType = {
  components: ResourceType[];
  isExpanded: boolean;
  setSidebar: (x: boolean) => void;
  currentChart: ChartType;

  // Handle revisions expansion for YAML wrapper
  showRevisions: boolean;
};

type StateType = {
  nodes: NodeType[];
  edges: EdgeType[];
  activeIds: number[]; // IDs of all currently selected nodes
  originX: number | null;
  originY: number | null;
  cursorX: number | null;
  cursorY: number | null;
  deltaX: number | null; // Dragging bg x-displacement
  deltaY: number | null; // Dragging y-displacement
  panX: number | null; // Two-finger pan x-displacement
  panY: number | null; // Two-finger pan y-displacement
  anchorX: number | null; // Initial cursorX during region select
  anchorY: number | null; // Initial cursorY during region select
  nodeClickX: number | null; // Initial cursorX during node click (drag vs click)
  nodeClickY: number | null; // Initial cursorY during node click (drag vs click)
  dragBg: boolean; // Boolean to track if all nodes should move with mouse (bg drag)
  preventBgDrag: boolean; // Prevent bg drag when moving selected with mouse down
  relocateAllowed: boolean; // Suppress movement of selected when drawing select region
  scale: number;
  btnZooming: boolean;
  showKindLabels: boolean;
  isExpanded: boolean;
  currentNode: NodeType | null;
  currentEdge: EdgeType | null;
  openedNode: NodeType | null;
  suppressCloseNode: boolean; // Still click should close opened unless on a node
  suppressDisplay: boolean; // Ignore clicks + pan/zoom on InfoPanel or ButtonSection
  version?: number; // Track in localstorage for handling updates when unmounted
};

// TODO: region-based unselect, shift-click, multi-region
export default class GraphDisplay extends Component<PropsType, StateType> {
  state = {
    nodes: [] as NodeType[],
    edges: [] as EdgeType[],
    activeIds: [] as number[],
    originX: null as number | null,
    originY: null as number | null,
    cursorX: null as number | null,
    cursorY: null as number | null,
    deltaX: null as number | null,
    deltaY: null as number | null,
    panX: null as number | null,
    panY: null as number | null,
    anchorX: null as number | null,
    anchorY: null as number | null,
    nodeClickX: null as number | null,
    nodeClickY: null as number | null,
    dragBg: false,
    preventBgDrag: false,
    relocateAllowed: false,
    scale: 0.5,
    btnZooming: false,
    showKindLabels: true,
    isExpanded: false,
    currentNode: null as NodeType | null,
    currentEdge: null as EdgeType | null,
    openedNode: null as NodeType | null,
    suppressCloseNode: false,
    suppressDisplay: false,
  };

  spaceRef: any = React.createRef();

  getRandomIntBetweenRange = (min: number, max: number) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
  };

  // Handle graph from localstorage
  getChartGraph = () => {
    let { components, currentChart } = this.props;

    let graph = localStorage.getItem(
      `charts.${currentChart.name}-${currentChart.version}`
    );

    let nodes = [] as NodeType[];
    let edges = [] as EdgeType[];

    if (!graph) {
      nodes = this.createNodes(components);
      edges = this.createEdges(components);
      this.setState({ nodes, edges });
    } else {
      let storedState = JSON.parse(
        localStorage.getItem(
          `charts.${currentChart.name}-${currentChart.version}`
        )
      );
      this.setState(storedState);
    }
  };

  componentDidMount() {
    // Initialize origin
    let height = this.spaceRef.offsetHeight;
    let width = this.spaceRef.offsetWidth;
    this.setState({
      originX: Math.round(width / 2),
      originY: Math.round(height / 2),
    });

    // Suppress trackpad gestures
    this.spaceRef.addEventListener("touchmove", (e: any) => e.preventDefault());
    this.spaceRef.addEventListener("mousewheel", (e: any) =>
      e.preventDefault()
    );

    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);

    this.getChartGraph();

    window.onbeforeunload = () => {
      this.storeChartGraph();
    };
  }

  // Live update on rollback/upgrade
  componentDidUpdate(prevProps: PropsType) {
    if (!_.isEqual(prevProps.currentChart, this.props.currentChart)) {
      this.storeChartGraph(prevProps);
      this.getChartGraph();
    }
  }

  createNodes = (components: ResourceType[]) => {
    return components.map((c: ResourceType) => {
      switch (c.Kind) {
        case "ClusterRoleBinding":
        case "ClusterRole":
        case "RoleBinding":
        case "Role":
          return {
            id: c.ID,
            RawYAML: c.RawYAML,
            name: c.Name,
            kind: c.Kind,
            x: this.getRandomIntBetweenRange(-500, 0),
            y: this.getRandomIntBetweenRange(0, 250),
            w: 40,
            h: 40,
          };
        case "Deployment":
        case "StatefulSet":
        case "Pod":
        case "ServiceAccount":
          return {
            id: c.ID,
            RawYAML: c.RawYAML,
            name: c.Name,
            kind: c.Kind,
            x: this.getRandomIntBetweenRange(0, 500),
            y: this.getRandomIntBetweenRange(0, 250),
            w: 40,
            h: 40,
          };
        case "Service":
        case "Ingress":
        case "ServiceAccount":
          return {
            id: c.ID,
            RawYAML: c.RawYAML,
            name: c.Name,
            kind: c.Kind,
            x: this.getRandomIntBetweenRange(0, 500),
            y: this.getRandomIntBetweenRange(-250, 0),
            w: 40,
            h: 40,
          };
        default:
          return {
            id: c.ID,
            RawYAML: c.RawYAML,
            name: c.Name,
            kind: c.Kind,
            x: this.getRandomIntBetweenRange(-400, 0),
            y: this.getRandomIntBetweenRange(-250, 0),
            w: 40,
            h: 40,
          };
      }
    });
  };

  createEdges = (components: ResourceType[]) => {
    let edges = [] as EdgeType[];
    components.map((c: ResourceType) => {
      c.Relations?.ControlRels?.map((rel: any) => {
        if (rel.Source == c.ID) {
          edges.push({
            type: "ControlRel",
            source: rel.Source,
            target: rel.Target,
          });
        }
      });
      c.Relations?.LabelRels?.map((rel: any) => {
        if (rel.Source == c.ID) {
          edges.push({
            type: "LabelRel",
            source: rel.Source,
            target: rel.Target,
          });
        }
      });
      c.Relations?.SpecRels?.map((rel: any) => {
        if (rel.Source == c.ID) {
          edges.push({
            type: "SpecRel",
            source: rel.Source,
            target: rel.Target,
          });
        }
      });
    });
    return edges;
  };

  storeChartGraph = (props?: PropsType) => {
    let useProps = props || this.props;

    let { currentChart } = useProps;
    let graph = JSON.parse(JSON.stringify(this.state));

    // Flush non-persistent data
    graph.activeIds = [];
    graph.currentNode = null;
    graph.currentEdge = null;
    graph.isExpanded = false;
    graph.openedNode = null;
    graph.suppressDisplay = false;
    graph.suppressCloseNode = false;

    localStorage.setItem(
      `charts.${currentChart.name}-${currentChart.version}`,
      JSON.stringify(graph)
    );
  };

  componentWillUnmount() {
    this.storeChartGraph();

    this.spaceRef.removeEventListener("touchmove", (e: any) =>
      e.preventDefault()
    );
    this.spaceRef.removeEventListener("mousewheel", (e: any) =>
      e.preventDefault()
    );
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
  }

  // Handle shift key for multi-select
  handleKeyDown = (e: any) => {
    if (e.key === "Shift") {
      this.setState({
        anchorX: this.state.cursorX,
        anchorY: this.state.cursorY,
        relocateAllowed: false,

        // Suppress jump when panning with mouse
        panX: null,
        panY: null,
        deltaX: null,
        deltaY: null,
      });
    }
  };

  handleKeyUp = (e: any) => {
    if (e.key === "Shift") {
      this.setState({
        anchorX: null,
        anchorY: null,

        // Suppress jump when panning with mouse
        panX: null,
        panY: null,
        deltaX: null,
        deltaY: null,
      });
    }
  };

  handleClickNode = (clickedId: number) => {
    let { cursorX, cursorY } = this.state;

    // Store position for distinguishing click vs drag on release
    this.setState({
      nodeClickX: cursorX,
      nodeClickY: cursorY,
      suppressCloseNode: true,
    });

    // Push to activeIds if not already present
    let holding = this.state.activeIds;
    if (!holding.includes(clickedId)) {
      holding.push(clickedId);
    }

    // Track and store offset to grab node from anywhere (must store)
    this.state.nodes.forEach((node: NodeType) => {
      if (this.state.activeIds.includes(node.id)) {
        node.toCursorX = node.x - cursorX;
        node.toCursorY = node.y - cursorY;
      }
    });

    this.setState({
      activeIds: holding,
      preventBgDrag: true,
      relocateAllowed: true,
    });
  };

  handleReleaseNode = (node: NodeType) => {
    let { cursorX, cursorY, nodeClickX, nodeClickY } = this.state;
    this.setState({ activeIds: [], preventBgDrag: false });

    // Distinguish node click vs drag (can't use onClick since drag counts)
    if (cursorX === nodeClickX && cursorY === nodeClickY) {
      this.setState({ openedNode: node });
    }
  };

  handleMouseDown = () => {
    let { cursorX, cursorY } = this.state;

    // Store position for distinguishing click vs drag on release
    this.setState({ nodeClickX: cursorX, nodeClickY: cursorY });

    this.setState({
      dragBg: true,

      // Suppress drifting on repeated click
      deltaX: null,
      deltaY: null,
      panX: null,
      panY: null,
      scale: 1,
    });
  };

  handleMouseUp = () => {
    let {
      cursorX,
      nodeClickX,
      cursorY,
      nodeClickY,
      suppressCloseNode,
    } = this.state;
    this.setState({ dragBg: false, activeIds: [] });

    // Distinguish bg click vs drag for setting closing opened node
    if (
      !suppressCloseNode &&
      cursorX === nodeClickX &&
      cursorY === nodeClickY
    ) {
      this.setState({ openedNode: null });
    } else if (this.state.suppressCloseNode) {
      this.setState({ suppressCloseNode: false });
    }
  };

  handleMouseMove = (e: any) => {
    let {
      originX,
      originY,
      dragBg,
      preventBgDrag,
      scale,
      panX,
      panY,
      anchorX,
      anchorY,
      nodes,
      activeIds,
      relocateAllowed,
    } = this.state;

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
        if (
          node.x > Math.min(anchorX, cursorX) &&
          node.x < Math.max(anchorX, cursorX) &&
          node.y > Math.min(anchorY, cursorY) &&
          node.y < Math.max(anchorY, cursorY)
        ) {
          activeIds.push(node.id);
          this.setState({ activeIds });
        }
      });
    }
  };

  // Handle pan XOR zoom (two-finger gestures count as onWheel)
  handleWheel = (e: any) => {
    this.setState({ btnZooming: false });

    // Prevent nav gestures if mouse is over InfoPanel or ButtonSection
    if (!this.state.suppressDisplay) {
      // Pinch/zoom sets e.ctrlKey to true
      if (e.ctrlKey) {
        // Clip deltaY for extreme mousewheel values
        let deltaY =
          e.deltaY >= 0 ? Math.min(40, e.deltaY) : Math.max(-40, e.deltaY);

        let scale = 1;
        scale -= deltaY * zoomConstant;
        this.setState({ scale, panX: 0, panY: 0 });
      } else {
        this.setState({ panX: e.deltaX, panY: e.deltaY, scale: 1 });
      }
    }
  };

  btnZoomIn = () => {
    this.setState({ scale: 1.24, btnZooming: true });
  };

  btnZoomOut = () => {
    this.setState({ scale: 0.76, btnZooming: true });
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
        originY: Math.round(height / 2),
      });
    });
  };

  // Pass origin to node for offset
  renderNodes = () => {
    let {
      activeIds,
      originX,
      originY,
      cursorX,
      cursorY,
      scale,
      panX,
      panY,
      anchorX,
      anchorY,
      relocateAllowed,
    } = this.state;

    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    this.state.nodes.map((node: NodeType, i: number) => {
      if (node.x < minX) minX = node.x < minX ? node.x : minX;
      maxX = node.x > maxX ? node.x : maxX;
      minY = node.y < minY ? node.y : minY;
      maxY = node.y > maxY ? node.y : maxY;
    });
    let midX = (minX + maxX) / 2;
    let midY = (minY + maxY) / 2;

    return this.state.nodes.map((node: NodeType, i: number) => {
      // Update position if not highlighting and active
      if (
        activeIds.includes(node.id) &&
        relocateAllowed &&
        !anchorX &&
        !anchorY
      ) {
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
        if (!this.state.btnZooming) {
          node.x = cursorX + scale * (node.x - cursorX);
          node.y = cursorY + scale * (node.y - cursorY);
        } else {
          node.x = midX + scale * (node.x - midX);
          node.y = midY + scale * (node.y - midY);
        }
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
          nodeMouseUp={() => this.handleReleaseNode(node)}
          isActive={activeIds.includes(node.id)}
          showKindLabels={this.state.showKindLabels}
          isOpen={node === this.state.openedNode}
          // Parameterized to allow setting to null
          setCurrentNode={(node: NodeType) => {
            this.setState({ currentNode: node });
          }}
        />
      );
    });
  };

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
          setCurrentEdge={(edge: EdgeType) =>
            this.setState({ currentEdge: edge })
          }
        />
      );
    });
  };

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
  };

  render() {
    return (
      <StyledGraphDisplay
        isExpanded={this.state.isExpanded}
        ref={(element) => (this.spaceRef = element)}
        onMouseMove={this.handleMouseMove}
        onMouseDown={this.state.suppressDisplay ? null : this.handleMouseDown}
        onMouseUp={this.state.suppressDisplay ? null : this.handleMouseUp}
        onWheel={this.handleWheel}
      >
        {this.renderNodes()}
        {this.renderEdges()}
        {this.renderSelectRegion()}

        <ButtonSection
          onMouseEnter={() => this.setState({ suppressDisplay: true })}
          onMouseLeave={() => this.setState({ suppressDisplay: false })}
        >
          <ToggleLabel
            onClick={() =>
              this.setState({ showKindLabels: !this.state.showKindLabels })
            }
          >
            <Checkbox checked={this.state.showKindLabels}>
              <i className="material-icons">done</i>
            </Checkbox>
            Show Type
          </ToggleLabel>
          {/*
          <ExpandButton onClick={this.toggleExpanded}>
            <i className="material-icons">
              {this.state.isExpanded ? "close_fullscreen" : "open_in_full"}
            </i>
          </ExpandButton>
          */}
        </ButtonSection>
        <InfoPanel
          setSuppressDisplay={(x: boolean) =>
            this.setState({ suppressDisplay: x })
          }
          currentNode={this.state.currentNode}
          currentEdge={this.state.currentEdge}
          openedNode={this.state.openedNode}
          // InfoPanel won't trigger onMouseLeave for unsuppressing if close is clicked
          closeNode={() =>
            this.setState({ openedNode: null, suppressDisplay: false })
          }
          // For YAML wrapper to trigger resize
          isExpanded={this.state.isExpanded}
          showRevisions={this.props.showRevisions}
        />
        <ZoomPanel btnZoomIn={this.btnZoomIn} btnZoomOut={this.btnZoomOut} />
      </StyledGraphDisplay>
    );
  }
}

const Checkbox = styled.div`
  width: 16px;
  height: 16px;
  border: 1px solid #ffffff55;
  margin: 0px 8px 0px 3px;
  border-radius: 3px;
  background: ${(props: { checked: boolean }) =>
    props.checked ? "#ffffff22" : ""};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;

  > i {
    font-size: 12px;
    padding-left: 0px;
    display: ${(props: { checked: boolean }) => (props.checked ? "" : "none")};
  }
`;

const ToggleLabel = styled.div`
  font: 12px "Work Sans";
  color: #ffffff;
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 3px;
  padding-right: 5px;
  cursor: pointer;
  border: 1px solid #ffffff55;
  :hover {
    background: #ffffff22;

    > div {
      background: #ffffff22;
    }
  }
`;

const ButtonSection = styled.div`
  position: absolute;
  top: 15px;
  right: 15px;
  display: flex;
  align-items: center;
  z-index: 999;
  cursor: pointer;
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
  border: 1px solid #ffffff55;

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
  width: ${(props: { isExpanded: boolean }) =>
    props.isExpanded ? "100vw" : "100%"};
  height: ${(props: { isExpanded: boolean }) =>
    props.isExpanded ? "100vh" : "100%"};
  background: #202227;
  position: ${(props: { isExpanded: boolean }) =>
    props.isExpanded ? "fixed" : "relative"};
  top: ${(props: { isExpanded: boolean }) => (props.isExpanded ? "-25px" : "")};
  right: ${(props: { isExpanded: boolean }) =>
    props.isExpanded ? "-25px" : ""};
`;
