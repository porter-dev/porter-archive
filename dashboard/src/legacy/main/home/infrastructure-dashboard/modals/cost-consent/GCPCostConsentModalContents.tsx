import React from "react";
import styled from "styled-components";

import ExpandableSection from "components/porter/ExpandableSection";
import Fieldset from "components/porter/Fieldset";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

type Props = {
  baseCost: number;
};
const GCPCostConsentModalContents: React.FC<Props> = ({ baseCost }) => {
  return (
    <div>
      <Text size={16}>Base GCP cost consent</Text>
      <Spacer height="15px" />
      <Text color="helper">
        Porter will create the underlying infrastructure in your own GCP
        project. You will be separately charged by GCP for this infrastructure.
        The cost for this base infrastructure is as follows:
      </Text>
      <Spacer y={1} />
      <ExpandableSection
        noWrapper
        expandText="[+] Show details"
        collapseText="[-] Hide details"
        Header={<Cost>${baseCost} / mo</Cost>}
        ExpandedSection={
          <>
            <Spacer height="15px" />
            <Fieldset background="#1b1d2688">
              • Google Kubernetes Engine Management (GKE) = $73/mo
              <Spacer height="15px" />
              • GKE Compute:
              <Spacer height="15px" />
              <Tab />+ System workloads (2) = $90/mo
              <Spacer height="15px" />
              <Tab />+ Monitoring workloads (1) = $45/mo
              <Spacer height="15px" />
              <Tab />+ Application workloads (1) = $45/mo
            </Fieldset>
          </>
        }
      />
      <Spacer y={1} />
      <Text color="helper">
        The base GCP infrastructure covers up to 2 vCPU and 4GB of RAM. Separate
        from the GCP cost, Porter charges based on your resource usage.
      </Text>
      <Spacer inline width="5px" />
      <Spacer y={0.5} />
      <Link hasunderline to="https://porter.run/pricing" target="_blank">
        Learn more about our pricing.
      </Link>
      <Spacer y={0.5} />
      <Text color="helper">
        You can use your GCP credits to pay for the underlying infrastructure,
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
        All GCP resources will be automatically deleted when you delete your
        Porter project. Please enter the GCP base cost (&quot;{baseCost}&quot;)
        below to proceed:
      </Text>
    </div>
  );
};

export default GCPCostConsentModalContents;
const Tab = styled.span`
  margin-left: 20px;
  height: 1px;
`;

const Cost = styled.div`
  font-weight: 600;
  font-size: 20px;
`;
