import Input from "components/porter/Input";
import React, { useContext } from "react"
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import Checkbox from "components/porter/Checkbox";
import { WorkerService } from "../serviceTypes";
import AnimateHeight, { Height } from "react-animate-height";
import { DATABASE_HEIGHT_DISABLED, DATABASE_HEIGHT_ENABLED, MIB_TO_GIB, MILI_TO_CORE, RESOURCE_HEIGHT_WITHOUT_AUTOSCALING, RESOURCE_HEIGHT_WITH_AUTOSCALING } from "./utils";
import { Context } from "shared/Context";
import InputSlider from "components/porter/InputSlider";

interface Props {
  service: WorkerService;
  editService: (service: WorkerService) => void;
  setHeight: (height: Height) => void;
  maxRAM: number;
  maxCPU: number;
}

const WorkerTabs: React.FC<Props> = ({
  service,
  editService,
  setHeight,
  maxCPU,
  maxRAM,
}) => {
  const [currentTab, setCurrentTab] = React.useState<string>('main');
  const { currentCluster } = useContext(Context);

  const renderMain = () => {
    setHeight(159);
    return (
      <>
        <Spacer y={1} />
        <Input
          label="Start command"
          placeholder="ex: sh start.sh"
          disabled={service.startCommand.readOnly}
          value={service.startCommand.value}
          width="300px"
          setValue={(e) => { editService({ ...service, startCommand: { readOnly: false, value: e } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
      </>
    )
  };

  const renderResources = () => {
    setHeight(service.autoscaling.enabled.value ? RESOURCE_HEIGHT_WITH_AUTOSCALING : RESOURCE_HEIGHT_WITHOUT_AUTOSCALING)
    return (
      <>
        <Spacer y={1} />
        <InputSlider
          label="CPUs: "
          unit="Cores"
          min={0}
          max={maxCPU}
          color={"#3a48ca"}
          value={(service.cpu.value / MILI_TO_CORE).toString()}
          setValue={(e) => {
            editService({ ...service, cpu: { readOnly: false, value: e * MILI_TO_CORE } });
          }}
          step={0.01}
          disabled={service.cpu.readOnly}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <InputSlider
          label="RAM: "
          unit="GiB"
          min={0}
          max={maxRAM}
          color={"#3a48ca"}
          value={(service.ram.value / MIB_TO_GIB).toString()}
          setValue={(e) => {
            editService({ ...service, ram: { readOnly: false, value: e * MIB_TO_GIB } });
          }}
          disabled={service.ram.readOnly}
          step={0.01}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <Input
          label="Replicas"
          placeholder="ex: 1"
          value={service.replicas.value}
          disabled={service.replicas.readOnly || service.autoscaling.enabled.value}
          width="300px"
          setValue={(e) => { editService({ ...service, replicas: { readOnly: false, value: e } }) }}
          disabledTooltip={service.replicas.readOnly ? "You may only edit this field in your porter.yaml." : "Disable autoscaling to specify replicas."}
        />
        <Spacer y={1} />
        <Checkbox
          checked={service.autoscaling.enabled.value}
          toggleChecked={() => { editService({ ...service, autoscaling: { ...service.autoscaling, enabled: { readOnly: false, value: !service.autoscaling.enabled.value } } }) }}
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
          <InputSlider
            label="Target CPU utilization: "
            unit="%"
            min={0}
            max={100}
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
          <InputSlider
            label="Target RAM utilization: "
            unit="%"
            min={0}
            max={100}
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
    )
  };

  const renderDatabase = () => {
    setHeight(service.cloudsql.enabled.value ? DATABASE_HEIGHT_ENABLED : DATABASE_HEIGHT_DISABLED)
    return (
      <>
        <Spacer y={1} />
        <Checkbox
          checked={service.cloudsql.enabled.value}
          disabled={service.cloudsql.enabled.readOnly}
          toggleChecked={() => {
            editService({
              ...service,
              cloudsql: {
                ...service.cloudsql,
                enabled: {
                  readOnly: false,
                  value: !service.cloudsql.enabled.value,
                },
              },
            });
          }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        >
          <Text color="helper">Securely connect to Google Cloud SQL</Text>
        </Checkbox>
        <AnimateHeight height={service.cloudsql.enabled.value ? 'auto' : 0}>
          <Spacer y={1} />
          <Input
            label={"Instance Connection Name"}
            placeholder="ex: project-123:us-east1:pachyderm"
            value={service.cloudsql.connectionName.value}
            disabled={service.cloudsql.connectionName.readOnly}
            width="300px"
            setValue={(e) => {
              editService({
                ...service,
                cloudsql: {
                  ...service.cloudsql,
                  connectionName: { readOnly: false, value: e },
                },
              });
            }}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
          />
          <Spacer y={1} />
          <Input
            label={"DB Port"}
            placeholder="5432"
            value={service.cloudsql.dbPort.value}
            disabled={service.cloudsql.dbPort.readOnly}
            width="300px"
            setValue={(e) => {
              editService({
                ...service,
                cloudsql: {
                  ...service.cloudsql,
                  dbPort: { readOnly: false, value: e },
                },
              });
            }}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
          />
          <Spacer y={1} />
          <Input
            label={"Service Account JSON"}
            placeholder="ex: { <SERVICE_ACCOUNT_JSON> }"
            value={service.cloudsql.serviceAccountJSON.value}
            disabled={service.cloudsql.serviceAccountJSON.readOnly}
            width="300px"
            setValue={(e) => {
              editService({
                ...service,
                cloudsql: {
                  ...service.cloudsql,
                  serviceAccountJSON: { readOnly: false, value: e },
                },
              });
            }}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
          />
        </AnimateHeight>
      </>
    );
  }

  return (
    <>
      <TabSelector
        options={currentCluster?.cloud_provider === "GCP" ?
          [
            { label: 'Main', value: 'main' },
            { label: 'Resources', value: 'resources' },
            { label: "Database", value: "database" },
          ] :
          [
            { label: 'Main', value: 'main' },
            { label: 'Resources', value: 'resources' },
          ]
        }
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />
      {currentTab === 'main' && renderMain()}
      {currentTab === 'resources' && renderResources()}
      {currentTab === 'database' && renderDatabase()}
    </>
  )
}

export default WorkerTabs;