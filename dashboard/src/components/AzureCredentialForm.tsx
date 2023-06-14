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
  const [roleStatus, setRoleStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const saveCredentials = () => {
    setIsLoading(true);
    api
      .createAzureIntegration(
        "<token>",
        {
          azure_client_id: clientId,
          azure_subscription_id: subscriptionId,
          azure_tenant_id: tenantId,
          service_principal_key: servicePrincipalKey,
        },
        {
          id: currentProject.id,
        }
      )
      .then(({ data }) => {
        setIsLoading(false);
        proceed(data.id);
      })
      .catch((err) => {
        console.error(err);
        setErrorMessage(err);
        setIsLoading(false);
      });
  };

  const renderContent = () => {
    return (
      <>
        <Spacer y={1} />
        <Fieldset>
          <Text size={16}>
            Create an Azure Service Principal and input credentials
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
            label={<Flex>Client ID</Flex>}
            value={clientId}
            setValue={(e) => {
              setClientId(e.trim());
            }}
            placeholder="ex: 12345678-abcd-1234-abcd-12345678abcd"
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
          <Input
            type="password"
            label={<Flex>Client Secret</Flex>}
            value={servicePrincipalKey}
            setValue={(e) => {
              setServicePrincipalKey(e.trim());
            }}
            placeholder="○ ○ ○ ○ ○ ○ ○ ○ ○"
            width="100%"
          />
        </Fieldset>
        <Spacer y={1} />
        <Button
          onClick={() => {
            saveCredentials();
          }}
          status={
            errorMessage ? (
              <Error
                message={errorMessage}
                ctaText="Troubleshooting steps"
                errorModalContents={
                  <>
                    <Text size={16}>Granting Porter access to Azure</Text>
                    <Spacer y={1} />
                    <Text color="helper">
                      Porter needs access to your Azure subscription in order to
                      create infrastructure. You can grant Porter access to
                      Azure by following these steps:
                    </Text>
                    <Spacer y={1} />
                    <Step number={1}>
                      <Link
                        to="https://aws.amazon.com/resources/create-account/"
                        target="_blank"
                      >
                        Create an AWS account
                      </Link>
                      <Spacer inline width="5px" />
                      if you don't already have one.
                    </Step>
                    <Spacer y={1} />
                    <Step number={2}>
                      Once you are logged in to your AWS account,
                      <Spacer inline width="5px" />
                      <Link
                        to="https://console.aws.amazon.com/billing/home?region=us-east-1#/account"
                        target="_blank"
                      >
                        copy your account ID
                      </Link>
                      .
                    </Step>
                    <Spacer y={1} />
                    <Step number={3}>
                      Fill in your account ID on Porter and select "Grant
                      permissions".
                    </Step>
                    <Spacer y={1} />
                    <Step number={4}>
                      After being redirected to AWS, select "Create stack" on
                      the AWS console.
                    </Step>
                    <Spacer y={1} />
                    <Step number={5}>
                      Wait until the stack status has changed from
                      "CREATE_IN_PROGRESS" to "CREATE_COMPLETE".
                    </Step>
                    <Spacer y={1} />
                    <Step number={6}>
                      Return to Porter and select "Continue".
                    </Step>
                  </>
                }
              />
            ) : (
              roleStatus
            )
          }
        >
          Continue
        </Button>
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
