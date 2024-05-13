import React from "react";
import styled from "styled-components";

const Line: React.FC = () => {
  return <StyledLine />;
};

export default Line;

const StyledLine = styled.div`
  height: 1px;
  background: #aaaabb55;
  width: 100%;
`;
