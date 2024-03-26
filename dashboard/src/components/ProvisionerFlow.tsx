import React, { useContext, useMemo, useState } from "react";
import styled from "styled-components";

import AzureCredentialForm from "components/AzureCredentialForm";
import CloudFormationForm from "components/CloudFormationForm";
import CredentialsForm from "components/CredentialsForm";
import Helper from "components/form-components/Helper";
import GCPCredentialsForm from "components/GCPCredentialsForm";
import ProvisionerForm from "components/ProvisionerForm";

import api from "shared/api";
import { integrationList } from "shared/common";
import { Context } from "shared/Context";

import AWSCostConsent from "./AWSCostConsent";
import AzureCostConsent from "./AzureCostConsent";
import GCPCostConsent from "./GCPCostConsent";
import Button from "./porter/Button";
import DashboardPlaceholder from "./porter/DashboardPlaceholder";
import Link from "./porter/Link";
import Spacer from "./porter/Spacer";
import Text from "./porter/Text";

const providers = ["aws", "gcp", "azure"];

type Props = {};

const ProvisionerFlow: React.FC<Props> = ({}) => {
  const { usage, hasBillingEnabled, currentProject, featurePreview } =
    useContext(Context);
  const [currentStep, setCurrentStep] = useState("cloud");
  const [credentialId, setCredentialId] = useState("");
  const [showCostConfirmModal, setShowCostConfirmModal] = useState(false);
  const [confirmCost, setConfirmCost] = useState("");
  const [useCloudFormationForm, setUseCloudFormationForm] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState("");

  const markStepCostConsent = async (step: string, provider: string) => {
    try {
      await api.updateOnboardingStep(
        "<token>",
        { step, provider },
        { project_id: currentProject.id }
      );
    } catch (err) {
      console.log(err);
    }
  };

  const openCostConsentModal = (provider: string) => {
    setSelectedProvider(provider);
    setShowCostConfirmModal(true);
    markStepCostConsent("cost-consent-opened", provider);
  };

  if (currentStep === "cloud") {
    return (
      <>
        <StyledProvisionerFlow>
          <BlockList>
            {providers.map((provider: string, i: number) => {
              const providerInfo = integrationList[provider];
              return (
                <Block
                  key={i}
                  disabled={
                    !currentProject?.multi_cluster &&
                    provider === "gcp" &&
                    !currentProject?.azure_enabled
                  }
                  onClick={() => {
                    if (provider != "gcp" || currentProject?.azure_enabled) {
                      openCostConsentModal(provider);
                      // setSelectedProvider(provider);
                      // setCurrentStep("credentials");
                    }
                  }}
                >
                  <Icon src={providerInfo.icon} />
                  <BlockTitle>{providerInfo.label}</BlockTitle>
                  <BlockDescription>
                    {provider === "gcp" && !currentProject?.azure_enabled
                      ? providerInfo.tagline
                      : "Hosted in your own cloud"}
                  </BlockDescription>
                </Block>
              );
            })}
          </BlockList>
          <DashboardPlaceholder>
            <Text size={16}>
              Want to test Porter without linking your own cloud account?
            </Text>
            <Spacer y={0.5} />
            <Text color={"helper"}>
              Get started on the Porter Cloud.
            </Text>
            <Spacer y={1} />
            <Link to="https://cloud.porter.run">
              <Button alt height="35px">
                Deploy on the Porter Cloud <Spacer inline x={1} />{" "}
                <i className="material-icons" style={{ fontSize: "18px" }}>
                  east
                </i>
              </Button>
            </Link>
          </DashboardPlaceholder>
        </StyledProvisionerFlow>
        {showCostConfirmModal &&
          ((selectedProvider === "aws" && (
            <AWSCostConsent
              setCurrentStep={setCurrentStep}
              setShowCostConfirmModal={setShowCostConfirmModal}
              markCostConsentComplete={() => {
                try {
                  markStepCostConsent("cost-consent-complete", "aws");
                } catch (err) {
                  console.log(err);
                }

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
              }}
            />
          )) ||
            (selectedProvider === "gcp" && (
              <GCPCostConsent
                setCurrentStep={setCurrentStep}
                setShowCostConfirmModal={setShowCostConfirmModal}
                markCostConsentComplete={() => {
                  try {
                    markStepCostConsent("cost-consent-complete", "gcp");
                  } catch (err) {
                    console.log(err);
                  }

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
                }}
              />
            )) ||
            (selectedProvider === "azure" && (
              <AzureCostConsent
                setCurrentStep={setCurrentStep}
                setShowCostConfirmModal={setShowCostConfirmModal}
                markCostConsentComplete={() => {
                  try {
                    markStepCostConsent("cost-consent-complete", "azure");
                  } catch (err) {
                    console.log(err);
                  }
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
                }}
              />
            )))}
      </>
    );
  } else if (currentStep === "credentials") {
    return (
      (selectedProvider === "aws" &&
        (useCloudFormationForm ? (
          <CloudFormationForm
            goBack={() => {
              setCurrentStep("cloud");
            }}
            proceed={(id) => {
              setCredentialId(id);
              setCurrentStep("cluster");
            }}
            switchToCredentialFlow={() => {
              setUseCloudFormationForm(false);
            }}
          />
        ) : (
          <CredentialsForm
            goBack={() => {
              setCurrentStep("cloud");
            }}
            proceed={(id) => {
              setCredentialId(id);
              setCurrentStep("cluster");
            }}
          />
        ))) ||
      (selectedProvider === "azure" && (
        <AzureCredentialForm
          goBack={() => {
            setCurrentStep("cloud");
          }}
          proceed={(id) => {
            setCredentialId(id);
            setCurrentStep("cluster");
          }}
        />
      )) ||
      (selectedProvider === "gcp" && (
        <GCPCredentialsForm
          goBack={() => {
            setCurrentStep("cloud");
          }}
          proceed={(id) => {
            setCredentialId(id);
            setCurrentStep("cluster");
          }}
        />
      ))
    );
  } else if (currentStep === "cluster") {
    return (
      <ProvisionerForm
        goBack={() => {
          setCurrentStep("credentials");
        }}
        credentialId={credentialId}
        provider={selectedProvider}
      />
    );
  }
};

