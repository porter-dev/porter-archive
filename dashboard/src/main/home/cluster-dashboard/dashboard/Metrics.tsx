import React, { useContext, useState, useEffect } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import settings from "assets/settings.svg";
import TabSelector from "components/TabSelector";
import Placeholder from "components/Placeholder";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import AreaChart from "../expanded-chart/metrics/AreaChart";
import {
  AvailableMetrics,
  NormalizedMetricsData,
} from "../expanded-chart/metrics/types";
import SelectRow from "../../../../components/form-components/SelectRow";
import { MetricNormalizer } from "../expanded-chart/metrics/MetricNormalizer";
import {
  resolutions,
  secondsBeforeNow,
} from "../expanded-chart/metrics/MetricsSection";

const Metrics: React.FC = () => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [loading, setLoading] = useState(true);
  const [detected, setDetected] = useState(false);
  const [metricsOptions, setMetricsOptions] = useState([]);
  const [dropdownExpanded, setDropdownExpanded] = useState(false);
  const [ingressOptions, setIngressOptions] = useState([]);
  const [selectedIngress, setSelectedIngress] = useState(null);
  const [selectedRange, setSelectedRange] = useState("1H");
  const [selectedMetric, setSelectedMetric] = useState("nginx:errors");
  const [selectedMetricLabel, setSelectedMetricLabel] = useState(
    "5XX Error Percentage"
  );
  const [selectedPercentile, setSelectedPercentile] = useState("0.99");
  const [data, setData] = useState<NormalizedMetricsData[]>([]);
  const [showMetricsSettings, setShowMetricsSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(0);
  const [hpaData, setHpaData] = useState([]);

  useEffect(() => {
    if (selectedMetric && selectedRange && selectedIngress) {
      getMetrics();
    }
  }, [
    selectedMetric,
    selectedRange,
    selectedIngress,
    selectedPercentile,
    currentCluster,
  ]);

  useEffect(() => {
    Promise.all([
      api.getCluster(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      ),
      api.getPrometheusIsInstalled(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      ),
    ])
      .then(() => {
        setDetected(true);
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
            setMetricsOptions([
              ...metricsOptions,
              {
                value: "nginx:errors",
                label: "5XX Error Percentage",
              },
              {
                value: "nginx:latency",
                label: "Request Latency (s)",
              },
              {
                value: "nginx:latency-histogram",
                label: "Percentile Response Times (s)",
              },
            ]);
            setLoading(false);
          })
          .catch((err) => {
            setCurrentError(JSON.stringify(err));
          })
          .finally(() => {
            setIsLoading((prev) => prev - 1);
          });
      })
      .catch(() => {
        setDetected(false);
        setLoading(false);
      });
  }, []);

  const renderMetricsSettings = () => {
    if (showMetricsSettings) {
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
            {selectedMetric == "nginx:latency-histogram" && (
              <SelectRow
                label="Percentile"
                value={selectedPercentile}
                setActiveValue={(x) => {
                  setSelectedPercentile(x);
                }}
                options={[
                  {
                    label: "99",
                    value: "0.99",
                  },
                  {
                    label: "95",
                    value: "0.95",
                  },
                  {
                    label: "50",
                    value: "0.5",
                  },
                ]}
                width="100%"
              />
            )}
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

  const getMetrics = async () => {
    try {
      let shouldsum = true;
      let namespace = "default";

      // calculate start and end range
      const d = new Date();
      const end = Math.round(d.getTime() / 1000);
      const start = end - secondsBeforeNow[selectedRange];

      let podNames = [] as string[];

      podNames = [selectedIngress?.name];

      setIsLoading((prev) => prev + 1);
      setData([]);

      const res = await api.getMetrics(
        "<token>",
        {
          metric: selectedMetric,
          shouldsum: false,
          kind: "Ingress",
          namespace: selectedIngress?.namespace || "default",
          percentile:
            selectedMetric == "nginx:latency-histogram"
              ? parseFloat(selectedPercentile)
              : undefined,
          startrange: start,
          endrange: end,
          resolution: resolutions[selectedRange],
          pods: podNames,
          name: selectedIngress?.name,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );

      setHpaData([]);

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

  return loading ? (
    <LoadingWrapper>
      <Loading />
    </LoadingWrapper>
  ) : !detected ? (
    <>
      <br />
      <br />
      <Placeholder height="calc(50vh - 50px)" minHeight="400px">
        Cluster metrics unavailable. Make sure nginx-ingress and Prometheus are
        installed.
        <A href="/launch">Go to Launch</A>
      </Placeholder>
    </>
  ) : (
    <StyledMetricsSection>
      <Header>
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
      </Header>
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
          <ParentSize>
            {({ width, height }) => (
              <AreaChart
                dataKey={selectedMetricLabel}
                data={data}
                hpaData={hpaData}
                hpaEnabled={false}
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

export default Metrics;

const A = styled.a`
  margin-left: 5px;
`;

const LoadingWrapper = styled.div`
  padding: 100px 0px;
  width: 100%;
  display: flex;
  align-items: center;
  font-size: 13px;
  justify-content: center;
  color: #ffffff44;
`;

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
  min-height: 400px;
  height: 50vh;
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
  margin-top: 34px;
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

const Header = styled.div`
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
`;
