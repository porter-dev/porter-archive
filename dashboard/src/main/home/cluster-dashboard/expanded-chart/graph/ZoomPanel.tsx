import React, { Component } from 'react';
import styled from 'styled-components';

type PropsType = {
    btnZoomIn: () => void,
    btnZoomOut: () => void,
};

type StateType = {
  wrapperHeight: number
};

export default class ZoomPanel extends Component<PropsType, StateType> {
  state = {
    wrapperHeight: 0
  }

  wrapperRef: any = React.createRef();

  componentDidMount() {
    this.setState({ wrapperHeight: this.wrapperRef.offsetHeight });
  }

  renderContents = () => {
    return (
      <Div>
        <IconWrapper onClick={this.props.btnZoomIn}>
          <i className="material-icons">add</i>
        </IconWrapper>
        <ZoomBreaker />
        <IconWrapper onClick={this.props.btnZoomOut}>
          <i className="material-icons">remove</i>
        </IconWrapper>
      </Div>
    )
  }

  render() {
    return (
      <StyledZoomer>
        {this.renderContents()}
      </StyledZoomer>
    );
  }
}

const Div = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: calc(100% - 7px);
`;

const IconWrapper = styled.div`
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -4px;
  margin-bottom: -4px;
  cursor: pointer;

  > i {
    font-size: 16px;
    color: #ffffff;
  }
`;

const StyledZoomer = styled.div`
  position: absolute;
  left: 15px;
  bottom: 15px;
  color: #ffffff;
  height: 64px;
  width: 36px;
  background: #34373Cdf;
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
`;

const ZoomBreaker = styled.div`
  background: #ffffff20;
  height: 1px;
  width: 22px;
`;