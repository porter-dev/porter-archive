import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import discordLogo from "../../../assets/discord.svg";

type PropsType = {};

type StateType = {
  showHelpDropdown: boolean;
};

export default class Help extends Component<PropsType, StateType> {
  state = {
    showHelpDropdown: false,
  };

  renderHelpDropdown = () => {
    if (this.state.showHelpDropdown) {
      return (
        <>
          <CloseOverlay
            onClick={() =>
              this.setState({
                showHelpDropdown: false,
              })
            }
          />
          <Dropdown dropdownWidth="155px" dropdownMaxHeight="300px">
            <Option
              onClick={() => {
                window
                  .open(
                    "https://porter-docs-demo-22fd462fef4dcd45.onporter.run",
                    "_blank"
                  )
                  .focus();
              }}
            >
              <i className="material-icons-outlined">book</i>
              Documentation
            </Option>
            <Line />
            <Option
              onClick={() => {
                window.open("https://discord.gg/Vbse9vJtPU", "_blank").focus();
              }}
            >
              <Icon src={discordLogo} />
              Community
            </Option>
            <Line />
            <Option id={"intercom_help"}>
              <i className="material-icons-outlined">message</i>
              Message us
            </Option>
          </Dropdown>
        </>
      );
    }
  };

  render() {
    return (
      <FeedbackButton selected={this.state.showHelpDropdown === true}>
        <Flex
          onClick={() =>
            this.setState({
              showHelpDropdown: !this.state.showHelpDropdown,
            })
          }
        >
          <i className="material-icons-outlined">help_outline</i>
          Help
        </Flex>
        {this.renderHelpDropdown()}
      </FeedbackButton>
    );
  }
}

Help.contextType = Context;

const Option = styled.div`
  margin-left: 12px;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 120px;
  height: 40px;
  color: #ffffff88;
  cursor: pointer;
  > i {
    opacity: 50%;
    color: white;
    margin-right: 9px;
    font-size: 18px;
    cursor: pointer;
  }

  :hover {
    color: #ffffff;

    > img {
      opacity: 100%;
    }

    > i {
      opacity: 100%;
    }
  }
`;

const Line = styled.div`
  height: 1px;
  z-index: 0;
  left: 0;
  background: #aaaabb55;
  width: 100%;
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

const Flex = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
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
  border-radius: 10px;
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

const NavButton = styled.a`
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  :hover {
    > i {
      color: #ffffff;
    }
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
  font-size: 13px;
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
      font-size: 18px;
      margin-right: 6px;
      margin-bottom: -1px;
    }
  }
`;

const Icon = styled.img`
  margin-left: -2px;
  height: 22px;
  width: 22px;
  opacity: 50%;
  margin-right: 7px;
`;
