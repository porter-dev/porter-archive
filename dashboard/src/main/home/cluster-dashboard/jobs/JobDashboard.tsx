import React, { useContext, useState } from "react";
import styled from "styled-components";
import { RouteComponentProps, withRouter } from "react-router";

import job from "assets/job.png";

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
import LastRunStatusSelector from "../LastRunStatusSelector";
import JobRunTable from "../chart/JobRunTable";
import ChartList from "../chart/ChartList";
import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";

type Props = RouteComponentProps & WithAuthProps & {
  currentView: PorterUrl;
  namespace?: string;
  setNamespace?: (namespace: string) => void;
  sortType: any;
};

// TODO: Pull namespace (and sort) down out of DashboardRouter
const JobDashboard: React.FC<Props> = ({
  currentView,
  namespace,
  setNamespace,
  sortType,
  ...props
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [lastRunStatus, setLastRunStatus] = useState("all" as JobStatusType);
  const [showRuns, setShowRuns] = useState(false);
  const [selectedTag, setSelectedTag] = useState("none");

  return (
    <StyledJobDashboard>
      <DashboardHeader
        image={job}
        title={currentView}
        description="Scripts and tasks that run once or on a repeating interval."
        disableLineBreak
      />
      {currentCluster.status === "UPDATING_UNAVAILABLE" ? (
        <ClusterProvisioningPlaceholder />
      ) : (
        <>
          <ControlRow>
            <FilterWrapper>
              <LastRunStatusSelector
                lastRunStatus={lastRunStatus}
                setLastRunStatus={setLastRunStatus}
              />
              {!currentProject?.capi_provisioner_enabled && (
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
              <ToggleButton>
                <ToggleOption
                  onClick={() => setShowRuns(false)}
                  selected={!showRuns}
                >
                  Jobs
                </ToggleOption>
                <ToggleOption
                  nudgeLeft
                  onClick={() => setShowRuns(true)}
                  selected={showRuns}
                >
                  Runs
                </ToggleOption>
              </ToggleButton>
              {props.isAuthorized(
                "namespace", 
                [], 
                ["get", "create"]
              ) && (
                <Button
                  onClick={() => {
                    pushFiltered(props, "/launch", ["project_id"]);
                  }}
                >
                  <i className="material-icons">add</i> Launch template
                </Button>
              )}
            </Flex>
          </ControlRow>
          <HidableElement show={showRuns}>
            <JobRunTable
              lastRunStatus={lastRunStatus}
              namespace={namespace}
              sortType={sortType}
            />
          </HidableElement>
          <HidableElement show={!showRuns}>
            <ChartList
              currentView={currentView}
              currentCluster={currentCluster}
              lastRunStatus={lastRunStatus}
              namespace={currentProject?.capi_provisioner_enabled ? "default" : namespace}
              sortType={sortType}
              selectedTag={selectedTag}
            />
          </HidableElement>
        </>
      )}
    </StyledJobDashboard>
  );
};

export default withRouter(withAuth(JobDashboard));

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

const StyledJobDashboard = styled.div`
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
