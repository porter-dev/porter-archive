import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Button from "components/porter/Button";
import {
  NewWebsocketOptions,
  useWebsockets,
} from "shared/hooks/useWebsockets";
import {
  getAvailability,
  getAvailabilityStacks,
} from "../../cluster-dashboard/expanded-chart/deploy-status-section/util";
import Spacer from "components/porter/Spacer";
import { pushFiltered } from "shared/routing";
import { RouteComponentProps, useLocation, withRouter } from "react-router";

type Props = RouteComponentProps & {
  chart: any;
  service: any;
  setExpandedJob: any;
};

const StatusFooter: React.FC<Props> = ({
  chart,
  service,
  setExpandedJob,
  ...props
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [controller, setController] = React.useState<any>(null);
  const [available, setAvailable] = React.useState<number>(0);
  const [total, setTotal] = React.useState<number>(0);
  const [stale, setStale] = React.useState<number>(0);
  const location = useLocation();

  useEffect(() => {
    // Do something
  }, []);

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
    return selector;
  };

  useEffect(() => {
    const selectors = getSelectors();

    if (selectors.length > 0) {
      // updatePods();
      [controller?.kind].forEach((kind) => {
        setupWebsocket(kind, controller?.metadata?.uid, selectors);
      });
      return () => closeAllWebsockets();
    }
  }, [controller]);

  const getName = (service: any) => {
    const name = chart.name + "-" + service.name;

    switch (service.type) {
      case "web":
        return name + "-web";
      case "worker":
        return name + "-wkr";
      case "job":
        return name + "job";
    }
  };

  useEffect(() => {
    if (chart) {
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
          const controllers =
            chart.chart.metadata.name == "job"
              ? res.data[0]?.status.active
              : res.data;
          const filteredControllers = controllers.filter((controller: any) => {
            const name = getName(service);
            return name == controller.metadata.name;
          });
          if (filteredControllers.length == 1) {
            setController(filteredControllers[0]);
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, [chart]);

  const setupWebsocket = (
    kind: string,
    controllerUid: string,
    selectors: string
  ) => {
    let apiEndpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/${kind}/status?`;
    if (kind == "pod" && selectors) {
      apiEndpoint += `selectors=${selectors}`;
    }


    const options: NewWebsocketOptions = {};
    options.onopen = () => {
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

      if (event.event_type == "ADD" && total == 0) {
        let [available, total, stale] = getAvailabilityStacks(
          object.metadata.kind,
          object
        );

        setAvailable(available);
        setTotal(total);
        setStale(stale);
        return;
      }

      // Make a new API call to update pods only when the event type is UPDATE
      if (event.event_type !== "UPDATE") {
        return;
      }

      // testing hot reload

      if (event.Kind != "pod") {
        let [available, total, stale] = getAvailabilityStacks(
          object.metadata.kind,
          object
        );

        setAvailable(available);
        setTotal(total);
        setStale(stale);
        return;
      }
      // updatePods();
    };

    options.onclose = () => {
    };

    options.onerror = (err: ErrorEvent) => {
      console.log(err);
      closeWebsocket(kind);
    };

    newWebsocket(kind, apiEndpoint, options);
    openWebsocket(kind);
  };

  const percentage = Number(1 - available / total).toLocaleString(undefined, {
    style: "percent",
    minimumFractionDigits: 2,
  });

  return (
    <StyledStatusFooter>
      {service.type === "job" && (
        <Container row>
          {/*
          <Mi className="material-icons">check</Mi>
          <Text color="helper">
            Last run succeeded at 12:39 PM on 4/13/23
          </Text>
          */}
          <Button
            onClick={() => setExpandedJob(service.name)}
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
          {percentage === "0.00%" ? (
            <StatusDot />
          ) : total === 0 ? (
            <StatusDot color="#ffffff33" />
          ) : (
            <StatusCircle percentage={percentage} />
          )}
          <Text color="helper">
            {total > 0 ? (
              <>
                Running {available}/{total} instances{" "}
                {stale == 1 ? `(${stale} old instance)` : ""}
                {stale > 1 ? `(${stale} old instances)` : ""}
              </>
            ) : (
              "Loading . . ."
            )}
          </Text>
          {/*
          <Spacer inline x={1} />
          <Button
            onClick={() => { }}
            height="30px"
            width="70px"
            color="#ffffff11"
            withBorder
          >
            <I className="material-icons">open_in_new</I>
            Logs
          </Button>
          */}
        </Container>
      )}
    </StyledStatusFooter>
  );
};

export default withRouter(StatusFooter);

const StatusDot = styled.div<{ color?: string }>`
  min-width: 7px;
  max-width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 10px;
  background: ${props => props.color || "#38a88a"};
`;

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

const StatusCircle = styled.div<{ 
  percentage?: any;
  dashed?: boolean;
}>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 10px;
  background: conic-gradient(
    from 0deg,
    #ffffff33 ${(props) => props.percentage},
    #ffffffaa 0% ${(props) => props.percentage}
  );
  border: ${(props) => (props.dashed ? "1px dashed #ffffff55" : "none")};
`;

const StyledStatusFooter = styled.div`
  width: 100%;
  padding: 10px 15px;
  background: ${(props) => props.theme.fg2};
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  border: 1px solid #494b4f;
  border-top: 0;
`;