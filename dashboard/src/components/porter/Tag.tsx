import React from "react";
import styled from "styled-components";

type Props = {
  backgroundColor?: string;
  hoverable?: boolean;
  children: React.ReactNode;
  borderColor?: string;
  style?: React.CSSProperties;
};

const Tag: React.FC<Props> = ({
  backgroundColor,
  hoverable = true,
  children,
  borderColor,
  style,
}) => {
  return (
    <StyledTag
      backgroundColor={backgroundColor ?? "#ffffff22"}
      hoverable={hoverable}
      hoverColor={backgroundColor ?? "#ffffff44"}
      borderColor={borderColor}
      style={style}
    >
      {children}
    </StyledTag>
  );
};

export default Tag;

const StyledTag = styled.div<{
  hoverable: boolean;
  backgroundColor: string;
  hoverColor: string;
  borderColor?: string;
}>`
  display: flex;
  justify-content: center;
  padding: 3px 5px;
  border-radius: 5px;
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
