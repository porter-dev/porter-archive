import React, { Component } from "react";
import styled from "styled-components";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import settings from "assets/settings.svg";
import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType, StorageType } from "shared/types";

import TabSelector from "components/TabSelector";
import SelectRow from "components/values-form/SelectRow";
import AreaChart, { MetricsData } from "./AreaChart";

type PropsType = {
  currentChart: ChartType;
};

type StateType = {
  controllerOptions: any[];
  selectedController: any;
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

export default class MetricsSection extends Component<PropsType, StateType> {
  state = {
    pods: [] as any[],
    selectedPod: "",
    controllerOptions: [] as any[],
    selectedController: null as any,
    selectedRange: "1H",
    selectedMetric: "cpu",
    selectedMetricLabel: "CPU Utilization (vCPUs)",
    dropdownExpanded: false,
    podDropdownExpanded: false,
    controllerDropdownExpanded: false,
    data: [] as MetricsData[],
    showMetricsSettings: false,
  };

  componentDidMount() {
    // get all controllers and read in a list of pods
    let { currentChart } = this.props;
    let { currentCluster, currentProject, setCurrentError } = this.context;

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
        // TODO -- check at least one controller returned
        let controllerOptions = [] as any[];
        res.data.map((controller: any) => {
          let name = controller?.metadata?.name;
          controllerOptions.push({ value: controller, label: name });
        });

        // iterate through the controllers to get the list of pods
        this.setState({
          controllerOptions,
          selectedController: controllerOptions[0].value,
        });

        this.getPods();
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
        this.setState({ controllerOptions: [] as any[] });
      });
  }

  componentDidUpdate(prevProps: PropsType, prevState: StateType) {
    // if resolution, data kind, controllers, or pods have changed, update data
    if (this.state.selectedMetric != prevState.selectedMetric) {
      this.getMetrics();
    }

    if (this.state.selectedRange != prevState.selectedRange) {
      this.getMetrics();
    }

    if (this.state.selectedPod != prevState.selectedPod) {
      this.getMetrics();
    }

    if (
      this.state.selectedController?.metadata?.name !=
      prevState.selectedController?.metadata?.name
    ) {
      this.getMetrics();
    }
  }

  getMetrics = () => {
    if (this.state.pods.length == 0) {
      return;
    }

    let { currentChart } = this.props;
    let { currentCluster, currentProject, setCurrentError } = this.context;
    let kind = this.state.selectedMetric;
    let shouldsum = true;

    // calculate start and end range
    var d = new Date();
    var end = Math.round(d.getTime() / 1000);
    var start = end - secondsBeforeNow[this.state.selectedRange];

    let pods = this.state.pods.map((pod: any) => {
      return pod.value;
    });

    if (this.state.selectedPod != "All") {
      pods = [this.state.selectedPod];
    }

    api
      .getMetrics(
        "<token>",
        {
          cluster_id: currentCluster.id,
          metric: kind,
          shouldsum: shouldsum,
          pods,
          namespace: currentChart.namespace,
          startrange: start,
          endrange: end,
          resolution: resolutions[this.state.selectedRange],
        },
        {
          id: currentProject.id,
        }
      )
      .then((res) => {
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

          this.setState({ data: tData });
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

          this.setState({ data: tData });
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

          this.setState({ data: tData });
        }
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
        // this.setState({ controllers: [], loading: false });
      });
  };

  getPods = () => {
    let { selectedController } = this.state;
    let { currentCluster, currentProject, setCurrentError } = this.context;

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

    api
      .getMatchingPods(
        "<token>",
        {
          cluster_id: currentCluster.id,
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

        this.setState({ pods, selectedPod: "All" });

        this.getMetrics();
      })
      .catch((err) => {
        console.log(err);
        setCurrentError(JSON.stringify(err));
        return;
      });
  };

  renderDropdown = () => {
    if (this.state.dropdownExpanded) {
      return (
        <>
          <DropdownOverlay
            onClick={() => this.setState({ dropdownExpanded: false })}
          />
          <Dropdown
            dropdownWidth="230px"
            dropdownMaxHeight="200px"
            onClick={() => this.setState({ dropdownExpanded: false })}
          >
            {this.renderOptionList()}
          </Dropdown>
        </>
      );
    }
  };

  renderOptionList = () => {
    let metricOptions = [
      { value: "cpu", label: "CPU Utilization (vCPUs)" },
      { value: "memory", label: "RAM Utilization (Mi)" },
      { value: "network", label: "Network Received Bytes (Ki)" },
    ];
    return metricOptions.map(
      (option: { value: string; label: string }, i: number) => {
        return (
          <Option
            key={i}
            selected={option.value === this.state.selectedMetric}
            onClick={() =>
              this.setState({
                selectedMetric: option.value,
                selectedMetricLabel: option.label,
              })
            }
            lastItem={i === metricOptions.length - 1}
          >
            {option.label}
          </Option>
        );
      }
    );
  };

  renderMetricsSettings = () => {
    if (this.state.showMetricsSettings && true) {
      return (
        <>
          <DropdownOverlay
            onClick={() => this.setState({ showMetricsSettings: false })}
          />
          <DropdownAlt dropdownWidth="330px" dropdownMaxHeight="300px">
            <Label>Additional Settings</Label>
            <SelectRow
              label="Target Controller"
              value={this.state.selectedController}
              setActiveValue={(x: any) =>
                this.setState({ selectedController: x })
              }
              options={this.state.controllerOptions}
              width="100%"
            />
            <SelectRow
              label="Target Pod"
              value={this.state.selectedPod}
              setActiveValue={(x: any) => this.setState({ selectedPod: x })}
              options={this.state.pods}
              width="100%"
            />
          </DropdownAlt>
        </>
      );
    }
  };

  render() {
    return (
      <StyledMetricsSection>
        <MetricsHeader>
          <Flex>
            <MetricSelector
              onClick={() =>
                this.setState({
                  dropdownExpanded: !this.state.dropdownExpanded,
                })
              }
            >
              <MetricsLabel>{this.state.selectedMetricLabel}</MetricsLabel>
              <i className="material-icons">arrow_drop_down</i>
              {this.renderDropdown()}
            </MetricSelector>
            <Relative>
              <IconWrapper
                onClick={() => this.setState({ showMetricsSettings: true })}
              >
                <SettingsIcon src={settings} />
              </IconWrapper>
              {this.renderMetricsSettings()}
            </Relative>
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
              currentTab={this.state.selectedRange}
              setCurrentTab={(x: string) => this.setState({ selectedRange: x })}
            />
          </RangeWrapper>
        </MetricsHeader>
        <ParentSize>
          {({ width, height }) => (
            <AreaChart
              data={this.state.data}
              width={width}
              height={height - 10}
              resolution={this.state.selectedRange}
              margin={{ top: 40, right: -40, bottom: 0, left: 50 }}
            />
          )}
        </ParentSize>
      </StyledMetricsSection>
    );
  }
}

MetricsSection.contextType = Context;

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
