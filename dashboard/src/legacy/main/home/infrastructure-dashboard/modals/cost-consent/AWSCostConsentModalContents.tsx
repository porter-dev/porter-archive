import React from "react";
import ExpandableSection from "legacy/components/porter/ExpandableSection";
import Fieldset from "legacy/components/porter/Fieldset";
import Link from "legacy/components/porter/Link";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import styled from "styled-components";

type Props = {
  baseCost: number;
};
const AWSCostConsentModalContents: React.FC<Props> = ({ baseCost }) => {
  return (
    <div>
      <Text size={16}>Base AWS cost consent</Text>
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
            ${baseCost} / mo
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
        Porter project. Please enter the AWS base cost (&quot;{baseCost}&quot;)
        below to proceed:
      </Text>
    </div>
  );
};

export default AWSCostConsentModalContents;
const Tab = styled.span`
  margin-left: 20px;
  height: 1px;
`;
