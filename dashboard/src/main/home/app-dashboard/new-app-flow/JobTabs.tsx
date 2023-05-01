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
    setHeight(244);

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
        <Spacer y={1} />
        <Input
          label="Cron schedule (leave blank to run manually)"
          placeholder="ex: */5 * * * *"
          value={service.cronSchedule}
          width="300px"
          setValue={(e) => { editService({ ...service, cronSchedule: e }) }}
        />
      </>
    )
  };

  const renderResources = () => {
    setHeight(244);

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
          label="RAM (GB)"
          placeholder="ex: 1"
          value={service.ram}
          width="300px"
          setValue={(e) => { editService({ ...service, ram: e }) }}
        />
      </>
    )
  };

  const renderAdvanced = () => {
    setHeight(118.5);

    return (
      <>
        <Spacer y={1} />
        <Checkbox
          checked={service.jobsExecuteConcurrently}
          toggleChecked={() => { editService({ ...service, jobsExecuteConcurrently: !service.jobsExecuteConcurrently }) }}
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
        setCurrentTab={setCurrentTab}
      />
      {currentTab === 'main' && renderMain()}
      {currentTab === 'resources' && renderResources()}
      {currentTab === 'advanced' && renderAdvanced()}
    </>
  )
}

export default JobTabs;