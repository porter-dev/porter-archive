import React from "react";
import styled from "styled-components";

import info from "assets/info.svg";
import warning from "assets/warning.png";

interface Props {
  type?: string;
  children: React.ReactNode;
  noMargin?: boolean;
}

const Banner: React.FC<Props> = ({ 
  type, 
  children,
  noMargin,
}) => {
  const renderIcon = () => {
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
      {renderIcon()}
      {children}
    </StyledBanner>
  );
};

export default Banner;

const StyledBanner = styled.div<{ 
  color?: string;
  noMargin?: boolean;
}>`
  height: 40px;
  width: 100%;
  margin: ${props => props.noMargin ? "5px 0 10px" : ""};
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  display: flex;
  border: 1px solid ${(props) => props.color || "#ffffff00"};
  border-radius: 8px;
  padding-left: 14px;
  color: ${(props) => props.color || "#ffffff"};
  align-items: center;
  background: #ffffff11;
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
