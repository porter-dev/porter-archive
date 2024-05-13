import React from "react";
import styled from "styled-components";

type Props = {
  size?: number;
  backgroundColor?: string;
  children: React.ReactNode;
  hoverable?: boolean;

  borderColor?: string;
  hoverColor?: string;
  borderRadiusPixels?: number;
  onClick?: () => void;
};

const Tag: React.FC<Props> = ({
  size,
  backgroundColor,
  hoverable = true,
  hoverColor,
  children,
  borderColor,
  borderRadiusPixels = 5,
  onClick,
}) => {
  return (
    <StyledTag
      size={size}
      backgroundColor={backgroundColor ?? "#ffffff22"}
      hoverable={hoverable}
      hoverColor={hoverColor ?? "#ffffff44"}
      borderColor={borderColor}
      borderRadiusPixels={borderRadiusPixels}
      onClick={onClick}
    >
      {children}
    </StyledTag>
  );
};

export default Tag;

const StyledTag = styled.div<{
  size?: number;
  hoverable: boolean;
  backgroundColor: string;
  hoverColor: string;
  borderColor?: string;
  borderRadiusPixels: number;
}>`
  display: flex;
  justify-content: center;
  font-size: ${({ size }) => size ?? 13}px;
  padding: 3px 5px;
  border-radius: ${({ borderRadiusPixels }) => borderRadiusPixels}px;
  background: ${({ backgroundColor }) => backgroundColor};
  user-select: text;
  border: 1px solid
    ${({ borderColor, backgroundColor }) => borderColor ?? backgroundColor};
  ${({ hoverable, hoverColor }) =>
    hoverable &&
    `:hover {
  background: ${hoverColor};
  cursor: pointer;
}`}
`;
