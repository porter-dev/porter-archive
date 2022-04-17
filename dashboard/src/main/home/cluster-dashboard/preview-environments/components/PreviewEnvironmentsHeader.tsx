import React from "react";
import TitleSection from "components/TitleSection";
import styled from "styled-components";

export const PreviewEnvironmentsHeader = () => (
  <>
    <TitleSection>
      <DashboardIcon>
        <i className="material-icons">device_hub</i>
      </DashboardIcon>
      Preview environments
    </TitleSection>
    <InfoSection>
      <TopRow>
        <InfoLabel>
          <i className="material-icons">info</i> Info
        </InfoLabel>
      </TopRow>
      <Description>
        Create preview environments for your pull requests
      </Description>
    </InfoSection>
  </>
);

const DashboardIcon = styled.div`
  height: 45px;
  min-width: 45px;
  width: 45px;
  border-radius: 5px;
  margin-right: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #676c7c;
  border: 2px solid #8e94aa;
  > i {
    font-size: 22px;
  }
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const Description = styled.div`
  color: #aaaabb;
  margin-top: 13px;
  margin-left: 2px;
  font-size: 13px;
`;

const InfoLabel = styled.div`
  width: 72px;
  height: 20px;
  display: flex;
  align-items: center;
  color: #7a838f;
  font-size: 13px;
  > i {
    color: #8b949f;
    font-size: 18px;
    margin-right: 5px;
  }
`;

const InfoSection = styled.div`
  margin-top: 36px;
  font-family: "Work Sans", sans-serif;
  margin-left: 0px;
  margin-bottom: 35px;
`;
