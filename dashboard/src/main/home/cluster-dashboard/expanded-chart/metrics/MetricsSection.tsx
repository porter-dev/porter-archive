import React, { Component } from "react";
import styled from "styled-components";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType, StorageType } from "shared/types";

import TabSelector from "components/TabSelector";
import AreaChart, { MetricsData } from "./AreaChart";

type PropsType = {
  currentChart: ChartType;
};

type StateType = {
  controllers: any[];
  selectedController: any;
  pods: string[];
  selectedPod: string;
  selectedRange: string;
  selectedMetric: string;
  selectedMetricLabel: string;
  controllerDropdownExpanded: boolean;
  podDropdownExpanded: boolean;
  dropdownExpanded: boolean;
  data: MetricsData[];
};

type MetricsCPUDataResponse = {
  pod?: string,
  results: {
    date: number,
    cpu: string,
  }[],
}[]

type MetricsMemoryDataResponse = {
  pod?: string,
  results: {
    date: number,
    memory: string,
  }[],
}[]

type MetricsNetworkDataResponse = {
  pod?: string,
  results: {
    date: number,
    bytes: string,
  }[],
}[]

const resolutions : { [range: string]: string } = {
  "1H": "15s",
  "6H": "15s",
  "1D": "15s",
  "1M": "5h",
}

const secondsBeforeNow : { [range: string]: number } = {
  "1H": 60 * 60,
  "6H": 60 * 60 * 6,
  "1D": 60 * 60 * 24,
  "1M": 60 * 60 * 24 * 30,
}

