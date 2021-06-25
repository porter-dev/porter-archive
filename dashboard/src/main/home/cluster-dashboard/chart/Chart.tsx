import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { ChartType, StorageType } from "shared/types";
import { Context } from "shared/Context";
import StatusIndicator from "components/StatusIndicator";
import { pushFiltered } from "shared/routing";
import { useHistory, useLocation, useRouteMatch } from "react-router";
import api from "shared/api";

type Props = {
  chart: ChartType;
  controllers: Record<string, any>;
  release: any;
};

const Chart: React.FunctionComponent<Props> = ({
  chart,
  controllers,
  release,
}) => {
  const [expand, setExpand] = useState<boolean>(false);
  const [chartControllers, setChartControllers] = useState<any>([]);
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
        {
          namespace: chart.namespace,
          cluster_id: currentCluster.id,
          storage: StorageType.Secret,
        },
        {
          id: currentProject.id,
          name: chart.name,
          revision: chart.version,
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

  const readableDate = (s: string) => {
    const ts = new Date(s);
    const date = ts.toLocaleDateString();
    const time = ts.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${time} on ${date}`;
  };

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

  return (
    <StyledChart
      onMouseEnter={() => setExpand(true)}
      onMouseLeave={() => setExpand(false)}
      expand={expand}
      onClick={() => {
        let urlParams = new URLSearchParams(location.search);
        let cluster = urlParams.get("cluster");
        let route = `${match.url}/${cluster}/${chart.namespace}/${chart.name}`;
        pushFiltered({ location, history }, route, ["project_id"]);
      }}
    >
      <Title>
        <IconWrapper>{renderIcon()}</IconWrapper>
        {chart.name}
      </Title>

      <BottomWrapper>
        <InfoWrapper>
          <StatusIndicator
            controllers={filteredControllers}
            status={chart.info.status}
            margin_left={"17px"}
          />
          <LastDeployed>
            <Dot>•</Dot> Last deployed{" "}
            {readableDate(
              release?.info?.last_deployed || chart.info.last_deployed
            )}
          </LastDeployed>
        </InfoWrapper>

        <TagWrapper>
          Namespace
          <NamespaceTag>{chart.namespace}</NamespaceTag>
        </TagWrapper>
      </BottomWrapper>

      <Version>v{release?.version || chart.version}</Version>
    </StyledChart>
  );
};

export default Chart;

const BottomWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 11px;
  margin-top: 12px;
`;

const Version = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 12px;
  color: #aaaabb;
`;

const Dot = styled.div`
  margin-right: 9px;
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

const StyledChart = styled.div`
  background: #26282f;
  cursor: pointer;
  margin-bottom: 25px;
  padding: 1px;
  border-radius: 5px;
  box-shadow: 0 5px 8px 0px #00000033;
  position: relative;
  border: 2px solid #9eb4ff00;
  width: calc(100% + 2px);
  height: calc(100% + 2px);

  animation: ${(props: { expand: boolean }) =>
      props.expand ? "expand" : "shrink"}
    0.12s;
  animation-fill-mode: forwards;
  animation-timing-function: ease-out;

  @keyframes expand {
    from {
      width: calc(100% + 2px);
      padding-top: 4px;
      padding-bottom: 14px;
      margin-left: 0px;
      box-shadow: 0 5px 8px 0px #00000033;
      padding-left: 1px;
      margin-bottom: 25px;
      margin-top: 0px;
    }
    to {
      width: calc(100% + 22px);
      padding-top: 7px;
      padding-bottom: 20px;
      margin-left: -10px;
      box-shadow: 0 8px 20px 0px #00000030;
      padding-left: 5px;
      margin-bottom: 21px;
      margin-top: -4px;
    }
  }

  @keyframes shrink {
    from {
      width: calc(100% + 22px);
      padding-top: 7px;
      padding-bottom: 20px;
      margin-left: -10px;
      box-shadow: 0 8px 20px 0px #00000030;
      padding-left: 5px;
      margin-bottom: 21px;
      margin-top: -4px;
    }
    to {
      width: calc(100% + 2px);
      padding-top: 4px;
      padding-bottom: 14px;
      margin-left: 0px;
      box-shadow: 0 5px 8px 0px #00000033;
      padding-left: 1px;
      margin-bottom: 25px;
      margin-top: 0px;
    }
  }
`;
