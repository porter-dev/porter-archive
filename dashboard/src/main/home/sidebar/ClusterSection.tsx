import React, { useEffect, useState } from "react";

import styled from "styled-components";
import { ClusterType, ProjectType } from "shared/types";
import { Tooltip } from "@material-ui/core";
import settings from "assets/settings.svg";

import monojob from "assets/monojob.png";
import monoweb from "assets/monoweb.png";
import sliders from "assets/sliders.svg";
import cluster from "assets/cluster.svg";

import SidebarLink from "./SidebarLink";

type Props = {
  cluster: ClusterType;
  currentCluster: ClusterType;
  currentProject: ProjectType;
  setCurrentCluster: (x: ClusterType, callback?: any) => void;
  navToClusterDashboard: () => void;
};

export const ClusterSection: React.FC<Props> = ({
  cluster,
  currentCluster,
  currentProject,
  setCurrentCluster,
  navToClusterDashboard,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) {
      currentCluster.id === cluster.id && setIsExpanded(true);
    }
  }, [currentCluster]);

  const renderClusterContent = (cluster: any) => {
    let clusterId = cluster.id;

    if (currentCluster && isExpanded) {
      return (
        <Relative>
          <SideLine />
          <NavButton
            path="/applications"
            active={
              currentCluster.id === clusterId &&
              window.location.pathname === "/applications"
            }
          >
            <Img src={monoweb} />
            Applications
          </NavButton>
          <NavButton
            path="/jobs"
            active={
              currentCluster.id === clusterId &&
              window.location.pathname === "/jobs"
            }
          >
            <Img src={monojob} />
            Jobs
          </NavButton>
          <NavButton
            path="/env-groups"
            active={
              currentCluster.id === clusterId &&
              window.location.pathname === "/env-groups"
            }
          >
            <Img src={sliders} />
            Env groups
          </NavButton>
          {cluster.service === "eks" &&
            cluster.infra_id > 0 &&
            currentProject.enable_rds_databases && (
              <NavButton
                path="/databases"
                active={
                  currentCluster.id === clusterId &&
                  window.location.pathname === "/databases"
                }
              >
                <Icon className="material-icons-outlined">storage</Icon>
                Databases
              </NavButton>
            )}
          {currentProject?.stacks_enabled ? (
            <NavButton
              path="/stacks"
              active={
                currentCluster.id === clusterId &&
                window.location.pathname === "/stacks"
              }
            >
              <Icon className="material-icons-outlined">lan</Icon>
              Stacks
            </NavButton>
          ) : null}
          <NavButton
            path={"/cluster-dashboard"}
            active={
              currentCluster.id === clusterId &&
              window.location.pathname === "/cluster-dashboard"
            }
          >
            <Icon className="material-icons">device_hub</Icon>
            Cluster settings
          </NavButton>
        </Relative>
      );
    }
  };

  return (
    <>
      <ClusterSelector onClick={() => setIsExpanded(!isExpanded)}>
        <LinkWrapper>
          <ClusterIcon>
            <svg
              width="19"
              height="19"
              viewBox="0 0 19 19"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15.207 12.4403C16.8094 12.4403 18.1092 11.1414 18.1092 9.53907C18.1092 7.93673 16.8094 6.63782 15.207 6.63782"
                stroke="white"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M3.90217 12.4403C2.29983 12.4403 1 11.1414 1 9.53907C1 7.93673 2.29983 6.63782 3.90217 6.63782"
                stroke="white"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M9.54993 13.4133C7.4086 13.4133 5.69168 11.6964 5.69168 9.55417C5.69168 7.41284 7.4086 5.69592 9.54993 5.69592C11.6913 5.69592 13.4082 7.41284 13.4082 9.55417C13.4082 11.6964 11.6913 13.4133 9.54993 13.4133Z"
                stroke="white"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M6.66895 15.207C6.66895 16.8094 7.96787 18.1092 9.5702 18.1092C11.1725 18.1092 12.4715 16.8094 12.4715 15.207"
                stroke="white"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M6.66895 3.90217C6.66895 2.29983 7.96787 1 9.5702 1C11.1725 1 12.4715 2.29983 12.4715 3.90217"
                stroke="white"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M5.69591 9.54996C5.69591 7.40863 7.41283 5.69171 9.55508 5.69171C11.6964 5.69171 13.4133 7.40863 13.4133 9.54996C13.4133 11.6913 11.6964 13.4082 9.55508 13.4082C7.41283 13.4082 5.69591 11.6913 5.69591 9.54996Z"
                stroke="white"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </ClusterIcon>
          <Tooltip title={cluster?.name}>
            <ClusterName>{cluster?.name}</ClusterName>
          </Tooltip>
          <I isExpanded={isExpanded} className="material-icons">
            arrow_drop_down
          </I>
          <Spacer />
        </LinkWrapper>
      </ClusterSelector>
      <div onClick={() => setCurrentCluster(cluster)}>
        {renderClusterContent(cluster)}
      </div>
    </>
  );
};

