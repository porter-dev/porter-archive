import React, { useState, type Dispatch, type SetStateAction } from "react";
import styled from "styled-components";

import Button from "components/porter/Button";
import ExpandableSection from "components/porter/ExpandableSection";
import Fieldset from "components/porter/Fieldset";
import Input from "components/porter/Input";
import Link from "components/porter/Link";
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

  const [confirmCost, setConfirmCost] = useState("");

  return (
    <Modal
      closeModal={() => {
        setShowCostConsentModal(false);
      }}
    >
      <Text size={16}>SOC 2 cost consent (TODO)</Text>
      <Spacer height="15px" />
      <Text color="helper">
        Porter will create the underlying infrastructure in your own AWS
        account. You will be separately charged by AWS for this infrastructure.
        The cost for this base infrastructure is as follows:
      </Text>
      <Spacer y={1} />
      <ExpandableSection
        noWrapper
        expandText="[+] Show details"
        collapseText="[-] Hide details"
        Header={
          <Text size={20} weight={600}>
            $224.58 / mo
          </Text>
        }
        ExpandedSection={
          <>
            <Spacer height="15px" />
            <Fieldset background="#1b1d2688">
              • Amazon Elastic Kubernetes Service (EKS) = $73/mo
              <Spacer height="15px" />
              • Amazon EC2:
              <Spacer height="15px" />
              <Tab />+ System workloads: t3.medium instance (2) = $60.74/mo
              <Spacer height="15px" />
              <Tab />+ Monitoring workloads: t3.large instance (1) = $60.74/mo
              <Spacer height="15px" />
              <Tab />+ Application workloads: t3.medium instance (1) = $30.1/mo
            </Fieldset>
          </>
        }
      />
      <Spacer y={1} />
      <Text color="helper">
        The base AWS infrastructure covers up to 2 vCPU and 4GB of RAM. Separate
        from the AWS cost, Porter charges based on your resource usage.
      </Text>
      <Spacer inline width="5px" />
      <Spacer y={0.5} />
      <Link hasunderline to="https://porter.run/pricing" target="_blank">
        Learn more about our pricing.
      </Link>
      <Spacer y={1} />
      <Input
        placeholder="224.58"
        value={confirmCost}
        setValue={setConfirmCost}
        width="100%"
        height="40px"
      />
      <Spacer y={1} />
      <Button
        disabled={confirmCost !== "224.58"}
        onClick={() => {
          setConfirmCost("");
          void updateContractWithSOC2();
        }}
        status={updateInProgress ? "loading" : undefined}
      >
        Enable SOC 2 infra controls
      </Button>
    </Modal>
  );
};

const Tab = styled.span`
  margin-left: 20px;
  height: 1px;
`;
