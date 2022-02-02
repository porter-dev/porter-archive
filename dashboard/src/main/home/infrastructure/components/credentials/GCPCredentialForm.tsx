import React, { useContext, useEffect, useState } from "react";
import InputRow from "components/form-components/InputRow";
import SelectRow from "components/form-components/SelectRow";
import SaveButton from "components/SaveButton";

import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import { Operation, OperationStatus, OperationType } from "shared/types";
import { readableDate } from "shared/string_utils";
import Placeholder from "components/Placeholder";
import Helper from "components/form-components/Helper";
import UploadArea from "components/form-components/UploadArea";

type Props = {
  setCreatedCredential: (aws_integration_id: number) => void;
  cancel: () => void;
};

const GCPCredentialForm: React.FunctionComponent<Props> = ({
  setCreatedCredential,
}) => {
  const { currentProject, setCurrentError } = useContext(Context);
  const [buttonStatus, setButtonStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const [serviceAccountKey, setServiceAccountKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const submit = () => {
    setIsLoading(true);
    api
      .createGCPIntegration(
        "<token>",
        {
          gcp_key_data: serviceAccountKey,
          gcp_project_id: projectId,
        },
        {
          project_id: currentProject.id,
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
        value={projectId}
        setValue={(x: string) => {
          setProjectId(x);
        }}
        label="🏷️ GCP Project ID"
        placeholder="ex: blindfold-ceiling-24601"
        width="100%"
        isRequired={true}
      />

      <Helper>Service account credentials for GCP permissions.</Helper>
      <UploadArea
        setValue={(x: any) => setServiceAccountKey(x)}
        label="🔒 GCP Key Data (JSON)"
        placeholder="Choose a file or drag it here."
        width="100%"
        height="100%"
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

export default GCPCredentialForm;

const GCPCredentialWrapper = styled.div`
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
