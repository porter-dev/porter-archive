import Input from "components/porter/Input";
import React, { useEffect, useRef } from "react";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import Checkbox from "components/porter/Checkbox";
import { WebService } from "./serviceTypes";
import AnimateHeight, { Height } from "react-animate-height";
import styled from "styled-components";
import ExpandableSection from "components/porter/ExpandableSection";

interface Props {
  service: WebService;
  editService: (service: WebService) => void;
  setHeight: (height: Height) => void;
  hasFooter?: boolean;
}

const RESOURCE_HEIGHT_WITHOUT_AUTOSCALING = 373;
const RESOURCE_HEIGHT_WITH_AUTOSCALING = 713;
const ADVANCED_BASE_HEIGHT = 300;
const PROBE_INPUTS_HEIGHT = 230;

const WebTabs: React.FC<Props> = ({
  service,
  editService,
  setHeight,
  hasFooter,
}) => {
  const [currentTab, setCurrentTab] = React.useState<string>("main");

  const renderMain = () => {
    setHeight(288);
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
    service.autoscaling.enabled.value ? setHeight(RESOURCE_HEIGHT_WITH_AUTOSCALING) : setHeight(RESOURCE_HEIGHT_WITHOUT_AUTOSCALING);
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
            setHeight(service.autoscaling.enabled.value ? RESOURCE_HEIGHT_WITHOUT_AUTOSCALING : RESOURCE_HEIGHT_WITH_AUTOSCALING);
          }}
          disabled={service.autoscaling.enabled.readOnly}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        >
          <Text color="helper">Enable autoscaling (overrides replicas)</Text>
        </Checkbox>
        <AnimateHeight height={service.autoscaling.enabled.value ? 'auto' : 0}>
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
        </AnimateHeight>
      </>
    );
  };

  const calculateHealthHeight = () => {
    let height = ADVANCED_BASE_HEIGHT;
    if (service.health.livenessProbe.enabled.value) {
      height += PROBE_INPUTS_HEIGHT;
    }
    if (service.health.startupProbe.enabled.value) {
      height += PROBE_INPUTS_HEIGHT;
    }
    if (service.health.readinessProbe.enabled.value) {
      height += PROBE_INPUTS_HEIGHT;
    }
    return height;
  };
  const renderHealth = () => {
    setHeight(calculateHealthHeight());
    return (
      <>
        <Spacer y={1} />
        <Text color="helper">
          <>
            <span>Health checks</span>
            <a
              href="https://docs.porter.run/enterprise/deploying-applications/zero-downtime-deployments#health-checks"
              target="_blank"
            >
              &nbsp;(?)
            </a>
          </>
        </Text>
        <Spacer y={0.5} />
        <Checkbox
          checked={service.health.livenessProbe.enabled.value}
          toggleChecked={() => {
            editService({
              ...service,
              health: {
                ...service.health,
                livenessProbe: {
                  ...service.health.livenessProbe,
                  enabled: {
                    readOnly: false,
                    value: !service.health.livenessProbe.enabled.value,
                  },
                },
              },
            });
            setHeight(calculateHealthHeight() + (service.health.livenessProbe.enabled.value ? -PROBE_INPUTS_HEIGHT : PROBE_INPUTS_HEIGHT));
          }}
          disabled={service.health.livenessProbe.enabled.readOnly}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        >
          <Text color="helper">Enable Liveness Probe</Text>
        </Checkbox>
        <AnimateHeight height={service.health.livenessProbe.enabled.value ? 'auto' : 0}>
          <Spacer y={0.5} />
          <Input
            label="Liveness Check Endpoint "
            placeholder="ex: 80"
            value={service.health.livenessProbe.path.value}
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
            disabled={service.health.livenessProbe.path.readOnly}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
          />
          <Spacer y={0.5} />
          <Input
            label="Failure Threshold"
            placeholder="ex: 80"
            value={service.health.livenessProbe.failureThreshold.value}
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
            disabled={
              service.health.livenessProbe.failureThreshold.readOnly
            }
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
          />
          <Spacer y={0.5} />
          <Input
            label="Retry Interval"
            placeholder="ex: 80"
            value={service.health.livenessProbe.periodSeconds.value}
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
            disabled={service.health.livenessProbe.periodSeconds.readOnly}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
          />
          <Spacer y={0.5} />
        </AnimateHeight>
        <Spacer y={0.5} />
        <Checkbox
          checked={service.health.startupProbe.enabled.value}
          toggleChecked={() => {
            editService({
              ...service,
              health: {
                ...service.health,
                startupProbe: {
                  ...service.health.startupProbe,
                  enabled: {
                    readOnly: false,
                    value: !service.health.startupProbe.enabled.value,
                  },
                },
              },
            });
            setHeight(calculateHealthHeight() + (service.health.startupProbe.enabled.value ? -PROBE_INPUTS_HEIGHT : PROBE_INPUTS_HEIGHT));
          }}
          disabled={service.health.startupProbe.enabled.readOnly}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        >
          <Text color="helper">Enable Start Up Probe</Text>
        </Checkbox>
        <AnimateHeight height={service.health.startupProbe.enabled.value ? 'auto' : 0}>
          <Spacer y={0.5} />
          <Input
            label="Start Up Check Endpoint "
            placeholder="ex: 80"
            value={service.health.startupProbe.path.value}
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
            disabled={service.health.startupProbe.path.readOnly}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
          />
          <Spacer y={0.5} />
          <Input
            label="Failure Threshold"
            placeholder="ex: 80"
            value={service.health.startupProbe.failureThreshold.value}
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
            disabled={service.health.startupProbe.failureThreshold.readOnly}
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
          <Spacer y={0.5} />
        </AnimateHeight>
        <Spacer y={0.5} />
        <Checkbox
          checked={service.health.readinessProbe.enabled.value}
          toggleChecked={() => {
            editService({
              ...service,
              health: {
                ...service.health,
                readinessProbe: {
                  ...service.health.readinessProbe,
                  enabled: {
                    readOnly: false,
                    value: !service.health.readinessProbe.enabled.value,
                  },
                },
              },
            });
            setHeight(calculateHealthHeight() + (service.health.readinessProbe.enabled.value ? -PROBE_INPUTS_HEIGHT : PROBE_INPUTS_HEIGHT));
          }}
          disabled={service.health.readinessProbe.enabled.readOnly}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        >
          <Text color="helper">Enable Readiness Probe</Text>
        </Checkbox>
        <AnimateHeight height={service.health.readinessProbe?.enabled.value ? 'auto' : 0}>
          <Spacer y={0.5} />
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
            value={service.health.readinessProbe.initialDelaySeconds.value}
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
          <Spacer y={0.5} />
        </AnimateHeight>
      </>
    );
  };

  const renderAdvanced = () => {
    return (
      <>
        <>
          <Spacer y={1} />
          <Input
            label={
              <>
                <span>Custom domain</span>
                <a
                  href="https://docs.porter.run/standard/deploying-applications/https-and-domains/custom-domains"
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
      </>
    );
  };
  return (
    <>
      <>
        <TabSelector
          options={[
            { label: "Main", value: "main" },
            { label: "Resources", value: "resources" },
            { label: "Advanced", value: "advanced" },
          ]}
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
        />
        {currentTab === "main" && renderMain()}
        {currentTab === "resources" && renderResources()}
        {currentTab === "advanced" && renderAdvanced()}
      </>
    </>
  );
};

export default WebTabs;
