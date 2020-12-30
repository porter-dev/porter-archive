import React, { Component } from 'react';
import styled from 'styled-components';

import api from '../../../shared/api';
import { Context } from '../../../shared/Context';

type PropsType = {
  logOut: () => void,
};

type StateType = {
  showDropdown: boolean
};

export default class Navbar extends Component<PropsType, StateType> {
  state = {
    showDropdown: false,
  }

  handleLogout = (): void => {
    let { logOut } = this.props;
    let { setCurrentError } = this.context;

    // Attempt user logout
    api.logOutUser('<token>', {}, {}, (err: any, res: any) => {
      err ? setCurrentError(err.response.data.errors[0]) : logOut();
    }); 
  }

  renderSettingsDropdown = () => {
    if (this.state.showDropdown) {
      return (
        <>
          <CloseOverlay onClick={() => this.setState({ showDropdown: false })} />
          <Dropdown dropdownWidth='250px' dropdownMaxHeight='200px'>
            <DropdownLabel>{this.context.user && this.context.user.email}</DropdownLabel>
            <LogOutButton onClick={this.handleLogout}>
              <i className="material-icons">keyboard_return</i> Log Out
            </LogOutButton>
          </Dropdown>
        </>
      );
    }
  }

  render() {
    return (
      <StyledNavbar>
        <NavButton href='https://docs.getporter.dev/docs' target='_blank'>
          <i className="material-icons">help_outline</i>
        </NavButton>
        <NavButton selected={this.state.showDropdown}>
          <i 
            className="material-icons-outlined" 
            onClick={() => this.setState({ showDropdown: !this.state.showDropdown })}
          >account_circle</i>
          {this.renderSettingsDropdown()}
        </NavButton>
      </StyledNavbar>
    );
  }
}

Navbar.contextType = Context;

const CloseOverlay = styled.div`
  position: fixed;
  width: 100vw;
  height: 100vh;
  z-index: 100;
  top: 0;
  left: 0;
  cursor: default;
`;

const LogOutButton = styled.button`
  padding: 13px;
  height: 40px;
  font-size: 13px;
  font-weight: 500;
  font-family: 'Work Sans', sans-serif;
  color: white;
  width: 100%;
  border: 0;
  text-align: left;
  background: none;
  cursor: ${(props) => (!props.disabled ? 'pointer' : 'default')};
  user-select: none;
  :focus { outline: 0 }
  :hover {
    background: #ffffff11;
  }
  display: flex;
  align-items: center;

  > i {
    background: none;
    border-radius: 3px;
    display: flex;
    font-size: 13px;
    top: 11px;
    margin-right: 10px;
    padding: 1px;
    align-items: center;
    justify-content: center;
    color: #ffffffaa;
    border: 1px solid #ffffffaa;
  }
`;

const DropdownLabel = styled.div`
  font-size: 13px;
  height: 40px;
  color: #ffffff44;
  font-weight: 500;
  display: flex;
  align-items: center;
  padding: 13px;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Dropdown = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + 5px);
  background: #26282f;
  width: ${(props: { dropdownWidth: string, dropdownMaxHeight: string }) => props.dropdownWidth};
  max-height: ${(props: { dropdownWidth: string, dropdownMaxHeight: string }) => props.dropdownMaxHeight ? props.dropdownMaxHeight : '300px'};
  border-radius: 3px;
  z-index: 999;
  overflow-y: auto;
  margin-bottom: 20px;
  box-shadow: 0 8px 20px 0px #00000088;
`;

const StyledNavbar = styled.div`
  width: 100%;
  height: 60px;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  padding-right: 5px;
  justify-content: flex-end;
`;

const NavButton = styled.a`
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  cursor: pointer;
  :hover {
    > i {
      color: #ffffff;
    }
  }
  
  > i {
    color: ${(props: { selected?: boolean }) => props.selected ? '#ffffff' : '#ffffff88'};
    font-size: 24px;
  }
`;