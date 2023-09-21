import React, { useState, useContext, useMemo } from "react";
import styled from "styled-components";
import { v4 as uuidv4 } from 'uuid';

import api from "shared/api";
import aws from "assets/aws.png";
import cloudformationStatus from "assets/cloud-formation-stack-complete.png";

import { Context } from "shared/Context";

import Text from "./porter/Text";
import Spacer from "./porter/Spacer";
import Input from "./porter/Input";
import Button from "./porter/Button";
import Link from "./porter/Link";
import Container from "./porter/Container";
import Step from "./porter/Step";
import { Box, Step as MuiStep, StepContent, StepLabel, Stepper, ThemeProvider, Typography, createTheme } from "@material-ui/core";
import { useQuery } from "@tanstack/react-query";
import Modal from "./porter/Modal";
import theme from "shared/themes/midnight";
import VerticalSteps from "./porter/VerticalSteps";

type Props = {
  goBack: () => void;
  proceed: (id: string) => void;
  switchToCredentialFlow: () => void;
};

const stepperTheme = createTheme({
  palette: {
    background: {
      paper: 'none',
    },
    text: {
      primary: '#DFDFE1',
      secondary: '#aaaabb',
    },
    action: {
      active: '#001E3C',
    },
  },
  typography: {
    fontFamily: "Work Sans, sans-serif",
  },
  overrides: {
    MuiStepIcon: {
      root: {
        '&$completed': {
          color: theme.button,
        },
        '&$active': {
          color: theme.button,
        },
      },
    },
  },
});

