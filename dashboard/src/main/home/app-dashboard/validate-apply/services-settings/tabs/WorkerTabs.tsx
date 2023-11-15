import React from "react";
import TabSelector from "components/TabSelector";

import { ClientService } from "lib/porter-apps/services";
import { match } from "ts-pattern";
import MainTab from "./Main";
import Resources from "./Resources";

interface Props {
  index: number;
  service: ClientService & {
    config: {
      type: "worker";
    };
  };
  chart?: any;
  maxRAM: number;
  maxCPU: number;
  clusterContainsGPUNodes: boolean;
}

const WorkerTabs: React.FC<Props> = ({ index, service, maxCPU, maxRAM, clusterContainsGPUNodes }) => {
  const [currentTab, setCurrentTab] = React.useState<"main" | "resources">(
    "main"
  );

  return (
    <>
      <TabSelector
        options={[
          { label: "Main", value: "main" },
          { label: "Resources", value: "resources" },
        ]}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />
      {match(currentTab)
        .with("main", () => <MainTab index={index} service={service} />)
        .with("resources", () => (
          <Resources
            index={index}
            maxCPU={maxCPU}
            maxRAM={maxRAM}
            service={service}
            clusterContainsGPUNodes={clusterContainsGPUNodes}
          />
        ))
        .exhaustive()}
    </>
  );
};

export default WorkerTabs;
