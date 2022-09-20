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
          {currentProject?.preview_envs_enabled && (
            <NavButton 
              path="/preview-environments"
              active={
                currentCluster.id === clusterId &&
                window.location.pathname === "/preview-environments"
              }
            >
              <InlineSVGWrapper
                id="Flat"
                fill="#FFFFFF"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 256 256"
              >
                <path d="M103.99951,68a36,36,0,1,0-44,35.0929v49.8142a36,36,0,1,0,16,0V103.0929A36.05516,36.05516,0,0,0,103.99951,68Zm-56,0a20,20,0,1,1,20,20A20.0226,20.0226,0,0,1,47.99951,68Zm40,120a20,20,0,1,1-20-20A20.0226,20.0226,0,0,1,87.99951,188ZM196.002,152.907l-.00146-33.02563a55.63508,55.63508,0,0,0-16.40137-39.59619L155.31348,56h20.686a8,8,0,0,0,0-16h-40c-.02978,0-.05859.00415-.08838.00446-.2334.00256-.46631.01245-.69824.03527-.12891.01258-.25391.03632-.38086.05494-.13135.01928-.26318.03424-.39355.06-.14014.02778-.27686.06611-.41455.10114-.11475.02924-.23047.05426-.34424.08862-.13428.04059-.26367.0907-.395.13806-.11524.04151-.231.07929-.34473.12629-.12109.05011-.23681.10876-.35449.16455-.11914.05621-.23926.10907-.356.17144-.11133.0597-.21728.12757-.32519.1922-.11621.06928-.23389.13483-.34668.21051-.11719.07831-.227.16553-.33985.24976-.09668.07227-.1958.1394-.28955.21655-.18652.1529-.36426.31531-.53564.48413-.01612.01593-.03418.02918-.05029.04529-.02051.02051-.0376.04321-.05762.06391-.16358.16711-.32178.33941-.47022.52032-.083.10059-.15527.20648-.23193.31006-.07861.10571-.16064.20862-.23438.3183-.08056.12072-.15087.24591-.2246.36993-.05958.1-.12208.19757-.17725.30036-.06787.12591-.125.25531-.18506.384-.05078.1084-.10547.21466-.15137.32568-.05127.12463-.09326.25189-.13867.37848-.04248.11987-.08887.238-.126.36047-.03857.12775-.06738.25757-.09912.38678-.03125.124-.06591.24622-.0913.37244-.02979.15088-.04786.30328-.06934.45544-.01465.10645-.03516.21094-.0459.31867q-.03955.39752-.04.79706V88a8,8,0,0,0,16,0V67.31378l24.28516,24.28485a39.73874,39.73874,0,0,1,11.71582,28.28321l.00146,33.02533a36.00007,36.00007,0,1,0,16-.00019ZM188.00244,208a20,20,0,1,1,20-20A20.0226,20.0226,0,0,1,188.00244,208Z" />
              </InlineSVGWrapper>
              Preview envs
            </NavButton>
          )}
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
      <ClusterSelector 
        onClick={() => setIsExpanded(!isExpanded)}
        active={
          !isExpanded && cluster.id === currentCluster.id && [
            "/cluster-dashboard",
            "/preview-environments",
            "/stacks",
            "/databases",
            "/env-groups",
            "/jobs",
            "/applications"
          ].includes(window.location.pathname)
        }
      >
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

const InlineSVGWrapper = styled.svg`
  width: 32px;
  height: 32px;
  padding: 8px;
  padding-left: 0;

  > path {
    fill: #ffffff;
  }
`;

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
