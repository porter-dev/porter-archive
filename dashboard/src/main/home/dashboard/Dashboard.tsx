import React, { Component } from "react";
import styled from "styled-components";

import gradient from "assets/gradient.jpg";
import { Context } from "shared/Context";
import { InfraType } from "shared/types";
import api from "shared/api";

import ProvisionerSettings from "../provisioner/ProvisionerSettings";
import ClusterPlaceholderContainer from "./ClusterPlaceholderContainer";
import { RouteComponentProps, withRouter } from "react-router";
import TabRegion from "components/TabRegion";
import Provisioner from "../provisioner/Provisioner";

import { setSearchParam } from "shared/routing";

type PropsType = RouteComponentProps & {
  projectId: number | null;
};

const tabOptions = [
  { label: "Project Overview", value: "overview" },
  { label: "Provisioner Status", value: "provisioner" },
];
// TODO: rethink this list, should be coupled with tabOptions
const tabOptionStrings = ["overview", "provisioner"];

type StateType = {
  infras: InfraType[];
};

class Dashboard extends Component<PropsType, StateType> {
  state = {
    infras: [] as InfraType[],
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
  }

  componentDidUpdate(prevProps: PropsType) {
    if (this.props.projectId && prevProps.projectId !== this.props.projectId) {
      this.refreshInfras();
    }

    if (!tabOptionStrings.includes(this.currentTab())) {
      this.setCurrentTab("overview");
    }
  }

  onShowProjectSettings = () => {
    this.props.history.push("project-settings");
  };

  currentTab = () => new URLSearchParams(this.props.location.search).get("tab");

  renderTabContents = () => {
    if (this.currentTab() === "provisioner") {
      return <Provisioner />;
    } else {
      return (
        <>
          {!this.context.currentCluster ? (
            <>
              <Banner>
                <i className="material-icons">error_outline</i>
                This project currently has no clusters connected.
              </Banner>
              <ProvisionerSettings infras={this.state.infras} />
            </>
          ) : (
            <ClusterPlaceholderContainer />
          )}
        </>
      );
    }
  };

  setCurrentTab = (x: string) =>
    this.props.history.push(setSearchParam(this.props.location, "tab", x));

  render() {
    let { currentProject } = this.context;
    let { onShowProjectSettings } = this;
    return (
      <>
        {currentProject && (
          <DashboardWrapper>
            <TitleSection>
              <DashboardIcon>
                <DashboardImage src={gradient} />
                <Overlay>
                  {currentProject && currentProject.name[0].toUpperCase()}
                </Overlay>
              </DashboardIcon>
              <Title>{currentProject && currentProject.name}</Title>
              {this.context.currentProject.roles.filter((obj: any) => {
                return obj.user_id === this.context.user.userId;
              })[0].kind === "admin" && (
                <i className="material-icons" onClick={onShowProjectSettings}>
                  more_vert
                </i>
              )}
            </TitleSection>

            <InfoSection>
              <TopRow>
                <InfoLabel>
                  <i className="material-icons">info</i> Info
                </InfoLabel>
              </TopRow>
              <Description>
                Project overview for {currentProject && currentProject.name}.
              </Description>
            </InfoSection>

            <TabRegion
              currentTab={this.currentTab()}
              setCurrentTab={this.setCurrentTab}
              options={tabOptions}
            >
              {this.renderTabContents()}
            </TabRegion>
          </DashboardWrapper>
        )}
      </>
    );
  }
}

Dashboard.contextType = Context;

export default withRouter(Dashboard);

const DashboardWrapper = styled.div`
  padding-bottom: 100px;
`;

const Banner = styled.div`
  height: 40px;
  width: 100%;
  margin: 5px 0 30px;
  font-size: 13px;
  display: flex;
  border-radius: 5px;
  padding-left: 15px;
  align-items: center;
  background: #ffffff11;
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
  color: #ffffff;
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
  margin-top: 20px;
  font-family: "Work Sans", sans-serif;
  margin-left: 0px;
  margin-bottom: 30px;
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 10px 0px 35px;
`;

const Overlay = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  background: #00000028;
  top: 0;
  left: 0;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
`;

const DashboardImage = styled.img`
  height: 45px;
  width: 45px;
  border-radius: 5px;
`;

const DashboardIcon = styled.div`
  position: relative;
  height: 45px;
  width: 45px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 22px;
  }
`;

const Title = styled.div`
  font-size: 20px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  margin-left: 18px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TitleSection = styled.div`
  height: 80px;
  margin-top: 10px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-left: 0px;

  > i {
    margin-left: 10px;
    cursor: pointer;
    font-size 18px;
    color: #858FAAaa;
    padding: 5px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
    margin-bottom: -3px;
  }
`;
