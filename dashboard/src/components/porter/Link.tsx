import DynamicLink from "components/DynamicLink";
import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  to?: string;
  onClick?: () => void;
  children: React.ReactNode;
  target?: string;
};

const Link: React.FC<Props> = ({
  to,
  onClick,
  children,
  target,
}) => {
  return (
    <>
      {to ? (
        <StyledLink to={to} target={target}>{children}</StyledLink>
      ) : (
        <Div onClick={onClick}>{children}</Div>
      )}
    </>
  );
};

export default Link;

const Div = styled.span`
  color: #8590ff;
  cursor: pointer;
  display: inline;
`;

const StyledLink = styled(DynamicLink)`
  color: #8590ff;
  display: inline;
  cursor: pointer;
`;