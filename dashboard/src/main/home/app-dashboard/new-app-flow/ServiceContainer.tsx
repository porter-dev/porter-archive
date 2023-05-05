import React, {useContext, useEffect, useMemo} from "react";
import AnimateHeight, { Height } from "react-animate-height";
import styled from "styled-components";

import web from "assets/web.png";
import worker from "assets/worker.png";
import job from "assets/job.png";

import Spacer from "components/porter/Spacer";
import WebTabs from "./WebTabs";
import WorkerTabs from "./WorkerTabs";
import JobTabs from "./JobTabs";
import { Service } from "./serviceTypes";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Button from "components/porter/Button";
import {NewWebsocketOptions, useWebsockets} from "../../../../shared/hooks/useWebsockets";
import { Context } from "../../../../shared/Context";
import api from "../../../../shared/api";
import {getAvailability} from "../../cluster-dashboard/expanded-chart/deploy-status-section/util";

interface ServiceProps {
  service: Service;
  chart: any;
  editService: (service: Service) => void;
  deleteService: () => void;
}

const ServiceContainer: React.FC<ServiceProps> = ({
  service,
  chart,
  deleteService,
  editService,
}) => {
  const [showExpanded, setShowExpanded] = React.useState<boolean>(false);
  const [height, setHeight] = React.useState<Height>("auto");
  const [controller, setController] = React.useState<any>(null);
  const [available, setAvailable] = React.useState<number>(0)
  const [total, setTotal] = React.useState<number>(0)

  console.log("initial controller", controller)
  console.log("initial available", available)
  console.log("initial total", total)
  const {
    newWebsocket,
    openWebsocket,
    closeAllWebsockets,
    closeWebsocket,
  } = useWebsockets();

  const getSelectors = () => {
    let ml =
        controller?.spec?.selector?.matchLabels || controller?.spec?.selector;
    let i = 1;
    let selector = "";
    for (var key in ml) {
      selector += key + "=" + ml[key];
      if (i != Object.keys(ml).length) {
        selector += ",";
      }
      i += 1;
    }
    return selector
  }

  useEffect(() => {
    const selectors = getSelectors()

    console.log("effect selectors", selectors)

    if (selectors.length > 0) {
      console.log("initial webby", selectors);
    // updatePods();
      [controller?.kind, "pod"].forEach((kind) => {
        setupWebsocket(kind, controller?.metadata?.uid, selectors);
      });
      return () => closeAllWebsockets();
    }
  }, [controller]);

  const { currentProject, currentCluster } = useContext(Context);

  useEffect(() => {
    api
      .getChartControllers(
        "<token>",
        {},
        {
          namespace: chart.namespace,
          cluster_id: currentCluster.id,
          id: currentProject.id,
          name: chart.name,
          revision: chart.version,
        }
      )
      .then((res: any) => {
        let controllers =
          chart.chart.metadata.name == "job"
            ? res.data[0]?.status.active
            : res.data;
        console.log("testing input", controllers);
        setController(controllers[0]);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  const setupWebsocket = (kind: string, controllerUid: string, selectors: string) => {
    console.log("called with", kind, controllerUid, selectors)
    let apiEndpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/${kind}/status?`;
    if (kind == "pod" && selectors) {
      apiEndpoint += `selectors=${selectors}`;
    }

    console.log("api end", apiEndpoint);

    const options: NewWebsocketOptions = {};
    options.onopen = () => {
      console.log("connected to websocket");
    };

    options.onmessage = (evt: MessageEvent) => {
      let event = JSON.parse(evt.data);
      let object = event.Object;
      object.metadata.kind = event.Kind;

      // update pods no matter what if ws message is a pod event.
      // If controller event, check if ws message corresponds to the designated controller in props.
      if (event.Kind != "pod" && object.metadata.uid !== controllerUid) {
        return;
      }

      console.log("event object", object)

      // Make a new API call to update pods only when the event type is UPDATE
      if (event.event_type !== "UPDATE") {
        return;
      }


      // testing hot reload

      if (event.Kind != "pod") {

        let [available, total] = getAvailability(object.metadata.kind, object);
        setAvailable(available);
        setTotal(total);
        return;
      }
      // updatePods();
    };

    options.onclose = () => {
      console.log("closing websocket");
    };

    options.onerror = (err: ErrorEvent) => {
      console.log(err);
      closeWebsocket(kind);
    };

    newWebsocket(kind, apiEndpoint, options);
    openWebsocket(kind);
  };

  // TODO: calculate heights instead of hardcoding them
  const renderTabs = (service: Service) => {
    switch (service.type) {
      case "web":
        return (
          <WebTabs
            service={service}
            editService={editService}
            setHeight={setHeight}
          />
        );
      case "worker":
        return (
          <WorkerTabs
            service={service}
            editService={editService}
            setHeight={setHeight}
          />
        );
      case "job":
        return (
          <JobTabs
            service={service}
            editService={editService}
            setHeight={setHeight}
          />
        );
    }
  };

  const renderIcon = (service: Service) => {
    switch (service.type) {
      case "web":
        return <Icon src={web} />;
      case "worker":
        return <Icon src={worker} />;
      case "job":
        return <Icon src={job} />;
    }
  };

  const percentage = Number(1 - available/total).toLocaleString(undefined,{style: 'percent', minimumFractionDigits:2});
  console.log(percentage)

  return (
    <>
      <ServiceHeader
        showExpanded={showExpanded}
        onClick={() => setShowExpanded(!showExpanded)}
      >
        <ServiceTitle>
          <ActionButton>
            <span className="material-icons dropdown">arrow_drop_down</span>
          </ActionButton>
          {renderIcon(service)}
          {service.name.trim().length > 0 ? service.name : "New Service"}
        </ServiceTitle>
        {service.canDelete && (
          <ActionButton
            onClick={(e) => {
              deleteService();
            }}
          >
            <span className="material-icons">delete</span>
          </ActionButton>
        )}
      </ServiceHeader>
      {showExpanded && (
        <StyledSourceBox showExpanded={showExpanded}>
          {renderTabs(service)}
        </StyledSourceBox>
      )}
      <StatusFooter showExpanded={showExpanded}>
        {service.type === "job" && (
          <Container row>
            <Mi className="material-icons">check</Mi>
            <Text color="helper">
              Last run succeeded at 12:39 PM on 4/13/23
            </Text>
            <Spacer inline x={1} />
            <Button
              onClick={() => console.log("redirect to runs")}
              height="30px"
              width="87px"
              color="#ffffff11"
              withBorder
            >
              <I className="material-icons">open_in_new</I>
              History
            </Button>
          </Container>
        )}
        {service.type !== "job" && (
          <Container row>
            <StatusCircle percentage={percentage} />
            <Text color="helper">Running {available}/{total} instances</Text>
            <Spacer inline x={1} />
            <Button
              onClick={() => console.log("redirect to logs")}
              height="30px"
              width="70px"
              color="#ffffff11"
              withBorder
            >
              <I className="material-icons">open_in_new</I>
              Logs
            </Button>
          </Container>
        )}
      </StatusFooter>
      <Spacer y={0.5} />
    </>
  );
};

export default ServiceContainer;

const Mi = styled.i`
  font-size: 16px;
  margin-right: 7px;
  margin-top: -1px;
  color: rgb(56, 168, 138);
`;

const I = styled.i`
  font-size: 14px;
  margin-right: 5px;
`;

const StatusCircle = styled.div<{ percentage?: any }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 10px;
  background: conic-gradient(
    from 0deg,
    #ffffff33 ${(props) => props.percentage},
    #ffffffaa 0% ${(props) => props.percentage}
  );
`;

const StatusFooter = styled.div<{ showExpanded: boolean }>`
  width: 100%;
  padding: 15px;
  background: ${(props) => props.theme.fg2};
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  border: 1px solid #494b4f;
  border-top: 0;
`;

const ServiceTitle = styled.div`
  display: flex;
  align-items: center;
`;

const StyledSourceBox = styled.div<{ showExpanded: boolean }>`
  width: 100%;
  color: #ffffff;
  padding: 14px 25px 30px;
  position: relative;
  font-size: 13px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  border-top: 0;
  border-bottom: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
`;

const ActionButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;

  :hover {
    color: white;
  }

  > span {
    font-size: 20px;
  }
  margin-right: 5px;
`;

const ServiceHeader = styled.div`
  flex-direction: row;
  display: flex;
  height: 60px;
  justify-content: space-between;
  cursor: pointer;
  padding: 20px;
  color: ${(props) => props.theme.text.primary};
  position: relative;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }

  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;

  .dropdown {
    font-size: 30px;
    cursor: pointer;
    border-radius: 20px;
    margin-left: -10px;
    transform: ${(props: { showExpanded: boolean }) =>
      props.showExpanded ? "" : "rotate(-90deg)"};
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const Icon = styled.img`
  height: 18px;
  margin-right: 15px;

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
