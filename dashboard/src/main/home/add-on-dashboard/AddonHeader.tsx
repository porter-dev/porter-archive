import React from "react";
import styled from "styled-components";

import Banner from "components/porter/Banner";
import Spacer from "components/porter/Spacer";
import TitleSection from "components/TitleSection";

import { useAddonContext } from "./AddonContextProvider";

const AddonHeader: React.FC = () => {
  const { addon } = useAddonContext();
  return (
    <HeaderWrapper>
      <TitleSection icon={addon.template.icon} iconWidth="33px">
        {addon.name.value}
        {/* <DeploymentType currentChart={currentChart} /> */}
      </TitleSection>

      <InfoWrapper>
        {/*
          <StatusIndicator
            controllers={controllers}
            status={currentChart.info.status}
            margin_left={"0px"}
          />
          */}
        {/* {!templateWhitelist.includes(currentChart.chart.metadata.name) &&
            <><DeployStatusSection
              chart={currentChart}
              setLogData={renderLogsAtTimestamp} /><LastDeployed>
                <Dot>•</Dot>Last deployed
                {" " + getReadableDate(currentChart.info.last_deployed)}
              </LastDeployed></>
          } */}
      </InfoWrapper>
    </HeaderWrapper>
  );
};

export default AddonHeader;

const HeaderWrapper = styled.div`
  position: relative;
`;

const Dot = styled.div`
  margin-right: 16px;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-left: 3px;
  margin-top: 22px;
`;

const LastDeployed = styled.div`
  font-size: 13px;
  margin-left: 8px;
  margin-top: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

const TagWrapper = styled.div`
  height: 20px;
  font-size: 12px;
  display: flex;
  margin-left: 15px;
  margin-bottom: -3px;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff44;
  border: 1px solid #ffffff44;
  border-radius: 3px;
  padding-left: 5px;
  background: #26282e;
`;

const NamespaceTag = styled.div`
  height: 20px;
  margin-left: 6px;
  color: #aaaabb;
  background: #43454a;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 6px;
  padding-left: 7px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
`;

const BannerContents = styled.div`
  display: flex;
  flex-direction: column;
  row-gap: 0.5rem;
`;
