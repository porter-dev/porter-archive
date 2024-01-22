import React, { Fragment, useContext, useMemo, useState } from "react";
import { Contract, EKS, EKSLogging } from "@porter-dev/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { match } from "ts-pattern";

import Banner from "components/porter/Banner";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import ExpandableSection from "components/porter/ExpandableSection";
import Fieldset from "components/porter/Fieldset";
import Image from "components/porter/Image";
import Input from "components/porter/Input";
import Link from "components/porter/Link";
import Modal from "components/porter/Modal";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import {
  useComplianceChecks,
  type VendorCheck,
} from "lib/hooks/useComplianceChecks";
import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";

import api from "shared/api";
import { Context } from "shared/Context";
import aws from "assets/aws.png";
import compliance from "assets/compliance.svg";
import framework from "assets/framework.svg";
import greenCheck from "assets/green-check.svg";
import linkExternal from "assets/link-external.svg";
import loading from "assets/loading.gif";
import notApplicable from "assets/not-applicable.svg";
import provider from "assets/provider.svg";
import refresh from "assets/refresh.png";
import typeSvg from "assets/type.svg";
import vanta from "assets/vanta.svg";
import warning from "assets/warning.svg";

const ComplianceDashboard: React.FC = () => {
  const { currentProject, currentCluster } = useContext(Context);
  const queryClient = useQueryClient();

  const [updateLoading, setUpdateLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmCost, setConfirmCost] = useState("");
  const [showCostConsentModal, setShowCostConsentModal] = useState(false);
  const [showExpandedErrorModal, setShowExpandedErrorModal] = useState(false);
  const [expandedCheck, setExpandedCheck] = useState<VendorCheck | null>(null);

  const { vendorChecks, actionRequired, provisioningStatus, latestContract } =
    useComplianceChecks();

  const contractProto = useMemo(() => {
    if (!latestContract) {
      return null;
    }

    return Contract.fromJsonString(atob(latestContract?.base64_contract), {
      ignoreUnknownFields: true,
    });
  }, [latestContract?.base64_contract]);

  const updateContractWithSOC2 = async (): Promise<void> => {
    try {
      if (!contractProto || !currentProject) {
        return;
      }

      setUpdateLoading(true);

      if (!contractProto.cluster) {
        return;
      }

      const updatedKindValues = match(contractProto.cluster.kindValues)
        .with({ case: "eksKind" }, ({ value }) => ({
          case: "eksKind" as const,
          value: new EKS({
            ...value,
            enableKmsEncryption: true,
            enableEcrScanning: true,
            logging: new EKSLogging({
              enableApiServerLogs: true,
              enableAuditLogs: true,
              enableAuthenticatorLogs: true,
              enableCloudwatchLogsToS3: true,
              enableControllerManagerLogs: true,
              enableSchedulerLogs: true,
            }),
          }),
        }))
        .otherwise((kind) => kind);

      const updatedContract = new Contract({
        ...contractProto,
        cluster: {
          ...contractProto.cluster,
          kindValues: updatedKindValues,
          isSoc2Compliant: true,
        },
      });

      await api.createContract("<token>", updatedContract, {
        project_id: currentProject.id,
      });

      await queryClient.invalidateQueries([
        currentProject?.id,
        currentCluster?.id,
        "getContracts",
      ]);
    } catch (err) {
    } finally {
      setUpdateLoading(false);
      setShowCostConsentModal(false);
    }
  };
  return (
    <StyledComplianceDashboard>
      <DashboardHeader
        image={compliance}
        title="Compliance"
        description="Configure your Porter infrastructure for various compliance frameworks."
        disableLineBreak
      />
      {currentCluster?.status === "UPDATING_UNAVAILABLE" ? (
        <ClusterProvisioningPlaceholder />
      ) : (
        <>
          <Container row>
            <Select
              options={[
                { value: "soc-2", label: "SOC 2" },
                { value: "hipaa", label: "HIPAA (request access)", disabled: true },
              ]}
              width="200px"
              value={"soc-2"}
              setValue={() => {}}
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
                { value: "azure", label: "Azure (coming soon)", disabled: true },
              ]}
              width="180px"
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
                { value: "vanta", label: "Vanta", icon: vanta },
                { value: "drata", label: "Drata (coming soon)", disabled: true },
                {
                  value: "oneleet",
                  label: "Oneleet (coming soon)",
                  disabled: true,
                },
              ]}
              width="200px"
              value={"vanta"}
              setValue={() => {}}
              prefix={
                <Container row>
                  <Image src={provider} size={15} opacity={0.6} />
                  <Spacer inline x={0.5} />
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
                window.open(
                  "https://app.vanta.com/tests?framework=soc2&service=aws&taskType=TEST",
                  "_blank"
                );
              }}
            >
              AWS SOC 2 Controls (Vanta)
              <Spacer inline x={0.5} />
              <Image
                src={linkExternal}
                size={16}
                additionalStyles="margin-bottom: -2px"
              />
            </Text>
          </Container>

          <Spacer y={1} />

          {provisioningStatus.state === "pending" || updateLoading ? (
            <>
              <Banner
                icon={
                  <Image src={loading} style={{ height: "16px", width: "16px" }} />
                }
              >
                SOC 2 infrastructure controls are being enabled. Note: This may take
                up to 30 minutes.
              </Banner>
              <Spacer y={1} />
            </>
          ) : !contractProto?.cluster?.isSoc2Compliant &&
            actionRequired &&
            provisioningStatus.state === "success" ? (
            <>
              <Banner type="warning">
                Action is required to pass additional controls.
                <Spacer inline x={0.5} />
                <Text
                  style={{
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setShowCostConsentModal(true);
                  }}
                >
                  Enable SOC 2 infrastructure controls
                </Text>
              </Banner>
              <Spacer y={1} />
            </>
          ) : contractProto?.cluster?.isSoc2Compliant &&
            provisioningStatus.state === "failed" ? (
            <>
              <Banner type="error">
                An error occurred while applying updates to your infrastructure.
                <Spacer inline x={1} />
                <Text
                  style={{
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setShowExpandedErrorModal(true);
                  }}
                >
                  Learn more
                </Text>
                <Spacer inline x={1} />
                <Text
                  style={{
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    void updateContractWithSOC2();
                  }}
                >
                  <Image src={refresh} size={12} style={{ marginBottom: "-2px" }} />
                  <Spacer inline x={0.5} />
                  Retry update
                </Text>
              </Banner>
              <Spacer y={1} />
            </>
          ) : null}

          <Container row>
            <PanelFilter
              isActive={statusFilter === "all"}
              onClick={() => {
                setStatusFilter("all");
              }}
            >
              <Text color="helper">All</Text>
              <Spacer y={0.2} />
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
                <Spacer inline x={0.5} />
                <Text color="helper">Passing</Text>
              </Container>
              <Spacer y={0.2} />
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
                <Image src={warning} size={12} />
                <Spacer inline x={0.5} />
                <Text color="helper">Action required</Text>
              </Container>
              <Spacer y={0.2} />
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
                <Spacer inline x={0.5} />
                <Text color="helper">Not applicable</Text>
              </Container>
              <Spacer y={0.2} />
              <Text size={18}>25</Text>
            </PanelFilter>
          </Container>

          <Spacer y={1.5} />

          {vendorChecks.map((check, i) => {
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
                      window.open(check.link, "_blank");
                    }}
                  >
                    {check.check}
                    <Spacer inline x={0.5} />
                    <Image
                      src={linkExternal}
                      opacity={check.status === "not_applicable" ? 0.25 : 1}
                      size={12}
                      additionalStyles="margin-bottom: -2px"
                    />
                  </Text>
                </Container>
                <Spacer y={1} />
              </Fragment>
            );
          })}

          <Spacer y={2} />

          {showExpandedErrorModal && (
            <Modal
              closeModal={() => {
                setShowExpandedErrorModal(false);
              }}
            >
              <Container row>
                <Text size={16}>Error enabling AWS SOC 2 controls</Text>
              </Container>
              <Spacer y={0.7} />
              <Text color="helper">{provisioningStatus.message}</Text>
            </Modal>
          )}
          {expandedCheck && (
            <Modal
              closeModal={() => {
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
              <Text color="helper">
                Porter is unable to automatically resolve this control. Please
                follow xyz instructions in order to xyz.
              </Text>
            </Modal>
          )}
          {showCostConsentModal && (
            <Modal
              closeModal={() => {
                setShowCostConsentModal(false);
              }}
            >
              <Text size={16}>SOC 2 cost consent (TODO)</Text>
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
                      <Tab />+ Monitoring workloads: t3.large instance (1) =
                      $60.74/mo
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
                disabled={confirmCost !== "224.58" || !latestContract}
                onClick={() => {
                  setConfirmCost("");
                  void updateContractWithSOC2();
                }}
                status={updateLoading ? "loading" : undefined}
              >
                Enable SOC 2 infra controls
              </Button>
            </Modal>
          )}
        </>
      )}
    </StyledComplianceDashboard>
  );
};

export default ComplianceDashboard;

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

const Tab = styled.span`
  margin-left: 20px;
  height: 1px;
`;

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

const StyledComplianceDashboard = styled.div`
  width: 100%;
  height: 100%;
`;
