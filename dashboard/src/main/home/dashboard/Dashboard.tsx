import React, { useState, useContext, useEffect } from "react";
import styled from "styled-components";
import { RouteComponentProps, withRouter } from "react-router";

import gradient from "assets/gradient.png";

import { Context } from "shared/Context";
import { InfraType } from "shared/types";
import api from "shared/api";
import { pushFiltered, pushQueryParams } from "shared/routing";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";

import ProvisionerSettings from "../provisioner/ProvisionerSettings";
import ClusterPlaceholderContainer from "./ClusterPlaceholderContainer";
import TabRegion from "components/TabRegion";
import FormDebugger from "components/porter-form/FormDebugger";
import TitleSection from "components/TitleSection";
import ClusterSection from "./ClusterSection";
import { StatusPage } from "../onboarding/steps/ProvisionResources/forms/StatusPage";
import Banner from "components/porter/Banner";
import Spacer from "components/porter/Spacer";

type Props = RouteComponentProps & WithAuthProps & {
  projectId: number | null;
  setRefreshClusters: (x: boolean) => void;
};

const Dashboard: React.FC<Props> = ({
  projectId,
  setRefreshClusters,
  ...props
}) => {
  const { currentProject, user, capabilities } = useContext(Context);
  const [infras, setInfras] = useState<InfraType[]>([]);
  const [pressingCtrl, setPressingCtrl] = useState(false);
  const [pressingK, setPressingK] = useState(false);
  const [showFormDebugger, setShowFormDebugger] = useState(false);
  const [tabOptions, setTabOptions] = useState([{ 
    label: "Connected clusters",
    value: "overview"
  }]);

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "k") {
      setPressingK(true);
    }
    if (e.key === "Meta" || e.key === "Control") {
      setPressingCtrl(true);
    }
    if (e.key === "z" && pressingK && pressingCtrl) {
      setPressingK(false);
      setPressingCtrl(false);
      setShowFormDebugger(!showFormDebugger);
    }
  };

  const handleKeyUp = (e: KeyboardEvent): void => {
    if (e.key === "Meta" || e.key === "Control" || e.key === "k") {
      setPressingK(false);
      setPressingCtrl(false);
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (currentProject) {
      if (currentProject.simplified_view_enabled) {
        pushFiltered(props, "/apps", ["project_id"]);
      }
      api
        .getInfra(
          "<token>",
          {},
          {
            project_id: currentProject.id,
          }
        )
        .then((res) => setInfras(res.data))
        .catch(console.log);
    }
  }, [currentProject]);

  const currentTab = () => new URLSearchParams(props.location.search).get("tab");

  useEffect(() => {
    if (props.isAuthorized("cluster", "", ["get", "create"])) {
      tabOptions.push({ label: "Create a cluster", value: "create-cluster" });
    }

    tabOptions.push({ label: "Provisioner status", value: "provisioner" });

    if (!capabilities?.provisioner) {
      let newTabs = [{ label: "Project overview", value: "overview" }];
      setTabOptions(newTabs);
    } else {
      setTabOptions(tabOptions);
    }
  }, [currentProject]);

  const renderTabContents = () => {
    if (currentTab() === "provisioner") {
      return (
        <StatusPage
          filter={[]}
          project_id={currentProject.id}
          setInfraStatus={() => null}
        />
      );
    } else if (currentTab() === "create-cluster") {
      const helperText =
        "You need to update your billing to provision or connect a new cluster";
      const helperType = "warning";
      return (
        <>
          <Banner type={helperType} noMargin>
            {helperText}
          </Banner>
          <Br />
          <ProvisionerSettings infras={infras} provisioner={true} />
        </>
      );
    } else {
      return <ClusterPlaceholderContainer />;
    }
  };

  return (
    <>
      {currentProject && (
        <DashboardWrapper>
          {showFormDebugger ? (
            <FormDebugger
              goBack={() => setShowFormDebugger(false)}
            />
          ) : (
            <>
              <TitleSection>
                <DashboardIcon>
                  <DashboardImage src={gradient} />
                  <Overlay>
                    {currentProject && currentProject.name[0].toUpperCase()}
                  </Overlay>
                </DashboardIcon>
                {currentProject && currentProject.name}
                {currentProject?.roles?.filter((obj: any) => {
                  return obj.user_id === user.userId;
                })[0].kind === "admin" || (
                  <i
                    className="material-icons"
                    onClick={() => {
                      pushFiltered(props, "/project-settings", ["project_id"]);
                    }}
                  >
                    more_vert
                  </i>
                )}
              </TitleSection>
              <Spacer height="15px" />
              <InfoSection>
                <TopRow>
                  <InfoLabel>
                    <i className="material-icons">info</i> Info
                  </InfoLabel>
                </TopRow>
                <Description>
                  Project overview for {currentProject && currentProject.name}
                  .
                </Description>
              </InfoSection>
              {
                currentProject?.capi_provisioner_enabled ? (
                  <ClusterSection />
                ) : (
                  <TabRegion
                    currentTab={currentTab()}
                    setCurrentTab={(x: string) => {
                      pushQueryParams(props, { tab: x });
                    }}
                    options={tabOptions}
                  >
                    {renderTabContents()}
                  </TabRegion>
                )
              }
            </>
          )}
        </DashboardWrapper>
      )}
    </>
  );
};

export default withRouter(withAuth(Dashboard));

const Br = styled.div`
  width: 100%;
  height: 1px;
`;

const DashboardWrapper = styled.div`
  padding-bottom: 100px;
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
  color: #aaaabb;
  font-size: 13px;
  > i {
    color: #aaaabb;
    font-size: 18px;
    margin-right: 5px;
  }
`;

const InfoSection = styled.div`
  margin-top: 20px;
  font-family: "Work Sans", sans-serif;
  margin-left: 0px;
  margin-bottom: 30px;
`;

const Overlay = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
`;

const DashboardImage = styled.img`
  height: 35px;
  width: 35px;
  border-radius: 5px;
`;

const DashboardIcon = styled.div`
  position: relative;
  height: 35px;
  margin-right: 17px;
  width: 35px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 22px;
  }
`;