export default class MetricsSection extends Component<PropsType, StateType> {
  state = {
    pods: [] as string[],
    selectedPod: "",
    controllers: [] as any[],
    selectedController: null as any,
    selectedRange: "1H",
    selectedMetric: "cpu",
    selectedMetricLabel: "CPU Utilization (vCPUs)",
    dropdownExpanded: false,
    podDropdownExpanded: false,
    controllerDropdownExpanded: false,
    data: [] as MetricsData[],
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

        // iterate through the controllers to get the list of pods
        this.setState({ controllers: res.data, selectedController: res.data[0] });
        
        this.getPods()
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
        this.setState({ controllers: [] });
      });      
  }

  componentDidUpdate(prevProps: PropsType, prevState: StateType) {
    // if resolution, data kind, controllers, or pods have changed, update data
    if (this.state.selectedMetric != prevState.selectedMetric) {
      this.getMetrics()
    }

    if (this.state.selectedRange != prevState.selectedRange) {
      this.getMetrics()
    }

    if (this.state.selectedPod != prevState.selectedPod) {
      this.getMetrics()
    }

    if (this.state.selectedController?.metadata?.name != prevState.selectedController?.metadata?.name) {
      this.getMetrics()
    }
  }

  getMetrics = () => {
    if (this.state.pods.length == 0) {
      return
    }

    let { currentChart } = this.props;
    let { currentCluster, currentProject, setCurrentError } = this.context;
    let kind = this.state.selectedMetric
    let shouldsum = true

    // calculate start and end range
    var d = new Date();
    var end = Math.round(d.getTime() / 1000);
    var start = end - secondsBeforeNow[this.state.selectedRange]

    let pods = this.state.pods

    if (this.state.selectedPod != "All") {
      pods = [this.state.selectedPod]
    }

    api
      .getMetrics(
        "<token>",
        {
          cluster_id: currentCluster.id,
          metric: kind,
          shouldsum: shouldsum,
          pods: pods,
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
          let data = res.data as MetricsCPUDataResponse
          
          // if summed, just look at the first data
            let tData = data[0].results.map(
              (d: {
                date: number,
                cpu: string,
              }, i: number) => {
                return {
                  date: d.date,
                  value: parseFloat(d.cpu),
                }
              }
            )

            this.setState({ data: tData })
        } else if (kind == "memory") {
          let data = res.data as MetricsMemoryDataResponse

          let tData = data[0].results.map(
            (d: {
              date: number,
              memory: string,
            }, i: number) => {
              return {
                date: d.date,
                value: parseFloat(d.memory) / (1024 * 1024), // put units in Mi
              }
            }
          )

          this.setState({ data: tData })
        } else if (kind == "network") {
          let data = res.data as MetricsNetworkDataResponse

          let tData = data[0].results.map(
            (d: {
              date: number,
              bytes: string,
            }, i: number) => {
              return {
                date: d.date,
                value: parseFloat(d.bytes) / (1024), // put units in Ki
              }
            }
          )

          this.setState({ data: tData })
        }
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
        // this.setState({ controllers: [], loading: false });
      });
  }

  getPods = () => {
    let { selectedController } = this.state;
    let { currentCluster, currentProject, setCurrentError } = this.context;

    let selectors = [] as string[];
    let ml =
      selectedController?.spec?.selector?.matchLabels || selectedController?.spec?.selector;
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
        let pods = res?.data?.map((pod: any) => {
          return pod?.metadata?.name
        });

        this.setState({ pods, selectedPod: "All" });

        this.getMetrics()
      })
      .catch((err) => {
        console.log(err);
        setCurrentError(JSON.stringify(err));
        return;
      });
  }

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

  renderPodDropdown = () => {
    if (this.state.podDropdownExpanded) {
      return (
        <>
          <DropdownOverlay
            onClick={() => this.setState({ podDropdownExpanded: false })}
          />
          <Dropdown
            dropdownWidth="400px"
            dropdownMaxHeight="200px"
            onClick={() => this.setState({ podDropdownExpanded: false })}
          >
            {this.renderPodOptionList()}
          </Dropdown>
        </>
      );
    }
  };

  renderPodOptionList = () => {
    let allPod = [(
      <Option
        key={0}
        selected={"All" === this.state.selectedPod}
        onClick={() => this.setState({ selectedPod: "All" })}
        lastItem={false}
      >
        All (summed)
      </Option>
    )];

    let podOptions = this.state.pods.map(
      (option: string, i: number) => {
        return (
          <Option
            key={i + 1}
            selected={option === this.state.selectedPod}
            onClick={() => this.setState({ selectedPod: option })}
            lastItem={i === this.state.pods.length - 1}
          >
            {option}
          </Option>
        );
      }
    )

    return allPod.concat(podOptions)
  };

  renderControllerDropdown = () => {
    if (this.state.controllerDropdownExpanded) {
      return (
        <>
          <DropdownOverlay
            onClick={() => this.setState({ controllerDropdownExpanded: false })}
          />
          <Dropdown
            dropdownWidth="300px"
            dropdownMaxHeight="200px"
            onClick={() => this.setState({ controllerDropdownExpanded: false })}
          >
            {this.renderControllerOptionList()}
          </Dropdown>
        </>
      );
    }
  };

  renderControllerOptionList = () => {
    return this.state.controllers.map(
      (controller: any, i: number) => {
        let name = controller?.metadata?.name

        return (
          <Option
            key={i}
            selected={name === this.state.selectedController?.metadata?.name}
            onClick={() => this.setState({ selectedController: controller })}
            lastItem={i === this.state.controllers.length - 1}
          >
            {name}
          </Option>
        );
      }
    )
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
            onClick={() => this.setState({ selectedMetric: option.value, selectedMetricLabel: option.label })}
            lastItem={i === metricOptions.length - 1}
          >
            {option.label}
          </Option>
        );
      }
    );
  };

  render() {
    return (
      <StyledMetricsSection>
        <ParentSize>
          {({ width, height }) => <AreaChart 
            data={this.state.data} 
            width={width} 
            height={height} 
            resolution={this.state.selectedRange}
            margin={{ top: 60, right: -40, bottom: 0, left: 50 }}
          />}
        </ParentSize>
        <MetricSelector
          onClick={() =>
            this.setState({ dropdownExpanded: !this.state.dropdownExpanded })
          }
        >
          <MetricsLabel>
          {this.state.selectedMetricLabel}
          </MetricsLabel>
          <i className="material-icons">arrow_drop_down</i>
          {this.renderDropdown()}
        </MetricSelector>
        <ControllerSelector
          onClick={() =>
            this.setState({ controllerDropdownExpanded: !this.state.controllerDropdownExpanded })
          }
        >
          <MetricsLabel>{this.state.selectedController?.metadata?.name}</MetricsLabel>
          <i className="material-icons">arrow_drop_down</i>
          {this.renderControllerDropdown()}
        </ControllerSelector>
        <PodSelector
          onClick={() =>
            this.setState({ podDropdownExpanded: !this.state.podDropdownExpanded })
          }
        >
          <MetricsLabel>{this.state.selectedPod}</MetricsLabel>
          <i className="material-icons">arrow_drop_down</i>
          {this.renderPodDropdown()}
        </PodSelector>
        <RangeWrapper>
          <TabSelector
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
      </StyledMetricsSection>
    );
  }
}

MetricsSection.contextType = Context;

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
  box-shadow: 0 4px 8px 0px #00000088;
`;


const RangeWrapper = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  font-weight: bold;
  width: 156px;
`;

const MetricSelector = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  position: absolute;
  top: 10px;
  left: 0;
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
`

const ControllerSelector = styled(MetricSelector)`
  left: 230px;
`

const PodSelector = styled(MetricSelector)`
  left: 490px;
`

const StyledMetricsSection = styled.div`
  width: 100%;
  height: 100%;
  background: #20222700;
  display: flex;
  position: relative;
  font-size: 13px;
  border-radius: 5px;
  overflow: hidden;
`;
