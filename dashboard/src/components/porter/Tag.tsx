import React from "react";
import styled from "styled-components";

type Props = {
  backgroundColor?: string;
  hoverable?: boolean;
  children: React.ReactNode;
};

const Tag: React.FC<Props> = ({
  backgroundColor,
  hoverable = true,
  children,
}) => {
  return (
    <StyledTag
      backgroundColor={backgroundColor ?? "#ffffff22"}
      hoverable={hoverable}
    >
      {children}
    </StyledTag>
  );
};

export default Tag;

const StyledTag = styled.div<{ hoverable: boolean; backgroundColor: string }>`
  display: flex;
  justify-content: center;
  padding: 3px 5px;
  border-radius: 5px;
  background: ${({ backgroundColor }) => backgroundColor};
  user-select: text;
  ${({ hoverable }) =>
    hoverable &&
    `:hover {
  background: #ffffff44;
  cursor: pointer;
}`}
`;
