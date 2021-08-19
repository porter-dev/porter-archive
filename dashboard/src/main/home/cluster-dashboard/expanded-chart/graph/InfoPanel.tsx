import React, { Component } from "react";
import styled from "styled-components";
import yaml from "js-yaml";

import { edgeColors, kindToIcon } from "shared/rosettaStone";
import { EdgeType, NodeType } from "shared/types";

import YamlEditor from "components/YamlEditor";

type PropsType = {
  currentNode: NodeType;
  currentEdge: EdgeType;
  openedNode: NodeType;
  setSuppressDisplay: (x: boolean) => void;
  closeNode: () => void;
  isExpanded: boolean;
  showRevisions: boolean;
};

type StateType = {
  wrapperHeight: number;
};

export default class InfoPanel extends Component<PropsType, StateType> {
  state = {
    wrapperHeight: 0,
  };

  renderIcon = (kind: string) => {
    let icon = "tonality";
    if (Object.keys(kindToIcon).includes(kind)) {
      icon = kindToIcon[kind];
    }

    return (
      <IconWrapper>
        <i className="material-icons">{icon}</i>
      </IconWrapper>
    );
  };

  renderColorBlock = (type: string) => {
    return <ColorBlock color={edgeColors[type]} />;
  };

  wrapperRef: any = React.createRef();

  componentDidMount() {
    this.setState({ wrapperHeight: this.wrapperRef.offsetHeight });
  }

  componentDidUpdate(prevProps: PropsType) {
    if (
      (prevProps.openedNode !== this.props.openedNode ||
        prevProps.isExpanded !== this.props.isExpanded ||
        prevProps.showRevisions !== this.props.showRevisions) &&
      this.wrapperRef
    ) {
      this.setState({ wrapperHeight: this.wrapperRef.offsetHeight });
    }
  }

  renderContents = () => {
    let { currentNode, currentEdge, openedNode } = this.props;
    if (openedNode) {
      return (
        <Wrapped>
          <Div>
            {this.renderIcon(openedNode.kind)}
            {openedNode.kind}
            <ResourceName>{openedNode.name}</ResourceName>
          </Div>
          <YamlWrapper ref={(element) => (this.wrapperRef = element)}>
            <YamlEditor
              value={yaml.dump(openedNode.RawYAML)}
              readOnly={true}
              height={this.state.wrapperHeight + "px"}
            />
          </YamlWrapper>
        </Wrapped>
      );
    } else if (currentNode) {
      return (
        <Div>
          {this.renderIcon(currentNode.kind)}
          {currentNode.kind}
          <ResourceName>{currentNode.name}</ResourceName>
        </Div>
      );
    } else if (currentEdge) {
      return (
        <EdgeInfo>
          {this.renderColorBlock(currentEdge.type)}
          {this.renderEdgeMessage(currentEdge)}
        </EdgeInfo>
      );
    }

    return (
      <Div>
        <IconWrapper>
          <i className="material-icons">info</i>
        </IconWrapper>
        Hover over a node or edge to display info.
      </Div>
    );
  };

  renderEdgeMessage = (edge: EdgeType) => {
    // TODO: render more information about edges (labels, spec property field)
    switch (edge.type) {
      case "ControlRel":
        return "Controller Relation";
      case "LabelRel":
        return "Label Relation";
      case "SpecRel":
        return "Spec Relation";
    }
  };

  render() {
    let { openedNode, closeNode, setSuppressDisplay } = this.props;

    // Only suppress display gestures (click, pan, and zoom) if expanded
    return (
      <StyledInfoPanel
        expanded={Boolean(openedNode)}
        onMouseEnter={openedNode ? () => setSuppressDisplay(true) : null}
        onMouseLeave={openedNode ? () => setSuppressDisplay(false) : null}
      >
        {this.renderContents()}

        {openedNode ? (
          <i onClick={closeNode} className="material-icons">
            close
          </i>
        ) : null}
      </StyledInfoPanel>
    );
  }
}

const Wrapped = styled.div`
  height: 100%;
  position: relative;
`;

const YamlWrapper = styled.div`
  width: 100%;
  margin-top: 7px;
  height: calc(100% - 44px);
  border-radius: 5px;
  border: 1px solid #ffffff22;
  overflow: hidden;
  background: #000000;
`;

const ColorBlock = styled.div`
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  margin-left: -2px;
  margin-right: 13px;
  background: ${(props: { color: string }) =>
    props.color ? props.color : "#ffffff66"};
`;

const Div = styled.div`
  display: flex;
  padding-left: 7px;
  align-items: center;
  padding-right: 23px;
`;

const EdgeInfo = styled.div`
  display: flex;
  align-items: center;
  padding-left: 7px;
  padding-right: 23px;
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
  height: ${(props: { expanded: boolean }) =>
    props.expanded ? "calc(100% - 68px)" : "40px"};
  width: ${(props: { expanded: boolean }) =>
    props.expanded ? "calc(50% - 68px)" : "400px"};
  max-width: 600px;
  min-width: 400px;
  background: #34373cdf;
  border-radius: 3px;
  padding-left: 11px;
  display: inline-block;
  z-index: 999;
  padding-top: 7px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding-right: 11px;
  cursor: default;

  > i {
    position: absolute;
    padding: 5px;
    top: 6px;
    right: 6px;
    border-radius: 50px;
    font-size: 17px;
    cursor: pointer;
    color: white;
    :hover {
      background: #ffffff22;
    }
  }
`;
