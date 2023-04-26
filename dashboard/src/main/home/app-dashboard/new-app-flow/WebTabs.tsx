import Input from "components/porter/Input";
import React from "react"
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import Checkbox from "components/porter/Checkbox";

interface Props {
}

const WebTabs: React.FC<Props> = ({
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
          label="Container port"
          placeholder="ex: 80"
          value=""
          width="300px"
          setValue={(e) => {}}
        />
        <Spacer y={1} />
        <Checkbox
          checked={true}
          toggleChecked={() => {}}
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
        <Spacer y={1} />
        <Input 
          label="Replicas"
          placeholder="ex: 1"
          value=""
          width="300px"
          setValue={(e) => {}}
        />
        <Spacer y={1} />
        <Checkbox
          checked={true}
          toggleChecked={() => {}}
        >
          <Text color="helper">Enable autoscaling (overrides replicas)</Text>
        </Checkbox>
        <Spacer y={1} />
        <Input 
          label="Min replicas"
          placeholder="ex: 1"
          value=""
          width="300px"
          setValue={(e) => {}}
        />
        <Spacer y={1} />
        <Input 
          label="Max replicas"
          placeholder="ex: 10"
          value=""
          width="300px"
          setValue={(e) => {}}
        />
        <Spacer y={1} />
        <Input 
          label="Target CPU utilization (%)"
          placeholder="ex: 50"
          value=""
          width="300px"
          setValue={(e) => {}}
        />
        <Spacer y={1} />
        <Input 
          label="Target RAM utilization (%)"
          placeholder="ex: 50"
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
        <Input 
          label="Custom domain"
          placeholder="ex: my-app.my-domain.com"
          value=""
          width="300px"
          setValue={(e) => {}}
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
        setCurrentTab={setCurrentTab}
      />
      {currentTab === 'main' && renderMain()}
      {currentTab === 'resources' && renderResources()}
      {currentTab === 'advanced' && renderAdvanced()}
    </>
  )
}

export default WebTabs;