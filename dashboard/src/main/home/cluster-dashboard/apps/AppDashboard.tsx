import React, { useContext, useState } from "react";
import styled from "styled-components";
import { RouteComponentProps, withRouter } from "react-router";

import web from "assets/web.png";

import { Context } from "shared/Context";
import { JobStatusType } from "shared/types";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";
import { 
  pushQueryParams,
  pushFiltered,
  PorterUrl,
} from "shared/routing";

import { NamespaceSelector } from "../NamespaceSelector";
import TagFilter from "../TagFilter";
import DashboardHeader from "../DashboardHeader";
import ChartList from "../chart/ChartList";
import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import SortSelector from "../SortSelector";
import Spacer from "components/porter/Spacer";

type Props = RouteComponentProps & WithAuthProps & {
  currentView: PorterUrl;
  namespace?: string;
  setNamespace?: (namespace: string) => void;
  sortType: any;
  setSortType: (sortType: any) => void;
};

// TODO: Pull namespace (and sort) down out of DashboardRouter
const AppDashboard: React.FC<Props> = ({
  currentView,
  namespace,
  setNamespace,
  sortType,
  setSortType,
  ...props
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [selectedTag, setSelectedTag] = useState("none");

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={web}
        title={currentView}
        description="Continuously running web services, workers, and add-ons."
        disableLineBreak
      />
      {currentCluster.status === "UPDATING_UNAVAILABLE" ? (
        <ClusterProvisioningPlaceholder />
      ) : (
        <>
          <ControlRow>
            <FilterWrapper>
              <SortSelector
                setSortType={setSortType}
                sortType={sortType}
                currentView={currentView}
              />
              <Spacer inline width="10px" />
              {!currentProject.capi_provisioner_enabled && (
                <NamespaceSelector
                  setNamespace={(x) => {
                    setNamespace(x);
                    pushQueryParams(props, {
                      namespace: x || "ALL",
                    });
                  }}
                  namespace={namespace}
                />
              )}
              <TagFilter
                onSelect={setSelectedTag}
              />
            </FilterWrapper>
            <Flex>
              {props.isAuthorized(
                "namespace", 
                [], 
                ["get", "create"]
              ) && (
                <Button
                  onClick={() => {
                    pushFiltered(props, "/launch", ["project_id"])
                  }}
                >
                  <i className="material-icons">add</i> Launch template
                </Button>
              )}
            </Flex>
          </ControlRow>
          <ChartList
            currentView={currentView}
            currentCluster={currentCluster}
            namespace={currentProject.capi_provisioner_enabled ? "default" : namespace}
            sortType={sortType}
            selectedTag={selectedTag}
          />
        </>
      )}
    </StyledAppDashboard>
  );
};

export default withRouter(withAuth(AppDashboard));

const ToggleOption = styled.div<{ selected: boolean; nudgeLeft?: boolean }>`
  padding: 0 10px;
  color: ${(props) => (props.selected ? "" : "#494b4f")};
  border: 1px solid #494b4f;
  height: 100%;
  display: flex;
  margin-left: ${(props) => (props.nudgeLeft ? "-1px" : "")};
  align-items: center;
  border-radius: ${(props) =>
    props.nudgeLeft ? "0 5px 5px 0" : "5px 0 0 5px"};
  :hover {
    border: 1px solid #7a7b80;
    z-index: 999;
  }
`;

const ToggleButton = styled.div`
  background: #26292e;
  border-radius: 5px;
  font-size: 13px;
  height: 30px;
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  border-bottom: 30px solid transparent;
`;

const StyledAppDashboard = styled.div`
`;

const ControlRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
`;

const FilterWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  border-bottom: 30px solid transparent;
  > div:not(:first-child) {
  }
`;

const Button = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-left: 10px;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 5px;
  font-weight: 500;
  color: white;
  height: 30px;
  padding: 0 8px;
  min-width: 155px;
  padding-right: 13px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const HidableElement = styled.div<{ show: boolean }>`
  display: ${(props) => (props.show ? "unset" : "none")};
`;
