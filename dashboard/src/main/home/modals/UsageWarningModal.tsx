import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import Banner from "components/Banner";

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
    <>
      <Br />
        <Banner type="warning">
          Your project is currently exceeding its resource usage limit.
        </Banner>
      <Br />
      <DescriptionSection>
        {
          filteredUsage !== null && (
            <>
              <div>
                <Label>CPU Usage: </Label>
                <Stat isRed={filteredUsage.current["resource_cpu"] > filteredUsage.limit["resource_cpu"]}>
                  {filteredUsage.current["resource_cpu"]} / {filteredUsage.limit["resource_cpu"]} vCPU
                </Stat>
              </div>
              <div>
                <Label>RAM Usage: </Label> 
                <Stat isRed={filteredUsage.current["resource_memory"] > filteredUsage.limit["resource_memory"]}>
                  {filteredUsage.current["resource_memory"]/1000} / {filteredUsage.limit["resource_memory"]/1000} GB
                </Stat>
              </div>
            </>
          )
        }
      </DescriptionSection>
      <Helper>
        You have <b>7 days</b> to resolve this issue before your access to the dashboard is restricted.
      </Helper>
      <Helper>
        Have a question about billing? Email us at <a target="_blank" href="mailto:contact@porter.run">contact@porter.run</a>.
      </Helper>
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
    </>
  );
};

export default UpgradeChartModal;

const Helper = styled.div`
  color: #aaaabb;
  margin-top: 12px;
`;

const Label = styled.div`
  margin-bottom: 10px;
  font-weight: 500;
`;

const Stat = styled.div<{ isRed: boolean }>`
  font-size: 20px;
  margin-bottom: 25px;
  color: ${props => props.isRed ? "#ff385d" : "#ffffff"};
`;

const Br = styled.div`
  width: 100%;
  height: 5px;
`;

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
  margin-bottom: 35px;
`;