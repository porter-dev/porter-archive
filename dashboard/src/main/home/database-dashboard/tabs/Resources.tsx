import React from "react";
import styled from "styled-components";

import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import { type InstanceTier, type ResourceOption } from "../forms/types";

type Props = {
  options: ResourceOption[];
  selected: InstanceTier;
  onSelect: (option: ResourceOption) => void;
  highlight: "storage" | "ram";
};

const Resources: React.FC<Props> = ({
  options,
  selected,
  onSelect,
  highlight,
}) => {
  return (
    <ResourcesContainer>
      {options.map((o) => {
        return (
          <StyledResourceOption
            key={o.tier}
            selected={o.tier === selected}
            onClick={() => {
              onSelect(o);
            }}
          >
            {highlight === "storage" ? (
              <>
                <Container row>
                  <Text>{o.label}</Text>
                  <Spacer inline width="5px" />
                  <Text color="helper">
                    - {o.cpuCores} CPU, {o.ramGigabytes} GB RAM
                  </Text>
                </Container>
                <StorageTag>{o.storageGigabytes} GB Storage</StorageTag>
              </>
            ) : (
              <>
                <Container row>
                  <Text>{o.label}</Text>
                  <Spacer inline width="5px" />
                  <Text color="helper">- {o.cpuCores} CPU</Text>
                </Container>
                <StorageTag>{o.ramGigabytes} GB RAM</StorageTag>
              </>
            )}
          </StyledResourceOption>
        );
      })}
    </ResourcesContainer>
  );
};

export default Resources;

const ResourcesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const StyledResourceOption = styled.div<{ selected?: boolean }>`
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid
    ${(props) => (props.selected ? "#ffffff" : props.theme.border)};
  width: 350px;
  padding: 10px 15px;
  border-radius: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  :hover {
    border: 1px solid #ffffff;
  }
`;

const StorageTag = styled.div`
  background: #202227;
  color: #aaaabb;
  border-radius: 5px;
  padding: 5px 10px;
  font-size: 13px;
  margin-left: 5px;
`;
