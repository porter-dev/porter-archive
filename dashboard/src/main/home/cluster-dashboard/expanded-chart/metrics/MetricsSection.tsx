import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import settings from "assets/settings.svg";
import api from "shared/api";
import { Context } from "shared/Context";
import { ChartTypeWithExtendedConfig, StorageType } from "shared/types";

import TabSelector from "components/TabSelector";
import Loading from "components/Loading";
import SelectRow from "components/form-components/SelectRow";
import AreaChart from "./AreaChart";
import { MetricNormalizer } from "./MetricNormalizer";
import { AvailableMetrics, NormalizedMetricsData } from "./types";
import CheckboxRow from "components/form-components/CheckboxRow";

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
  const [selectedPod, setSelectedPod] = useState("");
  const [controllerOptions, setControllerOptions] = useState([]);
  const [selectedController, setSelectedController] = useState(null);
  const [ingressOptions, setIngressOptions] = useState([]);
  const [selectedIngress, setSelectedIngress] = useState(null);
  const [selectedRange, setSelectedRange] = useState("1H");
  const [selectedMetric, setSelectedMetric] = useState("cpu");
  const [selectedMetricLabel, setSelectedMetricLabel] = useState(
    "CPU Utilization (vCPUs)"
  );
  const [dropdownExpanded, setDropdownExpanded] = useState(false);
  const [data, setData] = useState<NormalizedMetricsData[]>([]);
  const [showMetricsSettings, setShowMetricsSettings] = useState(false);
  const [metricsOptions, setMetricsOptions] = useState([
    { value: "cpu", label: "CPU Utilization (vCPUs)" },
    { value: "memory", label: "RAM Utilization (Mi)" },
    { value: "network", label: "Network Received Bytes (Ki)" },
  ]);
  const [isLoading, setIsLoading] = useState(0);
  const [hpaData, setHpaData] = useState([]);
  const [hpaEnabled, setHpaEnabled] = useState(
    currentChart?.config?.autoscaling?.enabled
  );

  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );

  // Add or remove hpa replicas chart option when current chart is updated
  useEffect(() => {
    if (currentChart?.config?.autoscaling?.enabled) {
      setMetricsOptions((prev) => {
        if (prev.find((option) => option.value === "hpa_replicas")) {
          return [...prev];
        }
        return [
          ...prev,
          { value: "hpa_replicas", label: "Number of replicas" },
        ];
      });
    } else {
      setMetricsOptions((prev) => {
        const hpaReplicasOptionIndex = prev.findIndex(
          (option) => option.value === "hpa_replicas"
        );
        const options = [...prev];
        if (hpaReplicasOptionIndex > -1) {
          options.splice(hpaReplicasOptionIndex, 1);
        }
        return [...options];
      });
    }
  }, [currentChart]);

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
          setMetricsOptions((prev) => {
            return [
              ...prev,
              {
                value: "nginx:errors",
                label: "5XX Error Percentage",
              },
            ];
          });

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
        setSelectedPod("All");

        getMetrics();
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
        return;
      })
      .finally(() => {
        setIsLoading((prev) => prev - 1);
      });
  };

  const getAutoscalingThreshold = async (
    metricType: "cpu_hpa_threshold" | "memory_hpa_threshold",
    shouldsum: boolean,
    namespace: string,
    start: number,
    end: number
  ) => {
    setIsLoading((prev) => prev + 1);
    setHpaData([]);
    try {
      const res = await api.getMetrics(
        "<token>",
        {
          metric: metricType,
          shouldsum: shouldsum,
          kind: selectedController?.kind,
          name: selectedController?.metadata.name,
          namespace: namespace,
          startrange: start,
          endrange: end,
          resolution: resolutions[selectedRange],
          pods: [],
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );

      if (!Array.isArray(res.data) || !res.data[0]?.results) {
        return;
      }
      const autoscalingMetrics = new MetricNormalizer(res.data, metricType);
      setHpaData(autoscalingMetrics.getParsedData());
      return;
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading((prev) => prev - 1);
    }
  };

  const getMetrics = async () => {
    if (pods?.length == 0) {
      return;
    }
    try {
      let shouldsum = selectedPod === "All";
      let namespace = currentChart.namespace;

      // calculate start and end range
      const d = new Date();
      const end = Math.round(d.getTime() / 1000);
      const start = end - secondsBeforeNow[selectedRange];

      let podNames = [] as string[];

      if (!shouldsum) {
        podNames = [selectedPod];
      }

      if (selectedMetric == "nginx:errors") {
        podNames = [selectedIngress?.name];
        namespace = selectedIngress?.namespace || "default";
        shouldsum = false;
      }

      setIsLoading((prev) => prev + 1);
      setData([]);

      const res = await api.getMetrics(
        "<token>",
        {
          metric: selectedMetric,
          shouldsum: shouldsum,
          kind: selectedController?.kind,
          name: selectedController?.metadata.name,
          namespace: namespace,
          startrange: start,
          endrange: end,
          resolution: resolutions[selectedRange],
          pods: podNames,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );

      setHpaData([]);
      const isHpaEnabled = currentChart?.config?.autoscaling?.enabled;
      if (shouldsum && isHpaEnabled) {
        if (selectedMetric === "cpu") {
          await getAutoscalingThreshold(
            "cpu_hpa_threshold",
            shouldsum,
            namespace,
            start,
            end
          );
        } else if (selectedMetric === "memory") {
          await getAutoscalingThreshold(
            "memory_hpa_threshold",
            shouldsum,
            namespace,
            start,
            end
          );
        }
      }

      const metrics = new MetricNormalizer(
        res.data,
        selectedMetric as AvailableMetrics
      );

      // transform the metrics to expected form
      setData(metrics.getParsedData());
    } catch (error) {
      setCurrentError(JSON.stringify(error));
    } finally {
      setIsLoading((prev) => prev - 1);
    }
  };

  useEffect(() => {
    if (selectedMetric && selectedRange && selectedPod && selectedController) {
      getMetrics();
    }
  }, [
    selectedMetric,
    selectedRange,
    selectedPod,
    selectedController,
    selectedIngress,
  ]);

  const renderMetricsSettings = () => {
    if (showMetricsSettings && true) {
      if (selectedMetric == "nginx:errors") {
        return (
          <>
            <DropdownOverlay onClick={() => setShowMetricsSettings(false)} />
            <DropdownAlt dropdownWidth="330px" dropdownMaxHeight="300px">
              <Label>Additional Settings</Label>
              <SelectRow
                label="Target Ingress"
                value={selectedIngress}
                setActiveValue={(x: any) => setSelectedIngress(x)}
                options={ingressOptions}
                width="100%"
              />
            </DropdownAlt>
          </>
        );
      }

      return (
        <>
          <DropdownOverlay onClick={() => setShowMetricsSettings(false)} />
          <DropdownAlt dropdownWidth="330px" dropdownMaxHeight="300px">
            <Label>Additional Settings</Label>
            <SelectRow
              label="Target Controller"
              value={selectedController}
              setActiveValue={(x: any) => setSelectedController(x)}
              options={controllerOptions}
              width="100%"
            />
            <SelectRow
              label="Target Pod"
              value={selectedPod}
              setActiveValue={(x: any) => setSelectedPod(x)}
              options={pods}
              width="100%"
            />
          </DropdownAlt>
        </>
      );
    }
  };

  const renderDropdown = () => {
    if (dropdownExpanded) {
      return (
        <>
          <DropdownOverlay onClick={() => setDropdownExpanded(false)} />
          <Dropdown
            dropdownWidth="230px"
            dropdownMaxHeight="200px"
            onClick={() => setDropdownExpanded(false)}
          >
            {renderOptionList()}
          </Dropdown>
        </>
      );
    }
  };

  const renderOptionList = () => {
    return metricsOptions.map(
      (option: { value: string; label: string }, i: number) => {
        return (
          <Option
            key={i}
            selected={option.value === selectedMetric}
            onClick={() => {
              setSelectedMetric(option.value);
              setSelectedMetricLabel(option.label);
            }}
            lastItem={i === metricsOptions.length - 1}
          >
            {option.label}
          </Option>
        );
      }
    );
  };

  return (
    <StyledMetricsSection>
      <MetricsHeader>
        <Flex>
          <MetricSelector
            onClick={() => setDropdownExpanded(!dropdownExpanded)}
          >
            <MetricsLabel>{selectedMetricLabel}</MetricsLabel>
            <i className="material-icons">arrow_drop_down</i>
            {renderDropdown()}
          </MetricSelector>
          <Relative>
            <IconWrapper onClick={() => setShowMetricsSettings(true)}>
              <SettingsIcon src={settings} />
            </IconWrapper>
            {renderMetricsSettings()}
          </Relative>

          <Highlight color={"#7d7d81"} onClick={getMetrics}>
            <i className="material-icons">autorenew</i>
          </Highlight>
        </Flex>
        <RangeWrapper>
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
      {isLoading > 0 && <Loading />}
      {data.length === 0 && isLoading === 0 && (
        <Message>
          No data available yet.
          <Highlight color={"#8590ff"} onClick={getMetrics}>
            <i className="material-icons">autorenew</i>
            Refresh
          </Highlight>
        </Message>
      )}
      {data.length > 0 && isLoading === 0 && (
        <>
          {currentChart?.config?.autoscaling?.enabled &&
            ["cpu", "memory"].includes(selectedMetric) && (
              <CheckboxRow
                toggle={() => setHpaEnabled((prev: any) => !prev)}
                checked={hpaEnabled}
                label="Show Autoscaling Threshold"
              />
            )}
          <ParentSize>
            {({ width, height }) => (
              <AreaChart
                dataKey={selectedMetricLabel}
                data={data}
                hpaData={hpaData}
                hpaEnabled={
                  hpaEnabled && ["cpu", "memory"].includes(selectedMetric)
                }
                width={width}
                height={height - 10}
                resolution={selectedRange}
                margin={{ top: 40, right: -40, bottom: 0, left: 50 }}
              />
            )}
          </ParentSize>
        </>
      )}
    </StyledMetricsSection>
  );
};

export default MetricsSection;

const Highlight = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  color: ${(props: { color: string }) => props.color};
  cursor: pointer;

  > i {
    font-size: 20px;
    margin-right: 3px;
  }
`;

const Label = styled.div`
  font-weight: bold;
`;

const Relative = styled.div`
  position: relative;
`;

const Message = styled.div`
  display: flex;
  height: 100%;
  width: calc(100% - 150px);
  align-items: center;
  justify-content: center;
  margin-left: 75px;
  text-align: center;
  color: #ffffff44;
  font-size: 13px;
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

const MetricSelector = styled.div`
  font-size: 13px;
  font-weight: 500;
  position: relative;
  color: #ffffff;
  display: flex;
  align-items: center;
  cursor: pointer;
  border-radius: 5px;
  :hover {
    > i {
      background: #ffffff22;
    }
  }

  > i {
    border-radius: 20px;
    font-size: 20px;
    margin-left: 10px;
  }
`;

const MetricsLabel = styled.div`
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 200px;
`;

const StyledMetricsSection = styled.div`
  width: 100%;
  min-height: 400px;
  height: calc(100vh - 400px);
  display: flex;
  flex-direction: column;
  position: relative;
  font-size: 13px;
  border-radius: 8px;
  border: 1px solid #ffffff33;
  padding: 18px 22px;
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
