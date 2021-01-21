import React from 'react';  
import styled from 'styled-components';

export default function Heading(props: { isAtTop?: boolean, children: any }) {
  return <StyledHeading isAtTop={props.isAtTop}>{props.children}</StyledHeading>;
}

const StyledHeading = styled.div<{ isAtTop: boolean }>`
  color: white;
  font-weight: 500;
  font-size: 16px;
  margin-top: ${props => props.isAtTop ? '0': '30px'};
  margin-bottom: 5px;
  display: flex;
  align-items: center;
`;