import Input from "components/porter/Input";
import React from "react"
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import Checkbox from "components/porter/Checkbox";

interface Props {
}

const JobTabs: React.FC<Props> = ({
}) => {
  const [currentTab, setCurrentTab] = React.useState<string>('main');

  const renderMain = () => {
    return (
      <>
        <Spacer y={1} />
        <Input 
          label="Start command"
          placeholder="ex: sh start.sh"
          value=""
          width="300px"
          setValue={(e) => {}}
        />
        <Spacer y={1} />
        <Input 
          label="Cron schedule (leave blank to run manually)"
          placeholder="ex: */5 * * * *"
          value=""
          width="300px"
          setValue={(e) => {}}
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
          value=""
          width="300px"
          setValue={(e) => {}}
        />
        <Spacer y={1} />
        <Input 
          label="RAM (GB)"
          placeholder="ex: 1"
          value=""
          width="300px"
          setValue={(e) => {}}
        />
      </>
    )
  };

  const renderAdvanced = () => {
    return (
      <>
        <Spacer y={1} />
        <Checkbox
          checked={true}
          toggleChecked={() => {}}
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