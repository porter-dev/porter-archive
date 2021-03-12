import React from "react";
import styled from "styled-components";

export default function Helper(props: { children: any }) {
  return <StyledHelper>{props.children}</StyledHelper>;
}

const StyledHelper = styled.div`
  color: #aaaabb;
  line-height: 1.6em;
  font-size: 13px;
  margin-bottom: 15px;
  margin-top: 20px;
`;
