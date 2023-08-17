import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import settings from "assets/settings.svg";
import api from "shared/api";
import { Context } from "shared/Context";
import { ChartTypeWithExtendedConfig } from "shared/types";

import TabSelector from "components/TabSelector";
import SelectRow from "components/form-components/SelectRow";
import MetricsChart from "./metrics/MetricsChart";
import { MetricNormalizer } from "../../cluster-dashboard/expanded-chart/metrics/MetricNormalizer";
type PropsType = {
  currentChart: ChartTypeWithExtendedConfig;
};

export const resolutions: { [range: string]: string } = {
  "1H": "1s",
  "6H": "15s",
  "1D": "15s",
  "1M": "5h",
};

export const secondsBeforeNow: { [range: string]: number } = {
  "1H": 60 * 60,
  "6H": 60 * 60 * 6,
  "1D": 60 * 60 * 24,
  "1M": 60 * 60 * 24 * 30,
};

const MetricsSection: React.FunctionComponent<PropsType> = ({
  currentChart,
}) => {
  const [pods, setPods] = useState([]);
  const [controllerOptions, setControllerOptions] = useState([]);
  const [selectedController, setSelectedController] = useState(null);
  const [ingressOptions, setIngressOptions] = useState([]);
  const [selectedIngress, setSelectedIngress] = useState(null);
  const [selectedRange, setSelectedRange] = useState("1H");
  const [selectedMetric, setSelectedMetric] = useState("cpu");
  const [showMetricsSettings, setShowMetricsSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(0);

  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );

  useEffect(() => {
    if (currentChart?.chart?.metadata?.name == "ingress-nginx") {
      setIsLoading((prev) => prev + 1);

      api
        .getNGINXIngresses(
          "<token>",
          {},
          {
            id: currentProject.id,
            cluster_id: currentCluster.id,
          }
        )
        .then((res) => {
          const ingressOptions = res.data.map((ingress: any) => ({
            value: ingress,
            label: ingress.name,
          }));
          setIngressOptions(ingressOptions);
          setSelectedIngress(ingressOptions[0]?.value);
          // iterate through the controllers to get the list of pods
        })
        .catch((err) => {
          setCurrentError(JSON.stringify(err));
        })
        .finally(() => {
          setIsLoading((prev) => prev - 1);
        });
    }

    setIsLoading((prev) => prev + 1);

    api
      .getChartControllers(
        "<token>",
        {},
        {
          id: currentProject.id,
          name: currentChart.name,
          namespace: currentChart.namespace,
          cluster_id: currentCluster.id,
          revision: currentChart.version,
        }
      )
      .then((res) => {
        const controllerOptions = res.data.map((controller: any) => {
          let name = controller?.metadata?.name;
          return { value: controller, label: name };
        });

        setControllerOptions(controllerOptions);
        setSelectedController(controllerOptions[0]?.value);
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
        setControllerOptions([]);
      })
      .finally(() => {
        setIsLoading((prev) => prev - 1);
      });
  }, [currentChart, currentCluster, currentProject]);

  useEffect(() => {
    getPods();
  }, [selectedController]);

  const getPods = () => {
    let selectors = [] as string[];
    let ml =
      selectedController?.spec?.selector?.matchLabels ||
      selectedController?.spec?.selector;
    let i = 1;
    let selector = "";
    for (var key in ml) {
      selector += key + "=" + ml[key];
      if (i != Object.keys(ml).length) {
        selector += ",";
      }
      i += 1;
    }

    selectors.push(selector);

    if (selectors[0] === "") {
      return;
    }

    setIsLoading((prev) => prev + 1);

    api
      .getMatchingPods(
        "<token>",
        {
          namespace: selectedController?.metadata?.namespace,
          selectors,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        let pods = [{ value: "All", label: "All (Summed)" }] as any[];
        res?.data?.forEach((pod: any) => {
          let name = pod?.metadata?.name;
          pods.push({ value: name, label: name });
        });
        setPods(pods);
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
        return;
      })
      .finally(() => {
        setIsLoading((prev) => prev - 1);
      });
  };

  const renderMetricsSettings = () => {
    if (showMetricsSettings && true) {
      if (selectedMetric == "nginx:errors") {
        return (
          <>
              <SelectRow
                displayFlex={true}
                label="Target Ingress"
                value={selectedIngress}
                setActiveValue={(x: any) => setSelectedIngress(x)}
                options={ingressOptions}
                width="100%"
              />
          </>
        );
      }

      return (
        <>
          <SelectRow
            displayFlex={true}
            label="Service"
            value={selectedController}
            setActiveValue={(x: any) => setSelectedController(x)}
            options={controllerOptions}
            width="100%"
          />
        </>
      );
    }
  };


  return (
    <StyledMetricsSection>
      <MetricsHeader>
        <Flex>
          {renderMetricsSettings()}
        </Flex>
        <RangeWrapper>
          <Relative>
          </Relative>
          <TabSelector
            noBuffer={true}
            options={[
              { value: "1H", label: "1H" },
              { value: "6H", label: "6H" },
              { value: "1D", label: "1D" },
              { value: "1M", label: "1M" },
            ]}
            currentTab={selectedRange}
            setCurrentTab={(x: string) => setSelectedRange(x)}
          />
        </RangeWrapper>
      </MetricsHeader>
      <MetricsChart
        currentChart={currentChart}
        selectedController={selectedController}
        selectedIngress={selectedIngress}
        selectedMetric="cpu"
        selectedMetricLabel="CPU Utilization (vCPUs)"
        selectedPod="All"
        selectedRange={selectedRange}
        pods={pods}
      />
      <MetricsChart
        currentChart={currentChart}
        selectedController={selectedController}
        selectedIngress={selectedIngress}
        selectedMetric="memory"
        selectedMetricLabel="RAM Utilization (Mi)"
        selectedPod="All"
        selectedRange={selectedRange}
        pods={pods}
      />
      <MetricsChart
        currentChart={currentChart}
        selectedController={selectedController}
        selectedIngress={selectedIngress}
        selectedMetric="network"
        selectedMetricLabel="Network Received Bytes (Ki)"
        selectedPod="All"
        selectedRange={selectedRange}
        pods={pods}
      />
      {currentChart?.config?.autoscaling?.enabled && (
        <MetricsChart
          currentChart={currentChart}
          selectedController={selectedController}
          selectedIngress={selectedIngress}
          selectedMetric="hpa_replicas"
          selectedMetricLabel="Number of replicas"
          selectedPod="All"
          selectedRange={selectedRange}
          pods={pods}
        />
      )}
      {currentChart?.chart?.metadata?.name == "ingress-nginx" && (
        <MetricsChart
          currentChart={currentChart}
          selectedController={selectedController}
          selectedIngress={selectedIngress}
          selectedMetric="nginx:errors"
          selectedMetricLabel="5XX Error Percentage"
          selectedPod="All"
          selectedRange={selectedRange}
          pods={pods}
        />
      )}
    </StyledMetricsSection>
  );
};

