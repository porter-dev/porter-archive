import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import SelectRow from "components/form-components/SelectRow";
import UploadArea from "components/form-components/UploadArea";
import Loading from "components/Loading";
import SaveButton from "components/SaveButton";
import RegistryImageList from "main/home/onboarding/components/RegistryImageList";
import { GCP_REGION_OPTIONS } from "main/home/onboarding/constants";
import { OFState } from "main/home/onboarding/state";
import { StateHandler } from "main/home/onboarding/state/StateHandler";
import { GCPRegistryConfig } from "main/home/onboarding/types";
import React, { useEffect, useState } from "react";
import api from "shared/api";
import { readableDate } from "shared/string_utils";
import styled from "styled-components";
import { useSnapshot } from "valtio";

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

        let lastUsed = integrations.find((i) => {
          return (
            i.id === snap.StateHandler?.connected_registry?.credentials?.id
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
        <Br />
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
          {lastConnectedAccount?.gcp_sa_email}
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
  nextFormStep: (data: Partial<GCPRegistryConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  const [registryName, setRegistryName] = useState("");
  const [registryUrl, setRegistryUrl] = useState("");
  const [buttonStatus, setButtonStatus] = useState("");
  const snap = useSnapshot(OFState);

  const validate = () => {
    if (!registryName) {
      return {
        hasError: true,
        error: "Registry Name cannot be empty",
      };
    }
    if (!registryUrl) {
      return {
        hasError: true,
        error: "Registry Url cannot be empty",
      };
    }
    return { hasError: false, error: "" };
  };

  const submit = async () => {
    const validation = validate();

    if (validation.hasError) {
      setButtonStatus(validation.error);
      return;
    }

    setButtonStatus("loading");

    try {
      const data = await api
        .connectGCRRegistry(
          "<token>",
          {
            name: registryName,
            gcp_integration_id:
              snap.StateHandler.connected_registry.credentials.id,
            url: registryUrl,
          },
          {
            id: project.id,
          }
        )
        .then((res) => res?.data);

      nextFormStep({
        settings: {
          registry_connection_id: data.id,
          gcr_url: registryUrl,
          registry_name: registryName,
        },
      });
    } catch (error) {
      setButtonStatus("Couldn't connect registry.");
    }
  };
  return (
    <>
      <Helper>
        Provide a name for Porter to use when displaying your registry.
      </Helper>
      <InputRow
        type="text"
        value={registryName}
        setValue={(name: string) => setRegistryName(name)}
        isRequired={true}
        label="🏷️ Registry Name"
        placeholder="ex: paper-straw"
        width="100%"
      />
      <Helper>
        GCR URI, in the form{" "}
        <CodeBlock>[gcr_domain]/[gcp_project_id]</CodeBlock>. For example,{" "}
        <CodeBlock>gcr.io/skynet-dev-172969</CodeBlock>.
      </Helper>
      <InputRow
        type="text"
        value={registryUrl}
        setValue={(url: string) => setRegistryUrl(url)}
        label="🔗 GCR URL"
        placeholder="ex: gcr.io/skynet-dev-172969"
        width="100%"
        isRequired={true}
      />
      <Br />
      <SaveButton
        text="Continue"
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

export const GARegistryConfig: React.FC<{
  nextFormStep: (data: Partial<GCPRegistryConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  const [buttonStatus, setButtonStatus] = useState("");
  const [registryName, setRegistryName] = useState("");
  const [region, setRegion] = useState("us-east1");

  const snap = useSnapshot(OFState);

  const validate = () => {
    if (!registryName) {
      return {
        hasError: true,
        error: "Registry Name cannot be empty",
      };
    }
    if (!region) {
      return {
        hasError: true,
        error: "Region is missing",
      };
    }

    if (!GCP_REGION_OPTIONS.map((val) => val.value).includes(region)) {
      return {
        hasError: true,
        error: "Region is invalid",
      };
    }

    return { hasError: false, error: "" };
  };

  const submit = async () => {
    const validation = validate();

    if (validation.hasError) {
      setButtonStatus(validation.error);
      return;
    }

    setButtonStatus("loading");

    let gcpProjectId = NaN;

    try {
      const gcp_integration = await api
        .getGCPIntegration("<token>", {}, { project_id: project.id })
        .then((res) => {
          let integrations = res.data;

          let lastUsed = integrations.find((i: any) => {
            return (
              i.id === snap.StateHandler?.connected_registry?.credentials?.id
            );
          });
          return lastUsed;
        });

      if (gcp_integration) {
        gcpProjectId = gcp_integration.gpc_project_id;
      }
    } catch (error) {
      setButtonStatus("Couldn't get the project id from the GCP integration.");
      return;
    }

    const registryUrl = `${region}-docker.pkg.dev/${gcpProjectId}`;

    try {
      const data = await api
        .connectGCRRegistry(
          "<token>",
          {
            name: registryName,
            gcp_integration_id:
              snap.StateHandler.connected_registry.credentials.id,
            url: registryUrl,
          },
          {
            id: project.id,
          }
        )
        .then((res) => res?.data);
      nextFormStep({
        settings: {
          registry_connection_id: data.id,
          gcr_url: registryUrl,
          registry_name: registryName,
        },
      });
    } catch (error) {
      setButtonStatus("Couldn't connect registry.");
    }
  };
  return (
    <>
      <Helper>Porter will use this registry to store your images.</Helper>
      <InputRow
        type="text"
        value={registryName}
        setValue={(name: string) => setRegistryName(name)}
        isRequired={true}
        label="🏷️ Registry Name"
        placeholder="ex: paper-straw"
        width="100%"
      />
      <SelectRow
        options={GCP_REGION_OPTIONS}
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
        text="Continue"
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
}> = ({ nextFormStep, project }) => {
  const snap = useSnapshot(StateHandler);
  return (
    <>
      <RegistryImageList
        project={snap.project}
        registry_id={snap.connected_registry.settings.registry_connection_id}
        registryType={"gcr"}
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
