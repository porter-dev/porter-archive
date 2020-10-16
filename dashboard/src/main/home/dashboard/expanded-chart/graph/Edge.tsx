import React, { Component } from 'react';
import styled from 'styled-components';

import { edgeColors } from '../../../../../shared/rosettaStone';
import { EdgeType } from '../../../../../shared/types';

const thickness = 8;

type PropsType = {
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  originX: number,
  originY: number,
  edge: EdgeType,
  setCurrentEdge: (edge: EdgeType) => void
};

type StateType = {
  showArrowHead: boolean
};

export default class Edge extends Component<PropsType, StateType> {
  state = {
    showArrowHead: true
  }

  render() {
    let { originX, originY, edge, setCurrentEdge } = this.props;
    let x1 = Math.round(originX + this.props.x1);
    let x2 = Math.round(originX + this.props.x2);
    let y1 = Math.round(originY - this.props.y1);
    let y2 = Math.round(originY - this.props.y2);
    
    var length = Math.sqrt(((x2-x1) * (x2-x1)) + ((y2-y1) * (y2-y1)));
    // center
    var cx = ((x1 + x2) / 2) - (length / 2);
    var cy = ((y1 + y2) / 2) - (thickness / 2);
    // angle
    var angle = Math.atan2((y1 - y2), (x1 - x2)) * (180 / Math.PI);

    return (
      <StyledEdge
        length={length}
        cx={cx}
        cy={cy}
        angle={angle}
        onMouseEnter={() => setCurrentEdge(edge)}
        onMouseLeave={() => setCurrentEdge(null)}
        type={edge.type}
      >
        {this.state.showArrowHead ? <ArrowHead color={edgeColors[edge.type]} /> : null}
        <VisibleLine color={edgeColors[edge.type]} />
      </StyledEdge>
    );
  }
}

const ArrowHead = styled.div`
  width: 0; 
  height: 0;
  margin-left: 20px;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent; 
  border-right: 10px solid ${(props: { color: string }) => props.color ? props.color : '#ffffff66'};
`;

const VisibleLine = styled.section`
  height: 1px;
  width: 100%;
  background: ${(props: { color: string }) => props.color ? props.color : '#ffffff66'};
`;

const StyledEdge: any = styled.div.attrs((props: any) => ({
  style: {
    top: props.cy + 'px',
    left: props.cx + 'px',
    transform: 'rotate(' + props.angle + 'deg)',
    width: props.length + 'px'
  },
}))`
  position: absolute;
  height: ${thickness}px;
  cursor: pointer;
  z-index: ${(props: { type: string, color: string }) => props.type == 'ControlRel' ? '1' : '0'};
  display: flex;
  align-items: center;
  justify-content: center;
  :hover {
    > section {
      box-shadow: 0 0 10px #ffffff;
    }
  }
`;