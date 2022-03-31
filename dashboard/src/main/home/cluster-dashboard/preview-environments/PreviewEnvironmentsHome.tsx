import TabSelector from "components/TabSelector";
import TitleSection from "components/TitleSection";
import React, { useContext, useState } from "react";
import { Context } from "shared/Context";
import styled from "styled-components";
import DeploymentList from "./DeploymentList";

const Header = () => (
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

type TabEnum = "repositories" | "pull_requests";

const PreviewEnvironmentsHome = () => {
  const { currentCluster, currentProject } = useContext(Context);

  const [currentTab, setCurrentTab] = useState<TabEnum>("repositories");

  return (
    <>
      <Header />
      <TabSelector
        options={[
          {
            label: "Linked Repositories",
            value: "repositories",
            component: () => {
              return <> Repoooos </>;
            },
          },
          {
            label: "Pull requests",
            value: "pull_requests",
            component: <DeploymentList />,
          },
        ]}
        currentTab={currentTab}
        setCurrentTab={(value: TabEnum) => setCurrentTab(value)}
      />
    </>
  );
};

export default PreviewEnvironmentsHome;

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
