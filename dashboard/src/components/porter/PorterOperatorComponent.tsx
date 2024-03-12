import React from "react";
import styled from "styled-components";

import Text from "components/porter/Text";

import info from "assets/information-circle-contained.svg";

import Container from "./Container";
import Icon from "./Icon";
import Spacer from "./Spacer";

type Props = {
  children: JSX.Element;
};
const PorterOperatorComponent: React.FC<Props> = ({ children }) => {
  return (
    <StyledContainer>
      <Container row>
        <Icon src={info} height={"14px"} />
        <Spacer inline x={0.5} />
        <Text>This is only visible to Porter operators</Text>
      </Container>
      <div style={{ marginTop: "10px" }}>{children}</div>
    </StyledContainer>
  );
};

export default PorterOperatorComponent;

const StyledContainer = styled.div`
  background-color: rgba(128, 128, 128, 0.2);
  padding: 20px;
  border-radius: 5px;
`;
