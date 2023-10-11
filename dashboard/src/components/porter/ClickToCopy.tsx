import React, { useEffect, useState } from "react";
import styled from "styled-components";

import Container from "./Container";

import copy from "assets/copy.svg";
import check from "assets/check.svg";

type Props = {
  size?: number;
  color?: string;
  weight?: number;
  children: any;
  additionalStyles?: string;
};

const ClickToCopy: React.FC<Props> = ({
  size,
  weight,
  color,
  children,
  additionalStyles,
}) => {
  const [showCopyPrompt, setShowCopyPrompt] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const getColor = () => {
    switch (color) {
      case "helper":
        return "#aaaabb";
      case "warner":
        return "#ff5a52";
      default:
        return color;
    }
  };

  return (
    <StyledClickToCopy
      size={size}
      color={getColor()}
      weight={weight}
      additionalStyles={additionalStyles}
      onMouseEnter={() => {
        setShowCopyPrompt(true);
      }}
      onMouseLeave={() => {
        setShowCopyPrompt(false);
        setCopied(false);
      }}
      onClick= {() => {
        navigator.clipboard.writeText(children);
        setCopied(true);
      }}
    >
      {children}
      {showCopyPrompt && (
        <CopyPrompt>
          {copied ? (
            <Container row>
              <Img small={true} src={check} />
              Copied
            </Container>
          ) : (
            <Container>
              <Img src={copy} />
              Click to copy
            </Container>
          )}
        </CopyPrompt>
      )}
    </StyledClickToCopy>
  );
};

export default ClickToCopy;

const Img = styled.img<{ small?: boolean }>`
  > img {
    height: ${props => props.small ? "10px" : "12px"};
    margin-right: 5px;
    opacity: 0.75;
  }
`;

const CopyPrompt = styled.div`
  position: absolute;
  left: calc(100% + 10px);
  top: -4px;
  height: 28px;
  background: #121212;
  z-index: 999;
  border: 1px solid #494B4F;
  opacity: 0;
  border-radius: 3px;
  animation: fadeIn 0.5s 0.2s;
  animation-fill-mode: forwards;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const StyledClickToCopy = styled.div<{
  size?: number;
  color?: string;
  weight?: number;
  additionalStyles?: string;
  truncate?: boolean;
}>`
  line-height: 1.5;
  font-weight: ${props => props.weight || 400};
  color: ${props => props.color || props.theme.text.primary};
  font-size: ${props => props.size || 13}px;
  display: inline;
  align-items: center;
  user-select: text;
  ${props => props.additionalStyles ? props.additionalStyles : ""}
  cursor: pointer;
  position: relative;
`;
