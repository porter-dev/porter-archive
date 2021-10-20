import React, { Component } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";

import Feedback from "./Feedback";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";
import { Select } from "@material-ui/core";

type PropsType = WithAuthProps & {
  logOut: () => void;
  currentView: string;
};

type StateType = {
  showDropdown: boolean;
  currentPolicy: string;
};

class Navbar extends Component<PropsType, StateType> {
  state = {
    showDropdown: false,
    currentPolicy: "admin",
  };

  renderSettingsDropdown = () => {
    if (this.state.showDropdown) {
      let version = this.context?.capabilities?.version;
      return (
        <>
          <CloseOverlay
            onClick={() => this.setState({ showDropdown: false })}
          />
          <Dropdown dropdownWidth="250px" dropdownMaxHeight="200px">
            <DropdownLabel>
              {this.context.user && this.context.user.email}
            </DropdownLabel>
            <UserDropdownButton
              onClick={() =>
                this.context.setCurrentModal("AccountSettingsModal", {})
              }
            >
              <SettingsIcon>
                <i className="material-icons">settings</i>
              </SettingsIcon>
              Account Settings
            </UserDropdownButton>
            <UserDropdownButton onClick={this.props.logOut}>
              <i className="material-icons">keyboard_return</i> Log Out
              {version !== "production" && <VersionTag>{version}</VersionTag>}
            </UserDropdownButton>
          </Dropdown>
        </>
      );
    }
  };

  renderFeedbackButton = () => {
    if (this.context?.capabilities?.provisioner) {
      return <Feedback currentView={this.props.currentView} />;
    }
  };

  render() {
    return (
      <StyledNavbar>
        {this.renderFeedbackButton()}
        <NavButton
          selected={this.state.showDropdown}
          onClick={() =>
            this.setState({ showDropdown: !this.state.showDropdown })
          }
        >
          <I className="material-icons">account_circle</I>
          {this.renderSettingsDropdown()}
        </NavButton>
      </StyledNavbar>
    );
  }
}

Navbar.contextType = Context;

export default withAuth(Navbar);

const VersionTag = styled.div`
  position: absolute;
  right: 10px;
  top: 15px;
  color: #ffffff22;
  font-weight: 400;
`;

const SettingsIcon = styled.div`
  > i {
    background: none;
    border-radius: 3px;
    display: flex;
    font-size: 15px;
    top: 11px;
    margin-right: 10px;
    padding: 1px;
    align-items: center;
    justify-content: center;
    color: #ffffffaa;
    border: 0;
  }
`;

const I = styled.i`
  margin-right: 7px;
`;

const PolicySelector = styled(Select)`
  height: 30px;
  width: 100px;
  margin-right: 15px;
  color: white !important;
`;

const CloseOverlay = styled.div`
  position: fixed;
  width: 100vw;
  height: 100vh;
  z-index: 100;
  top: 0;
  left: 0;
  cursor: default;
`;

const UserDropdownButton = styled.button`
  padding: 13px;
  position: relative;
  height: 40px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  width: 100%;
  border: 0;
  text-align: left;
  background: none;
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
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
  width: ${(props: {
    dropdownWidth: string;
    dropdownMaxHeight: string;
    feedbackSent?: boolean;
  }) => props.dropdownWidth};
  max-height: ${(props: {
    dropdownWidth: string;
    dropdownMaxHeight: string;
    feedbackSent?: boolean;
  }) => (props.dropdownMaxHeight ? props.dropdownMaxHeight : "300px")};
  border-radius: 3px;
  z-index: 999;
  overflow-y: auto;
  margin-bottom: 20px;
  box-shadow: 0 8px 20px 0px #00000088;
  animation: ${(props: {
    dropdownWidth: string;
    dropdownMaxHeight: string;
    feedbackSent?: boolean;
  }) => (props.feedbackSent ? "flyOff 0.3s 0.05s" : "")};
  animation-fill-mode: forwards;
  @keyframes flyOff {
    from {
      opacity: 1;
      transform: translateX(0px);
    }
    to {
      opacity: 0;
      transform: translateX(100px);
    }
  }
`;

const DropdownAlt = styled(Dropdown)`
  animation: fadeIn 0.3s 0.5s;
  opacity: 0;
  animation-fill-mode: forwards;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
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
  z-index: 1;
`;

const NavButton = styled.a`
  display: flex;
  position: relative;
  align-items: center;
  font-size: 14px;
  color: #ffffff88;
  cursor: pointer;
  justify-content: center;
  margin-right: 15px;
  :hover {
    > i {
      color: #ffffff;
    }
    color: #ffffff;
  }

  > i {
    cursor: pointer;
    color: ${(props: { selected?: boolean }) =>
      props.selected ? "#ffffff" : "#ffffff88"};
    font-size: 24px;
  }
`;

const FeedbackButton = styled(NavButton)`
  color: ${(props: { selected?: boolean }) =>
    props.selected ? "#ffffff" : "#ffffff88"};
  font-family: "Work Sans", sans-serif;
  font-size: 14px;
  margin-right: 20px;
  :hover {
    color: #ffffff;
    > div {
      > i {
        color: #ffffff;
      }
    }
  }

  > div {
    > i {
      color: ${(props: { selected?: boolean }) =>
        props.selected ? "#ffffff" : "#ffffff88"};
      font-size: 26px;
      margin-right: 6px;
    }
  }
`;
