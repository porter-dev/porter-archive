import React from "react";
import styled from "styled-components";

export default function Heading(props: { isAtTop?: boolean; children: any; docs?: string }) {
  return (
    <StyledHeading isAtTop={props.isAtTop}>
      {props.children}
      {
        props.docs && (
          <a href={props.docs} target="_blank">
            <i className="material-icons">help_outline</i>
          </a>
        )
      }
    </StyledHeading>
  );
}

const StyledHeading = styled.div<{ isAtTop: boolean }>`
  color: white;
  font-weight: 500;
  font-size: 16px;
  margin-top: ${(props) => (props.isAtTop ? "0" : "30px")};
  margin-bottom: 5px;
  display: flex;
  align-items: center;

  > a {
    > i {
      display: flex;
      align-items: center;
      margin-bottom: -2px;
      font-size: 16px;
      margin-left: 12px;
      color: #858faaaa;
      :hover {
        color: #aaaabb;
      }
    }
  }
`;
