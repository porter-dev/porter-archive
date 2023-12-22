import React from "react";
import styled from "styled-components";

import Loading from "components/Loading";
import { useAppStatus } from "lib/hooks/useAppStatus";

import { valueExists } from "shared/util";

import { useLatestRevision } from "../LatestRevisionContext";
import ServiceStatus from "./status/ServiceStatus";

const StatusTab: React.FC = () => {
  const {
    projectId,
    clusterId,
    latestClientServices,
    deploymentTarget,
    appName,
  } = useLatestRevision();

  const { serviceVersionStatus } = useAppStatus({
    projectId,
    clusterId,
    serviceNames: latestClientServices.map((s) => s.name.value),
    deploymentTargetId: deploymentTarget.id,
    appName,
  });

  //   const renderLogs = () => {
  //     return (
  //       <Logs
  //         podError={podError}
  //         key={selectedPod?.metadata?.name}
  //         selectedPod={selectedPod}
  //       />
  //     );
  //   };

  //   const renderTabs = () => {
  //     return controllers.map((c, i) => {
  //       return (
  //         <ControllerTab
  //           // handle CronJob case
  //           key={c.metadata?.uid || c.uid}
  //           selectedPod={selectedPod}
  //           selectPod={setSelectedPod}
  //           selectors={selectors ? [selectors[i]] : null}
  //           controller={c}
  //           isLast={i === controllers?.length - 1}
  //           isFirst={i === 0}
  //           setPodError={(x: string) => setPodError(x)}
  //         />
  //       );
  //     });
  //   };

  const renderStatusSection = (): JSX.Element => {
    if (Object.keys(serviceVersionStatus).length === 0) {
      return (
        <NoControllers>
          <Loading />
        </NoControllers>
      );
    }

    return (
      <ServiceVersionContainer>
        {Object.keys(serviceVersionStatus)
          .map((serviceName, i) => {
            const serviceStatus = serviceVersionStatus[serviceName];
            const clientService = latestClientServices.find(
              (s) => s.name.value === serviceName
            );
            if (clientService) {
              return (
                <ServiceStatus
                  isLast={i === Object.keys(serviceVersionStatus).length - 1}
                  key={serviceName}
                  serviceVersionStatusList={serviceStatus}
                  service={clientService}
                />
              );
            }
            return null;
          })
          .filter(valueExists)}
      </ServiceVersionContainer>
    );
    // if (controllers?.length > 0) {
    //   return (
    //     <Wrapper>
    //       <TabWrapper>{renderTabs()}</TabWrapper>
    //       {renderLogs()}
    //     </Wrapper>
    //   );
    // }

    // if (currentChart?.chart?.metadata?.name === "job") {
    //   return (
    //     <NoControllers>
    //       <i className="material-icons">category</i>
    //       There are no jobs currently running.
    //     </NoControllers>
    //   );
    // }

    // return (
    //   <NoControllers>
    //     <i className="material-icons">category</i>
    //     No objects to display. This might happen while your app is still
    //     deploying.
    //   </NoControllers>
    // );
  };

  return <StyledStatusSection>{renderStatusSection()}</StyledStatusSection>;
};

export default StatusTab;

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

const ServiceVersionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
