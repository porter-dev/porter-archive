import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import { v4 as uuidv4 } from 'uuid';

import api from "shared/api";
import aws from "assets/aws.png";

import { Context } from "shared/Context";

import Text from "./porter/Text";
import Spacer from "./porter/Spacer";
import InputRow from "./form-components/InputRow";
import SaveButton from "./SaveButton";
import Fieldset from "./porter/Fieldset";
import Input from "./porter/Input";
import Button from "./porter/Button";
import DocsHelper from "./DocsHelper";
import Error from "./porter/Error";
import Step from "./porter/Step";
import Link from "./porter/Link";

type Props = {
  goBack: () => void;
  proceed: (id: string) => void;
  switchToCredentialFlow: () => void;
};

const PORTER_ASSUME_ROLE_ARN = "arn:aws:iam::108458755588:role/CAPIManagement";

const CloudFormationForm: React.FC<Props> = ({
  goBack,
  proceed,
  switchToCredentialFlow
}) => {
  const [grantPermissionsError, setGrantPermissionsError] = useState("");
  const [roleStatus, setRoleStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [AWSAccountID, setAWSAccountID] = useState("");
  const { currentProject } = useContext(Context);

  const getExternalId = () => {
    let externalId = localStorage.getItem(AWSAccountID)
    console.log(externalId)
    if (!externalId) {
      externalId = uuidv4()
      localStorage.setItem(AWSAccountID, externalId);
    }

    return externalId
  }

  const checkIfRoleExists = async () => {
    let externalId = getExternalId();
    let targetARN = `arn:aws:iam::${AWSAccountID}:role/porter-manager`

    setRoleStatus("loading");
    setErrorMessage(undefined)
    try {
      await api
        .createAWSIntegration(
          "<token>",
          {
            aws_target_arn: targetARN,
            aws_external_id: externalId,
          },
          {
            id: currentProject.id,
          }
        );
      setRoleStatus("successful")
      proceed(targetARN);
    } catch (err) {
      console.log(err);
      setRoleStatus("");
      setErrorMessage("Porter could not access your AWS account. Please make sure you have granted permissions and try again.")
    }
  };

  const directToCloudFormation = () => {
    let externalId = getExternalId();
    window.open(
      `https://console.aws.amazon.com/cloudformation/home?
      #/stacks/create/review?templateURL=https://porter-role.s3.us-east-2.amazonaws.com/cloudformation-policy.json&stackName=PorterRole&param_ExternalIdParameter=${externalId}&param_PorterAssumeRoleParameter=${PORTER_ASSUME_ROLE_ARN}`
    )
  }

  const renderContent = () => {
    return (
      <>
        <Spacer y={1} />
        <Fieldset>
          <Text size={16}>
            Log in to AWS and "Create stack"
          </Text>
          <Spacer height="15px" />
          <Text color="helper">
            Provide your AWS account ID to log in and grant Porter access to AWS by clicking 'Grant permissions' below.
          </Text>
          <Text color="helper">
            You will need to select "Create stack" after being redirected to the AWS console.
          </Text>
          <Spacer y={1} />
          <Input
            label={
              <Flex>
                👤 AWS account ID
                <i
                  className="material-icons"
                  onClick={() => {
                    window.open("https://console.aws.amazon.com/billing/home?region=us-east-1#/account", "_blank")
                  }}
                >
                  help_outline
                </i>
              </Flex>
            }
            value={AWSAccountID}
            setValue={(e) => {
              if (e === "open-sesame") {
                switchToCredentialFlow();
              }
              setGrantPermissionsError("");
              setAWSAccountID(e.trim());
            }}
            placeholder="ex: 915037676314"
          />
          <Spacer y={1} />
          <Button
            onClick={() => {
              if (AWSAccountID.length === 12 && !isNaN(Number(AWSAccountID))) {
                directToCloudFormation();
              } else {
                setGrantPermissionsError("Invalid AWS account ID");
              }
            }}
            status={
              grantPermissionsError && (
                <Error message={grantPermissionsError} />
              )
            }
            color="#1E2631"
            withBorder
          >
            <ButtonImg src={aws} /> Grant permissions
          </Button>
          <Spacer y={1} />
          <Text color="helper">
            Make sure that the stack status has changed from "CREATE_IN_PROGRESS" to "CREATE_COMPLETE" before clicking Continue below.
          </Text>
        </Fieldset>
        <Spacer y={1} />
        <Button
          onClick={() => {
            checkIfRoleExists()
          }}
          status={
            errorMessage ? (
              <Error
                message={errorMessage}
                ctaText="Troubleshooting steps"
                errorModalContents={
                  <>
                    <Text size={16}>Granting Porter access to AWS</Text>
                    <Spacer y={1} />
                    <Text color="helper">
                      Porter needs access to your AWS account in order to create infrastructure. You can grant Porter access to AWS by following these steps:
                    </Text>
                    <Spacer y={1} />
                    <Step number={1}>
                      <Link to="https://aws.amazon.com/resources/create-account/" target="_blank">
                        Create an AWS account
                      </Link>
                      <Spacer inline width="5px" />
                      if you don't already have one.
                    </Step>
                    <Spacer y={1} />
                    <Step number={2}>
                      Once you are logged in to your AWS account,
                      <Spacer inline width="5px" />
                      <Link to="https://console.aws.amazon.com/billing/home?region=us-east-1#/account" target="_blank">
                        copy your account ID
                      </Link>.
                    </Step>
                    <Spacer y={1} />
                    <Step number={3}>Fill in your account ID on Porter and select "Grant permissions".</Step>
                    <Spacer y={1} />
                    <Step number={4}>After being redirected to AWS, select "Create stack" on the AWS console.</Step>
                    <Spacer y={1} />
                    <Step number={5}>Wait until the stack status has changed from "CREATE_IN_PROGRESS" to "CREATE_COMPLETE".</Step>
                    <Spacer y={1} />
                    <Step number={6}>Return to Porter and select "Continue".</Step>
                  </>
                }
              />
            ) : (
              roleStatus
            )
          }
        >
          Continue
        </Button>
      </>
    );
  }

  return (
    <>
      <Text size={16}>
        <BackButton width="140px" onClick={goBack}>
          <i className="material-icons">first_page</i>
          Select cloud
        </BackButton>
        <Spacer x={1} inline />
        <Img src={aws} />
        Grant AWS permissions
      </Text>
      <Spacer y={1} />
      <Text color="helper">
        Grant Porter permissions to create infrastructure in your AWS account.
      </Text>
      {renderContent()}
    </>
  );
};

export default CloudFormationForm;

const Flex = styled.div`
  display: flex;
  ailgn-items: center;
  > i {
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
  }
`;

const ButtonImg = styled.img`
  height: 14px;
  margin-right: 12px;
`;

const Img = styled.img`
  height: 18px;
  margin-right: 15px;
`;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 13px;
  height: 35px;
  padding: 5px 13px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
    margin-left: -2px;
  }
`;