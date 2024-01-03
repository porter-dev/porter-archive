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
import Fieldset from "components/porter/Fieldset";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import ToggleRow from "components/porter/ToggleRow";
import SOC2Checks from "components/SOC2Checks";

import api from "shared/api";
import { Context } from "shared/Context";
import sparkle from "assets/sparkle.svg";

import DonutChart from "./DonutChart";

type Props = {
  credentialId: string;
  provisionerError?: string;
  selectedClusterVersion: JsonValue;
};

//  Example SOC2 Check NOTE PLEASE ADD FUNC TO createContract and useEffect(() to correctly READ AND WRITE
//  "Display_Name_Of_SOC2_Check": {
//   "message": "Main Example Message about the Check",
//   "link": "example link for more docs ",
//   "enabled": (false or true if porter does it by default),
//   "status": ""(Keep blank or ENABLED if porter does it by default)
//  "enabledField": "text that goes next to the toggle",
//   "info": " more information",
//   "locked":(true if unmutable field like KMS),
//   "disabledTooltip": "display if message is disabled",
//  "hideToggle": true (if you want to hide the toggle
// }
const soc2DataDefault = {
  soc2_checks: {
    "Public SSH Access": {
      message:
        "Porter-provisioned instances do not allow remote SSH access. Users are not allowed to invoke commands directly on the host, and all commands are invoked via the EKS Control Plane.",
      enabled: true,
      hideToggle: true,
      status: "ENABLED",
    },
    "Cluster Secret Encryption": {
      message:
        "Cluster secrets can be encrypted using an AWS KMS Key. Secrets will be encrypted at rest, and encryption cannot be disabled for secrets.",
      enabled: false,
      disabledTooltip:
        "Enable KMS encryption for the cluster to enable SOC 2 compliance.",
      link: "https://aws.amazon.com/about-aws/whats-new/2020/03/amazon-eks-adds-envelope-encryption-for-secrets-with-aws-kms/",
      locked: true,
      status: "",
    },
    "Control Plane Log Retention": {
      message:
        "EKS Control Plane logs are by default available for a minimal amount of time, typically 1 hour or less. EKS CloudTrail Forwarding automatically sends control plane logs to CloudTrail for longer retention and later inspection.",
      enabled: false,
      enabledField: "Retain CloudTrail logs for 365 days",
      status: "",
    },
    "Enhanced Image Vulnerability Scanning": {
      message:
        "AWS ECR scans for CVEs from the open-source Clair database on push image push. Enhanced scanning provides continuous, automated scans against images as new vulnerabilities appear.",
      link: "https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-enhanced.html",
      enabled: false,
      info: "",
      status: "",
    },
  },
};

const DEFAULT_ERROR_MESSAGE =
  "An error occurred while provisioning your infrastructure. Please try again.";

const Compliance: React.FC<Props> = (props) => {
  const { currentProject, currentCluster, setShouldRefreshClusters } =
    useContext(Context);

  const [isClicked, setIsClicked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [soc2Enabled, setSoc2Enabled] = useState(false);
  const [clusterRegion, setClusterRegion] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [soc2Data, setSoc2Data] = useState(soc2DataDefault);
  const [isReadOnly, setIsReadOnly] = useState(false);

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
    //
    const cloudTrailEnabled =
      soc2Data.soc2_checks["Control Plane Log Retention"].enabled;
    const kmsEnabled =
      soc2Data.soc2_checks["Cluster Secret Encryption"].enabled;
    const ecrScanningEnabled =
      soc2Data.soc2_checks["Enhanced Image Vulnerability Scanning"].enabled;

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

  const determineStatus = (enabled: boolean): string => {
    if (enabled) {
      if (currentCluster?.status === "UPDATING") {
        return "PENDING_ENABLED";
      } else return "ENABLED";
    }
    return "";
  };

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

      setClusterRegion(eksValues.region);

      setSoc2Data((prevSoc2Data) => {
        return {
          ...prevSoc2Data,
          soc2_checks: {
            ...prevSoc2Data.soc2_checks,
            "Control Plane Log Retention": {
              ...prevSoc2Data.soc2_checks["Control Plane Log Retention"],
              enabled: cloudTrailEnabled,
              status: determineStatus(cloudTrailEnabled),
            },
            "Cluster Secret Encryption": {
              ...prevSoc2Data.soc2_checks["Cluster Secret Encryption"],
              enabled: eksValues.enableKmsEncryption,
              status: determineStatus(eksValues.enableKmsEncryption),
            },
            "Enhanced Image Vulnerability Scanning": {
              ...prevSoc2Data.soc2_checks[
                "Enhanced Image Vulnerability Scanning"
              ],
              enabled: eksValues.enableEcrScanning,
              status: determineStatus(eksValues.enableEcrScanning),
            },
          },
        };
      });

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

  return (
    <StyledCompliance>
      <Spacer y={1} />
      <Fieldset>
        <Container row>
          <Text size={16}>SOC 2 Compliance Dashboard</Text>
          <Spacer inline x={1} />
          <NewBadge>
            <img src={sparkle} />
            New
          </NewBadge>
        </Container>
        <Spacer y={1} />
        <DonutChart data={soc2Data} />
      </Fieldset>

      <SOC2Checks
        enableAll={soc2Enabled}
        soc2Data={soc2Data}
        setSoc2Data={setSoc2Data}
        readOnly={isReadOnly}
      />
      <Spacer y={1} />
      <Container row>
        <Button
          disabled={isDisabled() ?? isLoading}
          onClick={applySettings}
          status={getStatus()}
        >
          Save settings
        </Button>
        <Spacer inline x={1} />
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
            <Text>Enable All</Text>
          </Container>
        </ToggleRow>
      </Container>
    </StyledCompliance>
  );
};

export default Compliance;

const StyledCompliance = styled.div``;

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
