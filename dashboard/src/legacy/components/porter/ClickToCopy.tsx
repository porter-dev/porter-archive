import React, { useEffect, useState } from "react";
import styled from "styled-components";

import copy from "assets/copy.svg";
import check from "assets/check.svg";
import Text from "./Text";

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
        <>
          {copied ? (
            <CopyPrompt width="80px">
              <Img small={true} src={check} />
              <Text>Copied</Text>
            </CopyPrompt>
          ) : (
            <CopyPrompt width="120px">
              <Img src={copy} />
              <Text>Click to copy</Text>
            </CopyPrompt>
          )}
        </>
      )}
    </StyledClickToCopy>
  );
};

export default ClickToCopy;

const Img = styled.img<{ small?: boolean }>`
  height: ${props => props.small ? "10px" : "12px"};
  margin-right: 5px;
`;

const CopyPrompt = styled.div<{ width: string }>`
  position: absolute;
  width: ${props => props.width};
  display: flex;
  align-items: center;
  justify-content: center;
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
