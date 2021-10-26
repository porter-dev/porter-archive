import styled from "styled-components";
import InputRow from "components/form-components/InputRow";
import SelectRow from "components/form-components/SelectRow";
import SaveButton from "components/SaveButton";
import { OFState } from "main/home/onboarding/state";
import {
  AWSProvisionerConfig,
  AWSRegistryConfig,
} from "main/home/onboarding/types";
import React, { useEffect, useState } from "react";
import api from "shared/api";
import { useSnapshot } from "valtio";
import { SharedStatus } from "./SharedStatus";
import Loading from "components/Loading";
import Helper from "components/form-components/Helper";

const regionOptions = [
  { value: "us-east-1", label: "US East (N. Virginia) us-east-1" },
  { value: "us-east-2", label: "US East (Ohio) us-east-2" },
  { value: "us-west-1", label: "US West (N. California) us-west-1" },
  { value: "us-west-2", label: "US West (Oregon) us-west-2" },
  { value: "af-south-1", label: "Africa (Cape Town) af-south-1" },
  { value: "ap-east-1", label: "Asia Pacific (Hong Kong) ap-east-1" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai) ap-south-1" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul) ap-northeast-2" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore) ap-southeast-1" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney) ap-southeast-2" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo) ap-northeast-1" },
  { value: "ca-central-1", label: "Canada (Central) ca-central-1" },
  { value: "eu-central-1", label: "Europe (Frankfurt) eu-central-1" },
  { value: "eu-west-1", label: "Europe (Ireland) eu-west-1" },
  { value: "eu-west-2", label: "Europe (London) eu-west-2" },
  { value: "eu-south-1", label: "Europe (Milan) eu-south-1" },
  { value: "eu-west-3", label: "Europe (Paris) eu-west-3" },
  { value: "eu-north-1", label: "Europe (Stockholm) eu-north-1" },
  { value: "me-south-1", label: "Middle East (Bahrain) me-south-1" },
  { value: "sa-east-1", label: "South America (São Paulo) sa-east-1" },
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
  nextFormStep: (data: Partial<AWSRegistryConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  const snap = useSnapshot(OFState);
  const [accessId, setAccessId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [awsRegion, setAWSRegion] = useState("us-east-1");
  const [buttonStatus, setButtonStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [lastConnectedAccount, setLastConnectedAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .getAWSIntegration("<token>", {}, { project_id: project.id })
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
    if (!accessId) {
      return {
        hasError: true,
        error: "Access ID cannot be empty",
      };
    }
    if (!secretKey) {
      return {
        hasError: true,
        error: "AWS Secret key cannot be empty",
      };
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

    try {
      const res = await api.createAWSIntegration(
        "token",
        {
          aws_region: awsRegion,
          aws_access_key_id: accessId,
          aws_secret_access_key: secretKey,
        },
        {
          id: project.id,
        }
      );

      continueToNextStep(res.data?.id);
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
      <div>
        <InputRow
          type="text"
          value={accessId}
          setValue={(x: string) => {
            setAccessId(x);
          }}
          label="👤 AWS Access ID"
          placeholder="ex: AKIAIOSFODNN7EXAMPLE"
          width="100%"
          isRequired={true}
        />
        <InputRow
          type="password"
          value={secretKey}
          setValue={(x: string) => {
            setSecretKey(x);
          }}
          label="🔒 AWS Secret Key"
          placeholder="○ ○ ○ ○ ○ ○ ○ ○ ○"
          width="100%"
          isRequired={true}
        />
        <SelectRow
          options={regionOptions}
          width="100%"
          value={awsRegion}
          scrollBuffer={true}
          dropdownMaxHeight="240px"
          setActiveValue={(x: string) => {
            setAWSRegion(x);
          }}
          label="📍 AWS Region"
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
      </div>
    );
  }

  return (
    <>
      <Helper>Connected account:</Helper>
      <PreviewRow>
        <Flex>
          <i className="material-icons">account_circle</i>
          {lastConnectedAccount.aws_arn || "arn: n/a"}
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

const machineTypeOptions = [
  { value: "t2.medium", label: "t2.medium" },
  { value: "t2.xlarge", label: "t2.xlarge" },
  { value: "t2.2xlarge", label: "t2.2xlarge" },
  { value: "t3.medium", label: "t3.medium" },
  { value: "t3.xlarge", label: "t3.xlarge" },
  { value: "t3.2xlarge", label: "t3.2xlarge" },
];

export const SettingsForm: React.FC<{
  nextFormStep: (data: Partial<AWSProvisionerConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  const snap = useSnapshot(OFState);
  const [clusterName, setClusterName] = useState(`${project.name}-cluster`);
  const [machineType, setMachineType] = useState("t2.medium");
  const [buttonStatus, setButtonStatus] = useState("");

  const validate = () => {
    if (!clusterName) {
      return {
        hasError: true,
        error: "Registry name cannot be empty",
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

  const provisionECR = async (awsIntegrationId: number) => {
    console.log("Started provision ECR");

    try {
      return await api
        .provisionECR(
          "<token>",
          {
            aws_integration_id: awsIntegrationId,
            ecr_name: `${project.name}-registry`,
          },
          { id: project.id }
        )
        .then((res) => res?.data);
    } catch (error) {
      catchError(error);
    }
  };

  const provisionEKS = async (awsIntegrationId: number) => {
    try {
      return await api
        .provisionEKS(
          "<token>",
          {
            aws_integration_id: awsIntegrationId,
            eks_name: clusterName,
            machine_type: machineType,
            issuer_email: snap.StateHandler.user_email,
          },
          { id: project.id }
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

    const shouldProvisionECR = snap.StateHandler.connected_registry.skip;

    if (shouldProvisionECR) {
      if (!hasRegistryProvisioned(infras)) {
        registryProvisionResponse = await provisionECR(integrationId);
      }
    }
    if (!hasClusterProvisioned(infras)) {
      clusterProvisionResponse = await provisionEKS(integrationId);
    }

    nextFormStep({
      settings: {
        registry_infra_id: registryProvisionResponse?.id,
        cluster_infra_id: clusterProvisionResponse?.id,
        cluster_name: clusterName,
        aws_machine_type: machineType,
      },
    });
  };

  return (
    <>
      <InputRow
        type="text"
        value={clusterName}
        setValue={(x) => {
          setClusterName(String(x));
        }}
        label="Cluster Name"
        placeholder="ex: porter-cluster"
        width="100%"
      />
      <SelectRow
        options={machineTypeOptions}
        width="100%"
        value={machineType}
        dropdownMaxHeight="240px"
        setActiveValue={(x: string) => {
          setMachineType(x);
        }}
        label="⚙️ AWS Machine Type"
        doc="https://docs.porter.run/docs/provisioning-infrastructure#which-instance-type-should-i-select"
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

const SubmitButton = styled(SaveButton)`
  margin-left: ${(props: { disableLeftMargin: boolean }) =>
    props.disableLeftMargin ? "" : "16px"};
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
