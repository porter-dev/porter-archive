import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType, StorageType } from "shared/types";
import Loading from "components/Loading";
import backArrow from "assets/back_arrow.png";

import Logs from "./Logs";
import ControllerTab from "./ControllerTab";

type Props = {
  selectors?: string[];
  currentChart: ChartType;
  fullscreen?: boolean;
  setFullScreenLogs?: any;
};

const StatusSectionFC: React.FunctionComponent<Props> = ({
  currentChart,
  fullscreen,
  setFullScreenLogs,
  selectors,
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

  const renderLogs = () => {
    return (
      <Logs
        podError={podError}
        key={selectedPod?.metadata?.name}
        selectedPod={selectedPod}
      />
    );
  };

  const renderTabs = () => {
    return controllers.map((c, i) => {
      return (
        <ControllerTab
          // handle CronJob case
          key={c.metadata?.uid || c.uid}
          selectedPod={selectedPod}
          selectPod={setSelectedPod}
          selectors={selectors ? [selectors[i]] : null}
          controller={c}
          isLast={i === controllers?.length - 1}
          isFirst={i === 0}
          setPodError={(x: string) => setPodError(x)}
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
      return (
        <Wrapper>
          <TabWrapper>{renderTabs()}</TabWrapper>
          {renderLogs()}
        </Wrapper>
      );
    }

    if (currentChart?.chart?.metadata?.name === "job") {
      return (
        <NoControllers>
          <i className="material-icons">category</i>
          There are no jobs currently running.
        </NoControllers>
      );
    }

    return (
      <NoControllers>
        <i className="material-icons">category</i>
        No objects to display. This might happen while your app is still
        deploying.
      </NoControllers>
    );
  };

  return (
    <>
      {fullscreen ? (
        <FullScreen>
          <AbsoluteTitle>
            <BackButton onClick={setFullScreenLogs}>
              <i className="material-icons">navigate_before</i>
            </BackButton>
            Status ({currentChart.name})
          </AbsoluteTitle>
          <FullScreenButton top="70px" onClick={setFullScreenLogs}>
            <i className="material-icons">close_fullscreen</i>
          </FullScreenButton>
          {renderStatusSection()}
        </FullScreen>
      ) : (
        <StyledStatusSection>
          <FullScreenButton onClick={setFullScreenLogs}>
            <i className="material-icons">open_in_full</i>
          </FullScreenButton>
          {renderStatusSection()}
        </StyledStatusSection>
      )}
    </>
  );
};

export default StatusSectionFC;

const FullScreenButton = styled.div<{ top?: string }>`
  position: absolute;
  top: ${(props) => props.top || "10px"};
  right: 10px;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
  background: #ffffff11;
  border: 1px solid #aaaabb;

  :hover {
    background: #ffffff22;
  }

  > i {
    font-size: 14px;
  }
`;

const BackButton = styled.div`
  display: flex;
  width: 30px;
  z-index: 999;
  cursor: pointer;
  height: 30px;
  align-items: center;
  margin-right: 15px;
  justify-content: center;
  cursor: pointer;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  > i {
    font-size: 18px;
  }

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 12px;
  opacity: 0.75;
`;

const AbsoluteTitle = styled.div`
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  padding-left: 20px;
  font-size: 18px;
  font-weight: 500;
  user-select: text;
`;

const TabWrapper = styled.div`
  width: 35%;
  min-width: 250px;
  height: 100%;
  overflow-y: auto;
`;

const StyledStatusSection = styled.div`
  padding: 0px;
  user-select: text;
  overflow: hidden;
  width: 100%;
  min-height: 400px;
  height: calc(100vh - 400px);
  font-size: 13px;
  overflow: hidden;
  border-radius: 8px;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const FullScreen = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding-top: 60px;
`;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
`;

const NoControllers = styled.div`
  padding-top: 20%;
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  font-size: 14px;

  > i {
    font-size: 18px;
    margin-right: 12px;
  }
`;
