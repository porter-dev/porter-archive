import React, { useContext, useEffect, useState } from "react";
import InputRow from "components/form-components/InputRow";
import SelectRow from "components/form-components/SelectRow";
import SaveButton from "components/SaveButton";

import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import { Operation, OperationStatus, OperationType } from "shared/types";
import { readableDate } from "shared/string_utils";
import Placeholder from "components/Placeholder";

type Props = {
  setCreatedCredential: (aws_integration_id: number) => void;
  cancel: () => void;
};

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

const AWSCredentialForm: React.FunctionComponent<Props> = ({
  setCreatedCredential,
}) => {
  const { currentProject, setCurrentError } = useContext(Context);
  const [accessId, setAccessId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [assumeRoleArn, setAssumeRoleArn] = useState("");
  const [buttonStatus, setButtonStatus] = useState("");
  const [awsRegion, setAWSRegion] = useState("us-east-1");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const submit = () => {
    setIsLoading(true);

    api
      .createAWSIntegration(
        "<token>",
        {
          aws_region: awsRegion,
          aws_access_key_id: accessId,
          aws_secret_access_key: secretKey,
          aws_assume_role_arn: assumeRoleArn,
        },
        {
          id: currentProject.id,
        }
      )
      .then(({ data }) => {
        setCreatedCredential(data.id);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setHasError(true);
        setCurrentError(err.response?.data?.error);
        setIsLoading(false);
      });
  };

  if (hasError) {
    return <Placeholder>Error</Placeholder>;
  }

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

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
      <InputRow
        type="text"
        value={assumeRoleArn}
        setValue={(x: string) => {
          setAssumeRoleArn(x);
        }}
        label="👤 (Optional) AWS Assume Role ARN"
        placeholder="ex: arn:aws:iam::01234567890:role/my_assumed_role"
        width="100%"
        isRequired={false}
      />
      <Flex>
        <SaveButton
          text="Continue"
          disabled={false}
          onClick={submit}
          makeFlush={true}
          clearPosition={true}
          status={buttonStatus}
          statusPosition={"right"}
        />
      </Flex>
    </>
  );
};

export default AWSCredentialForm;

const Flex = styled.div`
  display: flex;
  color: #ffffff;
  align-items: center;
  margin-top: 30px;
  > i {
    color: #aaaabb;
    font-size: 20px;
    margin-right: 10px;
  }
`;
