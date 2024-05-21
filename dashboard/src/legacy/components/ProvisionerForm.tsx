import React, { useContext, useEffect, useState } from "react";
import aws from "legacy/assets/aws.png";
import azure from "legacy/assets/azure.png";
import gcp from "legacy/assets/gcp.png";
import Heading from "legacy/components/form-components/Heading";
import styled from "styled-components";

import AzureProvisionerSettings from "./AzureProvisionerSettings";
import Helper from "./form-components/Helper";
import GCPProvisionerSettings from "./GCPProvisionerSettings";
import Container from "./porter/Container";
import Spacer from "./porter/Spacer";
import Text from "./porter/Text";
import ProvisionerSettings from "./ProvisionerSettings";

type Props = {
  goBack: () => void;
  credentialId: string;
  provider: string;
};

const ProvisionerForm: React.FC<Props> = ({
  goBack,
  credentialId,
  provider,
}) => {
  return (
    <>
      {provider === "aws" && (
        <>
          <Container row>
            <BackButton width="155px" onClick={goBack}>
              <i className="material-icons">first_page</i>
              Set credentials
            </BackButton>
            <Spacer inline width="17px" />
            <Img src={aws} />
            <Text size={16}>Configure settings</Text>
          </Container>
          <Spacer y={1} />
          <ProvisionerSettings credentialId={credentialId} />
        </>
      )}
      {provider === "azure" && (
        <>
          <Container row>
            <BackButton width="155px" onClick={goBack}>
              <i className="material-icons">first_page</i>
              Set credentials
            </BackButton>
            <Spacer inline width="17px" />
            <Img src={azure} />
            <Text size={16}>Configure settings</Text>
          </Container>
          <Spacer y={1} />
          <AzureProvisionerSettings credentialId={credentialId} />
        </>
      )}
      {provider === "gcp" && (
        <>
          <Container row>
            <BackButton width="155px" onClick={goBack}>
              <i className="material-icons">first_page</i>
              Set credentials
            </BackButton>
            <Spacer inline width="17px" />
            <Img src={gcp} />
            <Text size={16}>Configure settings</Text>
          </Container>
          <Spacer y={1} />
          <Text color="helper">
            Configure settings for your GCP environment.
          </Text>
          <Spacer y={1} />
          <GCPProvisionerSettings credentialId={credentialId} />
        </>
      )}
    </>
  );
};

export default ProvisionerForm;

const Img = styled.img`
  height: 18px;
  margin-right: 15px;
`;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 13px;
  height: 35px;
  padding: 5px 13px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
    margin-left: -2px;
  }
`;
