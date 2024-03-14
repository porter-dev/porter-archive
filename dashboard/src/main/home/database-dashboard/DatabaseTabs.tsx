import React, { useMemo } from "react";
import { useHistory } from "react-router";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";

import { useDatastoreContext } from "./DatabaseContextProvider";
import DatastoreProvisioningIndicator from "./DatastoreProvisioningIndicator";
import ConnectedAppsTab from "./tabs/ConnectedAppsTab";
import ConnectTab from "./tabs/ConnectTab";
import MetricsTab from "./tabs/MetricsTab";
import SettingsTab from "./tabs/SettingsTab";

const validTabs = [
  "metrics",
  "connect",
  "configuration",
  "settings",
  "connected-apps",
] as const;
const DEFAULT_TAB = "connect";
type ValidTab = (typeof validTabs)[number];

type DbTabProps = {
  tabParam?: string;
};

// todo(ianedwards): refactor button to use more predictable state
export type ButtonStatus = "" | "loading" | JSX.Element | "success";

const DatabaseTabs: React.FC<DbTabProps> = ({ tabParam }) => {
  const history = useHistory();
  const { datastore } = useDatastoreContext();

  const currentTab = useMemo(() => {
    if (tabParam && validTabs.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab;
    }

    return DEFAULT_TAB;
  }, [tabParam]);

  const tabs = useMemo(() => {
    return [
      { label: "Connect", value: "connect" },
      { label: "Connected Apps", value: "connected-apps" },
      // { label: "Configuration", value: "configuration" },
      { label: "Settings", value: "settings" },
    ];
  }, []);

  if (datastore.status !== "AVAILABLE") {
    return <DatastoreProvisioningIndicator />;
  }

  return (
    <>
      <TabSelector
        noBuffer
        options={tabs}
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          history.push(`/datastores/${datastore.name}/${tab}`);
        }}
      />
      <Spacer y={1} />
      {match(currentTab)
        .with("connect", () => <ConnectTab />)
        .with("settings", () => <SettingsTab />)
        .with("metrics", () => <MetricsTab />)
        // .with("configuration", () => <ConfigurationTab />)
        .with("connected-apps", () => <ConnectedAppsTab />)
        .otherwise(() => null)}
      <Spacer y={2} />
    </>
  );
};

export default DatabaseTabs;
