import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import { handleSubmitFeedback } from "shared/feedback";

type PropsType = {
  currentView: string;
};

type StateType = {
  feedbackSent: boolean;
  showFeedbackDropdown: boolean;
  feedbackText: string;
};

export default class Feedback extends Component<PropsType, StateType> {
  state = {
    feedbackSent: false,
    showFeedbackDropdown: false,
    feedbackText: "",
  };

  renderReceipt = () => {
    if (this.state.feedbackSent) {
      return (
        <DropdownAlt dropdownWidth="300px" dropdownMaxHeight="200px">
          <ConfirmationMessage>
            <i className="material-icons-outlined">emoji_food_beverage</i>
            Thanks for improving Porter.
          </ConfirmationMessage>
        </DropdownAlt>
      );
    }
  };

  onSubmitFeedback = () => {
    let { user } = this.context;
    let msg =
      "👤 " +
      user.email +
      " 📍 " +
      this.props.currentView +
      ": " +
      this.state.feedbackText;
    handleSubmitFeedback(msg, () => {
      // console.log("submitted")
    });
    this.setState({ feedbackSent: true, feedbackText: "" });
  };

  renderFeedbackDropdown = () => {
    if (this.state.showFeedbackDropdown) {
      let disabled = this.state.feedbackText === "";
      return (
        <>
          <CloseOverlay
            onClick={() =>
              this.setState({
                showFeedbackDropdown: false,
                feedbackSent: false,
              })
            }
          />
          <Dropdown
            feedbackSent={this.state.feedbackSent}
            dropdownWidth="300px"
            dropdownMaxHeight="200px"
          >
            <FeedbackInput
              autoFocus={true}
              value={this.state.feedbackText}
              onChange={(e) => this.setState({ feedbackText: e.target.value })}
              placeholder="Help us improve this page."
            />
            <SendButton
              disabled={disabled}
              onClick={() => !disabled && this.onSubmitFeedback()}
            >
              <i className="material-icons">send</i> Send
            </SendButton>
          </Dropdown>
          {this.renderReceipt()}
        </>
      );
    }
  };

  render() {
    return (
      <FeedbackButton>
        <Flex
          onClick={() =>
            this.setState({
              showFeedbackDropdown: !this.state.showFeedbackDropdown,
            })
          }
        >
          <i className="material-icons-outlined">campaign</i>
          Feedback?
        </Flex>
        {this.renderFeedbackDropdown()}
      </FeedbackButton>
    );
  }
}

Feedback.contextType = Context;

const CloseOverlay = styled.div`
  position: fixed;
  width: 100vw;
  height: 100vh;
  z-index: 100;
  top: 0;
  left: 0;
  cursor: default;
`;

const ConfirmationMessage = styled.div`
  width: 100%;
  height: 100px;
  display: flex;
  font-size: 13px;
  align-items: center;
  justify-content: center;
  color: #ffffff55;

  > i {
    display: flex;
    font-size: 16px;
    margin-right: 10px;
    align-items: center;
    justify-content: center;
    color: #ffffff55;
  }
`;

const SendButton = styled.div`
  display: flex;
  align-items: center;
  height: 40px;
  cursor: ${(props: { disabled: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  justify-content: center;
  margin-top: -3px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  :hover {
    background: ${(props: { disabled: boolean }) =>
      props.disabled ? "" : "#ffffff11"};
  }

  > i {
    background: none;
    border-radius: 3px;
    display: flex;
    font-size: 14px;
    top: 11px;
    margin-right: 10px;
    padding: 1px;
    align-items: center;
    justify-content: center;
    color: #ffffffaa;
  }
`;

const FeedbackInput = styled.textarea`
  resize: none;
  width: 100%;
  height: 80px;
  outline: 0;
  padding: 14px;
  color: white;
  border: 0;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  background: #aaaabb11;
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
      font-size: 23px;
      margin-right: 6px;
    }
  }
`;