const CloudFormationForm: React.FC<Props> = ({
  goBack,
  proceed,
  switchToCredentialFlow
}) => {
  const [AWSAccountID, setAWSAccountID] = useState("");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [hasClickedCloudformationButton, setHasClickedCloudformationButton] = useState(false);
  const [showNeedHelpModal, setShowNeedHelpModal] = useState(false);

  const { currentProject, user } = useContext(Context);
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
      if (currentProject == null) {
        return;
      }
      await api.updateOnboardingStep("<token>", { step, account_id, cloudformation_url, error_message, login_url, external_id }, {
        project_id: currentProject.id,
      });
    } catch (err) {
      // console.log(err);
    }
  };

  const { data: canProceed } = useQuery(
    ["createAWSIntegration", currentStep, hasClickedCloudformationButton, AWSAccountID],
    async () => {
      if (currentProject == null) {
        return false;
      };
      let externalId = getExternalId();
      let targetARN = `arn:aws:iam::${AWSAccountID}:role/porter-manager`
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
      return true;
    },
    {
      enabled: currentStep === 2,
      retry: (failureCount, err) => {
        // if they've waited over 35 seconds notify us on slack. Cloudformation stack should only take around 20-25 seconds to create
        if (failureCount === 7 && hasClickedCloudformationButton) {
          reportFailedCreateAWSIntegration();
        }
        return true;
      },
      retryDelay: 5000,
    }
  )

  const awsAccountIdInputError = useMemo(() => {
    const regex = /^\d{12}$/;
    if (AWSAccountID.trim().length === 0) {
      return undefined;
    } else if (!regex.test(AWSAccountID)) {
      return 'A valid AWS Account ID must be a 12-digit number.';
    }
    return undefined;
  }, [AWSAccountID]);

  const handleAWSAccountIDChange = (accountId: string) => {
    setAWSAccountID(accountId);
    setHasClickedCloudformationButton(false);
    if (accountId === "open-sesame") {
      switchToCredentialFlow();
    }
  };

  const handleContinueWithAWSAccountId = () => {
    setCurrentStep(2);
    markStepStarted({ step: "aws-account-id-complete", account_id: AWSAccountID });
  }

  const handleProceedToProvisionStep = () => {
    try {
      if (currentProject != null) {
        api.inviteAdmin(
          "<token>",
          {},
          { project_id: currentProject.id }
        );
      };
    } catch (err) {
      console.log(err);
    }
    markStepStarted({ step: "aws-create-integration-success", account_id: AWSAccountID })
    proceed(`arn:aws:iam::${AWSAccountID}:role/porter-manager`);

    try {
      window.dataLayer?.push({
        event: 'provision-attempt',
        data: {
          cloud: 'aws',
          email: user?.email
        }
      });
    } catch (err) {
      console.log(err);
    }
  }

  const reportFailedCreateAWSIntegration = () => {
    markStepStarted({ step: "aws-create-integration-failed", account_id: AWSAccountID, external_id: getExternalId() })
  }

  const getExternalId = () => {
    let externalId = localStorage.getItem(AWSAccountID)
    if (!externalId) {
      externalId = uuidv4()
      localStorage.setItem(AWSAccountID, externalId);
    }

    return externalId
  }

  const directToAWSLogin = () => {
    const login_url = `https://signin.aws.amazon.com/console`;
    markStepStarted({ step: "aws-login-redirect-success", login_url });
    window.open(login_url, "_blank");
  }

  const directToCloudFormation = () => {
    const externalId = getExternalId();
    let trustArn = process.env.TRUST_ARN ? process.env.TRUST_ARN : "arn:aws:iam::108458755588:role/CAPIManagement";
    const cloudformation_url = `https://console.aws.amazon.com/cloudformation/home?#/stacks/create/review?templateURL=https://porter-role.s3.us-east-2.amazonaws.com/cloudformation-policy.json&stackName=PorterRole&param_ExternalIdParameter=${externalId}&param_TrustArnParameter=${trustArn}`
    markStepStarted({ step: "aws-cloudformation-redirect-success", account_id: AWSAccountID, cloudformation_url, external_id: externalId })
    window.open(cloudformation_url, "_blank")
    setHasClickedCloudformationButton(true);
  }

  const renderContent = () => {
    return (
      <>
        <Text>Grant Porter permissions to create infrastructure in your AWS account by following 3 simple steps.</Text>
        <Spacer y={1} />
        <VerticalSteps
          onlyShowCurrentStep={true}
          currentStep={currentStep}
          steps={[
            <>
              <Text size={16}>Log in to your AWS account</Text>
              <Spacer y={.5} />
              <Text color="helper">
                Return to Porter after successful login.
              </Text>
              <Spacer y={.5} />
              <AWSButtonContainer>
                <ButtonImg src={aws} />
                <Button
                  width={"170px"}
                  onClick={directToAWSLogin}
                  color="linear-gradient(180deg, #26292e, #24272c)"
                  withBorder
                >
                  Log in
                </Button>
              </AWSButtonContainer>
              <Spacer y={1} />
              <Button onClick={() => setCurrentStep(1)}>
                Continue
              </Button>
            </>,
            <>
              <Text size={16}>Enter your AWS account ID</Text>
              <Spacer y={.5} />
              <Text color="helper">
                Make sure this is the ID of the account you are currently logged into and would like to provision resources in.
              </Text>
              <Spacer y={.5} />
              <Input
                label={
                  <Flex>
                    👤 AWS account ID
                    <i
                      className="material-icons"
                      onClick={() => {
                        window.open("https://us-east-1.console.aws.amazon.com/billing/home?region=us-east-1#/account", "_blank")
                      }}
                    >
                      help_outline
                    </i>
                  </Flex>
                }
                value={AWSAccountID}
                setValue={handleAWSAccountIDChange}
                placeholder="ex: 915037676314"
                error={awsAccountIdInputError}
              />
              <Spacer y={1} />
              <StepChangeButtonsContainer>
                <Button onClick={handleContinueWithAWSAccountId} disabled={awsAccountIdInputError != null || AWSAccountID.length === 0}>Continue</Button>
                <Spacer inline x={0.5} />
                <Button onClick={() => setCurrentStep(0)} color="#222222">Back</Button>
              </StepChangeButtonsContainer>
            </>,
            <>
              <Text size={16}>Create an AWS Cloudformation stack</Text>
              <Spacer y={.5} />
              <Text color="helper">
                This grants Porter permissions to create infrastructure in your account.
              </Text>
              <Spacer y={.5} />
              <Text color="helper">
                Clicking the button below will take you to the AWS CloudFormation console. Return to Porter after clicking 'Create stack' in the bottom right corner.
              </Text>
              <Spacer y={.5} />
              <AWSButtonContainer>
                <ButtonImg src={aws} />
                <Button
                  width={"170px"}
                  onClick={directToCloudFormation}
                  color="linear-gradient(180deg, #26292e, #24272c)"
                  withBorder
                  disabled={canProceed}
                  disabledTooltipMessage={"Porter can already access your account!"}
                >
                  Grant permissions
                </Button>
              </AWSButtonContainer>
              <Spacer y={1} />
              <StepChangeButtonsContainer>
                <Button onClick={() => setCurrentStep(3)} disabled={!canProceed}>Continue</Button>
                <Spacer inline x={0.5} />
                <Button
                  onClick={() => setCurrentStep(1)}
                  color="#222222"
                  status={canProceed ? "success" : hasClickedCloudformationButton ? "loading" : undefined}
                  loadingText={`Checking if Porter can access AWS account ID ${AWSAccountID}...`}
                  successText={`Porter can access AWS account ID ${AWSAccountID}`}
                >
                  Back
                </Button>
              </StepChangeButtonsContainer>
            </>,
            <>
              <Text size={16}>Permission checks</Text>
              <Spacer y={.5} />
              <Text color="helper">
                Checking if Porter can access AWS account with ID {AWSAccountID}. This can take up to a minute.<Spacer inline width="10px" /><Link hasunderline onClick={() => setShowNeedHelpModal(true)}>
                  Need help?
                </Link>
              </Text>
              <Spacer y={1} />
              <Container row>
                <Button
                  onClick={handleProceedToProvisionStep}
                  disabled={!canProceed}
                >
                  Continue
                </Button>
                <Spacer inline x={0.5} />
                <Button onClick={() => setCurrentStep(2)} color="#222222">Back</Button>
              </Container>
            </>,
          ]}
        />
        {showNeedHelpModal &&
          <Modal closeModal={() => setShowNeedHelpModal(false)} width={"800px"}>
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
            <Step number={4}>After being redirected to AWS CloudFormation, select "Create stack" on the bottom right.</Step>
            <Spacer y={1} />
            <Step number={5}>The stack will start to create. Refresh until the stack status has changed from "CREATE_IN_PROGRESS" to "CREATE_COMPLETE":</Step>
            <Spacer y={1} />
            <ImageDiv>
              <img src={cloudformationStatus} height="250px" />
            </ImageDiv>
            <Spacer y={1} />
            <Step number={6}>Return to Porter and select "Continue".</Step>
            <Spacer y={1} />
            <Step number={7}>If you continue to see issues, <a href="mailto:support@porter.run">email support.</a></Step>
          </Modal>
        }
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

const ImageDiv = styled.div`
  text-align: center;
`;

const StepChangeButtonsContainer = styled.div`
  display: flex;
`;

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
