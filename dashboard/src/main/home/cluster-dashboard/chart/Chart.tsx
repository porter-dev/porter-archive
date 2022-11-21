import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useHistory, useLocation, useRouteMatch } from "react-router";

import {
  ChartType,
  JobStatusType,
  JobStatusWithTimeType,
  StorageType,
} from "shared/types";
import { Context } from "shared/Context";
import StatusIndicator from "components/StatusIndicator";
import { pushFiltered } from "shared/routing";
import api from "shared/api";
import { readableDate } from "shared/string_utils";
import { Tooltip, Zoom } from "@material-ui/core";
import CronParser from "cron-parser";

import {
  createTheme,
  MuiThemeProvider,
  withStyles,
} from "@material-ui/core/styles";

type Props = {
  chart: ChartType;
  controllers: Record<string, any>;
  jobStatus: JobStatusWithTimeType;
  isJob: boolean;
  closeChartRedirectUrl?: string;
};

const theme = createTheme({
  overrides: {
    MuiTooltip: {
      tooltip: {
        backgroundColor: "#3E3F44",
        border: "1px solid #ffffff33",
      },
    },
  },
});

const Chart: React.FunctionComponent<Props> = ({
  chart,
  controllers,
  jobStatus,
  isJob,
  closeChartRedirectUrl,
}) => {
  const [chartControllers, setChartControllers] = useState<any>([]);
  const [showDescription, setShowDescription] = useState(false);
  const context = useContext(Context);
  const location = useLocation();
  const history = useHistory();
  const match = useRouteMatch();

  const renderIcon = () => {
    if (chart.chart.metadata.icon && chart.chart.metadata.icon !== "") {
      return <Icon src={chart.chart.metadata.icon} />;
    } else {
      return <i className="material-icons">tonality</i>;
    }
  };

  const getControllerForChart = async (chart: ChartType) => {
    try {
      const { currentCluster, currentProject } = context;
      const res = await api.getChartControllers(
        "<token>",
        {},
        {
          name: chart.name,
          namespace: chart.namespace,
          cluster_id: currentCluster.id,
          revision: chart.version,
          id: currentProject.id,
        }
      );

      const controllersUid = res.data.map((c: any) => {
        return c.metadata.uid;
      });
      setChartControllers(controllersUid);
    } catch (error) {
      context.setCurrentError(JSON.stringify(error));
    }
  };

  useEffect(() => {
    getControllerForChart(chart);
  }, [chart]);

  const filteredControllers = useMemo(() => {
    let tmpControllers: any = {};
    chartControllers.forEach((uid: any) => {
      if (!controllers[uid]) {
        return;
      }
      tmpControllers[uid] = controllers[uid];
    });
    return tmpControllers;
  }, [chartControllers, controllers]);

  let interval = null;
  if (chart?.config?.schedule?.enabled) {
    interval = CronParser.parseExpression(chart?.config?.schedule.value, {
      utc: true,
    });
  }

  // @ts-ignore
  const rtf = new Intl.DateTimeFormat("en", {
    localeMatcher: "best fit", // other values: "lookup"
    // @ts-ignore
    dateStyle: "full",
    timeStyle: "long",
  });

  return (
    <StyledChart
      onClick={() => {
        const cluster = context.currentCluster?.name;
        let route = `${isJob ? "/jobs" : "/applications"}/${cluster}/${
          chart.namespace
        }/${chart.name}`;
        pushFiltered({ location, history }, route, ["project_id"], {
          closeChartRedirectUrl,
        });
      }}
    >
      <Title>
        <IconWrapper>{renderIcon()}</IconWrapper>
        {chart.canonical_name === "" ? chart.name : chart.canonical_name}
        {chart?.config?.description && (
          <>
            <Dot style={{ marginLeft: "9px", color: "#ffffff88" }}>•</Dot>
            <MuiThemeProvider theme={theme}>
              <Tooltip
                TransitionComponent={Zoom}
                placement={"bottom-start"}
                title={
                  <div
                    style={{
                      fontFamily: "Work Sans, sans-serif",
                      fontSize: "12px",
                      fontWeight: "normal",
                      padding: "5px 6px",
                      color: "#ffffffdd",
                      lineHeight: "16px",
                    }}
                  >
                    {chart.config.description as string}
                  </div>
                }
              >
                <Description>{chart.config.description}</Description>
              </Tooltip>
            </MuiThemeProvider>
          </>
        )}
      </Title>

      <BottomWrapper>
        <InfoWrapper>
          <StatusIndicator
            controllers={filteredControllers}
            status={chart.info.status}
            margin_left={"17px"}
          />
          <LastDeployed>
            {jobStatus?.status ? (
              <>
                <Dot>•</Dot>
                <JobStatus status={jobStatus.status}>
                  {jobStatus.status === JobStatusType.Running
                    ? "Started running"
                    : `Last run ${jobStatus.status}`}{" "}
                  at {readableDate(jobStatus.start_time)}
                </JobStatus>
              </>
            ) : (
              <>
                <Dot>•</Dot>
                <JobStatus>
                  Last deployed {readableDate(chart.info.last_deployed)}
                </JobStatus>
              </>
            )}
            {chart.config?.schedule?.enabled ? (
              <>
                <Dot style={{ marginLeft: "10px" }}>•</Dot>
                <JobStatus>
                  Next run {rtf.format(interval?.next().toDate() || new Date())}
                </JobStatus>
              </>
            ) : null}
          </LastDeployed>
        </InfoWrapper>

        <TagWrapper>
          Namespace
          <NamespaceTag>{chart.namespace}</NamespaceTag>
        </TagWrapper>
      </BottomWrapper>

      <TopRightContainer>
        <span>v{chart.version}</span>
      </TopRightContainer>
    </StyledChart>
  );
};

