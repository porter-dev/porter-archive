import React, { useState } from "react";
import styled from "styled-components";

import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import {
  CloudProviderAWS,
  CloudProviderAzure,
  CloudProviderGCP,
} from "lib/clusters/constants";
import { type ClientCloudProvider } from "lib/clusters/types";

import lightning from "assets/lightning.png";

import CostConsentModal from "../modals/cost-consent/CostConsentModal";

type Props = {
  onComplete: (provider: ClientCloudProvider) => void;
};
const CloudProviderSelect: React.FC<Props> = ({ onComplete }) => {
  const [cloudProvider, setCloudProvider] = useState<
    ClientCloudProvider | undefined
  >(undefined);

  return (
    <div>
      <DashboardHeader
        image={lightning}
        title="Getting started"
        description="Select your existing cloud provider to get started with Porter."
        disableLineBreak
        capitalize={false}
      />
      <StyledProvisionerFlow>
        <BlockList>
          {[CloudProviderAWS, CloudProviderGCP, CloudProviderAzure].map(
            (provider: ClientCloudProvider, i: number) => {
              return (
                <Block
                  key={i}
                  onClick={() => {
                    setCloudProvider(provider);
                  }}
                >
                  <Icon src={provider.icon} />
                  <BlockTitle>{provider.name}</BlockTitle>
                  <BlockDescription>Hosted in your own cloud</BlockDescription>
                </Block>
              );
            }
          )}
        </BlockList>
      </StyledProvisionerFlow>
      {cloudProvider !== undefined && (
        <CostConsentModal
          cloudProvider={cloudProvider}
          onClose={() => {
            setCloudProvider(undefined);
          }}
          onComplete={() => {
            onComplete(cloudProvider);
          }}
        />
      )}
    </div>
  );
};

export default CloudProviderSelect;

const BlockList = styled.div`
  overflow: visible;
  margin-top: 25px;
  margin-bottom: 27px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const Icon = styled.img<{ bw?: boolean }>`
  height: 30px;
  margin-top: 30px;
  margin-bottom: 15px;
  filter: ${(props) => (props.bw ? "grayscale(1)" : "")};
`;

const BlockDescription = styled.div`
  margin-bottom: 12px;
  color: #ffffff66;
  text-align: center;
  font-weight: 400;
  font-size: 13px;
  padding: 0px 25px;
  height: 2.4em;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const BlockTitle = styled.div`
  margin-bottom: 12px;
  width: 80%;
  text-align: center;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Block = styled.div<{ disabled?: boolean }>`
  align-items: center;
  user-select: none;
  display: flex;
  font-size: 13px;
  overflow: hidden;
  font-weight: 500;
  padding: 3px 0px 5px;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 170px;
  filter: ${({ disabled }) => (disabled ? "brightness(0.8) grayscale(1)" : "")};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  color: #ffffff;
  position: relative;
  border-radius: 5px;
  background: ${({ theme }) => theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: ${(props) => (props.disabled ? "" : "1px solid #7a7b80")};
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const StyledProvisionerFlow = styled.div`
  margin-top: -24px;
`;