const Spacer = styled.div`
  flex: 1;
`;

const Settings = styled.p`
  color: #ffffff44;
  width: 16px;
  padding-right: 7px;
  height: 100%;
  border-radius: 3px;
  cursor: pointer;
  margin-left: 1px;
  :hover {
    color: #ffffff;
  }
  > i {
    font-size: 16px;
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
  }
`;

const I = styled.i`
  color: #ffffff99;
  font-size: 20px;
  border-radius: 100px;
  transform: ${(props: { isExpanded: boolean }) =>
    props.isExpanded ? "" : "rotate(-90deg)"};
`;

const Relative = styled.div`
  position: relative;
`;

const SideLine = styled.div`
  position: absolute;
  left: 32px;
  width: 1px;
  top: 5px;
  height: calc(100% - 12px);
  background: #383a3f;
`;

const Icon = styled.span`
  padding: 4px;
  width: 22px;
  padding-top: 4px;
  border-radius: 3px;
  margin-right: 8px;
  font-size: 16px;
`;

const NavButton = styled(SidebarLink)`
  display: flex;
  align-items: center;
  border-radius: 5px;
  position: relative;
  text-decoration: none;
  height: 34px;
  margin: 5px 15px;
  margin-left: 39px;
  padding: 0 30px 2px 8px;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  color: #ffffff;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: any) => (props.active ? "#ffffff11" : "")};

  :hover {
    background: ${(props: any) => (props.active ? "#ffffff11" : "#ffffff08")};
  }

  > i {
    font-size: 20px;
    padding-top: 4px;
    border-radius: 3px;
    margin-right: 10px;
  }
`;

const Img = styled.img<{ enlarge?: boolean }>`
  padding: ${(props) => (props.enlarge ? "0 0 0 1px" : "4px")};
  height: 22px;
  width: 22px;
  padding-top: 4px;
  border-radius: 3px;
  margin-right: 8px;
`;

const ClusterName = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  margin-left: 3px;
  margin-right: 4px;
  font-weight: 400;
  color: #ffffff;
`;

const ClusterIcon = styled.div`
  > svg {
    width: 13px;
    display: flex;
    align-items: center;
    margin-bottom: -1x;
    margin-right: 9px;
    color: #ffffff;
  }
`;

const LinkWrapper = styled.div`
  color: white;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const ClusterSelector = styled.div`
  position: relative;
  display: block;
  border-radius: 5px;
  width: calc(100% - 30px);
  height: 34px;
  padding: 0 6px 2px 11px;
  font-size: 13px;
  margin: 5px 15px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  z-index: 1;
  background: ${(props: { active?: boolean }) =>
    props.active ? "#ffffff11" : ""};
  :hover {
    > div {
      > i {
        background: #ffffff11;
      }
    }
  }
`;