export default Chart;

const Description = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 80%;
  color: #ffffff88;
  position: relative;
  font-size: 13px;
  padding-top: 1px;
`;

const BottomWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 11px;
  margin-top: 3px;
`;

const TopRightContainer = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 12px;
  color: #aaaabb;
`;

const Dot = styled.div`
  margin-right: 9px;
`;

const StatusDot = styled.span`
  margin: 0 9px;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
`;

const LastDeployed = styled.div`
  font-size: 13px;
  margin-left: 10px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

const TagWrapper = styled.div`
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  border: 1px solid #ffffff44;
  border-radius: 3px;
  padding-left: 5px;
`;

const NamespaceTag = styled.div`
  height: 20px;
  margin-left: 6px;
  color: #aaaabb;
  background: #ffffff22;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 6px;
  padding-left: 7px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Icon = styled.img`
  width: 100%;
`;

const IconWrapper = styled.div`
  color: #efefef;
  background: none;
  font-size: 16px;
  top: 11px;
  left: 14px;
  height: 20px;
  width: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 3px;
  position: absolute;

  > i {
    font-size: 17px;
    margin-top: -1px;
  }
`;

const Title = styled.div`
  display: flex;
  position: relative;
  text-decoration: none;
  padding: 12px 35px 12px 45px;
  font-size: 14px;
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
  width: 80%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  animation: fadeIn 0.5s;

  > img {
    background: none;
    top: 12px;
    left: 13px;

    padding: 5px 4px;
    width: 24px;
    position: absolute;
  }
`;

const JobStatus = styled.span<{ status?: JobStatusType }>`
  font-size: 13px;
  font-weight: ${(props) =>
    props.status && props.status !== JobStatusType.Running ? "500" : ""};
  ${(props) => `
  color: ${
    props.status === JobStatusType.Succeeded
      ? "rgb(56, 168, 138)"
      : props.status === JobStatusType.Failed
      ? "#ff385d"
      : "#aaaabb66"
  }`}
`;

const StyledChart = styled.div`
  cursor: pointer;
  margin-bottom: 15px;
  padding-top: 2px;
  padding-bottom: 13px;
  position: relative;
  width: calc(100% + 2px);
  height: calc(100% + 2px);
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
`;
