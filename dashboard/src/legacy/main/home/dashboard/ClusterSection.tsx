import React, { useState, useContext } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";

import Banner from "components/porter/Banner";

import ProvisionerFlow from "components/ProvisionerFlow";
import ClusterList from "./ClusterList";
import TitleSection from "components/TitleSection";
import Spacer from "components/porter/Spacer";

type Props = {};

const ClusterSection = (props: Props) => {
  const { usage, currentCluster } = useContext(Context);

  const [currentStep, setCurrentStep] = useState("");

  if (currentStep === "cloud") {
    return (
      <>
        <TitleSection handleNavBack={() => setCurrentStep("")}>
          <Title>
            <ClusterIcon>
              <svg
                width="19"
                height="19"
                viewBox="0 0 19 19"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15.207 12.4403C16.8094 12.4403 18.1092 11.1414 18.1092 9.53907C18.1092 7.93673 16.8094 6.63782 15.207 6.63782"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.90217 12.4403C2.29983 12.4403 1 11.1414 1 9.53907C1 7.93673 2.29983 6.63782 3.90217 6.63782"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9.54993 13.4133C7.4086 13.4133 5.69168 11.6964 5.69168 9.55417C5.69168 7.41284 7.4086 5.69592 9.54993 5.69592C11.6913 5.69592 13.4082 7.41284 13.4082 9.55417C13.4082 11.6964 11.6913 13.4133 9.54993 13.4133Z"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.66895 15.207C6.66895 16.8094 7.96787 18.1092 9.5702 18.1092C11.1725 18.1092 12.4715 16.8094 12.4715 15.207"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.66895 3.90217C6.66895 2.29983 7.96787 1 9.5702 1C11.1725 1 12.4715 2.29983 12.4715 3.90217"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.69591 9.54996C5.69591 7.40863 7.41283 5.69171 9.55508 5.69171C11.6964 5.69171 13.4133 7.40863 13.4133 9.54996C13.4133 11.6913 11.6964 13.4082 9.55508 13.4082C7.41283 13.4082 5.69591 11.6913 5.69591 9.54996Z"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </ClusterIcon>
            Provision a new cluster
          </Title>
        </TitleSection>
        <Spacer y={1} />
        <Banner>
          You have currently provisioned {usage?.current.cluster || "0"} out of{" "}
          {usage?.limit.clusters || "0"} clusters for this project.
        </Banner>
        <Br />
        <ProvisionerFlow />
      </>
    );
  }
  return (
    <>
      {(usage?.current.cluster > 1 || !currentCluster) && (
        <Button onClick={() => setCurrentStep("cloud")}>
          <i className="material-icons">add</i> Create a cluster
        </Button>
      )}
      <ClusterList />
    </>
  );
};

export default ClusterSection;

const Br = styled.div<{ height?: string }>`
  width: 100%;
  height: ${(props) => props.height || "30px"};
`;

const ClusterIcon = styled.div`
  > svg {
    width: 20px;
    display: flex;
    align-items: center;
    margin-bottom: -1x;
    margin-right: 15px;
    color: #ffffff;
  }
`;

const Title = styled.div`
  font-size: 20px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  margin-left: 5px;
  border-radius: 2px;
  color: #ffffff;
  display: flex;
  align-items: center;
`;

const Button = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 5px;
  font-weight: 500;
  width: 147px;
  margin-bottom: 30px;
  color: white;
  height: 30px;
  padding: 0 8px;
  padding-right: 13px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;
