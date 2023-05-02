import Input from "components/porter/Input";
import React from "react"
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import Checkbox from "components/porter/Checkbox";
import { WorkerService } from "./serviceTypes";
import { Height } from "react-animate-height";

interface Props {
  service: WorkerService
  editService: (service: WorkerService) => void
  setHeight: (height: Height) => void
}

const WorkerTabs: React.FC<Props> = ({
  service,
  editService,
  setHeight
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
          label="CPUs"
          placeholder="ex: 0.5"
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
          disabled={service.replicas.readOnly}
          width="300px"
          setValue={(e) => { editService({ ...service, replicas: { readOnly: false, value: e } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <Checkbox
          checked={service.autoscalingOn.value}
          toggleChecked={() => { editService({ ...service, autoscalingOn: { readOnly: false, value: !service.autoscalingOn.value } }) }}
        >
          <Text color="helper">Enable autoscaling (overrides replicas)</Text>
        </Checkbox>
        <Spacer y={1} />
        <Input
          label="Min replicas"
          placeholder="ex: 1"
          value={service.minReplicas.value}
          disabled={service.minReplicas.readOnly}
          width="300px"
          setValue={(e) => { editService({ ...service, minReplicas: { readOnly: false, value: e } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <Input
          label="Max replicas"
          placeholder="ex: 10"
          value={service.maxReplicas.value}
          disabled={service.maxReplicas.readOnly}
          width="300px"
          setValue={(e) => { editService({ ...service, maxReplicas: { readOnly: false, value: e } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <Input
          label="Target CPU utilization (%)"
          placeholder="ex: 50"
          value={service.targetCPUUtilizationPercentage.value}
          disabled={service.targetCPUUtilizationPercentage.readOnly}
          width="300px"
          setValue={(e) => { editService({ ...service, targetCPUUtilizationPercentage: { readOnly: false, value: e } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <Input
          label="Target RAM utilization (%)"
          placeholder="ex: 50"
          value={service.targetRAMUtilizationPercentage.value}
          disabled={service.targetRAMUtilizationPercentage.readOnly}
          width="300px"
          setValue={(e) => { editService({ ...service, targetRAMUtilizationPercentage: { readOnly: false, value: e } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
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
            setHeight(713.5);
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