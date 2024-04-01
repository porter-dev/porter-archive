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
const AzureCostConsentModalContents: React.FC<Props> = ({ baseCost }) => {
  return (
    <div>
      <Text size={16}>Base Azure cost consent</Text>
      <Spacer height="15px" />
      <Text color="helper">
        Porter will create the underlying infrastructure in your own Azure
        account. You will be separately charged by Azure for this
        infrastructure. The cost for this base infrastructure is as follows:
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
              • Azure virtual machines:
              <Spacer height="15px" />
              <Tab />+ System workloads: Standard_B2als_v2 instance (3) =
              $82.34/mo
              <Spacer height="15px" />
              <Tab />+ Monitoring workloads: Standard_B2as_v2 instance (1) =
              $54.90/mo
              <Spacer height="15px" />
              <Tab />+ Application workloads: Standard_B2als_v2 instance (1) =
              $27.45/mo
            </Fieldset>
          </>
        }
      />
      <Spacer y={1} />
      <Text color="helper">
        The base Azure infrastructure covers up to 2 vCPU and 4GB of RAM for
        application workloads. Separate from the Azure cost, Porter charges
        based on your resource usage.
      </Text>
      <Spacer inline width="5px" />
      <Spacer y={0.5} />
      <Link hasunderline to="https://porter.run/pricing" target="_blank">
        Learn more about our pricing.
      </Link>
      <Spacer y={0.5} />
      <Text color="helper">
        You can use your Azure credits to pay for the underlying infrastructure,
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
        All Azure resources will be automatically deleted when you delete your
        Porter project. Please enter the Azure base cost (&quot;{baseCost}
        &quot;) below to proceed:
      </Text>
    </div>
  );
};

export default AzureCostConsentModalContents;

const Tab = styled.span`
  margin-left: 20px;
  height: 1px;
`;

const Cost = styled.div`
  font-weight: 600;
  font-size: 20px;
`;
