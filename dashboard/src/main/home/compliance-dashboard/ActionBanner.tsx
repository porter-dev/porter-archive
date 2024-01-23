import React, { useMemo, type Dispatch, type SetStateAction } from "react";
import { useHistory } from "react-router";

import Banner from "components/porter/Banner";
import Image from "components/porter/Image";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import loading_img from "assets/loading.gif";
import refresh from "assets/refresh.png";

import { useCompliance } from "./ComplianceContext";

type ActionBannerProps = {
  setShowCostConsentModal: Dispatch<SetStateAction<boolean>>;
};

export const ActionBanner: React.FC<ActionBannerProps> = ({
  setShowCostConsentModal,
}) => {
  const history = useHistory();
  const {
    updateInProgress,
    latestContractDB,
    latestContractProto,
    updateContractWithSOC2,
  } = useCompliance();

  const provisioningStatus = useMemo(() => {
    if (!latestContractDB || latestContractDB.condition === "") {
      return {
        state: "pending" as const,
        message: latestContractDB?.condition_metadata?.message ?? "",
      };
    }

    if (latestContractDB.condition === "SUCCESS") {
      return {
        state: "success" as const,
        message: latestContractDB.condition_metadata?.message ?? "",
      };
    }

    if (latestContractDB.condition === "COMPLIANCE_CHECK_FAILED") {
      return {
        state: "compliance_error" as const,
        message: latestContractDB.condition_metadata?.message ?? "",
      };
    }

    return {
      state: "failed" as const,
      message: latestContractDB.condition_metadata?.message ?? "",
    };
  }, [latestContractDB?.condition]);

  // check if provisioning is pending
  const isInfraPending = useMemo(() => {
    return provisioningStatus.state === "pending" || updateInProgress;
  }, [provisioningStatus.state, updateInProgress]);

  // check if compliance has not been enable or if not all checks have passed
  const actionRequredWithoutProvisioningError = useMemo(() => {
    return (
      provisioningStatus.state === "compliance_error" ||
      !latestContractProto?.cluster?.isSoc2Compliant
    );
  }, [provisioningStatus.state, latestContractProto?.toJsonString()]);

  // check if provisioning error is due to compliance update
  const provisioningErrorWithComplianceEnabled = useMemo(() => {
    return (
      provisioningStatus.state === "compliance_error" &&
      latestContractProto?.cluster?.isSoc2Compliant
    );
  }, [provisioningStatus.state, latestContractProto?.toJsonString()]);

  if (isInfraPending) {
    return (
      <Banner
        icon={
          <Image src={loading_img} style={{ height: "16px", width: "16px" }} />
        }
      >
        SOC 2 infrastructure controls are being enabled. Note: This may take up
        to 30 minutes.
      </Banner>
    );
  }

  if (actionRequredWithoutProvisioningError) {
    return (
      <Banner type="warning">
        Action is required to pass additional controls.
        <Spacer inline x={0.5} />
        {provisioningStatus.state === "compliance_error" ? (
          <Text
            style={{
              textDecoration: "underline",
              cursor: "pointer",
            }}
            onClick={() => {
              void updateContractWithSOC2();
            }}
          >
            Re-run infrastructure controls
          </Text>
        ) : (
          <Text
            style={{
              textDecoration: "underline",
              cursor: "pointer",
            }}
            onClick={() => {
              setShowCostConsentModal(true);
            }}
          >
            Enable SOC 2 infrastructure controls
          </Text>
        )}
      </Banner>
    );
  }

  if (provisioningErrorWithComplianceEnabled) {
    return (
      <Banner type="error">
        An error occurred while applying updates to your infrastructure.
        <Spacer inline x={1} />
        <Text
          style={{
            textDecoration: "underline",
            cursor: "pointer",
          }}
          onClick={() => {
            history.push("/cluster-dashboard");
          }}
        >
          Learn more
        </Text>
        <Spacer inline x={1} />
        <Text
          style={{
            textDecoration: "underline",
            cursor: "pointer",
          }}
          onClick={() => {
            void updateContractWithSOC2();
          }}
        >
          <Image src={refresh} size={12} style={{ marginBottom: "-2px" }} />
          <Spacer inline x={0.5} />
          Retry update
        </Text>
      </Banner>
    );
  }

  return null;
};
