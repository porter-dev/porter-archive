import Input from "components/porter/Input";
import React, { useEffect } from "react"
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import Checkbox from "components/porter/Checkbox";
import { WebService } from "./serviceTypes";
import { Height } from "react-animate-height";
import Tooltip from "components/porter/Tooltip";

interface Props {
  service: WebService
  editService: (service: WebService) => void
  setHeight: (height: Height) => void
}

const WebTabs: React.FC<Props> = ({
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
          value={service.startCommand.value}
          width="300px"
          disabled={service.startCommand.readOnly}
          setValue={(e) => { editService({ ...service, startCommand: { readOnly: false, value: e } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <Input
          label="Container port"
          placeholder="ex: 80"
          value={service.port.value}
          disabled={service.port.readOnly}
          width="300px"
          setValue={(e) => { editService({ ...service, port: { readOnly: false, value: e } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
        <Spacer y={1} />
        <Checkbox
          checked={service.generateUrlForExternalTraffic.value}
          disabled={service.generateUrlForExternalTraffic.readOnly}
          toggleChecked={() => { editService({ ...service, generateUrlForExternalTraffic: { readOnly: false, value: !service.generateUrlForExternalTraffic.value } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        >
          <Text color="helper">Generate a Porter URL for external traffic</Text>
        </Checkbox>
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
          disabled={service.replicas.readOnly || service.autoscalingOn.value}
          width="300px"
          setValue={(e) => { editService({ ...service, replicas: { readOnly: false, value: e } }) }}
          disabledTooltip={service.replicas.readOnly ? "You may only edit this field in your porter.yaml." : "Disable autoscaling to specify replicas."}
        />
        <Spacer y={1} />
        <Checkbox
          checked={service.autoscalingOn.value}
          toggleChecked={() => { editService({ ...service, autoscalingOn: { readOnly: false, value: !service.autoscalingOn.value } }) }}
          disabled={service.autoscalingOn.readOnly}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        >
          <Text color="helper">Enable autoscaling (overrides replicas)</Text>
        </Checkbox>
        <Spacer y={1} />
        <Input
          label="Min replicas"
          placeholder="ex: 1"
          value={service.minReplicas.value}
          disabled={service.minReplicas.readOnly || !service.autoscalingOn.value}
          width="300px"
          setValue={(e) => { editService({ ...service, minReplicas: { readOnly: false, value: e } }) }}
          disabledTooltip={service.minReplicas.readOnly ? "You may only edit this field in your porter.yaml." : "Enable autoscaling to specify min replicas."}
        />
        <Spacer y={1} />
        <Input
          label="Max replicas"
          placeholder="ex: 10"
          value={service.maxReplicas.value}
          disabled={service.maxReplicas.readOnly || !service.autoscalingOn.value}
          width="300px"
          setValue={(e) => { editService({ ...service, maxReplicas: { readOnly: false, value: e } }) }}
          disabledTooltip={service.maxReplicas.readOnly ? "You may only edit this field in your porter.yaml." : "Enable autoscaling to specify max replicas."}
        />
        <Spacer y={1} />
        <Input
          label="Target CPU utilization (%)"
          placeholder="ex: 50"
          value={service.targetCPUUtilizationPercentage.value}
          disabled={service.targetCPUUtilizationPercentage.readOnly || !service.autoscalingOn.value}
          width="300px"
          setValue={(e) => { editService({ ...service, targetCPUUtilizationPercentage: { readOnly: false, value: e } }) }}
          disabledTooltip={service.targetCPUUtilizationPercentage.readOnly ? "You may only edit this field in your porter.yaml." : "Enable autoscaling to specify target CPU utilization."}
        />
        <Spacer y={1} />
        <Input
          label="Target RAM utilization (%)"
          placeholder="ex: 50"
          value={service.targetRAMUtilizationPercentage.value}
          disabled={service.targetRAMUtilizationPercentage.readOnly || !service.autoscalingOn.value}
          width="300px"
          setValue={(e) => { editService({ ...service, targetRAMUtilizationPercentage: { readOnly: false, value: e } }) }}
          disabledTooltip={service.targetRAMUtilizationPercentage.readOnly ? "You may only edit this field in your porter.yaml." : "Enable autoscaling to specify target RAM utilization."}
        />
      </>
    )
  };

  const renderAdvanced = () => {
    return (
      <>
        <Spacer y={1} />
        <Input
          label="Custom domain"
          placeholder="ex: my-app.my-domain.com"
          value={service.customDomain.value}
          disabled={service.customDomain.readOnly}
          width="300px"
          setValue={(e) => { editService({ ...service, customDomain: { readOnly: false, value: e } }) }}
          disabledTooltip={"You may only edit this field in your porter.yaml."}
        />
      </>
    );
  };

  return (
    <>
      <TabSelector
        options={[
          { label: 'Main', value: 'main' },
          { label: 'Resources', value: 'resources' },
          { label: 'Advanced', value: 'advanced' },
        ]}
        currentTab={currentTab}
        setCurrentTab={(value: string) => {
          if (value === 'main') {
            setHeight(300);
          } else if (value === 'resources') {
            setHeight(713.5);
          } else if (value === 'advanced') {
            setHeight(159);
          }
          setCurrentTab(value);
        }}
      />
      {currentTab === 'main' && renderMain()}
      {currentTab === 'resources' && renderResources()}
      {currentTab === 'advanced' && renderAdvanced()}
    </>
  )
}

export default WebTabs;