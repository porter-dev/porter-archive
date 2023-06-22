import DynamicLink from "components/DynamicLink";
import React, { useEffect, useState } from "react";
import styled from "styled-components";

import Icon from "components/porter/Icon";

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
    <LinkWrapper>
      {to ? (
        <StyledLink to={to} target={target}>
          {children}
          {target === "_blank" && (
            <div>
            <Svg data-testid="geist-icon" fill="none" height="1em" shape-rendering="geometricPrecision" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="1em" data-darkreader-inline-stroke="" data-darkreader-inline-color=""><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path><path d="M15 3h6v6"></path><path d="M10 14L21 3"></path></Svg>
            </div>
          )}
        </StyledLink>
      ) : (
        <Div onClick={onClick}>
          {children}
        </Div>
      )}
      {hasunderline && <Underline />}
    </LinkWrapper>
  );
};

export default Link;

const Svg = styled.svg`
  margin-bottom: -1px;
  margin-left: 5px;
  color: #ffffff;
  stroke: #ffffff;
  stroke-width: 2;
`;

const Underline = styled.div`
  position: absolute;
  left: 0px;
  height: 1px;
  width: 100%;
  background: #ffffff;
`;

const LinkWrapper = styled.span`
  position: relative;
`;

const Div = styled.span`
  color: #ffffff;
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
`;

const StyledLink = styled(DynamicLink)<{ hasunderline?: boolean }>`
  color: #ffffff;
  display: inline-flex;
  font-size: 13px;
  cursor: pointer;
`;