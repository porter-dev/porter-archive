import React, {
  Component,
  Props,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import styled from "styled-components";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import settings from "assets/settings.svg";
import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType, StorageType } from "shared/types";

import TabSelector from "components/TabSelector";
import Loading from "components/Loading";
import SelectRow from "components/values-form/SelectRow";
import AreaChart, { MetricsData } from "./AreaChart";
import useAuth from "shared/auth/useAuth";

type PropsType = {
  currentChart: ChartType;
};

type StateType = {
  controllerOptions: any[];
  ingressOptions: any[];
  selectedController: any;
  selectedIngress: any;
  pods: any[];
  selectedPod: string;
  selectedRange: string;
  selectedMetric: string;
  selectedMetricLabel: string;
  controllerDropdownExpanded: boolean;
  podDropdownExpanded: boolean;
  dropdownExpanded: boolean;
  data: MetricsData[];
  showMetricsSettings: boolean;
  metricsOptions: MetricsOption[];
  isLoading: number;
};

type MetricsCPUDataResponse = {
  pod?: string;
  results: {
    date: number;
    cpu: string;
  }[];
}[];

type MetricsMemoryDataResponse = {
  pod?: string;
  results: {
    date: number;
    memory: string;
  }[];
}[];

type MetricsNetworkDataResponse = {
  pod?: string;
  results: {
    date: number;
    bytes: string;
  }[];
}[];

type MetricsNGINXErrorsDataResponse = {
  pod?: string;
  results: {
    date: number;
    error_pct: string;
  }[];
}[];

type MetricsOption = {
  value: string;
  label: string;
};

const resolutions: { [range: string]: string } = {
  "1H": "15s",
  "6H": "15s",
  "1D": "15s",
  "1M": "5h",
};

const secondsBeforeNow: { [range: string]: number } = {
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
  const [data, setData] = useState<MetricsData[]>([]);
  const [showMetricsSettings, setShowMetricsSettings] = useState(false);
  const [metricsOptions, setMetricsOptions] = useState([
    { value: "cpu", label: "CPU Utilization (vCPUs)" },
    { value: "memory", label: "RAM Utilization (Mi)" },
    { value: "network", label: "Network Received Bytes (Ki)" },
  ]);
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
          {
            cluster_id: currentCluster.id,
          },
          {
            id: currentProject.id,
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
          setControllerOptions([]);
        })
        .finally(() => {
          setIsLoading((prev) => {
            return prev - 1;
          });
        });
    }
    setIsLoading((prev) => prev + 1);

    api
      .getChartControllers(
        "<token>",
        {
          namespace: currentChart.namespace,
          cluster_id: currentCluster.id,
          storage: StorageType.Secret,
        },
        {
          id: currentProject.id,
          name: currentChart.name,
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

    setIsLoading((prev) => prev + 1);

    api
      .getMatchingPods(
        "<token>",
        {
          cluster_id: currentCluster.id,
          namespace: selectedController?.metadata?.namespace,
          selectors,
        },
        {
          id: currentProject.id,
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

  const getMetrics = () => {
    if (pods?.length == 0) {
      return;
    }

    const kind = selectedMetric;
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

    api
      .getMetrics(
        "<token>",
        {
          cluster_id: currentCluster.id,
          metric: kind,
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
        }
      )
      .then((res) => {
        if (!Array.isArray(res.data) || !res.data[0]?.results) {
          return;
        }
        // transform the metrics to expected form
        if (kind == "cpu") {
          let data = res.data as MetricsCPUDataResponse;

          // if summed, just look at the first data
          let tData = data[0].results.map(
            (
              d: {
                date: number;
                cpu: string;
              },
              i: number
            ) => {
              return {
                date: d.date,
                value: parseFloat(d.cpu),
              };
            }
          );

          setData(tData);
        } else if (kind == "memory") {
          let data = res.data as MetricsMemoryDataResponse;

          let tData = data[0].results.map(
            (
              d: {
                date: number;
                memory: string;
              },
              i: number
            ) => {
              return {
                date: d.date,
                value: parseFloat(d.memory) / (1024 * 1024), // put units in Mi
              };
            }
          );

          setData(tData);
        } else if (kind == "network") {
          let data = res.data as MetricsNetworkDataResponse;

          let tData = data[0].results.map(
            (
              d: {
                date: number;
                bytes: string;
              },
              i: number
            ) => {
              return {
                date: d.date,
                value: parseFloat(d.bytes) / 1024, // put units in Ki
              };
            }
          );

          setData(tData);
        } else if (kind == "nginx:errors") {
          let data = res.data as MetricsNGINXErrorsDataResponse;

          let tData = data[0].results.map(
            (
              d: {
                date: number;
                error_pct: string;
              },
              i: number
            ) => {
              return {
                date: d.date,
                value: parseFloat(d.error_pct), // put units in Ki
              };
            }
          );

          setData(tData);
        }
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
      })
      .finally(() => {
        setIsLoading((prev) => prev - 1);
      });
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
        <ParentSize>
          {({ width, height }) => (
            <AreaChart
              data={data}
              width={width}
              height={height - 10}
              resolution={selectedRange}
              margin={{ top: 40, right: -40, bottom: 0, left: 50 }}
            />
          )}
        </ParentSize>
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
  position: absolute;
  top: 0;
  right: 0;
  font-weight: bold;
  width: 156px;
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
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  font-size: 13px;
  border-radius: 5px;
  overflow: hidden;
`;
