import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {
  anchorX: number;
  anchorY: number;
  originX: number;
  originY: number;
  cursorX: number;
  cursorY: number;
};

type StateType = {};

export default class SelectRegion extends Component<PropsType, StateType> {
  state = {};

  render() {
    let { cursorX, cursorY, anchorX, anchorY, originX, originY } = this.props;

    var x, y, w, h;
    if (cursorY < anchorY) {
      y = anchorY;
    } else {
      y = cursorY;
    }
    if (cursorX < anchorX) {
      x = cursorX;
    } else {
      x = anchorX;
    }

    w = Math.abs(cursorX - anchorX);
    h = Math.abs(cursorY - anchorY);

    return (
      <StyledSelectRegion
        x={Math.round(originX + x)}
        y={Math.round(originY - y)}
        w={w}
        h={h}
      />
    );
  }
}

const StyledSelectRegion: any = styled.div.attrs(
  (props: { x: number; y: number; w: number; h: number }) => ({
    style: {
      top: props.y + "px",
      left: props.x + "px",
      width: props.w + "px",
      height: props.h + "px",
    },
  })
)`
  position: absolute;
  background: #ffffff22;
  z-index: 1;
`;
