import React, { useMemo, useState } from "react";
import { integrationList } from "shared/common";
import styled from "styled-components";
import { SupportedProviders } from "../types";
import Selector from "components/Selector";

export type ProviderSelectorProps = {
  selectProvider: (
    provider: SupportedProviders | (SupportedProviders | "external")
  ) => void;
  enableExternal?: boolean;
  enableSkip?: boolean;
};

const baseOptions = [
  {
    value: "aws",
    icon: integrationList["aws"].icon,
    label: "Amazon Elastic Container Registry (ECR)",
  },
  {
    value: "gcp",
    icon: integrationList["gcp"].icon,
    label: "Google Cloud Registry (GCR)",
  },
  {
    value: "do",
    icon: integrationList["do"].icon,
    label: "DigitalOcean Container Registry (DOCR)",
  },
];

const skipOption = {
  value: "skip",
  label: "Skip / I don't know what this is",
  icon: "",
};

const externalOption = {
  value: "external",
  icon: integrationList["kubernetes"].icon,
  label: "Link to an existing cluster",
};

const dummyOption = {
  value: "dummy",
  icon: "",
  label: "Select a provider",
};

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectProvider,
  enableExternal,
  enableSkip,
}) => {
  const [provider, setProvider] = useState(() => {
    if (enableSkip) {
      return "skip";
    }

    return "dummy";
  });

  const availableOptions = useMemo(() => {
    let options = [...baseOptions];
    if (enableSkip) {
      // Check if dummy option was deleted or not
      const dummyOptionIndex = options.findIndex((o) => o.value === "dummy");
      if (dummyOptionIndex >= 0) {
        options.splice(dummyOptionIndex, 1);
      }
      options.unshift(skipOption);
    } else {
      // Check if skip option was deleted or not
      const skipOptionIndex = options.findIndex((o) => o.value === "skip");
      if (skipOptionIndex >= 0) {
        options.splice(skipOptionIndex, 1);
      }
      if (!options.find((o) => o.value === "dummy")) {
        options.unshift(dummyOption);
      }
    }

    if (enableExternal) {
      if (!options.find((o) => o.value === "external")) {
        options.push(externalOption);
      }
    }

    return [...options];
  }, [enableSkip, enableExternal]);

  return (
    <>
      <Br />
      <Selector
        activeValue={provider}
        options={availableOptions}
        setActiveValue={(provider) => {
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
