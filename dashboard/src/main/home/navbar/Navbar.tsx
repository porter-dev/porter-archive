import React, { useContext, useState } from "react";
import styled from "styled-components";

import { withAuth, type WithAuthProps } from "shared/auth/AuthorizationHoc";
import { Context } from "shared/Context";
import settings from "assets/settings-bold.png";
import userIcon from "assets/user-icon.png";

import Container from "../../../components/porter/Container";
import StatusDot from "../../../components/porter/StatusDot";
import { useAuthn } from "../../../shared/auth/AuthnContext";
import Help from "./Help";

type PropsType = WithAuthProps & {
  logOut: () => void;
  currentView: string;
};

const Navbar: React.FC<PropsType> = ({ logOut }) => {
  const { capabilities, user, setCurrentModal } = useContext(Context);
  const [showDropdown, setShowDropdown] = useState(false);

  const { session } = useAuthn();

  const renderSettingsDropdown = (): JSX.Element | null => {
    if (!showDropdown) {
      return null;
    }
    const version = capabilities?.version;
    const userEmail = user?.email;
    return (
      <>
        <CloseOverlay
          onClick={() => {
            setShowDropdown(false);
          }}
        />
        <Dropdown dropdownWidth="250px" dropdownMaxHeight="200px">
          <Container row>
            <DropdownLabel>{userEmail}</DropdownLabel>
            {session && <StatusDot status={"available"} />}
          </Container>

          <UserDropdownButton
            onClick={() => {
              setCurrentModal("AccountSettingsModal", {});
            }}
          >
            <SettingsIcon>
              <Icon src={settings} />
            </SettingsIcon>
            Account settings
          </UserDropdownButton>
          <UserDropdownButton onClick={logOut}>
            <i className="material-icons">keyboard_return</i> Log out
            {version !== "production" && <VersionTag>{version}</VersionTag>}
          </UserDropdownButton>
        </Dropdown>
      </>
    );
  };

  return (
    <StyledNavbar>
      <Help />
      <NavButton
        selected={showDropdown}
        onClick={() => {
          setShowDropdown(!showDropdown);
        }}
      >
        <Img src={userIcon} selected={showDropdown} />
        {renderSettingsDropdown()}
      </NavButton>
    </StyledNavbar>
  );
};

export default withAuth(Navbar);

const Icon = styled.img`
  height: 15px;
  margin-right: 10px;
  opacity: 0.6;
  margin-bottom: -3px;
`;

const VersionTag = styled.div`
  position: absolute;
  right: 10px;
  top: 15px;
  color: #ffffff22;
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

const Img = styled.img<{ selected: boolean }>`
  height: 16px;
  opacity: ${(props) => (props.selected ? "1" : "0.6")};
  margin-right: 10px;
  border-radius: 5px;
  :hover {
    opacity: 1;
  }
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
  font-family: "Work Sans", sans-serif;
  color: #ffffff88;
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
    color: #fff;
    > i {
      color: #fff;
      border: 1px solid #fff;
    }
    > div {
      > img {
        opacity: 100%;
      }
    }
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
  padding: 13px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Dropdown = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + 15px);
  background: #121212;
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
  border-radius: 5px;
  z-index: 999;
  border: 1px solid #494b4f;
  overflow-y: auto;
  margin-bottom: 20px;
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

const StyledNavbar = styled.div`
  height: 50px;
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
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
  margin-right: 10px;
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
    font-size: 20px;
  }
`;
