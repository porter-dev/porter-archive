import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import { Operation, OperationStatus, OperationType } from "shared/types";
import { readableDate } from "shared/string_utils";
import Placeholder from "components/Placeholder";

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

  const renderList = () => {
    return doCredentials.map((cred) => {
      return (
        <PreviewRow key={cred.id} onClick={() => selectCredential(cred.id)}>
          <Flex>
            <i className="material-icons">account_circle</i>
            {cred.target_email && cred.target_id
              ? `${cred.target_email} (${cred.target_id})`
              : "email: n/a"}
          </Flex>
          <Right>Connected at {readableDate(cred.created_at)}</Right>
        </PreviewRow>
      );
    });
  };

  const renderContents = () => {
    return (
      <>
        <Description>
          Select your credentials from the list below, or create a new
          credential:
        </Description>
        {renderList()}
        <CreateNewRow
          href={`/api/projects/${currentProject?.id}/oauth/digitalocean`}
        >
          <Flex>
            <i className="material-icons">account_circle</i>Add New DO
            Credential
          </Flex>
        </CreateNewRow>
      </>
    );
  };

  return <DOCredentialWrapper>{renderContents()}</DOCredentialWrapper>;
};

export default DOCredentialsList;

const DOCredentialWrapper = styled.div`
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

const CreateNewRow = styled.a`
  background: none;
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
