import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import { Operation, OperationStatus, OperationType } from "shared/types";
import { readableDate } from "shared/string_utils";
import Placeholder from "components/Placeholder";
import GCPCredentialForm from "./GCPCredentialForm";

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

  const renderList = () => {
    return gcpCredentials.map((cred) => {
      return (
        <PreviewRow key={cred.id} onClick={() => selectCredential(cred.id)}>
          <Flex>
            <i className="material-icons">account_circle</i>
            {cred.gcp_sa_email || "email: n/a"}
          </Flex>
          <Right>Connected at {readableDate(cred.created_at)}</Right>
        </PreviewRow>
      );
    });
  };

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
        {renderList()}
        <CreateNewRow onClick={() => setShouldCreateCred(true)}>
          <Flex>
            <i className="material-icons">account_circle</i>Add New GCP
            Credential
          </Flex>
        </CreateNewRow>
      </>
    );
  };

  return <GCPCredentialWrapper>{renderContents()}</GCPCredentialWrapper>;
};

export default GCPCredentialsList;

const GCPCredentialWrapper = styled.div`
  margin-top: 20px;
`;

const PreviewRow = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 15px;
  color: #ffffff55;
  background: #ffffff01;
  border: 1px solid #aaaabb;
  justify-content: space-between;
  font-size: 13px;
  border-radius: 5px;
  cursor: pointer;
  margin: 16px 0;

  :hover {
    background: #ffffff10;
  }
`;

const Description = styled.div`
  width: 100%;
  font-size: 13px;
  color: #aaaabb;
  margin: 20px 0;
  display: flex;
  align-items: center;
  font-weight: 400;
`;

const CreateNewRow = styled(PreviewRow)`
  background: none;
`;

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

const Right = styled.div`
  text-align: right;
`;
