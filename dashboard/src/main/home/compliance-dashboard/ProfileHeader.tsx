import React, { useMemo } from "react";
import { match } from "ts-pattern";

import Container from "components/porter/Container";
import Image from "components/porter/Image";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import linkExternal from "assets/link-external.svg";
import vanta from "assets/vanta.svg";

import { useCompliance } from "./ComplianceContext";

export const ProfileHeader: React.FC = () => {
  const { profile } = useCompliance();

  const header = useMemo(() => {
    return match(profile)
      .with("soc2", () => ({
        text: "AWS SOC 2 Controls (Vanta)",
        link: "https://app.vanta.com/tests?framework=soc2&service=aws&taskType=TEST",
      }))
      .with("hipaa", () => ({
        text: "AWS HIPAA Controls (Vanta)",
        link: "https://app.vanta.com/tests?framework=hipaa&service=aws&taskType=TEST",
      }))
      .exhaustive();
  }, [profile]);

  return (
    <Container row>
      <Image src={vanta} size={25} />
      <Spacer inline x={1} />
      <Text
        size={21}
        additionalStyles=":hover { text-decoration: underline } cursor: pointer;"
        onClick={() => {
          window.open(header.link, "_blank");
        }}
      >
        {header.text}
        <Spacer inline x={0.5} />
        <Image
          src={linkExternal}
          size={16}
          additionalStyles="margin-bottom: -2px"
        />
      </Text>
    </Container>
  );
};
