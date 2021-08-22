import React from "react";
import styled from "styled-components";

interface Props {
  height?: string;
  children: React.ReactNode;
}

const Placeholder: React.FC<Props> = ({ height, children }) => {
  return <StyledPlaceholder height={height}>{children}</StyledPlaceholder>;
};

export default Placeholder;

const StyledPlaceholder = styled.div<{ height: string }>`
  width: 100%;
  height: ${(props) => props.height || "100px"};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #ffffff44;
  border-radius: 5px;
  background: #ffffff11;
`;
