import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import Placeholder from "components/Placeholder";
import AzureCredentialForm from "./AzureCredentialForm";
import CredentialList from "./CredentialList";
import Description from "components/Description";

type Props = {
  selectCredential: (azure_integration_id: number) => void;
};

type AzureCredential = {
  created_at: string;
  id: number;
  user_id: number;
  project_id: number;
  azure_client_id: string;
};

const AzureCredentialsList: React.FunctionComponent<Props> = ({
  selectCredential,
}) => {
  const { currentProject, setCurrentError } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [azCredentials, setAzureCredentials] = useState<AzureCredential[]>(
    null
  );
  const [shouldCreateCred, setShouldCreateCred] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    api
      .getAzureIntegration(
        "<token>",
        {},
        {
          project_id: currentProject.id,
        }
      )
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          throw Error("Data is not an array");
        }

        setAzureCredentials(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setHasError(true);
        setCurrentError(err.response?.data?.error);
        setIsLoading(false);
      });
  }, [currentProject]);

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

  const renderContents = () => {
    if (shouldCreateCred) {
      return (
        <AzureCredentialForm
          setCreatedCredential={selectCredential}
          cancel={() => {}}
        />
      );
    }

    return (
      <>
        <Description>
          Select your credentials from the list below, or create a new
          credential:
        </Description>
        <CredentialList
          credentials={azCredentials.map((cred) => {
            return {
              id: cred.id,
              display_name: cred.azure_client_id,
              created_at: cred.created_at,
            };
          })}
          selectCredential={selectCredential}
          shouldCreateCred={() => setShouldCreateCred(true)}
          addNewText="Add New Azure Credential"
        />
      </>
    );
  };

  return <AzureCredentialWrapper>{renderContents()}</AzureCredentialWrapper>;
};

export default AzureCredentialsList;

const AzureCredentialWrapper = styled.div`
  margin-top: 20px;
`;
