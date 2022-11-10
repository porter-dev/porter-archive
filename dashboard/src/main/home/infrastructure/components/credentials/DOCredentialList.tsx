import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import Placeholder from "components/OldPlaceholder";
import CredentialList from "./CredentialList";
import Description from "components/Description";

type Props = {
  selectCredential: (do_integration_id: number) => void;
};

type DOCredential = {
  created_at: string;
  id: number;
  user_id: number;
  project_id: number;
  target_email: string;
  target_id: string;
};

const DOCredentialsList: React.FunctionComponent<Props> = ({
  selectCredential,
}) => {
  const { currentProject, setCurrentError } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [doCredentials, setDOCredentials] = useState<DOCredential[]>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    api
      .getOAuthIds(
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

        setDOCredentials(data);
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
    return (
      <>
        <Description>
          Select your credentials from the list below, or create a new
          credential:
        </Description>
        <CredentialList
          credentials={doCredentials.map((cred) => {
            return {
              id: cred.id,
              display_name:
                cred.target_email && cred.target_id
                  ? `${cred.target_email} (${cred.target_id})`
                  : "",
              created_at: cred.created_at,
            };
          })}
          selectCredential={selectCredential}
          shouldCreateCred={() => {}}
          addNewText="Add New DO Credential"
          isLink={true}
          linkHref={`/api/projects/${currentProject?.id}/oauth/digitalocean`}
        />
      </>
    );
  };

  return <DOCredentialWrapper>{renderContents()}</DOCredentialWrapper>;
};

export default DOCredentialsList;

const DOCredentialWrapper = styled.div`
  margin-top: 20px;
`;
