import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import SelectRow from "components/form-components/SelectRow";
import ProvisionerStatus, {
  TFModule,
  TFResource,
} from "components/ProvisionerStatus";
import SaveButton from "components/SaveButton";
import { OFState } from "main/home/onboarding/state";
import { DOProvisionerConfig } from "main/home/onboarding/types";
import React, { useEffect, useState } from "react";
import api from "shared/api";
import styled from "styled-components";
import { useSnapshot } from "valtio";
import { useWebsockets } from "shared/hooks/useWebsockets";
import { SharedStatus } from "./SharedStatus";
import Loading from "components/Loading";

const tierOptions = [
  { value: "basic", label: "Basic" },
  { value: "professional", label: "Professional" },
];

const regionOptions = [
  { value: "ams3", label: "Amsterdam 3" },
  { value: "blr1", label: "Bangalore 1" },
  { value: "fra1", label: "Frankfurt 1" },
  { value: "lon1", label: "London 1" },
  { value: "nyc1", label: "New York 1" },
  { value: "nyc3", label: "New York 3" },
  { value: "sfo2", label: "San Francisco 2" },
  { value: "sfo3", label: "San Francisco 3" },
  { value: "sgp1", label: "Singapore 1" },
  { value: "tor1", label: "Toronto 1" },
];

const readableDate = (s: string) => {
  const ts = new Date(s);
  const date = ts.toLocaleDateString();
  const time = ts.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} on ${date}`;
};

/**
 * This will redirect to DO, and we should pass the redirection URI to be /onboarding/provision?provider=do
 *
 * After the oauth flow comes back, the first render will go and check if it exists a integration_id for DO in the
 * current onboarding project, after getting it, the CredentialsForm will use nextFormStep to save the onboarding state.
 *
 * If it happens to be an error, it will be shown with the default error handling through the modal.
 */
export const CredentialsForm: React.FC<{
  nextFormStep: (data: Partial<DOProvisionerConfig>) => void;
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
          i.id === snap.StateHandler?.provision_resources?.credentials?.id;
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

  return (
    <>
      {connectedAccount !== null && (
        <div>
          <div>Connected account: {connectedAccount.client}</div>
          <div>Connected at: {readableDate(connectedAccount.created_at)}</div>
        </div>
      )}
      <ConnectDigitalOceanButton
        href={`/api/projects/${project?.id}/oauth/digitalocean?redirect_uri=${encoded_redirect_uri}`}
      >
        {connectedAccount !== null
          ? "Connect another account"
          : "Sign In to Digital Ocean"}
      </ConnectDigitalOceanButton>

      <Br />
      {connectedAccount !== null && (
        <SaveButton
          text="Continue with connected account"
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
  nextFormStep: (data: Partial<DOProvisionerConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  const snap = useSnapshot(OFState);
  const [buttonStatus, setButtonStatus] = useState("");
  const [tier, setTier] = useState("basic");
  const [region, setRegion] = useState("nyc1");
  const [clusterName, setClusterName] = useState(`${project.name}-cluster`);

  const validate = () => {
    if (!clusterName) {
      return {
        hasError: true,
        error: "Cluster name cannot be empty",
      };
    }
    if (clusterName.length > 25) {
      return {
        hasError: true,
        error: "Cluster name cannot be longer than 25 characters",
      };
    }
    return {
      hasError: false,
      error: "",
    };
  };

  const catchError = (error: any) => {
    console.error(error);
  };

  const hasRegistryProvisioned = (
    infras: { kind: string; status: string }[]
  ) => {
    return !!infras.find(
      (i) => ["docr", "gcr", "ecr"].includes(i.kind) && i.status === "created"
    );
  };

  const hasClusterProvisioned = (
    infras: { kind: string; status: string }[]
  ) => {
    return !!infras.find(
      (i) => ["doks", "gks", "eks"].includes(i.kind) && i.status === "created"
    );
  };

  const provisionDOCR = async (integrationId: number, tier: string) => {
    console.log("Provisioning DOCR...");
    try {
      return await api
        .createDOCR(
          "<token>",
          {
            do_integration_id: integrationId,
            docr_name: project.name,
            docr_subscription_tier: tier,
          },
          {
            project_id: project.id,
          }
        )
        .then((res) => res?.data);
    } catch (error) {
      catchError(error);
    }
  };

  const provisionDOKS = async (
    integrationId: number,
    region: string,
    clusterName: string
  ) => {
    console.log("Provisioning DOKS...");
    try {
      return await api
        .createDOKS(
          "<token>",
          {
            do_integration_id: integrationId,
            doks_name: clusterName,
            do_region: region,
            issuer_email: snap.StateHandler.user_email,
          },
          {
            project_id: project.id,
          }
        )
        .then((res) => res?.data);
    } catch (error) {
      catchError(error);
    }
  };

  const submit = async () => {
    const validation = validate();

    if (validation.hasError) {
      setButtonStatus(validation.error);
      return;
    }

    let infras = [];
    try {
      infras = await api
        .getInfra("<token>", {}, { project_id: project?.id })
        .then((res) => res?.data);
    } catch (error) {
      setButtonStatus("Something went wrong, try again later");
      return;
    }

    const integrationId = snap.StateHandler.provision_resources.credentials.id;
    let registryProvisionResponse = null;
    let clusterProvisionResponse = null;

    if (snap.StateHandler.connected_registry.skip) {
      if (!hasRegistryProvisioned(infras)) {
        registryProvisionResponse = await provisionDOCR(integrationId, tier);
      }
    }

    if (!hasClusterProvisioned(infras)) {
      clusterProvisionResponse = await provisionDOKS(
        integrationId,
        region,
        clusterName
      );
    }

    nextFormStep({
      settings: {
        region,
        tier,
        cluster_name: clusterName,
        registry_infra_id: registryProvisionResponse?.id,
        cluster_infra_id: clusterProvisionResponse?.id,
      },
    });
  };

  return (
    <>
      <SelectRow
        options={tierOptions}
        width="100%"
        value={tier}
        setActiveValue={(x: string) => {
          setTier(x);
        }}
        label="💰 Subscription Tier"
      />
      <SelectRow
        options={regionOptions}
        width="100%"
        dropdownMaxHeight="240px"
        value={region}
        setActiveValue={(x: string) => {
          setRegion(x);
        }}
        label="📍 DigitalOcean Region"
      />
      <InputRow
        type="text"
        value={clusterName}
        setValue={(x: string) => {
          setClusterName(x);
        }}
        label="Cluster Name"
        placeholder="ex: porter-cluster"
        width="100%"
        isRequired={true}
      />
      <Br />
      <SaveButton
        text="Provision resources"
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

const Br = styled.div`
  width: 100%;
  height: 15px;
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
  border-radius: 5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 13px;
  margin-top: 22px;
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
