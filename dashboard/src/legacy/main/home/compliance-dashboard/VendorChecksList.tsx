import React, { Fragment, useMemo, useState } from "react";
import greenCheck from "legacy/assets/green-check.svg";
import linkExternal from "legacy/assets/link-external.svg";
import notApplicable from "legacy/assets/not-applicable.svg";
import warning from "legacy/assets/warning.svg";
import Container from "legacy/components/porter/Container";
import Image from "legacy/components/porter/Image";
import Modal from "legacy/components/porter/Modal";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { useIntercom } from "legacy/lib/hooks/useIntercom";
import styled from "styled-components";
import { match } from "ts-pattern";

import { useCompliance } from "./ComplianceContext";
import { type VendorCheck } from "./types";

type Filter = "all" | "passing" | "action-required" | "not-applicable";

export const VendorChecksList: React.FC = () => {
  const { profile, vendor, vendorChecks, latestContractProto } =
    useCompliance();
  const { showIntercomWithMessage } = useIntercom();

  const [statusFilter, setStatusFilter] = useState<Filter>("all");
  const [expandedCheck, setExpandedCheck] = useState<VendorCheck | null>(null);

  const renderExpandedCheckText = (): JSX.Element | null => {
    if (!expandedCheck) {
      return null;
    }

    if (profile === "soc2" && !latestContractProto?.complianceProfiles?.soc2) {
      return (
        <Text color="helper">
          SOC-2 compliance is not enabled for this cluster. Re-provisioning your
          infrastructure above will enable necessary security controls to ensure
          compliance.
        </Text>
      );
    }
    if (
      profile === "hipaa" &&
      !latestContractProto?.complianceProfiles?.hipaa
    ) {
      return (
        <Text color="helper">
          HIPAA compliance is not enabled for this cluster. Re-provisioning your
          infrastructure above will enable necessary security controls to ensure
          compliance.
        </Text>
      );
    }

    return (
      <Text color="helper">
        {expandedCheck.reason.length
          ? expandedCheck.reason
          : "An error occurred during provisioning that is causing this check to be unfulfilled. Please attempt to re-provision or contact support@porter.run if the error persists."}
      </Text>
    );
  };

  // show actionRequired, then passed, then notApplicable
  const sortedChecks = useMemo(() => {
    const failingChecks = vendorChecks.filter(
      (check) => check.status === "failing"
    );
    const passingChecks = vendorChecks.filter(
      (check) => check.status === "passed"
    );
    const notApplicableChecks = vendorChecks.filter(
      (check) => check.status === "not_applicable"
    );

    return match(statusFilter)
      .with("all", () => [
        ...failingChecks,
        ...passingChecks,
        ...notApplicableChecks,
      ])
      .with("passing", () => passingChecks)
      .with("action-required", () => failingChecks)
      .with("not-applicable", () => notApplicableChecks)
      .exhaustive();
  }, [vendorChecks, statusFilter]);

  const numberOfChecksPerStatus = useMemo(() => {
    return vendorChecks.reduce(
      (acc, check) => {
        if (check.status === "passed") {
          acc.passing += 1;
        } else if (check.status === "failing") {
          acc.failing += 1;
        } else if (check.status === "not_applicable") {
          acc.notApplicable += 1;
        }

        return acc;
      },
      {
        passing: 0,
        failing: 0,
        notApplicable: 0,
      }
    );
  }, [vendorChecks]);

  return (
    <>
      <Container row>
        <PanelFilter
          isActive={statusFilter === "all"}
          onClick={() => {
            setStatusFilter("all");
          }}
        >
          <Text color="helper">All</Text>
          <Spacer y={0.2} />
          <Text size={18}>{vendorChecks.length}</Text>
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
            <Spacer inline x={0.5} />
            <Text color="helper">Passing</Text>
          </Container>
          <Spacer y={0.2} />
          <Text size={18}>{numberOfChecksPerStatus.passing}</Text>
        </PanelFilter>
        <Spacer inline x={1.5} />
        <PanelFilter
          isActive={statusFilter === "action-required"}
          onClick={() => {
            setStatusFilter("action-required");
          }}
        >
          <Container row>
            <Image src={warning} size={12} />
            <Spacer inline x={0.5} />
            <Text color="helper">Action required</Text>
          </Container>
          <Spacer y={0.2} />
          <Text size={18}>{numberOfChecksPerStatus.failing}</Text>
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
            <Spacer inline x={0.5} />
            <Text color="helper">Not applicable</Text>
          </Container>
          <Spacer y={0.2} />
          <Text size={18}>{numberOfChecksPerStatus.notApplicable}</Text>
        </PanelFilter>
      </Container>

      <Spacer y={1.5} />

      {sortedChecks.map((check, i) => {
        return (
          <Fragment key={`${check.check}-${i}`}>
            <Container row>
              <Container style={{ width: "200px" }} row>
                {check.status === "passed" && (
                  <Image src={greenCheck} size={10} />
                )}
                {check.status === "failing" && (
                  <Image src={warning} size={14} />
                )}
                {check.status === "not_applicable" && (
                  <Image src={notApplicable} size={14} />
                )}
                <Spacer inline x={0.7} />
                {check.status === "passed" && (
                  <Text color="helper">Passing</Text>
                )}
                {check.status === "failing" && (
                  <ActionRequired>
                    <Text color="helper">Action required</Text>
                    <Spacer inline x={0.5} />
                    <i
                      className="material-icons-outlined"
                      onClick={() => {
                        setExpandedCheck(check);
                      }}
                    >
                      help_outline
                    </i>
                  </ActionRequired>
                )}
                {check.status === "not_applicable" && (
                  <Text color="#494B4F">Not applicable</Text>
                )}
              </Container>
              <Text
                color={check.status === "not_applicable" ? "#494B4F" : ""}
                style={{
                  marginBottom: "-1px",
                  cursor: "pointer",
                }}
                additionalStyles=":hover { text-decoration: underline }"
                onClick={() => {
                  if (vendor === "vanta") {
                    window.open(
                      `https://app.vanta.com/tests/${check.vendor_check_id}`,
                      "_blank"
                    );
                  }
                }}
              >
                {check.check}
                <Spacer inline x={0.5} />
                {vendor === "vanta" && (
                  <Image
                    src={linkExternal}
                    opacity={check.status === "not_applicable" ? 0.25 : 1}
                    size={12}
                    additionalStyles="margin-bottom: -2px"
                  />
                )}
              </Text>
            </Container>
            <Spacer y={1} />
          </Fragment>
        );
      })}

      {expandedCheck && (
        <Modal
          closeModal={() => {
            showIntercomWithMessage({
              message: "I am running into an issue enabling SOC-2 compliance.",
            });
            setExpandedCheck(null);
          }}
        >
          <Container row>
            <Image src={warning} size={16} />
            <Spacer inline x={0.7} />
            <Text size={16}>
              Action required for &ldquo;{expandedCheck.check}&rdquo;
            </Text>
          </Container>
          <Spacer y={0.7} />
          {renderExpandedCheckText()}
        </Modal>
      )}
    </>
  );
};

const PanelFilter = styled.div<{ isActive: boolean }>`
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 10px 15px;
  cursor: pointer;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid ${(props) => (props.isActive ? "#fefefe" : "#494b4f")};
  :hover {
    ${(props) => !props.isActive && "border: 1px solid #7a7b80;"}
  }
`;

const ActionRequired = styled.div`
  > i {
    font-size: 15px;
    color: #aaaabb;
    cursor: pointer;
    :hover {
      color: #ffffff;
    }
  }
  display: flex;
  align-items: center;
`;
