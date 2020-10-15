import React, { Component } from 'react';
import styled from 'styled-components';

type PropsType = {
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  originX: number,
  originY: number
};

type StateType = {
};

const thickness = 1;

export default class Edge extends Component<PropsType, StateType> {
  state = {
  }

  render() {
    let { originX, originY } = this.props;
    let x1 = Math.round(originX + this.props.x1);
    let x2 = Math.round(originX + this.props.x2);
    let y1 = Math.round(originY - this.props.y1);
    let y2 = Math.round(originY - this.props.y2);
    
    var length = Math.sqrt(((x2-x1) * (x2-x1)) + ((y2-y1) * (y2-y1)));
    // center
    var cx = ((x1 + x2) / 2) - (length / 2);
    var cy = ((y1 + y2) / 2) - (thickness / 2);
    // angle
    var angle = Math.atan2((y1-y2),(x1-x2))*(180/Math.PI);

    return (
      <StyledEdge
        length={length}
        cx={cx}
        cy={cy}
        angle={angle}
      />
    );
  }
}

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
  background: #ffffff66;
  color: #ffffff22;
  z-index: 0;
`;