import React from "react";
import styled from "styled-components";

import info from "assets/info.svg";
import warning from "assets/warning.png";

interface Props {
  type?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  noMargin?: boolean;
  suffix?: React.ReactNode;
}

const Banner: React.FC<Props> = ({ 
  type,
  icon,
  children,
  noMargin,
  suffix,
}) => {
  const renderIcon = () => {
    if (icon) {
      return icon;
    }

    if (type === "error" || type === "warning") {
      return <i className="material-icons-round">warning</i>;
    }
    return <img src={info} />;
  };

  return (
    <StyledBanner
      color={type === "error" ? "#ff385d" : type === "warning" && "#f5cb42"}
      noMargin={noMargin}
    >
      <>
      {renderIcon()}
      <span>{children}</span>
      </>
      {suffix && (
        <Suffix>{suffix}</Suffix>
      )}
    </StyledBanner>
  );
};

export default Banner;

const Suffix = styled.div`
  margin-left: auto;
  padding-left: 10px;
`;

const StyledBanner = styled.div<{
  color?: string;
  noMargin?: boolean;
}>`
  min-height: 40px;
  width: 100%;
  margin: ${(props) => (props.noMargin ? "5px 0 10px" : "")};
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  display: flex;
  line-height: 1.5;
  border: 1px solid ${(props) => props.color || "#ffffff00"};
  border-radius: 8px;
  padding: 10px 14px;
  color: ${(props) => props.color || "#ffffff"};
  align-items: center;
  jusrify-content: space-between;
  background: ${({ theme }) => theme.fg};
  > img {
    margin-right: 10px;
    width: 20px;
  }
  > i {
    margin-right: 10px;
    font-size: 18px;
  }
  > a {
    color: ${(props) => props.color || "#ffffff"};
  }
`;
