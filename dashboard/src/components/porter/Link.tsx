import DynamicLink from "components/DynamicLink";
import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  to: string;
  children: React.ReactNode;
};

const Link: React.FC<Props> = ({
  to,
  children,
}) => {
  return (
    <StyledLink to={to}>
      {children}
    </StyledLink>
  );
};

export default Link;

const StyledLink = styled(DynamicLink)`
  color: #8590ff;
  cursor: pointer;
`;