import React, { useContext, useState } from "react";
import InputRow from "components/form-components/InputRow";
import SaveButton from "components/SaveButton";

import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import Placeholder from "components/OldPlaceholder";
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
