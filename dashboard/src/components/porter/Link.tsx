import DynamicLink from "components/DynamicLink";
import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  to?: string;
  onClick?: () => void;
  children: React.ReactNode;
};

const Link: React.FC<Props> = ({
  to,
  onClick,
  children,
}) => {
  return (
    <>
      {to ? (
        <StyledLink to={to}>{children}</StyledLink>
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
`;

const StyledLink = styled(DynamicLink)`
  color: #8590ff;
  cursor: pointer;
`;