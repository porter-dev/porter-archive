import InputRow from "components/form-components/InputRow";
import SelectRow from "components/form-components/SelectRow";
import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import { AWSRegistryConfig } from "main/home/onboarding/types";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import api from "shared/api";
import { useSnapshot } from "valtio";
import { OFState } from "../../../state/index";
import IntegrationCategories from "main/home/integrations/IntegrationCategories";
import { StateHandler } from "main/home/onboarding/state/StateHandler";
import RegistryImageList from "main/home/onboarding/components/RegistryImageList";
import Loading from "components/Loading";

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
  const [buttonStatus, setButtonStatus] = useState("");
  const [awsRegion, setAWSRegion] = useState("us-east-1");
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
      <>
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
          scrollBuffer={true}
          value={awsRegion}
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
      </>
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
          Connected at{" "}
          {readableDate(lastConnectedAccount.created_at)}
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
  nextFormStep: (data: Partial<AWSRegistryConfig>) => void;
  project: any;
}> = ({ nextFormStep, project }) => {
  const snap = useSnapshot(OFState);
  const [registryName, setRegistryName] = useState("");

  const [buttonStatus, setButtonStatus] = useState("");
  const validate = () => {
    if (!registryName) {
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

  const submit = async () => {
    const validation = validate();
    if (validation.hasError) {
      setButtonStatus(validation.error);
      return;
    }
    try {
      const data = await api
        .connectECRRegistry(
          "<token>",
          {
            name: registryName,
            aws_integration_id:
              snap.StateHandler.connected_registry.credentials.id,
          },
          { id: project.id }
        )
        .then((res) => res?.data);

      nextFormStep({
        settings: {
          registry_connection_id: data?.id,
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
        setValue={(x) => {
          setRegistryName(String(x));
        }}
        label="🏷️ Registry Name"
        placeholder="ex: porter-awesome-registry"
        width="100%"
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

export const TestRegistryConnection: React.FC<{ nextFormStep: () => void }> = ({
  nextFormStep,
}) => {
  const snap = useSnapshot(StateHandler);
  console.log(snap.connected_registry.settings);
  return (
    <>
      <RegistryImageList
        registryType="ecr"
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

const Right = styled.div`
  text-align: right;
`;

const Br = styled.div`
  width: 100%;
  height: 15px;
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
