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
  display: inline;
  text-decoration: ${props => props.hasunderline ? "underline" : ""};
`;

const StyledLink = styled(DynamicLink)<{ hasunderline?: boolean }>`
  color: #ffffff;
  display: inline;
  cursor: pointer;
  text-decoration: ${props => props.hasunderline ? "underline" : ""};
`;