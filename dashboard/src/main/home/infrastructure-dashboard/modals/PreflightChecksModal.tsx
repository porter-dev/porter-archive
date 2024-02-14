import React, { useState } from "react";
import styled from "styled-components";

import { Error as ErrorComponent } from "components/porter/Error";
import Link from "components/porter/Link";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import StatusDot from "components/porter/StatusDot";
import Step from "components/porter/Step";
import Text from "components/porter/Text";
import { type ClientPreflightCheck } from "lib/clusters/types";

type ItemProps = {
  preflightCheck: ClientPreflightCheck;
};
const CheckItem: React.FC<ItemProps> = ({ preflightCheck }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <CheckItemContainer>
      <CheckItemTop
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
      >
        <StatusDot
          status={preflightCheck.error != null ? "failing" : "available"}
        />
        <Spacer inline x={1} />
        <Text style={{ marginLeft: "10px", flex: 1 }}>
          {preflightCheck.title}
        </Text>
        <ExpandIcon className="material-icons" isExpanded={isExpanded}>
          arrow_drop_down
        </ExpandIcon>
      </CheckItemTop>
      {isExpanded && preflightCheck.error && (
        <div>
          <ErrorComponent
            message={preflightCheck.error.detail}
            ctaText={"Troubleshooting steps"}
            errorModalContents={errorMessageToModal(
              preflightCheck.error.detail
            )}
          />
          <Spacer y={0.5} />
          {preflightCheck.error.metadata &&
            Object.entries(preflightCheck.error.metadata).map(
              ([key, value]) => (
                <>
                  <div key={key}>
                    <ErrorMessageLabel>{key}:</ErrorMessageLabel>
                    <ErrorMessageContent>{value}</ErrorMessageContent>
                  </div>
                </>
              )
            )}
        </div>
      )}
    </CheckItemContainer>
  );
};

type Props = {
  onClose: () => void;
  preflightChecks: ClientPreflightCheck[];
};
const PreflightChecksModal: React.FC<Props> = ({
  onClose,
  preflightChecks,
}) => {
  return (
    <Modal width="600px" closeModal={onClose}>
      <AppearingDiv>
        <Text size={16}>Cluster provision check</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          Your account does not have enough resources to provision this cluster.
          Please correct the issue by addressing the troubleshooting steps, or
          change your cluster configuration and re-provision.
        </Text>
        <Spacer y={1} />
        {preflightChecks.map((pfc) => (
          <CheckItem preflightCheck={pfc} key={pfc.title} />
        ))}
      </AppearingDiv>
    </Modal>
  );
};

export default PreflightChecksModal;

const AppearingDiv = styled.div<{ color?: string }>`
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  display: flex;
  flex-direction: column;
  color: ${(props) => props.color || "#ffffff44"};

  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const CheckItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 5px;
  font-size: 13px;
  width: 100%;
  margin-bottom: 10px;
  padding-left: 10px;
  cursor: pointer;
  background: ${(props) => props.theme.clickable.bg};
`;

const CheckItemTop = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  background: ${(props) => props.theme.clickable.bg};
`;

const ExpandIcon = styled.i<{ isExpanded: boolean }>`
  margin-left: 8px;
  color: #ffffff66;
  font-size: 20px;
  cursor: pointer;
  border-radius: 20px;
  transform: ${(props) => (props.isExpanded ? "" : "rotate(-90deg)")};
`;
const ErrorMessageLabel = styled.span`
  font-weight: bold;
  margin-left: 10px;
`;
const ErrorMessageContent = styled.div`
  font-family: "Courier New", Courier, monospace;
  padding: 5px 10px;
  border-radius: 4px;
  margin-left: 10px;
  user-select: text;
  cursor: text;
