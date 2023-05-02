import DynamicLink from "components/DynamicLink";
import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  to?: string;
  onClick?: () => void;
  children: React.ReactNode;
  target?: string;
  underline?: boolean;
};

const Link: React.FC<Props> = ({
  to,
  onClick,
  children,
  target,
  underline,
}) => {
  return (
    <>
      {to ? (
        <StyledLink 
          to={to} 
          target={target}
          underline={underline}
        >
          {children}
        </StyledLink>
      ) : (
        <Div 
          onClick={onClick}
          underline={underline}
        >
          {children}
        </Div>
      )}
    </>
  );
};

export default Link;

const Div = styled.span<{ underline?: boolean }>`
  color: #8590ff;
  cursor: pointer;
  display: inline;
  text-decoration: ${props => props.underline ? "underline" : ""};
`;

const StyledLink = styled(DynamicLink)<{ underline?: boolean }>`
  color: #8590ff;
  display: inline;
  cursor: pointer;
  text-decoration: ${props => props.underline ? "underline" : ""};
`;