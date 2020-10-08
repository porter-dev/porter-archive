import React, { Component } from 'react';
import styled from 'styled-components';

type PropsType = {
  name: string
};

type StateType = {
};

export default class Chart extends Component<PropsType, StateType> {
  state = {
    grow: false,
  }

  render() {
    return ( 
      <StyledChart
        onMouseEnter={() => this.setState({ grow: true })}
        onMouseLeave={() => this.setState({ grow: false })}
        grow={this.state.grow}
      >
        <Title>
          <i className="material-icons">polymer</i>
          {this.props.name}
        </Title>
        <StatusIndicator>
          <StatusColor status={'Running'} />
          Deployed
        </StatusIndicator>
      </StyledChart>
    );
  }
}

const StatusIndicator = styled.div`
  display: flex;
  flex: 1;
  width: 90px;
  height: 20px;
  font-size: 13px;
  margin-top: 10px;
  flex-direction: row;
  align-items: center;
  font-family: 'Hind Siliguri', sans-serif;
  margin-left: 20px;
  color: #aaaabb;
  animation: fadeIn 0.5s;

  @keyframes fadeIn {
    from { opacity: 0 }
    to { opacity: 1 }
  }
`;

const StatusColor = styled.div`
  margin-bottom: 1px;
  width: 8px;
  height: 8px;
  background: ${(props: { status: string }) => (props.status == 'Running' ? '#4797ff' : props.status == 'Stopped' ? "#ed5f85" : "#f5cb42")};
  border-radius: 20px;
  margin-right: 10px;
`;

const Title = styled.div`
  position: relative;
  text-decoration: none;
  padding: 16px 35px 12px 43px;
  font-size: 14px;
  font-family: 'Work Sans', sans-serif;
  font-weight: 500;
  color: #ffffff;
  width: 80%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  animation: fadeIn 0.5s;

  > i {
    color: #efefef;
    background: none;
    font-size: 16px;
    top: 11px;
    left: 14px;

    padding: 5px 4px;
    height: 20px;
    width: 20px;
    border-radius: 3px;
    position: absolute;
  }

  >img {
    background: none;
    top: 12px;
    left: 13px;

    padding: 5px 4px;
    width: 24px;
    position: absolute;
  }
`;

const StyledChart = styled.div`
  background: #23252a;
  cursor: pointer;
  margin-bottom: 25px;
  padding: 1px;
  padding-top: 3px;
  padding-bottom: 18px;
  border-radius: 5px;
  box-shadow: 0 5px 8px 0px #00000033;
  position: relative;
  border: 2px solid #9EB4FF00;
  width: calc(100% + 2px);
  height: calc(100% + 2px);

  animation: ${(props: { grow: boolean }) => props.grow ? 'grow' : 'shrink'} 0.12s;
  animation-fill-mode: forwards;
  animation-timing-function: ease-out;

  @keyframes grow {
    from { 
      width: calc(100% + 2px); 
      padding-top: 3px;
      padding-bottom: 18px;
      margin-left: 0px;
      box-shadow: 0 5px 8px 0px #00000033;
    }
    to {
      width: calc(100% + 22px);
      padding-top: 5px;
      padding-bottom: 22px;
      margin-left: -10px; 
      box-shadow: 0 8px 20px 0px #00000030;
    }
  }

  @keyframes shrink {
    from { 
      width: calc(100% + 22px);
      padding-top: 5px;
      padding-bottom: 22px;
      margin-left: -10px; 
      box-shadow: 0 8px 20px 0px #00000030;
    }
    to {
      width: calc(100% + 2px); 
      padding-top: 3px;
      padding-bottom: 18px;
      margin-left: 0px; 
      box-shadow: 0 5px 8px 0px #00000033;
    }
  }
`;
