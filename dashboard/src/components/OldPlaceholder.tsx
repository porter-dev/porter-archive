import React from "react";
import styled from "styled-components";

interface Props {
  height?: string;
  minHeight?: string;
  children: React.ReactNode;
}

const OldPlaceholder: React.FC<Props> = ({ height, minHeight, children }) => {
  return (
    <StyledPlaceholder height={height} minHeight={minHeight}>
      {children}
    </StyledPlaceholder>
  );
};

export default OldPlaceholder;

const StyledPlaceholder = styled.div<{
  height: string;
  minHeight: string;
}>`
  width: 100%;
  height: ${(props) => props.height || "100px"};
  minheight: ${(props) => props.minHeight || ""};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #ffffff44;
  border-radius: 5px;
  background: #ffffff11;
`;
