import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import close from "assets/close.png";

import { Context } from "shared/Context";
import { UsageData } from "shared/types";
import { Link } from "react-router-dom";

const ReadableNameMap: {
  [key: string]: string;
} = {
  resource_cpu: "CPU",
  resource_memory: "Memory",
  clusters: "Cluster number",
  users: "Users on your team",
};

const filterExceeded = (usage: UsageData) => {
  console.log(usage);
  const current = usage.current;
  const limits = usage.limit;
  return Object.keys(usage.current).reduce((acc, key) => {
    if (!acc.current) {
      acc.current = {} as any;
    }
    if (!acc.limit) {
      acc.limit = {} as any;
    }
    if (current[key] > limits[key]) {
      acc.current[key] = current[key];
      acc.limit[key] = limits[key];
    }
    return acc;
  }, {} as Partial<UsageData>);
};

const UpgradeChartModal: React.FC<{}> = () => {
  const { setCurrentModal, currentModalData } = useContext(Context);
  const [usage, setUsage] = useState<UsageData>(null);
  const [filteredUsage, setFilteredUsage] = useState<Partial<UsageData>>(null);
  useEffect(() => {
    if (currentModalData.usage) {
      const currentUsage: UsageData = currentModalData.usage;
      console.log(currentModalData);
      setUsage(currentUsage);
    }
  }, [currentModalData?.usage]);

  useEffect(() => {
    if (usage) {
      setFilteredUsage(filterExceeded(usage));
    }
  }, [usage]);

  if (!usage || !filteredUsage) {
    return null;
  }
  console.log({ usage, filteredUsage });
  return (
    <StyledUpgradeChartModal>
      <CloseButton onClick={() => setCurrentModal(null, null)}>
        <CloseButtonImg src={close} />
      </CloseButton>
      <ModalTitle>Usage warning</ModalTitle>
      You're current project is currently exceeding its usage limits. Your usage
      limits are:
      <DescriptionSection>
        {filteredUsage !== null &&
          Object.entries(filteredUsage.limit).map(([key, value]) => {
            return (
              <div key={key}>
                <b>{ReadableNameMap[key]}:</b> {value}
              </div>
            );
          })}
      </DescriptionSection>
      Your project is currently using:
      <DescriptionSection>
        {filteredUsage !== null &&
          Object.entries(filteredUsage.current).map(([key, value]) => {
            return (
              <div key={key}>
                <b>{ReadableNameMap[key]}:</b> {value}
              </div>
            );
          })}
      </DescriptionSection>
      You have currently <b>7 days</b> to resolve this issue before you loose
      access to the Porter dashboard.
      <Button
        as={Link}
        to={{
          pathname: "/project-settings",
          search: "?selected_tab=billing",
        }}
        onClick={() => setCurrentModal(null, null)}
      >
        Take me to billing
      </Button>
    </StyledUpgradeChartModal>
  );
};

export default UpgradeChartModal;

const Button = styled.button`
  height: 35px;
  background: #616feecc;
  :hover {
    background: #505edddd;
  }
  color: white;
  font-weight: 500;
  font-size: 13px;
  padding: 10px 15px;
  border-radius: 3px;
  cursor: "pointer";
  box-shadow: 0 5px 8px 0px #00000010;
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-left: 10px;

  width: max-content;
  position: absolute;
  right: 20px;
  bottom: 20px;
`;

const DescriptionSection = styled.div`
  margin-top: 10px;
  margin-bottom: 10px;
`;

const ModalTitle = styled.div`
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: Work Sans, sans-serif;
  font-size: 24px;
  color: #ffffff;
  user-select: none;
  font-weight: 700;
  align-items: center;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const StyledUpgradeChartModal = styled.div`
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  padding: 25px 30px;
  overflow: hidden;
  border-radius: 6px;
  background: #202227;
  font-size: 13px;
  line-height: 1.8em;
  font-family: Work Sans, sans-serif;
`;
