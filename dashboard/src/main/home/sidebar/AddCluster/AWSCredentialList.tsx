import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import Description from "components/Description";
import Loading from "components/Loading";
import Placeholder from "components/OldPlaceholder";
import ProvisionerFlow from "components/ProvisionerFlow";

import api from "shared/api";
import { Context } from "shared/Context";

import CredentialList from "./CredentialList";

type Props = {
  selectCredential: (aws_integration_id: number) => void;
  setTargetARN: (target_arn: string) => void;
  gpuModal?: boolean;
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
  setTargetARN,
  gpuModal,
}) => {
  const { currentProject, setCurrentError } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [awsCredentials, setAWSCredentials] = useState<AWSCredential[]>(null);
  const [shouldCreateCred, setShouldCreateCred] = useState(false);
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
    return <ProvisionerFlow />;
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
      return <ProvisionerFlow />;
    }

    return (
      <>
        <Description>
          Select your credentials from the list below, or create a new
          credential:
        </Description>
        <CredentialList
          credentials={awsCredentials?.map((cred) => {
            return {
              id: cred.id,
              display_name: cred.aws_arn,
              created_at: cred.created_at,
            };
          })}
          selectCredential={selectCredential}
          setTargetARN={setTargetARN}
          shouldCreateCred={() => {
            setShouldCreateCred(true);
          }}
          addNewText="Create new CloudFormation stack"
          gpuModal={gpuModal}
        />
      </>
    );
  };

  return <AWSCredentialWrapper>{renderContents()}</AWSCredentialWrapper>;
};

export default AWSCredentialsList;

const AWSCredentialWrapper = styled.div`
  margin-top: 20px;
`;
