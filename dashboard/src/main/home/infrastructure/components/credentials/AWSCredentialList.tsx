import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import { Operation, OperationStatus, OperationType } from "shared/types";
import { readableDate } from "shared/string_utils";
import Placeholder from "components/Placeholder";

type Props = {
  selectCredential: (aws_integration_id: number) => void;
};

type AWSCredential = {
  created_at: string;
  id: number;
  user_id: number;
  project_id: number;
  aws_arn: string;
};

const AWSCredentialsList: React.FunctionComponent<Props> = ({
  selectCredential,
}) => {
  const { currentProject, setCurrentError } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [awsCredentials, setAWSCredentials] = useState<AWSCredential[]>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    api
      .getAWSIntegration(
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

        setAWSCredentials(data);
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

  const renderCredentials = () => {
    return awsCredentials.map((cred) => {
      return (
        <PreviewRow key={cred.id} onClick={() => selectCredential(cred.id)}>
          <Flex>
            <i className="material-icons">account_circle</i>
            {cred.aws_arn || "arn: n/a"}
          </Flex>
          <Right>Connected at {readableDate(cred.created_at)}</Right>
        </PreviewRow>
      );
    });
  };

  return (
    <AWSCredentialWrapper>
      Select your credentials from the list below, or create a new credential:
      {renderCredentials()}
      <CreateNewRow>
        <Flex>
          <i className="material-icons">account_circle</i>Add New AWS Credential
        </Flex>
      </CreateNewRow>
    </AWSCredentialWrapper>
  );
};

export default AWSCredentialsList;

const AWSCredentialWrapper = styled.div`
  width: 80%;
  margin: 0 auto;
`;

const PreviewRow = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 15px;
  color: #ffffff55;
  background: #ffffff11;
  border: 1px solid #aaaabb;
  justify-content: space-between;
  font-size: 13px;
  border-radius: 5px;
  cursor: pointer;
  margin: 16px 0;

  :hover {
    background: #ffffff22;
  }
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
