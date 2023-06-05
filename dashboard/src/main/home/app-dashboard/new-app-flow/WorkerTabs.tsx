import Input from "components/porter/Input";
import React from "react"
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import Checkbox from "components/porter/Checkbox";
import { WorkerService } from "./serviceTypes";
import { Height } from "react-animate-height";

interface Props {
  service: WorkerService;
  editService: (service: WorkerService) => void;
  setHeight: (height: Height) => void;
}

const WorkerTabs: React.FC<Props> = ({
  service,
  editService,
  setHeight,
}) => {
  const [currentTab, setCurrentTab] = React.useState<string>('main');

  const renderMain = () => {
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
    return (
      <>
        <Spacer y={1} />
        <Input
          label="CPUs (Millicores)"
          placeholder="ex: 500"
          value={service.cpu.value}
          disabled={service.cpu.readOnly}
          width="300px"
          setValue={(e) => { editService({ ...service, cpu: { readOnly: false, value: e } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <Input
          label="RAM (MB)"
          placeholder="ex: 1"
          value={service.ram.value}
          disabled={service.ram.readOnly}
          width="300px"
          setValue={(e) => { editService({ ...service, ram: { readOnly: false, value: e } }) }}
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
        <Spacer y={1} />
        <Input
          label="Min replicas"
          placeholder="ex: 1"
          value={service.autoscaling.minReplicas.value}
          disabled={service.autoscaling.minReplicas.readOnly || !service.autoscaling.enabled.value}
          width="300px"
          setValue={(e) => { editService({ ...service, autoscaling: { ...service.autoscaling, minReplicas: { readOnly: false, value: e } } }) }}
          disabledTooltip={service.autoscaling.minReplicas.readOnly ? "You may only edit this field in your porter.yaml." : "Enable autoscaling to specify min replicas."}
        />
        <Spacer y={1} />
        <Input
          label="Max replicas"
          placeholder="ex: 10"
          value={service.autoscaling.maxReplicas.value}
          disabled={service.autoscaling.maxReplicas.readOnly || !service.autoscaling.enabled.value}
          width="300px"
          setValue={(e) => { editService({ ...service, autoscaling: { ...service.autoscaling, maxReplicas: { readOnly: false, value: e } } }) }}
          disabledTooltip={service.autoscaling.maxReplicas.readOnly ? "You may only edit this field in your porter.yaml." : "Enable autoscaling to specify max replicas."}
        />
        <Spacer y={1} />
        <Input
          label="Target CPU utilization (%)"
          placeholder="ex: 50"
          value={service.autoscaling.targetCPUUtilizationPercentage.value}
          disabled={service.autoscaling.targetCPUUtilizationPercentage.readOnly || !service.autoscaling.enabled.value}
          width="300px"
          setValue={(e) => { editService({ ...service, autoscaling: { ...service.autoscaling, targetCPUUtilizationPercentage: { readOnly: false, value: e } } }) }}
          disabledTooltip={service.autoscaling.targetCPUUtilizationPercentage.readOnly ? "You may only edit this field in your porter.yaml." : "Enable autoscaling to specify target CPU utilization."}
        />
        <Spacer y={1} />
        <Input
          label="Target RAM utilization (%)"
          placeholder="ex: 50"
          value={service.autoscaling.targetMemoryUtilizationPercentage.value}
          disabled={service.autoscaling.targetMemoryUtilizationPercentage.readOnly || !service.autoscaling.enabled.value}
          width="300px"
          setValue={(e) => { editService({ ...service, autoscaling: { ...service.autoscaling, targetMemoryUtilizationPercentage: { readOnly: false, value: e } } }) }}
          disabledTooltip={service.autoscaling.targetMemoryUtilizationPercentage.readOnly ? "You may only edit this field in your porter.yaml." : "Enable autoscaling to specify target RAM utilization."}
        />
      </>
    )
  };

  return (
    <>
      <TabSelector
        options={[
          { label: 'Main', value: 'main' },
          { label: 'Resources', value: 'resources' },
        ]}
        currentTab={currentTab}
        setCurrentTab={(value: string) => {
          if (value === 'main') {
            setHeight(159);
          } else if (value === 'resources') {
            setHeight(713);
          }
          setCurrentTab(value);
        }}
      />
      {currentTab === 'main' && renderMain()}
      {currentTab === 'resources' && renderResources()}
    </>
  )
}

export default WorkerTabs;