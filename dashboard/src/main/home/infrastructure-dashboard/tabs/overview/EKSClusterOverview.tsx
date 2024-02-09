import React from "react";
import styled from "styled-components";

import Heading from "components/form-components/Heading";
import Button from "components/porter/Button";
import Select from "components/porter/Select";

type Props = {
  // Define your component props here
};

const EKSClusterOverview: React.FC<Props> = (props) => {
  return (
    <>
      <StyledForm>
        <Heading isAtTop>EKS configuration</Heading>
        <Select
          options={[]}
          disabled={true}
          value={"test"}
          label="📍 AWS region"
        />
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
