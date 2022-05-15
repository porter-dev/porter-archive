import React, { useContext, useState } from "react";
import InputRow from "components/form-components/InputRow";
import SaveButton from "components/SaveButton";

import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import Placeholder from "components/Placeholder";

type Props = {
  setCreatedCredential: (aws_integration_id: number) => void;
  cancel: () => void;
};

const AzureCredentialForm: React.FunctionComponent<Props> = ({
  setCreatedCredential,
}) => {
  const { currentProject, setCurrentError } = useContext(Context);
  const [clientId, setClientId] = useState("");
  const [servicePrincipalKey, setServicePrincipalKey] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [buttonStatus, setButtonStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const submit = () => {
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
        setCreatedCredential(data.id);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setHasError(true);
        setCurrentError(err.response?.data?.error);
        setIsLoading(false);
      });
  };

  if (hasError) {
    return <Placeholder>Error</Placeholder>;
  }

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  return (
    <>
      <InputRow
        type="text"
        value={clientId}
        setValue={(x: string) => {
          setClientId(x);
        }}
        label="👤 Azure Client ID"
        placeholder="ex. 12345678-abcd-1234-abcd-12345678abcd"
        width="100%"
        isRequired={true}
      />
      <InputRow
        type="password"
        value={servicePrincipalKey}
        setValue={(x: string) => {
          setServicePrincipalKey(x);
        }}
        label="🔒 Azure Service Principal Key"
        placeholder="○ ○ ○ ○ ○ ○ ○ ○ ○"
        width="100%"
        isRequired={true}
      />
      <InputRow
        type="text"
        value={tenantId}
        setValue={(x: string) => {
          setTenantId(x);
        }}
        label="Azure Tenant ID"
        placeholder="ex. 12345678-abcd-1234-abcd-12345678abcd"
        width="100%"
        isRequired={true}
      />
      <InputRow
        type="text"
        value={subscriptionId}
        setValue={(x: string) => {
          setSubscriptionId(x);
        }}
        label="Azure Subscription ID"
        placeholder="ex. 12345678-abcd-1234-abcd-12345678abcd"
        width="100%"
        isRequired={true}
      />
      <Flex>
        <SaveButton
          text="Continue"
          disabled={false}
          onClick={submit}
          makeFlush={true}
          clearPosition={true}
          status={buttonStatus}
          statusPosition={"right"}
        />
      </Flex>
    </>
  );
};

export default AzureCredentialForm;

const Flex = styled.div`
  display: flex;
  color: #ffffff;
  align-items: center;
  > i {
    color: #aaaabb;
    font-size: 20px;
    margin-right: 10px;
  }
`;
