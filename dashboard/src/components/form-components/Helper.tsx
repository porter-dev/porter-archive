import React from "react";
import styled from "styled-components";

export const Helper = styled.div<{ color?: string }>`
  color: ${({ color }) => (color ? color : "#aaaabb")};
  line-height: 1.6em;
  font-size: 13px;
  margin-bottom: 35px;
  margin-top: 20px;
`;

export default Helper;
