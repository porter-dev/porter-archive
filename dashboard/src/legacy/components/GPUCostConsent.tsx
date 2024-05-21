import React, { useState, useContext } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";

import Modal from "./porter/Modal";
import Text from "./porter/Text";
import Spacer from "./porter/Spacer";
import Fieldset from "./porter/Fieldset";
import Button from "./porter/Button";
import ExpandableSection from "./porter/ExpandableSection";
import Input from "./porter/Input";
import Link from "./porter/Link";

type Props = {
  setCurrentStep: (step: string) => void;
  markCostConsentComplete: () => void;
};

const GPUCostConsent: React.FC<Props> = ({
  setCurrentStep,
  markCostConsentComplete,
}) => {
  const [confirmCost, setConfirmCost] = useState("");

  return (
    <>

      <Text size={16}>Base AWS cost consent</Text>
      <Spacer height="15px" />
      <Text color="helper">
        Porter will create the underlying infrastructure in your own AWS
        account. You will be separately charged by AWS for this
        infrastructure. The cost for this base infrastructure is as follows:
      </Text>
      <Spacer y={1} />
      <ExpandableSection
        noWrapper
        expandText="[+] Show details"
        collapseText="[-] Hide details"
        Header={<Cost>$224.58 / mo</Cost>}
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
              <Tab />+ Application workloads: t3.medium instance (1) =
              $30.1/mo
            </Fieldset>
          </>
        }
      />
      <Spacer y={1} />
      <Text color="helper">
        The base AWS infrastructure covers up to 2 vCPU and 4GB of RAM.
        Separate from the AWS cost, Porter charges based on your resource
        usage.
      </Text>
      <Spacer inline width="5px" />
      <Spacer y={0.5} />
      <Link hasunderline to="https://porter.run/pricing" target="_blank">
        Learn more about our pricing.
      </Link>
      <Spacer y={0.5} />
      <Text color="helper">
        You can use your AWS credits to pay for the underlying infrastructure,
        and if you are a startup with less than 5M in funding, you may qualify
        for our startup program that gives you $10k in credits.
      </Text>
      <Spacer y={0.5} />
      <Link
        hasunderline
        to="https://gcpjnf9adme.typeform.com/to/vUg9SDWf"
        target="_blank"
      >
        You can apply here.
      </Link>
      <Spacer y={0.5} />
      <Text color="helper">
        All AWS resources will be automatically deleted when you delete your
        Porter project. Please enter the AWS base cost ("224.58") below to
        proceed:
      </Text>
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
          markCostConsentComplete();
          setCurrentStep("credentials");
        }}
      >
        Continue
      </Button>

    </>
  );
};

export default GPUCostConsent;

const Cost = styled.div`
  font-weight: 600;
  font-size: 20px;
`;

const Tab = styled.span`
  margin-left: 20px;
  height: 1px;
`;
