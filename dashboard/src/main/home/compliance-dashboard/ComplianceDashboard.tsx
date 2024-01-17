import React, { useState } from "react";
import _ from "lodash";
import styled from "styled-components";

import Spacer from "components/porter/Spacer";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";

import compliance from "assets/compliance.svg";
import Container from "components/porter/Container";

import Text from "components/porter/Text";
import Select from "components/porter/Select";
import Image from "components/porter/Image";
import Banner from "components/porter/Banner";

import framework from "assets/framework.svg";
import typeSvg from "assets/type.svg";
import provider from "assets/provider.svg";
import aws from "assets/aws.png";
import vanta from "assets/vanta.svg";
import linkExternal from "assets/link-external.svg";
import greenCheck from "assets/green-check.svg";
import actionRequired from "assets/warning.svg";
import notApplicable from "assets/not-applicable.svg";

type Props = {
  projectId: number;
};

const ComplianceDashboard: React.FC<Props> = () => {
  const [statusFilter, setStatusFilter] = useState("all");

  return (
    <StyledComplianceDashboard>
      <DashboardHeader
        image={compliance}
        title="Compliance"
        description="Configure your Porter infrastructure for various compliance frameworks."
        disableLineBreak
      />
      <Container row>
        <Select
          options={[
            { value: "soc-2", label: "SOC 2" },
            { value: "hipaa", label: "HIPAA (request access)", disabled: true },
          ]}
          width="200px"
          value={"soc-2"}
          setValue={() => {
          }
          }
          prefix={
            <Container row>
              <Image src={framework} size={15} opacity={0.6} />
              <Spacer inline x={0.5} />
              Framework
            </Container>
          }
        />
        <Spacer inline x={1} />
        <Select
          options={[
            { value: "aws", label: "AWS", icon: aws },
            { value: "gcp", label: "Google Cloud (coming soon)", disabled: true },
            { value: "azure", label: "Azure (coming soon)", disabled: true },
          ]}
          width="180px"
          value={"aws"}
          setValue={() => {
          }
          }
          prefix={
            <Container row>
              <Image src={typeSvg} size={15} opacity={0.6} />
              <Spacer inline x={0.5} />
              Type
            </Container>
          }
        />
        <Spacer inline x={1} />
        <Select
          options={[
            { value: "vanta", label: "Vanta", icon: vanta },
            { value: "drata", label: "Drata (coming soon)", disabled: true },
            { value: "oneleet", label: "Oneleet (coming soon)", disabled: true },
          ]}
          width="200px"
          value={"vanta"}
          setValue={() => {
          }
          }
          prefix={
            <Container row>
              <Image src={provider} size={15} opacity={.6} />
              <Spacer inline x={.5} />
              Provider
            </Container>
          }
        />
      </Container>

      <Spacer y={1} />

      <Container row>
        <Image src={vanta} size={25} />
        <Spacer inline x={1} />
        <Text 
          size={21}
          additionalStyles=":hover { text-decoration: underline } cursor: pointer;"
          onClick={() => {
            window.open("https://app.vanta.com/tests?framework=soc2&service=aws&taskType=TEST", "_blank")
          }}
        >
          AWS SOC 2 Controls (Vanta)
          <Spacer inline x={.5} />
          <Image src={linkExternal} size={16} additionalStyles="margin-bottom: -2px"/>
        </Text>
      </Container>

      <Spacer y={1} />

      <Banner type="warning">
        Action is required to pass additional controls.
      </Banner>

      <Spacer y={1} />

      <Container row>
        <PanelFilter
          isActive={statusFilter === "all"}
          onClick={() => {
            setStatusFilter("all");
          }}
        >
          <Text color="helper">All</Text>
          <Spacer y={.2} />
          <Text size={18}>45</Text>
        </PanelFilter>
        <Spacer inline x={1.5} />
        <PanelFilter
          isActive={statusFilter === "passing"}
          onClick={() => {
            setStatusFilter("passing");
          }}
        >
          <Container row>
            <Image src={greenCheck} size={10} />
            <Spacer inline x={.5} />
            <Text color="helper">Passing</Text>
          </Container>
          <Spacer y={.2} />
          <Text size={18}>3</Text>
        </PanelFilter>
        <Spacer inline x={1.5} />
        <PanelFilter
          isActive={statusFilter === "action-required"}
          onClick={() => {
            setStatusFilter("action-required");
          }}
        >
          <Container row>
            <Image src={actionRequired} size={12} />
            <Spacer inline x={.5} />
            <Text color="helper">Action required</Text>
          </Container>
          <Spacer y={.2} />
          <Text size={18}>17</Text>
        </PanelFilter>
        <Spacer inline x={1.5} />
        <PanelFilter
          isActive={statusFilter === "not-applicable"}
          onClick={() => {
            setStatusFilter("not-applicable");
          }}
        >
          <Container row>
            <Image src={notApplicable} size={12} />
            <Spacer inline x={.5} />
            <Text color="helper">Not applicable</Text>
          </Container>
          <Spacer y={.2} />
          <Text size={18}>25</Text>
        </PanelFilter>
      </Container>
    </StyledComplianceDashboard>
  );
};

export default ComplianceDashboard;

const PanelFilter = styled.div<{ isActive: boolean }>`
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 10px 15px;
  cursor: pointer;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid ${(props) => props.isActive ? "#fefefe" : "#494b4f"};
  :hover {
    ${(props) => !props.isActive && "border: 1px solid #7a7b80;"}
  }
`;

const StyledComplianceDashboard = styled.div`
  width: 100%;
  height: 100%;
`;