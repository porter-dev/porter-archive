import React from "react";
import { integrationList } from "shared/common";
import styled from "styled-components";
import { SupportedProviders } from "../types";

export type ProviderSelectorProps = {
  selectProvider: (
    provider: SupportedProviders | (SupportedProviders | "external")
  ) => void;
  enableExternal?: boolean;
};

const providers: SupportedProviders[] = ["aws", "gcp", "do"];

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectProvider,
  enableExternal,
}) => {
  return (
    <>
      <BlockList>
        {providers.map((provider, i: number) => {
          let providerInfo = integrationList[provider];
          return (
            <Block
              key={i}
              onClick={() => {
                selectProvider(provider);
              }}
            >
              <Icon src={providerInfo.icon} />
              <BlockTitle>{providerInfo.label}</BlockTitle>
              <CostSection
                onClick={(e) => {
                  e.stopPropagation();
                  selectProvider(provider);
                }}
              ></CostSection>
              <BlockDescription>Hosted in your own cloud.</BlockDescription>
            </Block>
          );
        })}
        {enableExternal && (
          <Block
            key={"external"}
            onClick={() => {
              selectProvider("external");
            }}
          >
            <Icon src={""} />
            <BlockTitle>External Cluster</BlockTitle>
            <CostSection
              onClick={(e) => {
                e.stopPropagation();
                selectProvider("external");
              }}
            ></CostSection>
            <BlockDescription>
              Connect your own cluster via CLI.
            </BlockDescription>
          </Block>
        )}
      </BlockList>
    </>
  );
};

export default ProviderSelector;

const CostSection = styled.p`
  position: absolute;
  left: 0;
`;

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
  height: 42px;
  margin-top: 30px;
  margin-bottom: 15px;
  filter: ${(props) => (props.bw ? "grayscale(1)" : "")};
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
  border-radius: 5px;
  display: flex;
  font-size: 13px;
  overflow: hidden;
  font-weight: 500;
  padding: 3px 0px 5px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 170px;
  cursor: ${(props) => (props.disabled ? "" : "pointer")};
  color: #ffffff;
  position: relative;
  background: #26282f;
  box-shadow: 0 3px 5px 0px #00000022;
  :hover {
    background: ${(props) => (props.disabled ? "" : "#ffffff11")};
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

const BlockDescription = styled.div`
  margin-bottom: 12px;
  color: #ffffff66;
  text-align: center;
  font-weight: default;
  font-size: 13px;
  padding: 0px 25px;
  height: 2.4em;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;
