import React, { useState } from "react";
import styled from "styled-components";
import community from "assets/community.png";
import { useIntercom } from "lib/hooks/useIntercom";

type HelpProps = {};

const Help: React.FC<HelpProps> = () => {
  const [showHelpDropdown, setShowHelpDropdown] = useState(false);

  const { showIntercomWithMessage } = useIntercom();

  const renderHelpDropdown = () => {
    if (showHelpDropdown) {
      return (
        <>
          <CloseOverlay
            onClick={() => setShowHelpDropdown(false)}
          />
          <Dropdown dropdownWidth="155px" dropdownMaxHeight="300px">
            <Option
              onClick={() => {
                window.open("https://docs.porter.run", "_blank")?.focus();
              }}
            >
              <i className="material-icons-outlined">book</i>
              Documentation
            </Option>
            <Option
              onClick={() => {
                showIntercomWithMessage({ message: "I need help with...", delaySeconds: 0 });
              }}
            >
              <Icon src={community} />
              Talk to us
            </Option>
          </Dropdown>
        </>
      );
    }
  };

  return (
    <FeedbackButton selected={showHelpDropdown === true}>
      <Flex onClick={() => setShowHelpDropdown(!showHelpDropdown)}>
        <i className="material-icons-outlined">help_outline</i>
        Help
      </Flex>
      {renderHelpDropdown()}
    </FeedbackButton>
  );
};

export default Help;

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
  overflow-y: auto;
  margin-bottom: 20px;
  border: 1px solid #494B4F;
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
