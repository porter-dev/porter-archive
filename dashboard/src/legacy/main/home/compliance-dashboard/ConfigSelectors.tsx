import React from "react";

import Container from "components/porter/Container";
import Image from "components/porter/Image";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";

import aws from "assets/aws.png";
import framework from "assets/framework.svg";
import oneleet from "assets/oneleet.svg";
import provider from "assets/provider.svg";
import typeSvg from "assets/type.svg";
import vanta from "assets/vanta.svg";

import { useCompliance } from "./ComplianceContext";

export const ConfigSelectors: React.FC = () => {
  const { profile, setProfile, vendor, setVendor } = useCompliance();
  return (
    <Container row>
      <Select
        options={[
          { value: "soc2", label: "SOC 2" },
          {
            value: "hipaa",
            label: "HIPAA",
          },
        ]}
        value={profile}
        setValue={(value) => {
          if (value === "soc2") {
            setProfile("soc2");
            return;
          }

          setProfile("hipaa");
        }}
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
          {
            value: "gcp",
            label: "Google Cloud (coming soon)",
            disabled: true,
          },
          {
            value: "azure",
            label: "Azure (coming soon)",
            disabled: true,
          },
        ]}
        value={"aws"}
        setValue={() => {}}
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
          {
            value: "oneleet",
            label: "Oneleet",
            icon: oneleet,
          },
          { value: "vanta", label: "Vanta", icon: vanta },
          {
            value: "drata",
            label: "Drata (coming soon)",
            disabled: true,
          },
        ]}
        value={vendor}
        setValue={(value) => {
          if (value === "vanta") {
            setVendor("vanta");
            return;
          }

          setVendor("oneleet");
        }}
        prefix={
          <Container row>
            <Image src={provider} size={15} opacity={0.6} />
            <Spacer inline x={0.5} />
            Provider
          </Container>
        }
      />
    </Container>
  );
};
