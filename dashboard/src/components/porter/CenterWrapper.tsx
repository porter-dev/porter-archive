import React from "react";
import styled from "styled-components";

type Props = {
  children: React.ReactNode;
};

const CenterWrapper: React.FC<Props> = ({ children }) => {
  return <StyledCenterWrapper>{children}</StyledCenterWrapper>;
};

export default CenterWrapper;

const StyledCenterWrapper = styled.div`
  width: 100%;
  max-width: 900px;
`;
