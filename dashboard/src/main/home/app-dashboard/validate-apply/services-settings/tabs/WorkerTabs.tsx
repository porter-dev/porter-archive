import React from "react";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import { type ClientService } from "lib/porter-apps/services";

import Advanced from "./Advanced";
import MainTab from "./Main";
import Resources from "./Resources";

type Props = {
  index: number;
  service: ClientService & {
    config: {
      type: "worker";
    };
  };
  maxRAM: number;
  maxCPU: number;
  clusterContainsGPUNodes: boolean;
};

const WorkerTabs: React.FC<Props> = ({
  index,
  service,
  maxCPU,
  maxRAM,
  clusterContainsGPUNodes,
}) => {
  const [currentTab, setCurrentTab] = React.useState<
    "main" | "resources" | "advanced"
  >("main");

  return (
    <>
      <TabSelector
        options={[
          { label: "Main", value: "main" },
          { label: "Resources", value: "resources" },
          { label: "Advanced", value: "advanced" },
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
        .with("advanced", () => (
          <>
            <Spacer y={1} />
            <Advanced index={index} />
          </>
        ))
        .exhaustive()}
    </>
  );
};

export default WorkerTabs;
