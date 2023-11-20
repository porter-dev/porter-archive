import React from "react";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import { type ClientService } from "lib/porter-apps/services";

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
  maxRAM: number;
  maxCPU: number;
  clusterContainsGPUNodes: boolean;
  internalNetworkingDetails: {
    namespace: string;
    appName: string;
  };
  clusterIngressIp: string;
  showDisableTls: boolean;
};

const WebTabs: React.FC<Props> = ({
  index,
  service,
  maxRAM,
  maxCPU,
  clusterContainsGPUNodes,
  internalNetworkingDetails,
  clusterIngressIp,
  showDisableTls,
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
            clusterIngressIp={clusterIngressIp}
            showDisableTls={showDisableTls}
          />
        ))
        .with("resources", () => (
          <Resources
            index={index}
            maxCPU={maxCPU}
            maxRAM={maxRAM}
            clusterContainsGPUNodes={clusterContainsGPUNodes}
            service={service}
          />
        ))
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
