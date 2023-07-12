import React, { useState, useContext } from "react";
import styled from "styled-components";
import { v4 as uuidv4 } from 'uuid';

import api from "shared/api";
import aws from "assets/aws.png";

import { Context } from "shared/Context";

import Text from "./porter/Text";
import Spacer from "./porter/Spacer";
import Input from "./porter/Input";
import Button from "./porter/Button";
import Error from "./porter/Error";
import Step from "./porter/Step";
import Link from "./porter/Link";
import Container from "./porter/Container";
import VerticalSteps from "./porter/VerticalSteps";

type Props = {
  goBack: () => void;
  proceed: (id: string) => void;
  switchToCredentialFlow: () => void;
};

const CloudFormationForm: React.FC<Props> = ({
  goBack,
  proceed,
  switchToCredentialFlow
}) => {
  const [hasSentAWSNotif, setHasSentAWSNotif] = useState(false);
  const [roleStatus, setRoleStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [AWSAccountID, setAWSAccountID] = useState("");
  const [AWSAccountIDInputError, setAWSAccountIDInputError] = useState<string | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const { currentProject } = useContext(Context);
  const markStepStarted = async (
    {
      step,
      account_id = "",
      cloudformation_url = "",
      error_message = "",
      login_url = "",
      external_id = "",
    }:
      {
        step: string;
        account_id?: string;
        cloudformation_url?: string;
        error_message?: string;
        login_url?: string;
        external_id?: string;
      }
  ) => {
    try {
      await api.updateOnboardingStep("<token>", { step, account_id, cloudformation_url, error_message, login_url, external_id }, {});
    } catch (err) {
      // console.log(err);
    }
  };

  const getAccountIdInputError = (accountId: string) => {
    const regex = /^\d{12}$/;
    if (accountId === "") {
      return undefined;
    } else if (!regex.test(accountId)) {
      return 'A valid AWS Account ID must be a 12-digit number.';
    }
    return undefined;
  };

  const handleAWSAccountIDChange = (accountId: string) => {
    setAWSAccountID(accountId);
    if (accountId === "open-sesame") {
      switchToCredentialFlow();
    }
    // handle case where user resets the input to empty
    if (accountId.trim().length === 0) {
      setCurrentStep(0);
      setAWSAccountIDInputError(undefined);
      return;
    }
    const accountIdInputError = getAccountIdInputError(accountId);
    if (accountIdInputError == null) {
      setCurrentStep(1);
      if (!hasSentAWSNotif) {
        setHasSentAWSNotif(true);
        markStepStarted({ step: "aws-account-id-complete", account_id: accountId });
        if (currentProject != null) {
          try {
            api.inviteAdmin(
              "<token>",
              {},
              { project_id: currentProject.id }
            );
          } catch (err) {
            console.log(err);
          }
        }
      }
    } else {
      setCurrentStep(0);
    }
    setAWSAccountIDInputError(accountIdInputError);
  };

  const getExternalId = () => {
    let externalId = localStorage.getItem(AWSAccountID)
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
      if (currentProject == null) {
        setErrorMessage("Could not find current project.")
        return;
      };
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
      markStepStarted({ step: "aws-create-integration-success", account_id: AWSAccountID })
      proceed(targetARN);
    } catch (err) {
      setRoleStatus("");
      setErrorMessage("Porter could not access your AWS account. Please make sure you have granted permissions and try again.")
      markStepStarted({
        step: "aws-create-integration-failure",
        account_id: AWSAccountID,
        error_message: err?.response?.data?.error ??
          err?.toString() ?? "unable to determine error - check honeycomb",
        external_id: externalId,
      })
    }
  };

  const directToAWSLoginAndProceedStep = () => {
    const login_url = `https://${AWSAccountID}.signin.aws.amazon.com/console`;
    markStepStarted({ step: "aws-login-redirect-success", account_id: AWSAccountID, login_url })
    setCurrentStep(2);
    window.open(login_url, "_blank")
  }

  const directToCloudFormationAndProceedStep = () => {
    const externalId = getExternalId();
    let trustArn = process.env.TRUST_ARN ? process.env.TRUST_ARN : "arn:aws:iam::108458755588:role/CAPIManagement";
    const cloudformation_url = `https://console.aws.amazon.com/cloudformation/home?#/stacks/create/review?templateURL=https://porter-role.s3.us-east-2.amazonaws.com/cloudformation-policy.json&stackName=PorterRole&param_ExternalIdParameter=${externalId}&param_TrustArnParameter=${trustArn}`
    markStepStarted({ step: "aws-cloudformation-redirect-success", account_id: AWSAccountID, cloudformation_url, external_id: externalId })
    setCurrentStep(3);
    window.open(cloudformation_url, "_blank")
  }

  const renderContent = () => {
    return (
      <>
        <Text>Grant Porter permissions to create infrastructure in your AWS account by following 4 simple steps.</Text>
        <Spacer y={1} />
        <VerticalSteps
          currentStep={currentStep}
          steps={
            [
              <>
                <Text size={16}>1. Provide your AWS Account ID.</Text>
                <Spacer y={0.5} />
                <Input
                  label={
                    <Flex>
                      👤 AWS account ID
                      <i
                        className="material-icons"
                        onClick={() => {
                          window.open("https://docs.aws.amazon.com/IAM/latest/UserGuide/FindingYourAWSId.html", "_blank")
                        }}
                      >
                        help_outline
                      </i>
                    </Flex>
                  }
                  value={AWSAccountID}
                  setValue={handleAWSAccountIDChange}
                  placeholder="ex: 915037676314"
                  error={AWSAccountIDInputError}
                />
              </>,
              <>
                <Text size={16}>2. Log in to your AWS Account.</Text>
                <Spacer y={0.25} />
                <Text color="helper">Return to Porter after successful log-in.</Text>
                <Spacer y={0.5} />
                <AWSButtonContainer>
                  <ButtonImg src={aws} />
                  <Button
                    width={"170px"}
                    onClick={directToAWSLoginAndProceedStep}
                    color="#1E2631"
                    withBorder
                  >
                    Log in
                  </Button>
                </AWSButtonContainer>
                {/* escape hatch for dev use only */}
                {process.env.TRUST_ARN != null && process.env.TRUST_ARN !== "arn:aws:iam::108458755588:role/CAPIManagement" &&
                  <>
                    <Spacer y={0.5} />
                    <Link onClick={() => setCurrentStep(4)} hasunderline>Skip this step</Link>
                  </>
                }
              </>,
              <>
                <Text size={16}>3. Create an AWS Cloudformation Stack.</Text>
                <Spacer y={0.25} />
                <Text color="helper">This grants Porter permissions to create infrastructure.</Text>
                <Spacer y={0.25} />
                <Text color="helper">
                  Return to Porter once the stack status has changed from "CREATE_IN_PROGRESS" to "CREATE_COMPLETE".
                </Text>
                <Spacer y={0.5} />
                <AWSButtonContainer>
                  <ButtonImg src={aws} />
                  <Button
                    width={"170px"}
                    onClick={directToCloudFormationAndProceedStep}
                    color="#1E2631"
                    withBorder
                  >
                    Grant permissions
                  </Button>
                </AWSButtonContainer>
              </>,
              <>
                <Text size={16}>4. Continue to the provision step.</Text>
                <Spacer y={0.5} />
                <Button
                  width={"200px"}
                  onClick={checkIfRoleExists}
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
            ].filter(step => step != null)
          }
        />
      </>
    );
  }

  return (
    <>
      <Container row>
        <BackButton width="140px" onClick={goBack}>
          <i className="material-icons">first_page</i>
          Select cloud
        </BackButton>
        <Spacer x={1} inline />
        <Img src={aws} />
        <Text size={16}>
          Grant AWS permissions
        </Text>
      </Container>
      <Spacer y={1} />
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

const AWSButtonContainer = styled.div`
  display: flex;
  align-items: center;
  `;