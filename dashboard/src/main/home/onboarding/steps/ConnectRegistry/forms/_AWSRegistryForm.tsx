import InputRow from "components/form-components/InputRow";
import SelectRow from "components/form-components/SelectRow";
import SaveButton from "components/SaveButton";
import React, { useState } from "react";
import api from "shared/api";

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

export const CredentialsForm: React.FC<{ nextFormStep: () => void }> = ({
  nextFormStep,
}) => {
  const [accessId, setAccessId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [buttonStatus, setButtonStatus] = useState("");

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
    // TODO: Ask alex how to request the aws_integration_id on this step
    nextFormStep();
  };

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

export const SettingsForm: React.FC<{ nextFormStep: () => void }> = ({
  nextFormStep,
}) => {
  const [registryName, setRegistryName] = useState("");
  const [awsRegion, setAWSRegion] = useState("us-east-1");
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

    nextFormStep();
  };

  return (
    <>
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
      <SelectRow
        options={regionOptions}
        width="100%"
        value={awsRegion}
        dropdownMaxHeight="240px"
        setActiveValue={(x: string) => {
          setAWSRegion(x);
        }}
        label="📍 AWS Region"
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

export const TestRegistryConnection: React.FC<{ nextFormStep: () => void }> = ({
  nextFormStep,
}) => {
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
