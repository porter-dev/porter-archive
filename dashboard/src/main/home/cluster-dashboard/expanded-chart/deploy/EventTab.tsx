
import React, { Component } from 'react';
import styled from 'styled-components';

type PropsType = {
};

type StateType = {
};

export default class EventTab extends Component<PropsType, StateType> {
  state = {
  }

  render() {
    return (
      <StyledEventTab 
        isLast={false}
      >
        <EventHeader>
            <i className="material-icons">cloud_upload</i>
            Deploy successful!
            <div>
                Dec 12 at 11:55AM
            </div>
        </EventHeader>
      </StyledEventTab>
    );
  }
}

const StyledEventTab = styled.div`
  width: 100%;
  margin-bottom: 2px;
  background: #ffffff11;
  border-bottom-left-radius: ${(props: { isLast: boolean }) => props.isLast ? '5px' : ''};
`;

const EventHeader = styled.div`
  width: 100%;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ffffff66;
  user-select: none;
  padding: 8px 18px;
  padding-left: 22px;
`;