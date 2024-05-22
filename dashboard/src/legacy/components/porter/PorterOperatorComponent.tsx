import React, { useContext } from "react";
import info from "legacy/assets/information-circle-contained.svg";
import Text from "legacy/components/porter/Text";
import styled from "styled-components";

import { Context } from "shared/Context";

import Container from "./Container";
import Icon from "./Icon";
import Spacer from "./Spacer";

type Props = {
  children: JSX.Element;
};
const PorterOperatorComponent: React.FC<Props> = ({ children }) => {
  const { user } = useContext(Context);

  if (!user?.email?.endsWith("@porter.run")) {
    return null;
  }
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
