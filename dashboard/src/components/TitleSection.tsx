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
}

const TitleSection: React.FC<Props> = ({
  children,
  icon,
  iconWidth,
  capitalize,
  handleNavBack,
  className,
  materialIconClass,
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

      {icon &&
        (materialIconClass?.length ? (
          <MaterialIcon width={iconWidth} className={materialIconClass}>
            {icon}
          </MaterialIcon>
        ) : (
          <Icon width={iconWidth} src={icon} />
        ))}

      <StyledTitle capitalize={capitalize}>{children}</StyledTitle>
    </StyledTitleSection>
  );
};

export default TitleSection;

const BackButton = styled.div`
  > i {
    cursor: pointer;
    font-size: 24px;
    color: #969fbbaa;
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
  height: 35px;
`;

const Icon = styled.img<{ width: string }>`
  width: ${(props) => props.width || "25px"};
  margin-right: 16px;
`;

const MaterialIcon = styled.span<{ width: string }>`
  width: ${(props) => props.width || "25px"};
  margin-right: 16px;
`;

const StyledTitle = styled.div<{ capitalize: boolean }>`
  font-size: 21px;
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
