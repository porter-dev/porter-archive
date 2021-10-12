import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import SaveButton from "components/SaveButton";
import { DORegistryConfig } from "main/home/onboarding/types";
import React, { useEffect, useState } from "react";
import api from "shared/api";
import styled from "styled-components";
import { useSnapshot } from "valtio";
import { State } from "../ConnectRegistryState";

/**
 * This will redirect to DO, and we should pass the redirection URI to be /onboarding/registry?provider=do
 *
 * After the oauth flow comes back, the first render will go and check if it exists a integration_id for DO in the
 * current onboarding project, after getting it, the CredentialsForm will use nextFormStep to save the onboarding state.
 *
 * If it happens to be an error, it will be shown with the default error handling through the modal.
 */
export const CredentialsForm: React.FC<{
  nextFormStep: (data: Partial<DORegistryConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  useEffect(() => {
    api.getOAuthIds("<token>", {}, { project_id: project?.id }).then((res) => {
      let tgtIntegration = res.data.find((integration: any) => {
        return integration.client === "do";
      });

      if (tgtIntegration) {
        nextFormStep({
          credentials: {
            id: tgtIntegration.id,
          },
        });
      }
    });
  }, []);

  return (
    <>
      <ConnectDigitalOceanButton
        target={"_blank"}
        href={`/api/projects/${project?.id}/oauth/digitalocean`}
      >
        Connect Digital Ocean
      </ConnectDigitalOceanButton>
    </>
  );
};

export const SettingsForm: React.FC<{
  nextFormStep: (data: Partial<DORegistryConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  const [registryUrl, setRegistryUrl] = useState("basic");
  const [registryName, setRegistryName] = useState("");
  const [buttonStatus] = useState("");
  const snap = useSnapshot(State);

  const submit = async () => {
    await api.connectDORegistry(
      "<token>",
      {
        name: registryName,
        do_integration_id: snap.config.credentials.id,
        url: registryUrl,
      },
      { project_id: project.id }
    );
    nextFormStep({
      settings: {
        registry_url: registryUrl,
      },
    });
  };

  return (
    <>
      <InputRow
        type="text"
        value={registryName}
        setValue={(registryName: string) => setRegistryName(registryName)}
        isRequired={true}
        label="🏷️ Registry Name"
        placeholder="ex: paper-straw"
        width="100%"
      />
      <Helper>
        DOC R URI, in the form{" "}
        <CodeBlock>registry.digitalocean.com/[REGISTRY_NAME]</CodeBlock>. For
        example, <CodeBlock>registry.digitalocean.com/porter-test</CodeBlock>.
      </Helper>
      <InputRow
        type="text"
        value={registryUrl}
        setValue={(url: string) => setRegistryUrl(url)}
        label="🔗 GCR URL"
        placeholder="ex: registry.digitalocean.com/porter-test"
        width="100%"
        isRequired={true}
      />
      <SaveButton
        text="Connect Registry"
        disabled={false}
        onClick={submit}
        makeFlush={true}
        clearPosition={true}
        status={buttonStatus}
        statusPosition={"right"}
      />
    </>
  );
};

export const TestRegistryConnection: React.FC<{
  nextFormStep: () => void;
  project: any;
}> = ({ nextFormStep }) => {
  return (
    <>
      <SaveButton
        text="Continue"
        disabled={false}
        onClick={nextFormStep}
        makeFlush={true}
        clearPosition={true}
        status={""}
        statusPosition={"right"}
      />
    </>
  );
};

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

const ConnectDigitalOceanButton = styled.a`
  width: 200px;
  justify-content: center;
  border-radius: 5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  color: white;
  font-weight: 500;
  padding: 10px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: 0 5px 8px 0px #00000010;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;
