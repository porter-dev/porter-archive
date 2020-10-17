import React, { Component } from 'react';
import styled from 'styled-components';

import { ResourceType, NodeType, EdgeType } from '../../../../../shared/types';

import GraphDisplay from './GraphDisplay';
import InfoPanel from './InfoPanel';
import Loading from '../../../../../components/Loading';

type PropsType = {
  components: ResourceType[],
  setSidebar: (x: boolean) => void
};

type StateType = {
  showKindLabels: boolean,
  currentNode: NodeType | null,
  currentEdge: EdgeType | null,
  isExpanded: boolean,
  openedNode: NodeType | null
};

// TODO: region-based unselect, shift-click, multi-region
export default class GraphWrapper extends Component<PropsType, StateType> {
  state = {
    showKindLabels: true,
    currentNode: null as (NodeType | null),
    currentEdge: null as (EdgeType | null),
    isExpanded: false,
    openedNode: null as (NodeType | null)
  }

  toggleExpanded = () => {
    this.setState({ isExpanded: !this.state.isExpanded }, () => {
      this.props.setSidebar(!this.state.isExpanded);
    });
  }

  renderContents = () => {
    if (this.props.components && this.props.components.length > 0) {

      // Prop down isExpanded for recentering origin on expand/collapse
      return (
        <GraphDisplay
          components={this.props.components}
          isExpanded={this.state.isExpanded}
          showKindLabels={this.state.showKindLabels}
          setCurrentNode={(node: NodeType) => this.setState({ currentNode: node })}
          setCurrentEdge={(edge: EdgeType) => this.setState({ currentEdge: edge })}
          setOpenedNode={(node: NodeType) => this.setState({ openedNode: node })}
        />
      );
    }

    return <Loading offset='-30px' />;
  }

  render() {
    return (
      <StyledGraphWrapper isExpanded={this.state.isExpanded}>
        {this.renderContents()}      

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
          openedNode={this.state.openedNode}
        />
      </StyledGraphWrapper>
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

const StyledGraphWrapper = styled.div`
  overflow: hidden;
  width: ${(props: { isExpanded: boolean }) => props.isExpanded ? '100vw' : '100%'};
  height: ${(props: { isExpanded: boolean }) => props.isExpanded ? '100vh' : '100%'};
  background: #202227;
  position: ${(props: { isExpanded: boolean }) => props.isExpanded ? 'fixed' : 'relative'};
  top: ${(props: { isExpanded: boolean }) => props.isExpanded ? '-25px' : ''};
  right: ${(props: { isExpanded: boolean }) => props.isExpanded ? '-25px' : ''};
`;