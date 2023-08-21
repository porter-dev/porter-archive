import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import Placeholder from "components/OldPlaceholder";
import GCPCredentialForm from "./GCPCredentialForm";
import CredentialList from "./CredentialList";
import Description from "components/Description";

type Props = {
  selectCredential: (gcp_integration_id: number) => void;
};

type GCPCredential = {
  created_at: string;
  id: number;
  user_id: number;
  project_id: number;
  gcp_sa_email: string;
};

const GCPCredentialsList: React.FunctionComponent<Props> = ({
  selectCredential,
}) => {
  const { currentProject, setCurrentError } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [gcpCredentials, setGCPCredentials] = useState<GCPCredential[]>(null);
  const [shouldCreateCred, setShouldCreateCred] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    api
      .getGCPIntegration(
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

        setGCPCredentials(data);
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
        <GCPCredentialForm
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
          credentials={gcpCredentials.map((cred) => {
            return {
              id: cred.id,
              display_name: cred.gcp_sa_email,
              created_at: cred.created_at,
            };
          })}
          selectCredential={selectCredential}
          shouldCreateCred={() => setShouldCreateCred(true)}
          addNewText="Add New GCP Credential"
        />
      </>
    );
  };

  return <GCPCredentialWrapper>{renderContents()}</GCPCredentialWrapper>;
};

export default GCPCredentialsList;

const GCPCredentialWrapper = styled.div`
  margin-top: 20px;
`;
