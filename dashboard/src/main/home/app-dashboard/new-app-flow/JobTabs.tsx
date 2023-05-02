import Input from "components/porter/Input";
import React from "react"
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import Checkbox from "components/porter/Checkbox";
import { JobService } from "./serviceTypes";
import { Height } from "react-animate-height";

interface Props {
  service: JobService;
  editService: (service: JobService) => void;
  setHeight: (height: Height) => void;
}

const JobTabs: React.FC<Props> = ({
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
        <Spacer y={1} />
        <Input
          label="Cron schedule (leave blank to run manually)"
          placeholder="ex: */5 * * * *"
          value={service.cronSchedule.value}
          disabled={service.cronSchedule.readOnly}
          width="300px"
          setValue={(e) => { editService({ ...service, cronSchedule: { readOnly: false, value: e } }) }}
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
          label="CPUs (Mi)"
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
      </>
    )
  };

  const renderAdvanced = () => {
    return (
      <>
        <Spacer y={1} />
        <Checkbox
          checked={service.jobsExecuteConcurrently.value}
          toggleChecked={() => { editService({ ...service, jobsExecuteConcurrently: { readOnly: false, value: !service.jobsExecuteConcurrently.value } }) }}
        >
          <Text color="helper">Allow jobs to execute concurrently</Text>
        </Checkbox>
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
            setHeight(244);
          } else if (value === 'resources') {
            setHeight(244);
          } else if (value === 'advanced') {
            setHeight(118.5);
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

export default JobTabs;