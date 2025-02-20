import React from "react";
import Spacer from "legacy/components/porter/Spacer";
import TabSelector from "legacy/components/TabSelector";
import { type ClientService } from "legacy/lib/porter-apps/services";
import { match } from "ts-pattern";

import Advanced from "./Advanced";
import Health from "./Health";
import MainTab from "./Main";
import Resources from "./Resources";

type Props = {
  index: number;
  service: ClientService & {
    config: {
      type: "worker";
    };
  };
};

const WorkerTabs: React.FC<Props> = ({ index, service }) => {
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
        .with("resources", () => <Resources index={index} service={service} />)
        .with("advanced", () => (
          <>
            <Health index={index} />
            <Spacer y={1} />
            <Advanced index={index} />
          </>
        ))
        .exhaustive()}
    </>
  );
};

export default WorkerTabs;
