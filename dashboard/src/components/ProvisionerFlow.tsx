import React, { useState, useContext } from "react";
import styled from "styled-components";

import { integrationList } from "shared/common";
import { Context } from "shared/Context";
import api from "shared/api";

import ProvisionerForm from "components/ProvisionerForm";
import CloudFormationForm from "components/CloudFormationForm";
import CredentialsForm from "components/CredentialsForm";
import GCPCredentialsForm from "components/GCPCredentialsForm";
import Helper from "components/form-components/Helper";
import AzureCredentialForm from "components/AzureCredentialForm";
import AWSCostConsent from "./AWSCostConsent";
import AzureCostConsent from "./AzureCostConsent";
import GCPCostConsent from "./GCPCostConsent";
import { type Props } from "./porter-form/PorterFormContextProvider";

const providers = ["aws", "gcp", "azure"];



const ProvisionerFlow: React.FC<Props> = () => {
  const {
    currentProject,
  } = useContext(Context);
  const [currentStep, setCurrentStep] = useState("cloud");
  const [credentialId, setCredentialId] = useState("");
  const [showCostConfirmModal, setShowCostConfirmModal] = useState(false);
  const [useCloudFormationForm, setUseCloudFormationForm] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState("");

  const markStepCostConsent = async (step: string, provider: string): Promise<void> => {
    try {
      await api.updateOnboardingStep("<token>", { step, provider }, { project_id: currentProject.id });
    } catch (err) {
      ;
    }
  };

  const openCostConsentModal = (provider: string): void => {
    setSelectedProvider(provider);
    setShowCostConfirmModal(true);
    void markStepCostConsent("cost-consent-opened", provider);
  };

  if (currentStep === "cloud") {
    return (
      <>
        <StyledProvisionerFlow>
          <Helper>Select your hosting backend:</Helper>
          <BlockList>
            {providers.map((provider: string, i: number) => {
              const providerInfo = integrationList[provider];
              return (
                <Block
                  key={i}
                  disabled={
                    !currentProject?.multi_cluster &&
                    (provider === "gcp" && !currentProject?.azure_enabled)
                  }
                  onClick={() => {
                    if ((provider !== "gcp" || currentProject?.azure_enabled)) {
                      openCostConsentModal(provider);
                      // setSelectedProvider(provider);
                      // setCurrentStep("credentials");
                    }
                  }}
                >
                  <Icon src={providerInfo.icon} />
                  <BlockTitle>{providerInfo.label}</BlockTitle>
                  <BlockDescription>
                    {(provider === "gcp" && !currentProject?.azure_enabled) ? providerInfo.tagline : "Hosted in your own cloud"}
                  </BlockDescription>
                </Block>
              );
            })}
          </BlockList>
        </StyledProvisionerFlow>
        {showCostConfirmModal &&
          ((selectedProvider === "aws" && (
            <AWSCostConsent
              setCurrentStep={setCurrentStep}
              setShowCostConfirmModal={setShowCostConfirmModal}
              markCostConsentComplete={async () => {
                try {
                  void markStepCostConsent("cost-consent-complete", "aws");
                } catch (err) {

                }
                if (currentProject != null) {
                  try {
                    await api.inviteAdmin(
                      "<token>",
                      {},
                      { project_id: currentProject.id }
                    );
                  } catch (err) {
                  }
                }
              }}
            />
          )) ||
            ((selectedProvider === "gcp" && (
              <GCPCostConsent
                setCurrentStep={setCurrentStep}
                setShowCostConfirmModal={setShowCostConfirmModal}
                markCostConsentComplete={async () => {
                  try {
                    void markStepCostConsent("cost-consent-complete", "gcp");
                  } catch (err) {
                  }
                  if (currentProject != null) {
                    try {
                      await api.inviteAdmin(
                        "<token>",
                        {},
                        { project_id: currentProject.id }
                      );
                    } catch (err) {

                    }
                  }
                }}
              />
            ))) ||
            (selectedProvider === "azure" && (
              <AzureCostConsent
                setCurrentStep={setCurrentStep}
                setShowCostConfirmModal={setShowCostConfirmModal}
                markCostConsentComplete={async () => {
                  try {
                    void markStepCostConsent("cost-consent-complete", "azure");
                  } catch (err) {

                  }
                  if (currentProject != null) {
                    try {
                      await api.inviteAdmin(
                        "<token>",
                        {},
                        { project_id: currentProject.id }
                      );
                    } catch (err) {

                    }
                  }
                }}
              />
            )))}
      </>
    );
  } else if (currentStep === "credentials") {
    if (selectedProvider === "aws") {
      if (useCloudFormationForm) {
        return (
          <CloudFormationForm
            goBack={() => { setCurrentStep("cloud"); }}
            proceed={(id: string) => {
              setCredentialId(id);
              setCurrentStep("cluster");
            }}
            switchToCredentialFlow={() => { setUseCloudFormationForm(false); }}
          />
        );
      } else {
        return (
          <CredentialsForm
            goBack={() => { setCurrentStep("cloud"); }}
            proceed={(id: string) => {
              setCredentialId(id);
              setCurrentStep("cluster");
            }}
          />
        );
      }
    } else if (selectedProvider === "azure") {
      return (
        <AzureCredentialForm
          goBack={() => { setCurrentStep("cloud"); }}
          proceed={(id: string) => {
            setCredentialId(id);
            setCurrentStep("cluster");
          }}
        />
      );
    } else if (selectedProvider === "gcp") {
      return (
        <GCPCredentialsForm
          goBack={() => { setCurrentStep("cloud"); }}
          proceed={(id: string) => {
            setCredentialId(id);
            setCurrentStep("cluster");
          }}
        />
      );
    }
    return null;
  } else if (currentStep === "cluster") {
    return (
      <ProvisionerForm
        goBack={() => { setCurrentStep("credentials"); }}
        credentialId={credentialId}
        provider={selectedProvider}
      />
    );
  }
  return null;
};

export default ProvisionerFlow;


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
