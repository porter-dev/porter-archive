import React from "react";
import Spacer from "legacy/components/porter/Spacer";
import TabSelector from "legacy/components/TabSelector";
import { type ClientService } from "legacy/lib/porter-apps/services";
import { match } from "ts-pattern";

import Advanced from "./Advanced";
import Health from "./Health";
import MainTab from "./Main";
import Networking from "./Networking";
import Resources from "./Resources";

type Props = {
  index: number;
  service: ClientService & {
    config: {
      type: "web";
    };
  };
  internalNetworkingDetails: {
    namespace: string;
    appName: string;
  };
};

const WebTabs: React.FC<Props> = ({
  index,
  service,
  internalNetworkingDetails,
}) => {
  const [currentTab, setCurrentTab] = React.useState<
    "main" | "resources" | "networking" | "advanced"
  >("main");

  return (
    <>
      <TabSelector
        options={[
          { label: "Main", value: "main" },
          { label: "Resources", value: "resources" },
          { label: "Networking", value: "networking" },
          { label: "Advanced", value: "advanced" },
        ]}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />
      {match(currentTab)
        .with("main", () => <MainTab index={index} service={service} />)
        .with("networking", () => (
          <Networking
            index={index}
            service={service}
            internalNetworkingDetails={internalNetworkingDetails}
          />
        ))
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

export default WebTabs;
