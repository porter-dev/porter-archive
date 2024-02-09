import React from "react";
import styled from "styled-components";

import Heading from "components/form-components/Heading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";

const EKSClusterOverview: React.FC = () => {
  return (
    <>
      <StyledForm>
        <Heading isAtTop>EKS configuration</Heading>
        <Spacer y={0.5} />
        <Container style={{ width: "200px" }}>
          <Select
            options={[]}
            disabled={true}
            value={"test"}
            label="📍 AWS region"
          />
        </Container>
      </StyledForm>
      <Button
        // disabled={isDisabled()}
        disabled={false}
      >
        Provision
      </Button>
    </>
  );
};

export default EKSClusterOverview;

const StyledForm = styled.div`
  position: relative;
  padding: 30px 30px 25px;
  border-radius: 5px;
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
  font-size: 13px;
  margin-bottom: 30px;
`;