`;

const AWS_LOGIN_ERROR_MESSAGE =
  "Porter could not access your AWS account. Please make sure you have granted permissions and try again.";
const AWS_EIP_QUOTA_ERROR_MESSAGE =
  "Your AWS account has reached the limit of elastic IPs allowed in the region. Additional addresses must be requested in order to provision.";
const AWS_VPC_QUOTA_ERROR_MESSAGE =
  "Your AWS account has reached the limit of VPCs allowed in the region. Additional VPCs must be requested in order to provision.";
const AWS_NAT_GATEWAY_QUOTA_ERROR_MESSAGE =
  "Your AWS account has reached the limit of NAT Gateways allowed in the region. Additional NAT Gateways must be requested in order to provision.";
const AWS_VCPU_QUOTA_ERROR_MESSAGE =
  "Your AWS account has reached the limit of vCPUs allowed in the region. Additional vCPUs must be requested in order to provision.";
const DEFAULT_ERROR_MESSAGE =
  "An error occurred while provisioning your infrastructure. Please try again.";

const errorMessageToModal = (errorMessage: string) => {
  switch (errorMessage) {
    case AWS_LOGIN_ERROR_MESSAGE:
      return (
        <>
          <Text size={16} weight={500}>
            Granting Porter access to AWS
          </Text>
          <Spacer y={1} />
          <Text color="helper">
            Porter needs access to your AWS account in order to create
            infrastructure. You can grant Porter access to AWS by following
            these steps:
          </Text>
          <Spacer y={1} />
          <Step number={1}>
            <Link
              to="https://aws.amazon.com/resources/create-account/"
              target="_blank"
            >
              Create an AWS account
            </Link>
            <Spacer inline width="5px" />
            if you don't already have one.
          </Step>
          <Spacer y={1} />
          <Step number={2}>
            Once you are logged in to your AWS account,
            <Spacer inline width="5px" />
            <Link
              to="https://console.aws.amazon.com/billing/home?region=us-east-1#/account"
              target="_blank"
            >
              copy your account ID
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={3}>
            Fill in your account ID on Porter and select "Grant permissions".
          </Step>
          <Spacer y={1} />
          <Step number={4}>
            After being redirected to AWS, select "Create stack" on the AWS
            console.
          </Step>
          <Spacer y={1} />
          <Step number={5}>Return to Porter and select "Continue".</Step>
        </>
      );
    case AWS_EIP_QUOTA_ERROR_MESSAGE:
      return (
        <>
          <Text size={16} weight={500}>
            Requesting more EIP Adresses
          </Text>
          <Spacer y={1} />
          <Text color="helper">
            You will need to either request more EIP addresses or delete
            existing ones in order to provision in the region specified. You can
            request more addresses by following these steps:
          </Text>
          <Spacer y={1} />
          <Step number={1}>
            Log into
            <Spacer inline width="5px" />
            <Link
              to="https://console.aws.amazon.com/billing/home?region=us-east-1#/account"
              target="_blank"
            >
              your AWS account
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={2}>
            Navigate to
            <Spacer inline width="5px" />
            <Link
              to="https://us-east-1.console.aws.amazon.com/servicequotas/home/services/ec2/quotas"
              target="_blank"
            >
              the Amazon Elastic Compute Cloud (Amazon EC2) Service Quotas
              portal
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={3}>
            Search for "EC2-VPC Elastic IPs" in the search box and click on the
            search result.
          </Step>
          <Spacer y={1} />
          <Step number={4}>
            Click on "Request quota increase". In order to provision with
            Porter, you will need to request at least 3 addresses above your
            current quota limit.
          </Step>
          <Spacer y={1} />
          <Step number={5}>
            Once that request is approved, return to Porter and retry the
            provision.
          </Step>
        </>
      );
    case AWS_VPC_QUOTA_ERROR_MESSAGE:
      return (
        <>
          <Text size={16} weight={500}>
            Requesting more VPCs
          </Text>
          <Spacer y={1} />
          <Text color="helper">
            You will need to either request more VPCs or delete existing ones in
            order to provision in the region specified. You can request more
            VPCs by following these steps:
          </Text>
          <Spacer y={1} />
          <Step number={1}>
            Log into
            <Spacer inline width="5px" />
            <Link
              to="https://console.aws.amazon.com/billing/home?region=us-east-1#/account"
              target="_blank"
            >
              your AWS account
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={2}>
            Navigate to
            <Spacer inline width="5px" />
            <Link
              to="https://us-east-1.console.aws.amazon.com/servicequotas/home/services/vpc/quotas"
              target="_blank"
            >
              the Amazon Virtual Private Cloud (Amazon VPC) Service Quotas
              portal
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={3}>
            Search for "VPCs per Region" in the search box and click on the
            search result.
          </Step>
          <Spacer y={1} />
          <Step number={4}>
            Click on "Request quota increase". In order to provision with
            Porter, you will need to request at least 1 VPCs above your current
            quota limit.
          </Step>
          <Spacer y={1} />
          <Step number={5}>
            Once that request is approved, return to Porter and retry the
            provision.
          </Step>
        </>
      );
    case AWS_NAT_GATEWAY_QUOTA_ERROR_MESSAGE:
      return (
        <>
          <Text size={16} weight={500}>
            Requesting more NAT Gateways
          </Text>
          <Spacer y={1} />
          <Text color="helper">
            You will need to either request more NAT Gateways or delete existing
            ones in order to provision in the region specified. You can request
            more NAT Gateways by following these steps:
          </Text>
          <Spacer y={1} />
          <Step number={1}>
            Log into
            <Spacer inline width="5px" />
            <Link
              to="https://console.aws.amazon.com/billing/home?region=us-east-1#/account"
              target="_blank"
            >
              your AWS account
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={2}>
            Navigate to
            <Spacer inline width="5px" />
            <Link
              to="https://us-east-1.console.aws.amazon.com/servicequotas/home/services/vpc/quotas"
              target="_blank"
            >
              the Amazon Virtual Private Cloud (Amazon VPC) Service Quotas
              portal
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={3}>
            Search for "NAT gateways per Availability Zone" in the search box
            and click on the search result.
          </Step>
          <Spacer y={1} />
          <Step number={4}>
            Click on "Request quota increase". In order to provision with
            Porter, you will need to request at least 3 NAT Gateways above your
            current quota limit.
          </Step>
          <Spacer y={1} />
          <Step number={5}>
            Once that request is approved, return to Porter and retry the
            provision.
          </Step>
        </>
      );
    case AWS_VCPU_QUOTA_ERROR_MESSAGE:
      return (
        <>
          <Text size={16} weight={500}>
            Requesting more vCPUs
          </Text>
          <Spacer y={1} />
          <Text color="helper">
            You will need to either request more vCPUs or delete existing
            instances in order to provision in the region specified. You can
            request more vCPUs by following these steps:
          </Text>
          <Spacer y={1} />
          <Step number={1}>
            Log into
            <Spacer inline width="5px" />
            <Link
              to="https://console.aws.amazon.com/billing/home?region=us-east-1#/account"
              target="_blank"
            >
              your AWS account
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={2}>
            Navigate to
            <Spacer inline width="5px" />
            <Link
              to="https://us-east-1.console.aws.amazon.com/servicequotas/home/services/ec2/quotas"
              target="_blank"
            >
              the Amazon Elastic Compute Cloud (Amazon EC2) Service Quotas
              portal
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={3}>
            Search for "Running On-Demand Standard (A, C, D, H, I, M, R, T, Z)
            instances" in the search box and click on the search result.
          </Step>
          <Spacer y={1} />
          <Step number={4}>
            Click on "Request quota increase". In order to provision with
            Porter, you will need to request at least 10 vCPUs above your
            current quota limit.
          </Step>
          <Spacer y={1} />
          <Step number={5}>
            Once that request is approved, return to Porter and retry the
            provision.
          </Step>
        </>
      );
    default:
      return null;
  }
};
