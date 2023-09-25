import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import { v4 as uuidv4 } from "uuid";

import api from "shared/api";
import azure from "assets/azure.png";

import { Context } from "shared/Context";

import Text from "./porter/Text";
import Spacer from "./porter/Spacer";
import InputRow from "./form-components/InputRow";
import SaveButton from "./SaveButton";
import Fieldset from "./porter/Fieldset";
import Input from "./porter/Input";
import Button from "./porter/Button";
import DocsHelper from "./DocsHelper";
import Error from "./porter/Error";
import Step from "./porter/Step";
import Link from "./porter/Link";
import Container from "./porter/Container";
import VerticalSteps from "./porter/VerticalSteps";
import aws from "../assets/aws.png";
import PreflightChecks from "./PreflightChecks";
import Modal from "./porter/Modal";
import cloudformationStatus from "../assets/cloud-formation-stack-complete.png";

type Props = {
  goBack: () => void;
  proceed: (id: string) => void;
};

const AzureCredentialForm: React.FC<Props> = ({ goBack, proceed }) => {
  const { currentProject } = useContext(Context);
  const [clientId, setClientId] = useState("");
  const [servicePrincipalKey, setServicePrincipalKey] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const saveCredentials = async () => {
    setIsLoading(true);
    if (currentProject == null) {
      setErrorMessage("Current project is not defined.");
    } else if (subscriptionId.trim() === "") {
      setErrorMessage("Subscription ID is required");
    } else if (clientId.trim() === "") {
      setErrorMessage("App ID is required");
    } else if (tenantId.trim() === "") {
      setErrorMessage("Tenant ID is required");
    } else if (servicePrincipalKey.trim() === "") {
      setErrorMessage("Password is required");
    } else {
      try {
        const azureIntegrationResponse = await api.createAzureIntegration(
          "<token>",
          {
            azure_client_id: clientId,
            azure_subscription_id: subscriptionId,
            azure_tenant_id: tenantId,
            service_principal_key: servicePrincipalKey,
          },
          {
            id: currentProject.id,
          });
        const azureIntegrationId = azureIntegrationResponse.data.cloud_provider_credentials_id;
        try {
          if (currentProject?.id != null) {
            api.inviteAdmin(
              "<token>",
              {},
              { project_id: currentProject?.id }
            );
          }
        } catch (err) {
          console.log(err);
        }
        proceed(azureIntegrationId)
      } catch (err) {
        if (err.response?.data?.error) {
          setErrorMessage(err.response?.data?.error.replace("unknown: ", ""));
        } else {
          setErrorMessage("Something went wrong, please try again later.");
        }
      }
    }

    setIsLoading(false);
  };

  const getButtonStatus = () => {
    if (isLoading) {
      return "loading";
    } else if (errorMessage !== "") {
      return <Error
        message={errorMessage}
      />;
    } else {
      return null;
    }
  };

  const renderContent = () => {
    return (
      <>
        <>
          <VerticalSteps
              onlyShowCurrentStep={true}
              currentStep={currentStep}
              steps={[
                <>
                  <Text size={16}>Set up your Azure subscription</Text>
                  <Spacer y={.5} />
                  <Text color="helper">
                    Follow our <Link to="https://docs.porter.run/standard/getting-started/provisioning-on-azure">documentation</Link> to create your service principal and prepare your subscription for use with Porter.
                  </Text>
                  <Spacer y={1} />
                  <Button onClick={() => setCurrentStep(1)}>
                    Continue
                  </Button>
                </>,
                <>
                    <Text size={16}>
                      Input Azure service principal credentials
                    </Text>
                    <Spacer height="15px" />
                    <Text color="helper">
                      Provide the credentials for an Azure Service Principal authorized on
                      your Azure subscription.
                    </Text>
                    <Spacer y={1} />
                    <Input
                        label={<Flex>Subscription ID</Flex>}
                        value={subscriptionId}
                        setValue={(e) => {
                          setSubscriptionId(e.trim());
                        }}
                        placeholder="ex: 12345678-abcd-1234-abcd-12345678abcd"
                        width="100%"
                    />
                    <Spacer y={1} />
                    <Input
                        label={<Flex>App ID</Flex>}
                        value={clientId}
                        setValue={(e) => {
                          setClientId(e.trim());
                        }}
                        placeholder="ex: 12345678-abcd-1234-abcd-12345678abcd"
                        width="100%"
                    />
                    <Spacer y={1} />
                    <Input
                        type="password"
                        label={<Flex>Password</Flex>}
                        value={servicePrincipalKey}
                        setValue={(e) => {
                          setServicePrincipalKey(e.trim());
                        }}
                        placeholder="○ ○ ○ ○ ○ ○ ○ ○ ○"
                        width="100%"
                    />
                    <Spacer y={1} />
                    <Input
                        label={<Flex>Tenant ID</Flex>}
                        value={tenantId}
                        setValue={(e) => {
                          setTenantId(e.trim());
                        }}
                        placeholder="ex: 12345678-abcd-1234-abcd-12345678abcd"
                        width="100%"
                    />
                  <Spacer y={1} />
                  <Container row>
                      <Button onClick={() => setCurrentStep(0)} color="#222222">Back</Button>
                      <Spacer inline x={0.5} />
                      <Button
                        onClick={saveCredentials}
                        status={getButtonStatus()}
                      >
                      Continue
                      </Button>
                  </Container>
                </>,
              ]}
          />
        </>
      </>
    );
  };

  return (
    <>
      <Container row>
        <BackButton width="140px" onClick={goBack}>
          <i className="material-icons">first_page</i>
          Select cloud
        </BackButton>
        <Spacer x={1} inline />
        <Img src={azure} />
        <Text size={16}>Grant Azure permissions</Text>
      </Container>
      <Spacer y={1} />
      <Text color="helper">
        Grant Porter permissions to create infrastructure in your Azure
        subscription.
      </Text>
      <Spacer y={1} />
      {renderContent()}
    </>
  );
};

export default AzureCredentialForm;

const Flex = styled.div`
  display: flex;
  align-items: center;
  > i {
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
  }
`;

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
