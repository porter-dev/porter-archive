import Input from "components/porter/Input";
import React, { useEffect } from "react"
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import Checkbox from "components/porter/Checkbox";
import { WebService } from "./serviceTypes";
import { Height } from "react-animate-height";

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
          checked={service.ingress.enabled.value}
          disabled={service.ingress.enabled.readOnly}
          toggleChecked={() => { editService({ ...service, ingress: { ...service.ingress, enabled: { readOnly: false, value: !service.ingress.enabled.value } } }) }}
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

  const renderAdvanced = () => {
    return (
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
            </>}
          placeholder="ex: my-app.my-domain.com"
          value={service.ingress.hosts.value}
          disabled={service.ingress.hosts.readOnly}
          width="300px"
          setValue={(e) => { editService({ ...service, ingress: { ...service.ingress, hosts: { readOnly: false, value: e } } }) }}
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
            setHeight(288);
          } else if (value === 'resources') {
            setHeight(713);
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