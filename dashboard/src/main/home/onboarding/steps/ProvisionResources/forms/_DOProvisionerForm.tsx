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
        Sign In to Digital Ocean
      </ConnectDigitalOceanButton>
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
    const integrationId = snap.StateHandler.provision_resources.credentials.id;
    let registryProvisionResponse = null;
    let clusterProvisionResponse = null;

    if (snap.StateHandler.connected_registry.skip) {
      registryProvisionResponse = await provisionDOCR(integrationId, tier);
    }
    clusterProvisionResponse = await provisionDOKS(
      integrationId,
      region,
      clusterName
    );

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

export const Status: React.FC<{
  nextFormStep: () => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  return (
    <SharedStatus
      nextFormStep={nextFormStep}
      project_id={project?.id}
      filter={["doks", "docr"]}
    />
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
