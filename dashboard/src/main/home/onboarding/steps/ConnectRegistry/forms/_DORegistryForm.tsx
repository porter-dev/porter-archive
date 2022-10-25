import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import Loading from "components/Loading";
import SaveButton from "components/SaveButton";
import RegistryImageList from "main/home/onboarding/components/RegistryImageList";
import { OFState } from "main/home/onboarding/state";
import { StateHandler } from "main/home/onboarding/state/StateHandler";
import { DORegistryConfig } from "main/home/onboarding/types";
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router";
import api from "shared/api";
import { readableDate } from "shared/string_utils";
import styled from "styled-components";
import { useSnapshot } from "valtio";

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
  const snap = useSnapshot(OFState);

  const [isLoading, setIsLoading] = useState(true);
  const [connectedAccount, setConnectedAccount] = useState(null);

  useEffect(() => {
    api.getOAuthIds("<token>", {}, { project_id: project?.id }).then((res) => {
      let integrations = res.data.filter((integration: any) => {
        return integration.client === "do";
      });

      if (Array.isArray(integrations) && integrations.length) {
        // Sort decendant
        integrations.sort((a, b) => b.id - a.id);
        let lastUsed = integrations.find((i) => {
          i.id === snap.StateHandler?.connected_registry?.credentials?.id;
        });
        if (!lastUsed) {
          lastUsed = integrations[0];
        }
        setConnectedAccount(lastUsed);
      }
      setIsLoading(false);
    });
  }, []);

  const submit = (integrationId: number) => {
    nextFormStep({
      credentials: {
        id: integrationId,
      },
    });
  };

  const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;

  const encoded_redirect_uri = encodeURIComponent(url);

  if (isLoading) {
    return <Loading />;
  }

  let content = "Project name: n/a";

  if (connectedAccount?.target_email) {
    content = `${connectedAccount?.target_email}`;
  }

  if (connectedAccount?.target_id) {
    content = `${connectedAccount?.target_id}`;
  }

  return (
    <>
      {connectedAccount !== null && (
        <>
          <Helper>Connected account:</Helper>
          <PreviewRow>
            <Flex>
              <i className="material-icons">account_circle</i>
              {content}
            </Flex>
            <Right>
              Connected at {readableDate(connectedAccount.created_at)}
            </Right>
          </PreviewRow>
        </>
      )}
      {connectedAccount !== null ? (
        <Helper>
          Want to use a different account?{" "}
          <A
            href={`/api/projects/${project?.id}/oauth/digitalocean?redirect_uri=${encoded_redirect_uri}`}
          >
            Sign in to DigitalOcean
          </A>
          .
        </Helper>
      ) : (
        <ConnectDigitalOceanButton
          href={`/api/projects/${project?.id}/oauth/digitalocean?redirect_uri=${encoded_redirect_uri}`}
        >
          Sign In to DigitalOcean
        </ConnectDigitalOceanButton>
      )}

      <Br height="5px" />
      {connectedAccount !== null && (
        <SaveButton
          text="Continue"
          disabled={false}
          onClick={() => submit(connectedAccount.id)}
          makeFlush={true}
          clearPosition={true}
          status={""}
          statusPosition={"right"}
        />
      )}
    </>
  );
};

export const SettingsForm: React.FC<{
  nextFormStep: (data: Partial<DORegistryConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  const [registryUrl, setRegistryUrl] = useState(
    "registry.digitalocean.com/porter-test"
  );
  const [registryName, setRegistryName] = useState("");
  const [buttonStatus] = useState("");
  const snap = useSnapshot(OFState);

  const submit = async () => {
    const data = await api
      .connectDORegistry(
        "<token>",
        {
          name: registryName,
          do_integration_id:
            snap.StateHandler.connected_registry.credentials.id,
          url: registryUrl,
        },
        { project_id: project.id }
      )
      .then((res) => res?.data);
    nextFormStep({
      settings: {
        registry_connection_id: data?.id,
        registry_url: registryUrl,
      },
    });
  };

  return (
    <>
      <Helper>
        Provide a name for Porter to use when displaying your registry.
      </Helper>
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
        DOCR URI, in the form{" "}
        <CodeBlock>registry.digitalocean.com/[REGISTRY_NAME]</CodeBlock>. For
        example, <CodeBlock>registry.digitalocean.com/porter-test</CodeBlock>.
      </Helper>
      <InputRow
        type="text"
        value={registryUrl}
        setValue={(url: string) => setRegistryUrl(url)}
        label="🔗 DOCR URL"
        placeholder="ex: registry.digitalocean.com/porter-test"
        width="100%"
        isRequired={true}
      />
      <Br />
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
  const snap = useSnapshot(StateHandler);
  return (
    <>
      <RegistryImageList
        registryType="docker"
        project={snap.project}
        registry_id={snap.connected_registry.settings.registry_connection_id}
      />
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

const A = styled.a`
  cursor: pointer;
`;

const Right = styled.div`
  text-align: right;
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
`;

const Br = styled.div<{ height?: string }>`
  width: 100%;
  height: ${(props) => props.height || "15px"};
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

const ConnectDigitalOceanButton = styled.a`
  width: 200px;
  justify-content: center;
  margin-top: 22px;
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
