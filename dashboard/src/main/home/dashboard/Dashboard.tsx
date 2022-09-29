import React, { Component } from "react";
import styled from "styled-components";

import gradient from "assets/gradient.png";
import { Context } from "shared/Context";
import { InfraType } from "shared/types";
import api from "shared/api";

import ProvisionerSettings from "../provisioner/ProvisionerSettings";
import ClusterPlaceholderContainer from "./ClusterPlaceholderContainer";
import { RouteComponentProps, withRouter } from "react-router";
import TabRegion from "components/TabRegion";
import Provisioner from "../provisioner/Provisioner";
import FormDebugger from "components/porter-form/FormDebugger";
import TitleSection from "components/TitleSection";

import { pushFiltered, pushQueryParams } from "shared/routing";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";
import { StatusPage } from "../onboarding/steps/ProvisionResources/forms/StatusPage";

type PropsType = RouteComponentProps &
  WithAuthProps & {
    projectId: number | null;
    setRefreshClusters: (x: boolean) => void;
  };

// TODO: rethink this list, should be coupled with tabOptions
const tabOptionStrings = ["overview", "create-cluster", "provisioner"];

type StateType = {
  infras: InfraType[];
  pressingCtrl: boolean;
  pressingK: boolean;
  showFormDebugger: boolean;
};

class Dashboard extends Component<PropsType, StateType> {
  state = {
    infras: [] as InfraType[],
    pressingCtrl: false,
    pressingK: false,
    showFormDebugger: false,
  };

  refreshInfras = () => {
    if (this.props.projectId) {
      api
        .getInfra(
          "<token>",
          {},
          {
            project_id: this.props.projectId,
          }
        )
        .then((res) => this.setState({ infras: res.data }))
        .catch(console.log);
    }
  };

  componentDidMount() {
    this.refreshInfras();
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
  }

  handleKeyDown = (e: KeyboardEvent): void => {
    let { pressingK, pressingCtrl } = this.state;
    if (e.key === "Meta" || e.key === "Control") {
      this.setState({ pressingCtrl: true });
    }
    if (e.key === "k") {
      this.setState({ pressingK: true });
    }
    if (e.key === "z" && pressingK && pressingCtrl) {
      this.setState({ pressingK: false, pressingCtrl: false });
      this.setState({ showFormDebugger: !this.state.showFormDebugger });
    }
  };

  handleKeyUp = (e: KeyboardEvent): void => {
    if (e.key === "Meta" || e.key === "Control" || e.key === "k") {
      this.setState({ pressingCtrl: false, pressingK: false });
    }
  };

  componentDidUpdate(prevProps: PropsType) {
    if (this.props.projectId && prevProps.projectId !== this.props.projectId) {
      this.refreshInfras();
    }

    if (!tabOptionStrings.includes(this.currentTab())) {
      this.setCurrentTab("overview");
    }
  }

  onShowProjectSettings = () => {
    pushFiltered(this.props, "/project-settings", ["project_id"]);
  };

  currentTab = () => new URLSearchParams(this.props.location.search).get("tab");

  renderTabContents = () => {
    if (this.currentTab() === "provisioner") {
      return (
        <StatusPage
          filter={[]}
          project_id={this.props.projectId}
          setInfraStatus={() => null}
        />
      );
    } else if (this.currentTab() === "create-cluster") {
      let helperText = "Create a cluster to link to this project";
      let helperIcon = "info";
      let helperColor = "white";
      if (
        this.context.hasBillingEnabled &&
        this.context.usage.current.clusters !== 0 &&
        this.context.usage.current.clusters >= this.context.usage.limit.clusters
      ) {
        helperText =
          "You need to update your billing to provision or connect a new cluster";
        helperIcon = "warning";
        helperColor = "#f5cb42";
      }
      return (
        <>
          <Banner color={helperColor}>
            <i className="material-icons">{helperIcon}</i>
            {helperText}
          </Banner>
          <ProvisionerSettings infras={this.state.infras} provisioner={true} />
        </>
      );
    } else {
      return <ClusterPlaceholderContainer />;
    }
  };

  setCurrentTab = (x: string) => {
    pushQueryParams(this.props, { tab: x });
  };

  render() {
    let { currentProject, capabilities } = this.context;
    let { onShowProjectSettings } = this;

    let tabOptions = [{ label: "Connected clusters", value: "overview" }];

    if (this.props.isAuthorized("cluster", "", ["get", "create"])) {
      tabOptions.push({ label: "Create a cluster", value: "create-cluster" });
    }

    tabOptions.push({ label: "Provisioner status", value: "provisioner" });

    if (!capabilities?.provisioner) {
      tabOptions = [{ label: "Project overview", value: "overview" }];
    }

    return (
      <>
        {currentProject && (
          <DashboardWrapper>
            {this.state.showFormDebugger ? (
              <FormDebugger
                goBack={() => this.setState({ showFormDebugger: false })}
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
                  {this.context.currentProject?.roles?.filter((obj: any) => {
                    return obj.user_id === this.context.user.userId;
                  })[0].kind === "admin" || (
                    <i
                      className="material-icons"
                      onClick={onShowProjectSettings}
                    >
                      more_vert
                    </i>
                  )}
                </TitleSection>
                <Br />

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
                <TabRegion
                  currentTab={this.currentTab()}
                  setCurrentTab={this.setCurrentTab}
                  options={tabOptions}
                >
                  {this.renderTabContents()}
                </TabRegion>
              </>
            )}
          </DashboardWrapper>
        )}
      </>
    );
  }
}

Dashboard.contextType = Context;

export default withRouter(withAuth(Dashboard));

const Br = styled.div`
  width: 100%;
  height: 1px;
`;

const DashboardWrapper = styled.div`
  padding-bottom: 100px;
`;

const Banner = styled.div<{ color: string }>`
  height: 40px;
  width: 100%;
  margin: 5px 0 30px;
  font-size: 13px;
  display: flex;
  border-radius: 5px;
  padding-left: 15px;
  align-items: center;
  background: #ffffff11;
  color: ${(props) => props.color};
  > i {
    margin-right: 10px;
    font-size: 18px;
  }
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const Description = styled.div`
  color: #8b949f;
  margin-top: 13px;
  margin-left: 2px;
  font-size: 13px;
`;

const InfoLabel = styled.div`
  width: 72px;
  height: 20px;
  display: flex;
  align-items: center;
  color: #8b949f;
  font-size: 13px;
  > i {
    color: #8b949f;
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

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 10px 0px 20px;
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
