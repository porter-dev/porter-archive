import React, { useMemo, useRef, useState } from "react";
import { integrationList } from "shared/common";
import styled from "styled-components";
import { SupportedProviders } from "../types";
import Selector from "components/Selector";

export type ProviderSelectorProps = {
  selectProvider: (
    provider: SupportedProviders | (SupportedProviders | "external")
  ) => void;
  options: {
    value: string;
    icon: string;
    label: string;
  }[];
  defaultOption?: string;
};

export const registryOptions = [
  {
    value: "skip",
    label: "Skip / I don't know what this is",
    icon: "",
  },
  {
    value: "aws",
    icon: integrationList["ecr"]?.icon,
    label: "Amazon Elastic Container Registry (ECR)",
  },
  {
    value: "gcp",
    icon: integrationList["gcr"]?.icon,
    label: "Google Cloud Registry (GCR)",
  },
  {
    value: "gar",
    icon: integrationList["gcr"]?.icon,
    label: "Google Artifact Registry (GAR)",
  },
  {
    value: "do",
    icon: integrationList["do"]?.icon,
    label: "DigitalOcean Container Registry (DOCR)",
  },
];

export const provisionerOptions = [
  {
    value: "aws",
    icon: integrationList["aws"]?.icon,
    label: "Amazon Web Services (AWS)",
  },
  {
    value: "gcp",
    icon: integrationList["gcp"]?.icon,
    label: "Google Cloud Platform (GCP)",
  },

  {
    value: "do",
    icon: integrationList["do"]?.icon,
    label: "DigitalOcean (DO)",
  },
];

export const provisionerOptionsWithExternal = [
  ...provisionerOptions,
  {
    value: "external",
    icon: integrationList["kubernetes"]?.icon,
    label: "Link an existing cluster",
  },
];

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectProvider,
  options,
  defaultOption,
}) => {
  const [provider, setProvider] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const activeProvider = useMemo(() => {
    if (!isDirty || !provider) {
      if (typeof defaultOption === "string") {
        return defaultOption;
      }
      if (options.find((o) => o.value === "skip")) {
        return "skip";
      }
    }

    return provider;
  }, [provider, isDirty, defaultOption]);

  return (
    <>
      <Br />
      <Selector
        activeValue={activeProvider}
        options={options}
        placeholder="Select a cloud provider"
        setActiveValue={(provider) => {
          setIsDirty(true);
          setProvider(provider);
          selectProvider(provider as SupportedProviders);
        }}
        width="100%"
        height="45px"
      />
      <Br />
    </>
  );
};

export default ProviderSelector;

const Br = styled.div`
  width: 100%;
  height: 10px;
`;

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
  align-items: center;
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
