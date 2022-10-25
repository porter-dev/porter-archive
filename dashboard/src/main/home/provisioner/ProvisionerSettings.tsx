import React, {
  Component,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import { integrationList } from "shared/common";
import { InfraType } from "shared/types";

import Helper from "components/form-components/Helper";
import AWSFormSection from "./AWSFormSection";
import GCPFormSection from "./GCPFormSection";
import DOFormSection from "./DOFormSection";
import AzureFormSection from "./AzureFormSection";
import SaveButton from "components/SaveButton";
import ExistingClusterSection from "./ExistingClusterSection";
import { useHistory, useLocation } from "react-router";
import { pushFiltered } from "shared/routing";
import azure from "assets/azure.png";

type Props = {
  isInNewProject?: boolean;
  projectName?: string;
  infras?: InfraType[];
  provisioner?: boolean;
};

const providers = ["aws", "gcp"];

const ProvisionerSettings: React.FC<Props> = ({
  provisioner,
  projectName,
  infras,
  isInNewProject,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [highlightCosts, setHighlightCosts] = useState(true);

  const { setCurrentError, usage, hasBillingEnabled } = useContext(Context);
  const location = useLocation();
  const history = useHistory();

  useEffect(() => {
    if (!provisioner) {
      handleSelectProvider("skipped");
    }
  }, [provisioner]);

  const isUsageExceeded = useMemo(() => {
    if (!hasBillingEnabled) {
      return false;
    }
    return usage.current.clusters >= usage.limit.clusters;
  }, [usage]);

  const handleSelectProvider = (newSelectedProvider: string) => {
    if (!isInNewProject) {
      setSelectedProvider(newSelectedProvider);
      return;
    }
    if (newSelectedProvider === selectedProvider) {
      return;
    }

    if (selectedProvider && !newSelectedProvider) {
      window?.analytics?.track("provision_unselect-provider", {
        unselectedProvider: selectedProvider,
      });
      setSelectedProvider(newSelectedProvider);
      return;
    }

    window?.analytics?.track("provision_select-provider", {
      selectedProvider: newSelectedProvider,
    });
    setSelectedProvider(newSelectedProvider);
  };

  const handleError = () => {
    handleSelectProvider(null);

    setCurrentError(
      "Provisioning failed. Check your credentials and try again."
    );
    pushFiltered({ location, history }, "/dashboard", ["project_id"], {
      tab: "overview",
    });
  };

  const trackOnSave = (provider: string) => {
    window?.analytics?.track("provision_created-project", {
      choosenProvider: provider,
    });
  };

  const renderSkipHelper = () => {
    if (!provisioner) {
      return;
    }

    return (
      <>
        {selectedProvider === "skipped" ? (
          <Helper>
            Don't have a Kubernetes cluster?
            <Highlight onClick={() => handleSelectProvider(null)}>
              Provision through Porter
            </Highlight>
          </Helper>
        ) : (
          <PositionWrapper selectedProvider={selectedProvider}>
            <Helper>
              Already have a Kubernetes cluster?
              <Highlight onClick={() => handleSelectProvider("skipped")}>
                Skip
              </Highlight>
            </Helper>
          </PositionWrapper>
        )}
      </>
    );
  };

  const renderSelectedProvider = (override?: string) => {
    let currentSelectedProvider = selectedProvider;
    if (override) {
      currentSelectedProvider = override;
    }

    if (selectedProvider === "aws") {
      return (
        <AWSFormSection
          handleError={handleError}
          projectName={projectName}
          infras={infras}
          highlightCosts={highlightCosts}
          setSelectedProvisioner={(x: string | null) => {
            handleSelectProvider(x);
          }}
          trackOnSave={() => trackOnSave(selectedProvider)}
        >
          {renderSkipHelper()}
        </AWSFormSection>
      );
    }

    if (selectedProvider === "gcp") {
      return (
        <GCPFormSection
          handleError={handleError}
          projectName={projectName}
          infras={infras}
          highlightCosts={highlightCosts}
          setSelectedProvisioner={(x: string | null) => {
            handleSelectProvider(x);
          }}
          trackOnSave={() => trackOnSave(selectedProvider)}
        >
          {renderSkipHelper()}
        </GCPFormSection>
      );
    }

    if (selectedProvider === "azure") {
      return (
        <AzureFormSection
          handleError={handleError}
          projectName={projectName}
          infras={infras}
          highlightCosts={highlightCosts}
          setSelectedProvisioner={(x: string | null) => {
            handleSelectProvider(x);
          }}
          trackOnSave={() => trackOnSave(selectedProvider)}
        />
      );
    }

    if (selectedProvider === "do") {
      return (
        <DOFormSection
          handleError={handleError}
          projectName={projectName}
          infras={infras}
          highlightCosts={highlightCosts}
          setSelectedProvisioner={(x: string | null) => {
            handleSelectProvider(x);
          }}
          trackOnSave={() => trackOnSave(selectedProvider)}
        />
      );
    }

    return (
      <ExistingClusterSection
        projectName={projectName}
        trackOnSave={() => trackOnSave(selectedProvider)}
      >
        {renderSkipHelper()}
      </ExistingClusterSection>
    );
  };

  const renderFooter = () => {
    let helper = provisioner
      ? "Note: Provisioning can take up to 15 minutes"
      : "";

    if (isInNewProject && !selectedProvider) {
      return (
        <>
          <Helper>
            Already have a Kubernetes cluster?
            <Highlight onClick={() => handleSelectProvider("skipped")}>
              Skip
            </Highlight>
          </Helper>
          <Br />
          <SaveButton
            text="Submit"
            disabled={true}
            onClick={() => {}}
            makeFlush={true}
            helper={helper}
          />
        </>
      );
    }
  };

  const renderHelperText = () => {
    if (!provisioner) {
      return;
    }

    if (isInNewProject) {
      return (
        <>
          Select your hosting backend:<Required>*</Required>
        </>
      );
    } else {
      return "Need a cluster? Provision through Porter:";
    }
  };

  return (
    <StyledProvisionerSettings>
      <Helper>{renderHelperText()}</Helper>
      {!selectedProvider ? (
        <BlockList>
          {providers.map((provider: string, i: number) => {
            let providerInfo = integrationList[provider];
            return (
              <Block
                key={i}
                disabled={isUsageExceeded}
                onClick={() => {
                  if (!isUsageExceeded) {
                    handleSelectProvider(provider);
                    setHighlightCosts(false);
                  }
                }}
              >
                <Icon src={providerInfo.icon} />
                <BlockTitle>{providerInfo.label}</BlockTitle>
                <CostSection
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isUsageExceeded) {
                      handleSelectProvider(provider);
                      setHighlightCosts(true);
                    }
                  }}
                >
                  {/*
                  {provider == "aws" && "$205/Month"}
                  {provider == "gcp" && "$250/Month"}
                  {provider == "do" && "$90/Month"}
                  <InfoTooltip text={""} />
                  */}
                </CostSection>
                <BlockDescription>Hosted in your own cloud</BlockDescription>
              </Block>
            );
          })}
          {
            window.location.href.includes("dashboard.staging.getporter.dev") && (
              <Block
                key={3}
                disabled={isUsageExceeded}
                onClick={() => {
                  if (!isUsageExceeded) {
                    handleSelectProvider("azure");
                    setHighlightCosts(false);
                  }
                }}
              >
                <Icon src={azure} />
                <BlockTitle>Azure</BlockTitle>
                <BlockDescription>Hosted in your own cloud</BlockDescription>
              </Block>
            )
          }
        </BlockList>
      ) : (
        <>{renderSelectedProvider()}</>
      )}
      {renderFooter()}
    </StyledProvisionerSettings>
  );
};

export default ProvisionerSettings;

const Br = styled.div`
  width: 100%;
  height: 35px;
`;

const StyledProvisionerSettings = styled.div`
  position: relative;
  z-index: 0;
`;

const PositionWrapper = styled.div<{ selectedProvider: string | null }>``;

const Highlight = styled.div`
  margin-left: 5px;
  color: #8590ff;
  display: inline-block;
  cursor: pointer;
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

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
  display: inline-block;
`;

const Icon = styled.img<{ bw?: boolean }>`
  height: 42px;
  margin-top: 30px;
  margin-bottom: 15px;
  filter: ${(props) => (props.bw ? "grayscale(1)" : "")};
`;

const BlockDescription = styled.div`
  margin-bottom: 12px;
  color: #ffffff66;
  text-align: center;
  font-weight: default;
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
  filter: ${({ disabled }) => (disabled ? "grayscale(1)" : "")};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  color: #ffffff;
  position: relative;
  border-radius: 5px;
  background: #26292e;
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

const CostSection = styled.p`
  position: absolute;
  left: 0;
`;
