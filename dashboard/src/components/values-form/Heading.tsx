import React from 'react';  
import styled from 'styled-components';

export default function Heading(props: { children: any }) {
  return <StyledHeading>{props.children}</StyledHeading>;
}

const StyledHeading = styled.div`
  color: white;
  font-weight: 500;
  font-size: 16px;
  margin-top: 30px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
`;