export default ProvisionerFlow;

const Cost = styled.div`
  font-weight: 600;
  font-size: 20px;
`;

const Tab = styled.span`
  margin-left: 20px;
  height: 1px;
`;

const BlockList = styled.div`
  overflow: visible;
  margin-top: 25px;
  margin-bottom: 27px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const Icon = styled.img<{ bw?: boolean }>`
  height: 30px;
  margin-top: 30px;
  margin-bottom: 15px;
  filter: ${(props) => (props.bw ? "grayscale(1)" : "")};
`;

const BlockDescription = styled.div`
  margin-bottom: 12px;
  color: #ffffff66;
  text-align: center;
  font-weight: 400;
  font-size: 13px;
  padding: 0px 25px;
  height: 2.4em;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const BlockTitle = styled.div`
  margin-bottom: 12px;
  width: 80%;
  text-align: center;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Block = styled.div<{ disabled?: boolean }>`
  align-items: center;
  user-select: none;
  display: flex;
  font-size: 13px;
  overflow: hidden;
  font-weight: 500;
  padding: 3px 0px 5px;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 170px;
  filter: ${({ disabled }) => (disabled ? "brightness(0.8) grayscale(1)" : "")};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  color: #ffffff;
  position: relative;
  border-radius: 5px;
  background: ${({ theme }) => theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: ${(props) => (props.disabled ? "" : "1px solid #7a7b80")};
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const StyledProvisionerFlow = styled.div`
  margin-top: -24px;
`;
