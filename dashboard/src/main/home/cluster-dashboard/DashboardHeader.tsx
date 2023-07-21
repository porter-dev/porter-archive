import React, { useContext } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";

import TitleSection from "components/TitleSection";
import Spacer from "components/porter/Spacer";
import Tooltip from "components/porter/Tooltip";
import Container from "components/porter/Container";
import ClusterSelector from "../ClusterSelector";

type PropsType = {
  image?: any;
  title: any;
  description?: any;
  materialIconClass?: string;
  disableLineBreak?: boolean;
  capitalize?: boolean;
  prefix?: any;
  enableMultiCluster?: boolean;
};

const DashboardHeader: React.FC<PropsType> = ({
  image,
  title,
  description,
  materialIconClass,
  disableLineBreak,
  capitalize = true,
  prefix,
  enableMultiCluster,
}) => {
  const context = useContext(Context);

  return (
    <>
      <Container row>
        {prefix}
        <TitleSection capitalize={capitalize} icon={image} materialIconClass={materialIconClass}>
          {title}
        </TitleSection>
      </Container>

      {description && (
        <>
          <Spacer height="35px" />
          <InfoSection>
            <TopRow>
              <Tooltip content="TestInfo" position="bottom" hidden={true}>
                <InfoLabel>
                  <i className="material-icons">info</i> Info
                </InfoLabel>
              </Tooltip>
            </TopRow>
            <Description>{description}</Description>
          </InfoSection>
        </>
      )}
      {context.currentProject?.simplified_view_enabled && enableMultiCluster && (
        <><ClusterSelector /></>
      )}
      <Spacer height="35px" />
    </>
  );
};

export default DashboardHeader;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 1px;
  background: #494b4f;
  width: 100%;
  margin: 10px 0px 15px;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const Description = styled.div`
  color: #aaaabb;
  margin-top: 13px;
  margin-left: 1px;
  font-size: 13px;
`;

const InfoLabel = styled.div`
  width: 72px;
  height: 20px;
  display: flex;
  align-items: center;
  color: #aaaabb;
  font-size: 13px;
  > i {
    color: #aaaabb;
    font-size: 18px;
    margin-right: 5px;
  }
`;

const InfoSection = styled.div`
  font-family: "Work Sans", sans-serif;
  margin-left: 0px;
`;

const ClusterLabel = styled.div`
  color: #ffffff22;
  font-size: 14px;
  text-transform: none;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
