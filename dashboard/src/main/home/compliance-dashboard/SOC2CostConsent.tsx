import React, { type Dispatch, type SetStateAction } from "react";

import Button from "components/porter/Button";
import ExpandableSection from "components/porter/ExpandableSection";
import Fieldset from "components/porter/Fieldset";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import { useCompliance } from "./ComplianceContext";

type Props = {
  setShowCostConsentModal: Dispatch<SetStateAction<boolean>>;
};

export const SOC2CostConsent: React.FC<Props> = ({
  setShowCostConsentModal,
}) => {
  const { updateInProgress, updateContractWithSOC2 } = useCompliance();

  return (
    <Modal
      closeModal={() => {
        setShowCostConsentModal(false);
      }}
    >
      <Text size={16}>Enable SOC-2</Text>
      <Spacer height="15px" />
      <Text color="helper">
        Porter will update the underlying infrastructure in your own AWS account
        to ensure compliance with any automated SOC-2 controls. Additional costs
        may apply.
      </Text>
      <Spacer y={1} />
      <ExpandableSection
        noWrapper
        expandText="[+] Show details"
        collapseText="[-] Hide details"
        Header={
          <Text size={20} weight={600}>
            Additional updates for SOC-2
          </Text>
        }
        isInitiallyExpanded
        ExpandedSection={
          <>
            <Spacer height="15px" />
            <Fieldset background="#1b1d2688">
              • GuardDuty (threat detection)
              <Spacer height="15px" />
              • CloudTrail (audit logs) and CloudWatch (monitoring)
              <Spacer height="15px" />
              • KMS encrypted secrets
              <Spacer height="15px" />
              • Container vulnerability scanning
              <Spacer height="15px" />
            </Fieldset>
          </>
        }
      />
      <Spacer y={1} />
      <Button
        onClick={() => {
          void updateContractWithSOC2();
          setShowCostConsentModal(false);
        }}
        status={updateInProgress ? "loading" : undefined}
        disabled={updateInProgress}
      >
        Enable SOC 2 infra controls
      </Button>
    </Modal>
  );
};
