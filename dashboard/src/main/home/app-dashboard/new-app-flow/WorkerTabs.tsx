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
          value={service.cpu}
          width="300px"
          setValue={(e) => { editService({ ...service, cpu: e }) }}
        />
        <Spacer y={1} />
        <Input
          label="RAM (MB)"
          placeholder="ex: 1"
          value={service.ram}
          width="300px"
          setValue={(e) => { editService({ ...service, ram: e }) }}
        />
        <Spacer y={1} />
        <Input
          label="Replicas"
          placeholder="ex: 1"
          value={service.replicas}
          width="300px"
          setValue={(e) => { editService({ ...service, replicas: e }) }}
        />
        <Spacer y={1} />
        <Checkbox
          checked={service.autoscalingOn}
          toggleChecked={() => { editService({ ...service, autoscalingOn: !service.autoscalingOn }) }}
        >
          <Text color="helper">Enable autoscaling (overrides replicas)</Text>
        </Checkbox>
        <Spacer y={1} />
        <Input
          label="Min replicas"
          placeholder="ex: 1"
          value={service.minReplicas}
          width="300px"
          setValue={(e) => { editService({ ...service, minReplicas: e }) }}
        />
        <Spacer y={1} />
        <Input
          label="Max replicas"
          placeholder="ex: 10"
          value={service.maxReplicas}
          width="300px"
          setValue={(e) => { editService({ ...service, maxReplicas: e }) }}
        />
        <Spacer y={1} />
        <Input
          label="Target CPU utilization (%)"
          placeholder="ex: 50"
          value={service.targetCPUUtilizationPercentage}
          width="300px"
          setValue={(e) => { editService({ ...service, targetCPUUtilizationPercentage: e }) }}
        />
        <Spacer y={1} />
        <Input
          label="Target RAM utilization (%)"
          placeholder="ex: 50"
          value={service.targetRAMUtilizationPercentage}
          width="300px"
          setValue={(e) => { editService({ ...service, targetRAMUtilizationPercentage: e }) }}
        />
      </>
    )
  };

  const renderAdvanced = () => {
    return (
      <>
      </>
    );
  };

  return (
    <>
      <TabSelector
        options={[
          { label: 'Main', value: 'main' },
          { label: 'Resources', value: 'resources' },
          // { label: 'Advanced', value: 'advanced' },
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
      {/* currentTab === 'advanced' && renderAdvanced() */}
    </>
  )
}

export default WorkerTabs;