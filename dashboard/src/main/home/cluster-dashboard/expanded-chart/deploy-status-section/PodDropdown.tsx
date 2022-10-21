import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType } from "shared/types";
import Loading from "components/Loading";

import ControllerTab from "./ControllerTab";

type Props = {
  selectors?: string[];
  currentChart: ChartType;
  onUpdate: (props: any) => void;
  onSelectPod: (pod: any) => void;
};

const PodDropdown: React.FunctionComponent<Props> = ({
  currentChart,
  selectors,
  onUpdate,
  onSelectPod,
}) => {
  const [selectedPod, setSelectedPod] = useState<any>({});
  const [controllers, setControllers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [podError, setPodError] = useState<string>("");

  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );

  useEffect(() => {
    let isSubscribed = true;
    api
      .getChartControllers(
        "<token>",
        {},
        {
          namespace: currentChart.namespace,
          cluster_id: currentCluster.id,
          id: currentProject.id,
          name: currentChart.name,
          revision: currentChart.version,
        }
      )
      .then((res: any) => {
        if (!isSubscribed) {
          return;
        }
        let controllers =
          currentChart.chart.metadata.name == "job"
            ? res.data[0]?.status.active
            : res.data;
        setControllers(controllers);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isSubscribed) {
          return;
        }
        setCurrentError(JSON.stringify(err));
        setControllers([]);
        setIsLoading(false);
      });
    return () => {
      isSubscribed = false;
    };
  }, [currentProject, currentCluster, setCurrentError, currentChart]);

  const renderTabs = () => {
    return controllers.map((c, i) => {
      return (
        <ControllerTab
          // handle CronJob case
          key={c.metadata?.uid || c.uid}
          selectedPod={selectedPod}
          selectPod={(pod: any, userSelected) => {
            setSelectedPod(pod);

            if (userSelected) {
              onSelectPod(pod);
            }
          }}
          selectors={selectors ? [selectors[i]] : null}
          controller={c}
          isLast={i === controllers?.length - 1}
          isFirst={i === 0}
          setPodError={(x: string) => setPodError(x)}
          onUpdate={onUpdate}
        />
      );
    });
  };

  const renderStatusSection = () => {
    if (isLoading) {
      return (
        <NoControllers>
          <Loading />
        </NoControllers>
      );
    }
    if (controllers?.length > 0) {
      return <TabWrapper>{renderTabs()}</TabWrapper>;
    }

    return (
      <NoControllers>
        <i className="material-icons">category</i>
        No objects to display. This might happen while your app is still
        deploying.
      </NoControllers>
    );
  };

  return <StyledStatusSection>{renderStatusSection()}</StyledStatusSection>;
};

export default PodDropdown;

const TabWrapper = styled.div`
  width: 100%;
  min-height: 50px;
`;

const StyledStatusSection = styled.div`
  padding: 0px;
  user-select: text;
  overflow: hidden;
  width: 100%;
  font-size: 13px;
`;

const NoControllers = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  min-height: 50px;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  font-size: 14px;

  > i {
    font-size: 18px;
    margin-right: 12px;
  }
`;
