import React, { useContext, useEffect, useMemo, useState } from "react";
import type { JsonValue } from "@bufbuild/protobuf";
import { Cluster, Contract, EKS, EKSLogging } from "@porter-dev/api-contracts";
import axios from "axios";
import styled from "styled-components";
import { match } from "ts-pattern";

import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Error from "components/porter/Error";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import ToggleRow from "components/porter/ToggleRow";

import api from "shared/api";
import { Context } from "shared/Context";
import sparkle from "assets/sparkle.svg";

type Props = {
  credentialId: string;
  provisionerError?: string;
  selectedClusterVersion: JsonValue;
};

const DEFAULT_ERROR_MESSAGE =
  "An error occurred while provisioning your infrastructure. Please try again.";

const Compliance: React.FC<Props> = (props) => {
  const { currentProject, currentCluster, setShouldRefreshClusters } =
    useContext(Context);

  const [cloudTrailEnabled, setCloudTrailEnabled] = useState(false);
  // const [cloudTrailRetention, setCloudTrailRetention] = useState(false);
  const [ecrScanningEnabled, setEcrScanningEnabled] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [kmsEnabled, setKmsEnabled] = useState(false);
  const [soc2Enabled, setSoc2Enabled] = useState(false);
  const [clusterRegion, setClusterRegion] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string>("");

  const applySettings = async (): Promise<void> => {
    if (!currentCluster || !currentProject || !setShouldRefreshClusters) {
      return;
    }

    try {
      setIsLoading(true);
      setIsClicked(true);
      setIsReadOnly(true);

      const contractResults = await api.getContracts(
        "<token>",
        { cluster_id: currentCluster.id },
        { project_id: currentProject.id }
      );

      if (contractResults.data.length === 0) {
        setErrorMessage("Unable to retrieve contract results");
        setErrorDetails("");
        return;
      }

      const result = contractResults.data.reduce(
        (prev: { CreatedAt: string }, current: { CreatedAt: string }) =>
          Date.parse(current.CreatedAt) > Date.parse(prev.CreatedAt)
            ? current
            : prev
      );

      const contract = createContract(result.base64_contract);

      await api.createContract("<token>", contract, {
        project_id: currentProject.id,
      });
      setShouldRefreshClusters(true);

      setIsClicked(false);
      setIsLoading(false);
      setIsReadOnly(false);
    } catch (err) {
      let errMessage =
        "Failed to provision cluster, please contact support@porter.run.";
      if (axios.isAxiosError(err) && err.response?.data) {
        errMessage = err.response.data.error.replace("unknown: ", "");
      }

      // hacky, need to standardize error contract with backend
      setIsClicked(false);
      setIsLoading(false);
      void markStepStarted("provisioning-failed", errMessage);

      // enable edit again only in the case of an error
      setIsClicked(false);
      setIsReadOnly(false);
    } finally {
      setIsLoading(false);
    }
  };

  const createContract = (base64Contract: string): Contract => {
    const contractData = JSON.parse(atob(base64Contract));
    const latestCluster: Cluster = Cluster.fromJson(contractData.cluster, {
      ignoreUnknownFields: true,
    });

    const updatedKindValues = match(latestCluster.kindValues)
      .with({ case: "eksKind" }, ({ value }) => ({
        value: new EKS({
          ...value,
          enableKmsEncryption: soc2Enabled || kmsEnabled || false,
          enableEcrScanning:
            soc2Enabled ||
            ecrScanningEnabled ||
            value.enableEcrScanning ||
            false,
          logging: new EKSLogging({
            enableApiServerLogs: soc2Enabled || cloudTrailEnabled || false,
            enableAuditLogs: soc2Enabled || cloudTrailEnabled || false,
            enableAuthenticatorLogs: soc2Enabled || cloudTrailEnabled || false,
            enableCloudwatchLogsToS3: soc2Enabled || cloudTrailEnabled || false,
            enableControllerManagerLogs:
              soc2Enabled || cloudTrailEnabled || false,
            enableSchedulerLogs: soc2Enabled || cloudTrailEnabled || false,
          }),
        }),
        case: "eksKind" as const,
      }))
      .with({ case: "gkeKind" }, ({ value }) => ({
        value,
        case: "gkeKind" as const,
      }))
      .with({ case: "aksKind" }, ({ value }) => ({
        value,
        case: "aksKind" as const,
      }))
      .with({ case: undefined }, () => ({
        value: undefined,
        case: undefined,
      }))
      .exhaustive();
    const cluster = new Cluster({
      ...latestCluster,
      kindValues: updatedKindValues,
    });

    return new Contract({
      cluster,
    });
  };

  const getStatus = (): JSX.Element | string => {
    if (isLoading) {
      return <Loading />;
    }
    if (isReadOnly && props.provisionerError === "") {
      return "Provisioning is still in progress...";
    } else if (errorMessage !== "") {
      return (
        <Error
          message={
            errorDetails !== ""
              ? errorMessage + " (" + errorDetails + ")"
              : errorMessage
          }
          ctaText={
            errorMessage !== DEFAULT_ERROR_MESSAGE
              ? "Troubleshooting steps"
              : undefined
          }
        />
      );
    }
    return "";
  };

  const isDisabled = (): boolean | undefined => {
    return (
      isUserProvisioning ||
      isClicked ||
      (currentCluster && !currentProject?.enable_reprovision)
    );
  };

  const markStepStarted = async (
    step: string,
    errMessage?: string
  ): Promise<void> => {
    try {
      await api.updateOnboardingStep(
        "<token>",
        {
          step,
          error_message: errMessage,
          region: clusterRegion,
          provider: "aws",
        },
        {
          project_id: currentProject ? currentProject.id : 0,
        }
      );
    } catch (err) {}
  };

  const isUserProvisioning = useMemo(() => {
    return isReadOnly && props.provisionerError === "";
  }, [isReadOnly, props.provisionerError]);

  useEffect(() => {
    const contract: Contract = Contract.fromJson(props.selectedClusterVersion, {
      ignoreUnknownFields: true,
    });

    if (contract.cluster && contract.cluster.kindValues.case === "eksKind") {
      const eksValues = contract.cluster.kindValues.value;
      const cloudTrailEnabled =
        eksValues.logging != null &&
        eksValues.logging.enableApiServerLogs &&
        eksValues.logging.enableAuditLogs &&
        eksValues.logging.enableAuthenticatorLogs &&
        eksValues.logging.enableControllerManagerLogs;

      setCloudTrailEnabled(cloudTrailEnabled);
      setClusterRegion(eksValues.region);
      setEcrScanningEnabled(eksValues.enableEcrScanning);
      setKmsEnabled(eksValues.enableKmsEncryption);

      setSoc2Enabled(
        cloudTrailEnabled &&
          eksValues.enableKmsEncryption &&
          eksValues.enableEcrScanning
      );
    }
  }, [props.selectedClusterVersion]);

  useEffect(() => {
    if (!currentCluster) {
      return;
    }

    setIsReadOnly(
      currentCluster.status === "UPDATING" ||
        currentCluster.status === "UPDATING_UNAVAILABLE"
    );
  }, []);

  useEffect(() => {
    if (soc2Enabled) {
      setCloudTrailEnabled(true);
      // setCloudTrailRetention(true);
      setEcrScanningEnabled(true);
      setKmsEnabled(true);
    }
  }, [soc2Enabled]);
  return (
    <StyledCompliance>
      <Spacer y={1} />
      <Container row>
        <Text size={16}>SOC 2 compliance</Text>
        <Spacer inline x={1} />
        <NewBadge>
          <img src={sparkle} />
          New
        </NewBadge>
      </Container>
      <Spacer y={0.5} />
      <Text color="helper">
        Configure your AWS infrastructure to be SOC 2 compliant with Porter.
      </Text>
      <Spacer y={0.5} />
      <ToggleRow
        isToggled={soc2Enabled}
        onToggle={() => {
          setSoc2Enabled((prev) => !prev);
        }}
        disabled={isReadOnly}
        disabledTooltip={
          "Wait for provisioning to complete before editing this field."
        }
      >
        <Container row>
          <Text>Enable all SOC 2 settings</Text>
        </Container>
      </ToggleRow>
      <Spacer y={0.5} />
      <GutterContainer>
        <ToggleRow
          isToggled={cloudTrailEnabled}
          onToggle={() => {
            setCloudTrailEnabled((prev) => !prev);
          }}
          disabled={soc2Enabled || isReadOnly}
          disabledTooltip={
            soc2Enabled
              ? "Global SOC 2 setting must be disabled to toggle this"
              : "Wait for provisioning to complete before editing this field."
          }
        >
          <Container row>
            <Text>EKS CloudTrail Forwarding</Text>
            <Spacer inline x={1} />
            <Text color="helper">
              Forward all application and control plane logs to CloudTrail.
            </Text>
          </Container>
        </ToggleRow>
        {/* <Spacer y={0.5} />
        <ToggleRow
          isToggled={cloudTrailRetention}
          onToggle={() => { setCloudTrailRetention((prev) => !prev) }}
          disabled={soc2Enabled || isReadOnly}
          disabledTooltip={
            soc2Enabled ? "Global SOC 2 setting must be disabled to toggle this" : "Wait for provisioning to complete before editing this field."
          }
        >
          <Container row>
            <Text>Retain CloudTrail logs for 365 days</Text>
            <Spacer inline x={1} />
            <Text color="helper">Store CloudTrail logs in an S3 bucket for 365 days.</Text>
          </Container>
        </ToggleRow> */}
        <Spacer y={0.5} />
        <ToggleRow
          isToggled={kmsEnabled}
          onToggle={() => {
            setKmsEnabled((prev) => !prev);
          }}
          disabled={soc2Enabled || isReadOnly || kmsEnabled}
          disabledTooltip={
            kmsEnabled
              ? "KMS encryption can never be disabled."
              : soc2Enabled
              ? "Global SOC 2 setting must be disabled to toggle this"
              : "Wait for provisioning to complete before editing this field."
          }
        >
          <Container row>
            <Text>AWS KMS Secret Encryption</Text>
            <Spacer inline x={1} />
            <Text color="helper">
              Encrypt secrets with AWS Key Management Service.
            </Text>
          </Container>
        </ToggleRow>
        <Spacer y={0.5} />
        <ToggleRow
          isToggled={ecrScanningEnabled}
          onToggle={() => {
            setEcrScanningEnabled((prev) => !prev);
          }}
          disabled={soc2Enabled || isReadOnly}
          disabledTooltip={
            soc2Enabled
              ? "Global SOC 2 setting must be disabled to toggle this"
              : "Wait for provisioning to complete before editing this field."
          }
        >
          <Container row>
            <Text>Enhanced ECR scanning</Text>
            <Spacer inline x={1} />
            <Text color="helper">
              Scan ECR image repositories for vulnerabilities.
            </Text>
          </Container>
        </ToggleRow>
      </GutterContainer>
      <Spacer y={1} />
      <Button
        disabled={isDisabled() ?? isLoading}
        onClick={applySettings}
        status={getStatus()}
      >
        Save settings
      </Button>
    </StyledCompliance>
  );
};

export default Compliance;

const StyledCompliance = styled.div``;

const GutterContainer = styled.div`
  border-left: 1px solid #313237;
  margin-left: 5px;
  padding-left: 15px;
`;

const NewBadge = styled.div`
  font-size: 13px;
  padding: 5px 10px;
  background: linear-gradient(110deg, #b6d5f2, #6836e2);
  border-radius: 5px;
  display: flex;
  align-items: center;

  > img {
    height: 14px;
    margin-right: 5px;
  }
`;