export default MetricsSection;

const Label = styled.div`
  font-weight: bold;
`;

const Relative = styled.div`
  position: relative;
`;

const IconWrapper = styled.div`
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  border-radius: 30px;
  height: 25px;
  width: 25px;
  margin-left: 8px;
  cursor: pointer;
  :hover {
    background: #ffffff22;
  }
`;

const SettingsIcon = styled.img`
  opacity: 0.4;
  width: 20px;
  height: 20px;
  margin-left: -1px;
  margin-bottom: -2px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const MetricsHeader = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  overflow: visible;
  justify-content: space-between;
`;

const DropdownOverlay = styled.div`
  position: fixed;
  width: 100%;
  height: 100%;
  z-index: 10;
  left: 0px;
  top: 0px;
  cursor: default;
`;

const Option = styled.div`
  width: 100%;
  border-top: 1px solid #00000000;
  border-bottom: 1px solid
    ${(props: { selected: boolean; lastItem: boolean }) =>
      props.lastItem ? "#ffffff00" : "#ffffff15"};
  height: 37px;
  font-size: 13px;
  padding-top: 9px;
  align-items: center;
  padding-left: 15px;
  cursor: pointer;
  padding-right: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${(props: { selected: boolean; lastItem: boolean }) =>
    props.selected ? "#ffffff11" : ""};

  :hover {
    background: #ffffff22;
  }
`;

const Dropdown = styled.div`
  position: absolute;
  left: 0;
  top: calc(100% + 10px);
  background: #26282f;
  width: ${(props: { dropdownWidth: string; dropdownMaxHeight: string }) =>
    props.dropdownWidth};
  max-height: ${(props: { dropdownWidth: string; dropdownMaxHeight: string }) =>
    props.dropdownMaxHeight || "300px"};
  border-radius: 3px;
  z-index: 999;
  overflow-y: auto;
  margin-bottom: 20px;
  box-shadow: 0px 4px 10px 0px #00000088;
`;

const DropdownAlt = styled(Dropdown)`
  padding: 20px 20px 7px;
  overflow: visible;
`;

const RangeWrapper = styled.div`
  float: right;
  font-weight: bold;
  width: 158px;
  margin-top: -8px;
`;

const StyledMetricsSection = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
`;
