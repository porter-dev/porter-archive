import React, { useState, useContext } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";

import express from "assets/express.svg";
import standard from "assets/standard.svg";
import bullet from "assets/bullet.svg";

import Modal from "./porter/Modal";
import Text from "./porter/Text";
import Spacer from "./porter/Spacer";
import Fieldset from "./porter/Fieldset";
import Button from "./porter/Button";
import ExpandableSection from "./porter/ExpandableSection";
import Input from "./porter/Input";
import Link from "./porter/Link";
import Container from "./porter/Container";

type Props = {
  setCurrentStep: (step: string) => void;
  setShowCostConfirmModal: (show: boolean) => void;
  markCostConsentComplete: () => void;
};

const AWSCostConsent: React.FC<Props> = ({
  setCurrentStep,
  setShowCostConfirmModal,
  markCostConsentComplete,
}) => {
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [confirmCost, setConfirmCost] = useState("");

  if (selectedProfile === "") {
    return (
      <>
        <Modal
          width="700px"
          closeModal={() => {
            setConfirmCost("");
            setShowCostConfirmModal(false);
          }}
        >
          <Text size={16}>Select your Porter tier</Text>
          <Spacer y={1} />
          <Container row>
            <ProfileWrapper onClick={() => { setSelectedProfile("express") }}>
              <BadgeWrapper>
                <BadgeBg />
                <Badge>
                  <Icon src={express} />
                  Express
                </Badge>
              </BadgeWrapper>
              <Spacer y={1} />
              <Text>Free forever</Text>
              <Spacer y={2} />
              <Text>Features:</Text>
              <Spacer y={.5} />
              <Text color="helper"><Bullet src={bullet}></Bullet>Unlimited resources</Text>
              <Spacer y={.5} />
              <Text color="helper"><Bullet src={bullet}></Bullet>Unlimited applications</Text>
              <Spacer y={.5} />
              <Text color="helper"><Bullet src={bullet}></Bullet>Unlimited builds</Text>
              <Spacer y={.5} />
              <Text color="helper"><Bullet src={bullet}></Bullet>Up to 3 users</Text>
              <Spacer y={.5} />
              <Text color="helper"><Bullet src={bullet}></Bullet>One-click ejection to Standard</Text>
            </ProfileWrapper>
            <Spacer inline width="20px" />
            <ProfileWrapper onClick={() => { setSelectedProfile("standard") }}>
              <BadgeWrapper>
                <BadgeBg />
                <Badge>
                  <Icon src={standard} />
                  Standard
                </Badge>
              </BadgeWrapper>
              <Spacer y={1} />
              <Text>$6/mo <Text color="helper">per GB RAM</Text></Text>
              <Spacer height="5px" />
              <Text>$13/mo <Text color="helper">per vCPU</Text></Text>
              <Spacer y={1} />
              <Text>Features:</Text>
              <Spacer y={.5} />
              <Text color="helper"><Bullet src={bullet}></Bullet>Everything in Express</Text>
              <Spacer y={.5} />
              <Text color="helper"><Bullet src={bullet}></Bullet>Alerts (Slack + Email)</Text>
              <Spacer y={.5} />
              <Text color="helper"><Bullet src={bullet}></Bullet>GPU support</Text>
              <Spacer y={.5} />
              <Text color="helper"><Bullet src={bullet}></Bullet>Preview environments</Text>
              <Spacer y={.5} />
              <Text color="helper"><Bullet src={bullet}></Bullet>Team permissions</Text>
            </ProfileWrapper>
          </Container>
        </Modal>
      </>
    )
  }

  if (selectedProfile === "express") {
    return (
      <>
        <Modal
          width="700px"
          closeModal={() => {
            setConfirmCost("");
            setShowCostConfirmModal(false);
          }}
        >
          <Text size={16}>Porter Express AWS cost consent</Text>
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
            Header={<Cost>$150? / mo</Cost>}
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
              setShowCostConfirmModal(false);
              setConfirmCost("");
              markCostConsentComplete();
              setCurrentStep("credentials");
            }}
          >
            Continue
          </Button>
        </Modal>
      </>
    );
  };

  return (
    <>
      <Modal
        width="700px"
        closeModal={() => {
          setConfirmCost("");
          setShowCostConfirmModal(false);
        }}
      >
        <Text size={16}>Porter Standard AWS cost consent</Text>
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
            setShowCostConfirmModal(false);
            setConfirmCost("");
            markCostConsentComplete();
            setCurrentStep("credentials");
          }}
        >
          Continue
        </Button>
      </Modal>
    </>
  );
};

export default AWSCostConsent;

const Bullet = styled.img`
  height: 10px;
  margin-right: 10px;
  margin-left: 5px;
`;

const Icon = styled.img`
  height: 18px;
  margin-right: 10px;
`;

const BadgeBg = styled.div`
  position: absolute;
  top: -1px;
  left: -1px;
  width: calc(100% + 2px);
  height: 32px;
  border-radius: 30px;
  z-index: -1;
  background: linear-gradient(20deg, #444550, 90%, #BEBEC1);
`;

const BadgeWrapper = styled.div`
  position: relative;
  z-index: 2;
`;

const Badge = styled.div`
  height: 30px;
  border-radius: 30px;
  font-size: 14px;
  background: ${({ theme }) => theme.fg};
  display: flex;
  align-items: center;
  padding: 0 10px;
  z-index: 999;
`;

const ProfileWrapper = styled.div`
  flex: 1;
  padding: 25px;
  border-radius: 10px;
  background: ${({ theme }) => theme.clickable.bg};
  border: 1px solid #494b4f;
  font-size: 13px;
  cursor: pointer;
  :hover {
    border: ${(props) => (props.disabled ? "" : "1px solid #7a7b80")};
  }
  height: 400px;
`;

const Cost = styled.div`
  font-weight: 600;
  font-size: 20px;
`;

const Tab = styled.span`
  margin-left: 20px;
  height: 1px;
`;
