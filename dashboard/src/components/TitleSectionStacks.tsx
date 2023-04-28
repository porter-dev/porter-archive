import React from "react";
import styled from "styled-components";

interface Props {
  children: React.ReactNode;
  icon?: any;
  iconWidth?: string;
  capitalize?: boolean;
  className?: string;
  materialIconClass?: string;
  handleNavBack?: () => void;
  onClick?: any;
}

const TitleSectionStacks: React.FC<Props> = ({
  children,
  icon,
  iconWidth,
  capitalize,
  handleNavBack,
  className,
  materialIconClass,
  onClick,
}) => {
  return (
    <StyledTitleSection className={className}>
      {handleNavBack && (
        <BackButton>
          <i className="material-icons" onClick={handleNavBack}>
            keyboard_backspace
          </i>
        </BackButton>
      )}

      {icon}

      <StyledTitle capitalize={capitalize} onClick={onClick}>
        {children}
      </StyledTitle>
    </StyledTitleSection>
  );
};

export default TitleSectionStacks;

const BackButton = styled.div`
  > i {
    cursor: pointer;
    font-size: 24px;
    color: #aaaabb;
    margin-right: 10px;
    padding: 3px;
    margin-left: 0px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }
`;

const StyledTitleSection = styled.div`
  display: flex;
  align-items: center;
`;

const Icon = styled.span<{ disableMarginRight: boolean }>`
  font-size: 24px;
  margin-right: 10px;
  ${(props) => {
    if (!props.disableMarginRight) {
      return "margin-right: 20px";
    }
  }}
`;

const StyledTitle = styled.div<{
  capitalize: boolean;
  onClick?: any;
}>`
  font-size: 21px;
  user-select: text;
  color: ${(props) => props.theme.text.primary};
  text-transform: ${(props) => (props.capitalize ? "capitalize" : "")};
  display: flex;
  align-items: center;
  cursor: ${(props) => (props.onClick ? "pointer" : "")};
  :hover {
    text-decoration: ${(props) => (props.onClick ? "underline" : "")};
  }

  > i {
    margin-left: 10px;
    cursor: pointer;
    font-size: 18px;
    color: #858faaaa;
    padding: 5px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
    margin-bottom: -3px;
  }

  > a {
    > i {
      display: flex;
      align-items: center;
      margin-bottom: -2px;
      font-size: 18px;
      margin-left: 15px;
      color: #858faaaa;
      :hover {
        color: #aaaabb;
      }
    }
  }
`;
