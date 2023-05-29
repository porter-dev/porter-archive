import DynamicLink from "components/DynamicLink";
import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  to?: string;
  onClick?: () => void;
  children: React.ReactNode;
  target?: string;
  hasunderline?: boolean;
};

const Link: React.FC<Props> = ({
  to,
  onClick,
  children,
  target,
  hasunderline,
}) => {
  return (
    <>
      {to ? (
        <StyledLink 
          to={to} 
          target={target}
          hasunderline={hasunderline}
        >
          {children}
        </StyledLink>
      ) : (
        <Div 
          onClick={onClick}
          hasunderline={hasunderline}
        >
          {children}
        </Div>
      )}
    </>
  );
};

export default Link;

const Div = styled.span<{ hasunderline?: boolean }>`
  color: #ffffff;
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  border-bottom: ${props => props.hasunderline ? "1px solid #fff" : ""};
`;

const StyledLink = styled(DynamicLink)<{ hasunderline?: boolean }>`
  color: #ffffff;
  display: inline-flex;
  font-size: 13px;
  cursor: pointer;
  text-decoration: ;
  border-bottom: ${props => props.hasunderline ? "1px solid #fff" : ""};
`;