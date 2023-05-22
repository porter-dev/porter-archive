import Input from "components/porter/Input";
import React, { useEffect, useRef } from "react";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import Checkbox from "components/porter/Checkbox";
import { WebService } from "./serviceTypes";
import AnimateHeight, { Height } from "react-animate-height";
import styled from "styled-components";

interface Props {
  service: WebService;
  editService: (service: WebService) => void;
  setHeight: (height: Height) => void;
  hasFooter?: boolean;
}

const WebTabs: React.FC<Props> = ({
  service,
  editService,
  setHeight,
  hasFooter,
}) => {
  const [currentTab, setCurrentTab] = React.useState<string>("main");
  const [showSettingsLive, setShowSettingsLive] = React.useState<boolean>(
    false
  );
  const [showSettingsStart, setShowSettingsStart] = React.useState<boolean>(
    false
  );
  const [showSettingsReady, setShowSettingsReady] = React.useState<boolean>(
    false
  );
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    calculateContainerHeight();
  }, [currentTab]);
  const calculateContainerHeight = () => {
    const containerHeight = containerRef.current?.offsetHeight || 0;
    const add = hasFooter ? 0 : 55;
    setHeight(containerHeight + add);
  };
  const renderMain = () => {
    return (
      <>
        <Spacer y={1} />
        <Input
          label="Start command"
          // TODO: uncomment the below once we have docs on what /cnb/lifecycle/launcher is
          // label={
          //   <>
          //     <span>Start command</span>
          //     {!service.startCommand.readOnly && service.startCommand.value.includes("/cnb/lifecycle/launcher") &&
          //       <a
          //         href="https://docs.porter.run/deploying-applications/https-and-domains/custom-domains"
          //         target="_blank"
          //       >
          //         &nbsp;(?)
          //       </a>
          //     }
          //   </>}
          placeholder="ex: sh start.sh"
          value={service.startCommand.value}
          width="300px"
          disabled={service.startCommand.readOnly}
          setValue={(e) => {
            editService({
              ...service,
              startCommand: { readOnly: false, value: e },
            });
          }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <Input
          label="Container port"
          placeholder="ex: 80"
          value={service.port.value}
          disabled={service.port.readOnly}
          width="300px"
          setValue={(e) => {
            editService({ ...service, port: { readOnly: false, value: e } });
          }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <Checkbox
          checked={service.ingress.enabled.value}
          disabled={service.ingress.enabled.readOnly}
          toggleChecked={() => {
            editService({
              ...service,
              ingress: {
                ...service.ingress,
                enabled: {
                  readOnly: false,
                  value: !service.ingress.enabled.value,
                },
              },
            });
          }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        >
          <Text color="helper">Generate a Porter URL for external traffic</Text>
        </Checkbox>
      </>
    );
  };

  const renderResources = () => {
    return (
      <>
        <Spacer y={1} />
        <Input
          label="CPUs (Millicores)"
          placeholder="ex: 500"
          value={service.cpu.value}
          disabled={service.cpu.readOnly}
          width="300px"
          setValue={(e) => {
            editService({ ...service, cpu: { readOnly: false, value: e } });
          }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <Input
          label="RAM (MB)"
          placeholder="ex: 1"
          value={service.ram.value}
          disabled={service.ram.readOnly}
          width="300px"
          setValue={(e) => {
            editService({ ...service, ram: { readOnly: false, value: e } });
          }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <Input
          label="Replicas"
          placeholder="ex: 1"
          value={service.replicas.value}
          disabled={
            service.replicas.readOnly || service.autoscaling.enabled.value
          }
          width="300px"
          setValue={(e) => {
            editService({
              ...service,
              replicas: { readOnly: false, value: e },
            });
          }}
          disabledTooltip={
            service.replicas.readOnly
              ? "You may only edit this field in your porter.yaml."
              : "Disable autoscaling to specify replicas."
          }
        />
        <Spacer y={1} />
        <Checkbox
          checked={service.autoscaling.enabled.value}
          toggleChecked={() => {
            editService({
              ...service,
              autoscaling: {
                ...service.autoscaling,
                enabled: {
                  readOnly: false,
                  value: !service.autoscaling.enabled.value,
                },
              },
            });
          }}
          disabled={service.autoscaling.enabled.readOnly}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        >
          <Text color="helper">Enable autoscaling (overrides replicas)</Text>
        </Checkbox>
        <Spacer y={1} />
        <Input
          label="Min replicas"
          placeholder="ex: 1"
          value={service.autoscaling.minReplicas.value}
          disabled={
            service.autoscaling.minReplicas.readOnly ||
            !service.autoscaling.enabled.value
          }
          width="300px"
          setValue={(e) => {
            editService({
              ...service,
              autoscaling: {
                ...service.autoscaling,
                minReplicas: { readOnly: false, value: e },
              },
            });
          }}
          disabledTooltip={
            service.autoscaling.minReplicas.readOnly
              ? "You may only edit this field in your porter.yaml."
              : "Enable autoscaling to specify min replicas."
          }
        />
        <Spacer y={1} />
        <Input
          label="Max replicas"
          placeholder="ex: 10"
          value={service.autoscaling.maxReplicas.value}
          disabled={
            service.autoscaling.maxReplicas.readOnly ||
            !service.autoscaling.enabled.value
          }
          width="300px"
          setValue={(e) => {
            editService({
              ...service,
              autoscaling: {
                ...service.autoscaling,
                maxReplicas: { readOnly: false, value: e },
              },
            });
          }}
          disabledTooltip={
            service.autoscaling.maxReplicas.readOnly
              ? "You may only edit this field in your porter.yaml."
              : "Enable autoscaling to specify max replicas."
          }
        />
        <Spacer y={1} />
        <Input
          label="Target CPU utilization (%)"
          placeholder="ex: 50"
          value={service.autoscaling.targetCPUUtilizationPercentage.value}
          disabled={
            service.autoscaling.targetCPUUtilizationPercentage.readOnly ||
            !service.autoscaling.enabled.value
          }
          width="300px"
          setValue={(e) => {
            editService({
              ...service,
              autoscaling: {
                ...service.autoscaling,
                targetCPUUtilizationPercentage: { readOnly: false, value: e },
              },
            });
          }}
          disabledTooltip={
            service.autoscaling.targetCPUUtilizationPercentage.readOnly
              ? "You may only edit this field in your porter.yaml."
              : "Enable autoscaling to specify target CPU utilization."
          }
        />
        <Spacer y={1} />
        <Input
          label="Target RAM utilization (%)"
          placeholder="ex: 50"
          value={service.autoscaling.targetMemoryUtilizationPercentage.value}
          disabled={
            service.autoscaling.targetMemoryUtilizationPercentage.readOnly ||
            !service.autoscaling.enabled.value
          }
          width="300px"
          setValue={(e) => {
            editService({
              ...service,
              autoscaling: {
                ...service.autoscaling,
                targetMemoryUtilizationPercentage: {
                  readOnly: false,
                  value: e,
                },
              },
            });
          }}
          disabledTooltip={
            service.autoscaling.targetMemoryUtilizationPercentage.readOnly
              ? "You may only edit this field in your porter.yaml."
              : "Enable autoscaling to specify target RAM utilization."
          }
        />
      </>
    );
  };

  const renderHealth = () => {
    return (
      <>
        <Spacer y={1} />
        <>
          <StyledAdvancedBuildSettings
            showSettings={showSettingsLive}
            isCurrent={true}
            onClick={() => {
              setShowSettingsLive(!showSettingsLive);
            }}
          >
            <AdvancedBuildTitle>
              <i className="material-icons dropdown">arrow_drop_down</i>
              Configure Liveness Probe Settings
            </AdvancedBuildTitle>
          </StyledAdvancedBuildSettings>
          <PaddingContainer>
            <AnimateHeight
              height={showSettingsLive ? "auto" : 0}
              duration={1000}
            >
              <Spacer y={0.5} />
              <Checkbox
                checked={service.health.livenessProbe?.enabled.value}
                toggleChecked={() => {
                  editService({
                    ...service,
                    health: {
                      ...service.health,
                      livenessProbe: {
                        ...service.health.livenessProbe,
                        enabled: {
                          readOnly: false,
                          value: !service.health.livenessProbe?.enabled.value,
                        },
                      },
                    },
                  });
                }}
              >
                <Text color="helper">Enable Liveness Probe</Text>
              </Checkbox>
              <Spacer y={0.5} />

              <>
                <Input
                  label="Liveness Check Endpoint "
                  placeholder="ex: 80"
                  value={service.health.livenessProbe.path.value}
                  disabled={service.health.livenessProbe.path.readOnly}
                  width="300px"
                  setValue={(e) => {
                    editService({
                      ...service,
                      health: {
                        ...service.health,
                        livenessProbe: {
                          ...service.health.livenessProbe,
                          path: {
                            readOnly: false,
                            value: e,
                          },
                        },
                      },
                    });
                  }}
                  disabledTooltip={
                    "You may only edit this field in your porter.yaml."
                  }
                />
                <Spacer y={0.5} />
                <Input
                  label="Failure Threshold"
                  placeholder="ex: 80"
                  value={service.health.livenessProbe.failureThreshold.value}
                  disabled={
                    service.health.livenessProbe.failureThreshold.readOnly
                  }
                  width="300px"
                  setValue={(e) => {
                    editService({
                      ...service,
                      health: {
                        ...service.health,
                        livenessProbe: {
                          ...service.health.livenessProbe,
                          failureThreshold: {
                            readOnly: false,
                            value: e,
                          },
                        },
                      },
                    });
                  }}
                  disabledTooltip={
                    "You may only edit this field in your porter.yaml."
                  }
                />
                <Spacer y={0.5} />
                <Input
                  label="Retry Interval"
                  placeholder="ex: 80"
                  value={service.health.livenessProbe.periodSeconds.value}
                  disabled={service.health.livenessProbe.periodSeconds.readOnly}
                  width="300px"
                  setValue={(e) => {
                    editService({
                      ...service,
                      health: {
                        ...service.health,
                        livenessProbe: {
                          ...service.health.livenessProbe,
                          periodSeconds: {
                            readOnly: false,
                            value: e,
                          },
                        },
                      },
                    });
                  }}
                  disabledTooltip={
                    "You may only edit this field in your porter.yaml."
                  }
                />
              </>
            </AnimateHeight>
          </PaddingContainer>
        </>
        <Spacer y={1} />
        <>
          <StyledAdvancedBuildSettings
            showSettings={showSettingsStart}
            isCurrent={true}
            onClick={() => {
              setShowSettingsStart(!showSettingsStart);
            }}
          >
            <AdvancedBuildTitle>
              <i className="material-icons dropdown">arrow_drop_down</i>
              Configure Start Up Probe Settings
            </AdvancedBuildTitle>
          </StyledAdvancedBuildSettings>
          <PaddingContainer>
            <AnimateHeight
              height={showSettingsStart ? "auto" : 0}
              duration={1000}
            >
              <Spacer y={0.5} />
              <Checkbox
                checked={service.health.startupProbe?.enabled.value}
                toggleChecked={() => {
                  editService({
                    ...service,
                    health: {
                      ...service.health,
                      startupProbe: {
                        ...service.health.startupProbe,
                        enabled: {
                          readOnly: false,
                          value: !service.health.startupProbe?.enabled.value,
                        },
                      },
                    },
                  });
                }}
                //disabled={service.autoscaling.enabled.readOnly}
                //disabledTooltip={"You may only edit this field in your porter.yaml."}
              >
                <Text color="helper">Enable Start Up Probe</Text>
              </Checkbox>
              <Spacer y={0.5} />

              <>
                <Input
                  label="Start Up Check Endpoint "
                  placeholder="ex: 80"
                  value={service.health.startupProbe.path.value}
                  disabled={service.health.startupProbe.path.readOnly}
                  width="300px"
                  setValue={(e) => {
                    editService({
                      ...service,
                      health: {
                        ...service.health,
                        startupProbe: {
                          ...service.health.startupProbe,
                          path: {
                            readOnly: false,
                            value: e,
                          },
                        },
                      },
                    });
                  }}
                  disabledTooltip={
                    "You may only edit this field in your porter.yaml."
                  }
                />
                <Spacer y={0.5} />

                <Input
                  label="Failure Threshold"
                  placeholder="ex: 80"
                  value={service.health.startupProbe.failureThreshold.value}
                  disabled={
                    service.health.startupProbe.failureThreshold.readOnly
                  }
                  width="300px"
                  setValue={(e) => {
                    editService({
                      ...service,
                      health: {
                        ...service.health,
                        startupProbe: {
                          ...service.health.startupProbe,
                          failureThreshold: {
                            readOnly: false,
                            value: e,
                          },
                        },
                      },
                    });
                  }}
                  disabledTooltip={
                    "You may only edit this field in your porter.yaml."
                  }
                />
                <Spacer y={0.5} />
                <Input
                  label="Retry Interval"
                  placeholder="ex: 80"
                  value={service.health.startupProbe.periodSeconds.value}
                  disabled={service.health.startupProbe.periodSeconds.readOnly}
                  width="300px"
                  setValue={(e) => {
                    editService({
                      ...service,
                      health: {
                        ...service.health,
                        startupProbe: {
                          ...service.health.startupProbe,
                          periodSeconds: {
                            readOnly: false,
                            value: e,
                          },
                        },
                      },
                    });
                  }}
                  disabledTooltip={
                    "You may only edit this field in your porter.yaml."
                  }
                />
              </>
            </AnimateHeight>
          </PaddingContainer>
        </>
        <Spacer y={1} />
        <>
          <StyledAdvancedBuildSettings
            showSettings={showSettingsReady}
            isCurrent={true}
            onClick={() => {
              setShowSettingsReady(!showSettingsReady);
            }}
          >
            <AdvancedBuildTitle>
              <i className="material-icons dropdown">arrow_drop_down</i>
              Configure Readiness Probe settings
            </AdvancedBuildTitle>
          </StyledAdvancedBuildSettings>
          <PaddingContainer>
            <AnimateHeight
              height={showSettingsReady ? "auto" : 0}
              duration={1000}
            >
              <Spacer y={0.5} />
              <Checkbox
                checked={service.health.readinessProbe?.enabled.value}
                toggleChecked={() => {
                  editService({
                    ...service,
                    health: {
                      ...service.health,
                      readinessProbe: {
                        ...service.health.readinessProbe,
                        enabled: {
                          readOnly: false,
                          value: !service.health.readinessProbe?.enabled.value,
                        },
                      },
                    },
                  });
                }}
                //disabled={service.autoscaling.enabled.readOnly}
                //disabledTooltip={"You may only edit this field in your porter.yaml."}
              >
                <Text color="helper">Enable Readiness Probe</Text>
              </Checkbox>
              <Spacer y={0.5} />

              <>
                <Input
                  label="Readiness Check Endpoint "
                  placeholder="ex: 80"
                  value={service.health.readinessProbe.path.value}
                  disabled={service.health.readinessProbe.path.readOnly}
                  width="300px"
                  setValue={(e) => {
                    editService({
                      ...service,
                      health: {
                        ...service.health,
                        readinessProbe: {
                          ...service.health.readinessProbe,
                          path: {
                            readOnly: false,
                            value: e,
                          },
                        },
                      },
                    });
                  }}
                  disabledTooltip={
                    "You may only edit this field in your porter.yaml."
                  }
                />
                <Spacer y={0.5} />

                <Input
                  label="Failure Threshold"
                  placeholder="ex: 80"
                  value={service.health.readinessProbe.failureThreshold.value}
                  disabled={
                    service.health.readinessProbe.failureThreshold.readOnly
                  }
                  width="300px"
                  setValue={(e) => {
                    editService({
                      ...service,
                      health: {
                        ...service.health,
                        readinessProbe: {
                          ...service.health.readinessProbe,
                          failureThreshold: {
                            readOnly: false,
                            value: e,
                          },
                        },
                      },
                    });
                  }}
                  disabledTooltip={
                    "You may only edit this field in your porter.yaml."
                  }
                />
                <Spacer y={0.5} />

                <Input
                  label="Initial Delay Threshold"
                  placeholder="ex: 80"
                  value={
                    service.health.readinessProbe.initialDelaySeconds.value
                  }
                  disabled={
                    service.health.readinessProbe.initialDelaySeconds.readOnly
                  }
                  width="300px"
                  setValue={(e) => {
                    editService({
                      ...service,
                      health: {
                        ...service.health,
                        readinessProbe: {
                          ...service.health.readinessProbe,
                          initialDelaySeconds: {
                            readOnly: false,
                            value: e,
                          },
                        },
                      },
                    });
                  }}
                  disabledTooltip={
                    "You may only edit this field in your porter.yaml."
                  }
                />
              </>
            </AnimateHeight>
          </PaddingContainer>
        </>
      </>
    );
  };

  const renderAdvanced = () => {
    return (
      <>
        <ScrollableDiv>
          <>
            <Spacer y={1} />
            <Input
              label={
                <>
                  <span>Custom domain</span>
                  <a
                    href="https://docs.porter.run/deploying-applications/https-and-domains/custom-domains"
                    target="_blank"
                  >
                    &nbsp;(?)
                  </a>
                </>
              }
              placeholder="ex: my-app.my-domain.com"
              value={service.ingress.hosts.value}
              disabled={service.ingress.hosts.readOnly}
              width="300px"
              setValue={(e) => {
                editService({
                  ...service,
                  ingress: {
                    ...service.ingress,
                    hosts: { readOnly: false, value: e },
                  },
                });
              }}
              disabledTooltip={
                "You may only edit this field in your porter.yaml."
              }
            />
            {renderHealth()}
          </>
        </ScrollableDiv>
      </>
    );
  };
  return (
    <>
      <div
        ref={containerRef}
        style={{ paddingBottom: currentTab == "advanced" ? "100px" : "50px" }}
      >
        <TabSelector
          options={[
            { label: "Main", value: "main" },
            { label: "Resources", value: "resources" },
            { label: "Advanced", value: "advanced" },
          ]}
          currentTab={currentTab}
          setCurrentTab={(value: string) => {
            setShowSettingsLive(false);
            setShowSettingsStart(false);
            setShowSettingsReady(false);
            setCurrentTab(value);
          }}
        />
        {currentTab === "main" && renderMain()}
        {currentTab === "resources" && renderResources()}
        {currentTab === "advanced" && renderAdvanced()}
      </div>
    </>
  );
};

export default WebTabs;

const StyledAdvancedBuildSettings = styled.div`
  color: ${({ showSettings }) => (showSettings ? "white" : "#aaaabb")};
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
  ${({ disabled }) =>
    !disabled &&
    `
    :hover {
      border: 1px solid #7a7b80;
      color: white;
    }
  `}
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  border-radius: 5px;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 10px;
  cursor: pointer;
  border-bottom-left-radius: ${({ showSettings }) => showSettings && "0px"};
  border-bottom-right-radius: ${({ showSettings }) => showSettings && "0px"};

  .dropdown {
    margin-right: 8px;
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    transform: ${(props: { showSettings: boolean; isCurrent: boolean }) =>
      props.showSettings ? "" : "rotate(-90deg)"};
  }
`;
const AdvancedBuildTitle = styled.div`
  display: flex;
  align-items: center;
`;
const ScrollableDiv = styled.div`
  overflow-y: auto;
  padding: 0 25px;
  width: calc(100% + 50px);
  margin-left: -25px;
  max-height: 400px;
`;
const Footer = styled.div`
  position: relative;
  width: calc(100% + 50px);
  margin-left: -25px;
  padding: 0 25px;
  background: ${({ theme }) => theme.fg};
  margin-bottom: -30px;
  padding-bottom: 30px;
`;

const Shade = styled.div`
  position: absolute;

  top: -15px;
  left: 0;
  height: 50px;
  width: 100%;
  background: linear-gradient(to bottom, #00000000, ${({ theme }) => theme.fg});
`;
const StyledAnimateHeight = styled(AnimateHeight)`
  & > * {
    padding-left: 5px;
  }
`;
const PaddingContainer = styled.div`
  padding-left: 15px;
`;
