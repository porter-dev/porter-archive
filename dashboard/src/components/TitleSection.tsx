import React from "react";
import styled from "styled-components";

interface Props {
  children: React.ReactNode;
  icon?: any;
  iconWidth?: string;
  capitalize?: boolean;
  handleNavBack?: () => void;
}

const TitleSection: React.FC<Props> = ({
  children,
  icon,
  iconWidth,
  capitalize,
  handleNavBack,
}) => {
  return (
    <StyledTitleSection>
      {handleNavBack && (
        <BackButton>
          <i className="material-icons" onClick={handleNavBack}>
            keyboard_backspace
          </i>
        </BackButton>
      )}
      {icon && <Icon width={iconWidth} src={icon} />}
      <StyledTitle capitalize={capitalize}>{children}</StyledTitle>
    </StyledTitleSection>
  );
};

export default TitleSection;

const BackButton = styled.div`
  > i {
    cursor: pointer;
    font-size 24px;
    color: #969Fbbaa;
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
  margin-bottom: 15px;
  display: flex;
  align-items: center;
`;

const Icon = styled.img<{ width: string }>`
  width: ${(props) => props.width || "28px"};
  margin-right: 16px;
`;

const StyledTitle = styled.div<{ capitalize: boolean }>`
  font-size: 24px;
  font-weight: 600;
  user-select: text;
  text-transform: ${(props) => (props.capitalize ? "capitalize" : "")};
  display: flex;
  align-items: center;

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
