import React, { type Dispatch, type SetStateAction } from "react";
import Button from "legacy/components/porter/Button";
import ExpandableSection from "legacy/components/porter/ExpandableSection";
import Fieldset from "legacy/components/porter/Fieldset";
import Modal from "legacy/components/porter/Modal";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";

import { useCompliance } from "./ComplianceContext";

type Props = {
  setShowCostConsentModal: Dispatch<SetStateAction<boolean>>;
};

export const SOC2CostConsent: React.FC<Props> = ({
  setShowCostConsentModal,
}) => {
  const { profile, updateInProgress, updateContractWithProfile } =
    useCompliance();

  const profileText = profile === "soc2" ? "SOC-2" : "HIPAA";

  return (
    <Modal
      closeModal={() => {
        setShowCostConsentModal(false);
      }}
    >
      <Text size={16}>
        Enable
        {profileText}
      </Text>
      <Spacer height="15px" />
      <Text color="helper">
        Porter will update the underlying infrastructure in your own AWS account
        to ensure compliance with any automated {profileText} controls.
        Additional costs may apply.
      </Text>
      <Spacer y={1} />
      <ExpandableSection
        noWrapper
        expandText="[+] Show details"
        collapseText="[-] Hide details"
        Header={
          <Text size={20} weight={600}>
            Additional updates for {profileText}
          </Text>
        }
        isInitiallyExpanded
        ExpandedSection={
          <>
            <Spacer height="15px" />
            <Fieldset background="#1b1d2688">
              • CloudTrail (audit logs) and CloudWatch (monitoring)
              <Spacer height="15px" />
              • KMS encrypted secrets
              <Spacer height="15px" />
              {profile === "soc2" && (
                <>
                  • Container vulnerability scanning
                  <Spacer height="15px" />
                  • GuardDuty (threat detection)
                  <Spacer height="15px" />
                </>
              )}
            </Fieldset>
          </>
        }
      />
      <Spacer y={1} />
      <Button
        onClick={() => {
          void updateContractWithProfile();
          setShowCostConsentModal(false);
        }}
        status={updateInProgress ? "loading" : undefined}
        disabled={updateInProgress}
      >
        Enable {profileText} infra controls
      </Button>
    </Modal>
  );
};
