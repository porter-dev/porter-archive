import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import SelectRow from "components/form-components/SelectRow";
import UploadArea from "components/form-components/UploadArea";
import Loading from "components/Loading";
import SaveButton from "components/SaveButton";
import { OFState } from "main/home/onboarding/state";
import {
  GCPProvisionerConfig,
  GCPRegistryConfig,
} from "main/home/onboarding/types";
import React, { useEffect, useState } from "react";
import api from "shared/api";
import styled from "styled-components";
import { useSnapshot } from "valtio";
import { SharedStatus } from "./SharedStatus";

const regionOptions = [
  { value: "asia-east1", label: "asia-east1" },
  { value: "asia-east2", label: "asia-east2" },
  { value: "asia-northeast1", label: "asia-northeast1" },
  { value: "asia-northeast2", label: "asia-northeast2" },
  { value: "asia-northeast3", label: "asia-northeast3" },
  { value: "asia-south1", label: "asia-south1" },
  { value: "asia-southeast1", label: "asia-southeast1" },
  { value: "asia-southeast2", label: "asia-southeast2" },
  { value: "australia-southeast1", label: "australia-southeast1" },
  { value: "europe-north1", label: "europe-north1" },
  { value: "europe-west1", label: "europe-west1" },
  { value: "europe-west2", label: "europe-west2" },
  { value: "europe-west3", label: "europe-west3" },
  { value: "europe-west4", label: "europe-west4" },
  { value: "europe-west6", label: "europe-west6" },
  { value: "northamerica-northeast1", label: "northamerica-northeast1" },
  { value: "southamerica-east1", label: "southamerica-east1" },
  { value: "us-central1", label: "us-central1" },
  { value: "us-east1", label: "us-east1" },
  { value: "us-east4", label: "us-east4" },
  { value: "us-west1", label: "us-west1" },
  { value: "us-west2", label: "us-west2" },
  { value: "us-west3", label: "us-west3" },
  { value: "us-west4", label: "us-west4" },
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

export const CredentialsForm: React.FC<{
  nextFormStep: (data: Partial<GCPRegistryConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  const snap = useSnapshot(OFState);
  const [projectId, setProjectId] = useState("");
  const [serviceAccountKey, setServiceAccountKey] = useState("");
  const [buttonStatus, setButtonStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [lastConnectedAccount, setLastConnectedAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .getGCPIntegration("<token>", {}, { project_id: project.id })
      .then((res) => {
        let integrations = res.data;
        if (!Array.isArray(integrations) || !integrations.length) {
          setShowForm(true);
          return;
        }

        // DO NOT USE THE INTEGRATION ID FROM THE CONNECTED REGISTRY
        integrations = integrations.filter((i) => {
          return (
            i.id !== snap.StateHandler?.connected_registry?.credentials?.id
          );
        });

        // filter can change the type from integrations so just in case
        // we check again that integrations is an array
        if (!Array.isArray(integrations) || !integrations) {
          setShowForm(true);
          return;
        }

        integrations.sort((a, b) => b.id - a.id);

        let lastUsed = integrations.find((i) => {
          return (
            i.id === snap.StateHandler?.provision_resources?.credentials?.id
          );
        });

        if (!lastUsed) {
          setShowForm(true);
          return;
        }

        setLastConnectedAccount(lastUsed);
        setShowForm(false);
      })
      .catch((err) => {
        setShowForm(true);
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const validate = () => {
    if (!projectId) {
      return { hasError: true, error: "Project ID cannot be empty" };
    }

    if (!serviceAccountKey) {
      return { hasError: true, error: "GCP Key Data cannot be empty" };
    }
    return {
      hasError: false,
      error: "",
    };
  };

  const submit = async () => {
    const validation = validate();

    if (validation.hasError) {
      setButtonStatus(validation.error);
      return;
    }
    setButtonStatus("loading");
    try {
      const gcpIntegration = await api
        .createGCPIntegration(
          "<token>",
          {
            gcp_key_data: serviceAccountKey,
            gcp_project_id: projectId,
          },
          { project_id: project.id }
        )
        .then((res) => res.data);

      nextFormStep({
        credentials: {
          id: gcpIntegration?.id,
        },
      });
    } catch (error) {
      setButtonStatus("Something went wrong, please try again");
    }
  };

  const continueToNextStep = (integration_id: number) => {
    nextFormStep({
      credentials: {
        id: integration_id,
      },
    });
  };

  if (isLoading) {
    return <Loading />;
  }

  if (showForm) {
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
          {lastConnectedAccount && (
            <SaveButton
              text="Cancel"
              disabled={false}
              onClick={() => setShowForm(false)}
              makeFlush={true}
              clearPosition={true}
              status=""
              statusPosition="right"
              color="#fc4976"
            />
          )}
          <SubmitButton
            text="Continue"
            disabled={false}
            onClick={submit}
            makeFlush={true}
            clearPosition={true}
            status={buttonStatus}
            statusPosition={"right"}
            disableLeftMargin={!lastConnectedAccount}
          />
        </Flex>
      </>
    );
  }

  return (
    <>
      <Helper>Connected account:</Helper>
      <PreviewRow>
        <Flex>
          <i className="material-icons">account_circle</i>
          {lastConnectedAccount?.gcp_sa_email || "n/a"}
        </Flex>
        <Right>
          Connected at {readableDate(lastConnectedAccount.created_at)}
        </Right>
      </PreviewRow>
      <Helper>
        Want to use a different account?{" "}
        <A onClick={() => setShowForm(true)} href="#">
          Connect another account
        </A>
        .
      </Helper>

      <Br />

      <SaveButton
        text="Continue"
        disabled={false}
        onClick={() => continueToNextStep(lastConnectedAccount?.id)}
        makeFlush={true}
        clearPosition={true}
        status={buttonStatus}
        statusPosition={"right"}
      />
    </>
  );
};

export const SettingsForm: React.FC<{
  nextFormStep: (data: Partial<GCPProvisionerConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  const [region, setRegion] = useState("us-east1");
  const [clusterName, setClusterName] = useState(`${project.name}-cluster`);
  const [buttonStatus, setButtonStatus] = useState("");
  const snap = useSnapshot(OFState);

  const validate = () => {
    if (!clusterName) {
      return {
        hasError: true,
        error: "Cluster Name cannot be empty",
      };
    }

    return { hasError: false, error: "" };
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

  const catchError = (error: any) => {
    console.error(error);
  };

  const submit = async () => {
    const validation = validate();

    setButtonStatus("loading");

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
        registryProvisionResponse = await provisionGCR(integrationId);
      }
    }
    if (!hasClusterProvisioned(infras)) {
      clusterProvisionResponse = await provisionGKE(integrationId);
    }

    nextFormStep({
      settings: {
        cluster_name: clusterName,
        registry_infra_id: registryProvisionResponse?.id,
        cluster_infra_id: clusterProvisionResponse?.id,
      },
    });
  };

  const provisionGCR = async (id: number) => {
    console.log("Provisioning GCR");

    try {
      const res = await api.createGCR(
        "<token>",
        {
          gcp_integration_id: id,
        },
        { project_id: project.id }
      );
      return res?.data;
    } catch (error) {
      return catchError(error);
    }
  };

  const provisionGKE = async (id: number) => {
    console.log("Provisioning GKE");

    try {
      const res = await api.createGKE(
        "<token>",
        {
          gcp_region: region,
          gke_name: clusterName,
          gcp_integration_id: id,
          issuer_email: snap.StateHandler.user_email,
        },
        { project_id: project.id }
      );
      return res?.data;
    } catch (error) {
      return catchError(error);
    }
  };

  return (
    <>
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
      <SelectRow
        options={regionOptions}
        width="100%"
        value={region}
        scrollBuffer={true}
        dropdownMaxHeight="240px"
        setActiveValue={(x: string) => {
          setRegion(x);
        }}
        label="📍 GCP Region"
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

const Right = styled.div`
  text-align: right;
`;

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

const A = styled.a`
  cursor: pointer;
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

const FlexColumn = styled.div`
  display: flex;
  flex-direction: column;
`;

const FlexColumnWithMargin = styled(FlexColumn)`
  margin-left: ${(props: { marginLeft: string }) => props.marginLeft};
`;

const SelectableSpan = styled.span`
  user-select: text;
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

const SubmitButton = styled(SaveButton)`
  margin-left: ${(props: { disableLeftMargin: boolean }) =>
    props.disableLeftMargin ? "" : "16px"};
`;
