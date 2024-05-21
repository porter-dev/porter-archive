import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import SelectRow from "components/form-components/SelectRow";
import UploadArea from "components/form-components/UploadArea";
import SaveButton from "components/SaveButton";
import { GAR_REGION_OPTIONS } from "main/home/onboarding/constants";
import React, { useContext, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";

type GCPIntegration = {
  id: string;
  gcp_project_id: string;
  [key: string]: unknown;
};

const GARForm = (props: { closeForm: () => void }) => {
  const { closeForm } = props;
  const { currentProject } = useContext(Context);

  const [credentialsName, setCredentialsName] = useState("");
  const [serviceAccountKey, setServiceAccountKey] = useState("");
  const [region, setRegion] = useState("us-east1");
  const [buttonStatus, setButtonStatus] = useState("");

  const isValid = () => {
    return (
      credentialsName.length > 0 &&
      serviceAccountKey.length > 0 &&
      region.length > 0
    );
  };

  const handleSubmit = async () => {
    setButtonStatus("loading");

    let integration: GCPIntegration;

    try {
      const res = await api.createGCPIntegration<GCPIntegration>(
        "<token>",
        {
          gcp_key_data: serviceAccountKey,
          gcp_project_id: "",
        },
        {
          project_id: currentProject.id,
        }
      );

      integration = res.data;
    } catch (error) {
      setButtonStatus(
        "Couldn't connect with GCP with the provided credentials."
      );
      return;
    }

    try {
      let registryURL: string;

      // GCP project IDs can have the ':' character like example.com:my-project
      // if this is the case then we need to case on this
      //
      // see: https://cloud.google.com/artifact-registry/docs/docker/names#domain
      if (integration.gcp_project_id.includes(":")) {
        const domainProjectID = integration.gcp_project_id.split(":");

        if (
          domainProjectID.length !== 2 ||
          domainProjectID[0].length === 0 ||
          domainProjectID[1].length === 0
        ) {
          setButtonStatus(
            "Invalid GCP project ID. Please check your credentials."
          );
          return;
        }

        registryURL = `${region}-docker.pkg.dev/${domainProjectID[0]}/${domainProjectID[1]}`;
      } else {
        registryURL = `${region}-docker.pkg.dev/${integration.gcp_project_id}`;
      }

      await api.connectGCRRegistry(
        "token",
        {
          gcp_integration_id: integration.id,
          name: credentialsName,
          url: registryURL,
        },
        { id: currentProject.id }
      );
    } catch (error) {
      setButtonStatus(
        "Couldn't connect the GAR registry with the provided credentials."
      );
      return;
    }

    setButtonStatus("successfull");
    closeForm();
  };

  return (
    <StyledForm>
      <CredentialWrapper>
        <Heading isAtTop>Porter settings</Heading>
        <Helper>
          Give a name to this set of registry credentials (just for Porter).
        </Helper>
        <InputRow
          type="text"
          value={credentialsName}
          setValue={(credentialsName: string) =>
            setCredentialsName(credentialsName)
          }
          isRequired={true}
          label="🏷️ Registry name"
          placeholder="ex: paper-straw"
          width="100%"
        />
        <Heading>GCP settings</Heading>
        <Helper>Service account credentials for GCP permissions.</Helper>
        <UploadArea
          setValue={(x: any) => setServiceAccountKey(x)}
          label="🔒 GCP key data (JSON)"
          placeholder="Choose a file or drag it here."
          width="100%"
          height="100%"
          isRequired={true}
        />
        <SelectRow
          options={GAR_REGION_OPTIONS}
          width="100%"
          value={region}
          scrollBuffer={true}
          dropdownMaxHeight="240px"
          setActiveValue={(x: string) => {
            setRegion(x);
          }}
          label="📍 GAR region"
        />
      </CredentialWrapper>
      <SaveButton
        text="Save settings"
        status={buttonStatus}
        makeFlush={true}
        clearPosition={true}
        statusPosition="right"
        disabled={!isValid()}
        onClick={!isValid() ? null : handleSubmit}
      />
    </StyledForm>
  );
};

export default GARForm;

const CredentialWrapper = styled.div`
  padding: 30px;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  margin-bottom: 30px;
`;

const StyledForm = styled.div`
  position: relative;
  padding-bottom: 75px;
`;

const CodeBlock = styled.span`
  display: inline-block;
  background-color: #1b1d26;
  color: white;
  border-radius: 5px;
  font-family: monospace;
  padding: 2px 3px;
  margin-top: -2px;
  user-select: text;
`;
