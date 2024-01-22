import React, { useMemo } from "react";
import { useHistory } from "react-router";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";

import { useDatabaseContext } from "./DatabaseContextProvider";
import ConfigurationTab from "./tabs/ConfigurationTab";
import ConnectedAppsTab from "./tabs/ConnectedAppsTab";
import DatabaseEnvTab from "./tabs/DatabaseEnvTab";
import MetricsTab from "./tabs/MetricsTab";
import SettingsTab from "./tabs/SettingsTab";

const validTabs = [
  "metrics",
  "credentials",
  "configuration",
  "settings",
  "connected-apps",
] as const;
const DEFAULT_TAB = "connected-apps";
type ValidTab = (typeof validTabs)[number];

type DbTabProps = {
  tabParam?: string;
};

// todo(ianedwards): refactor button to use more predictable state
export type ButtonStatus = "" | "loading" | JSX.Element | "success";

const DatabaseTabs: React.FC<DbTabProps> = ({ tabParam }) => {
  const history = useHistory();
  const { datastore } = useDatabaseContext();

  const currentTab = useMemo(() => {
    if (tabParam && validTabs.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab;
    }

    return DEFAULT_TAB;
  }, [tabParam]);

  const tabs = useMemo(() => {
    return [
      { label: "Connected Apps", value: "connected-apps" },
      { label: "Credentials", value: "credentials" },
      { label: "Configuration", value: "configuration" },
      { label: "Settings", value: "settings" },
    ];
  }, []);

  return (
    <>
      <TabSelector
        noBuffer
        options={tabs}
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          history.push(`/databases/${datastore.name}/${tab}`);
        }}
      />
      <Spacer y={1} />
      {match(currentTab)
        .with("credentials", () => <DatabaseEnvTab envData={datastore.env} />)
        .with("settings", () => <SettingsTab />)
        .with("metrics", () => <MetricsTab />)
        .with("configuration", () => <ConfigurationTab />)
        .with("connected-apps", () => <ConnectedAppsTab />)
        .otherwise(() => null)}
      <Spacer y={2} />
    </>
  );
};

export default DatabaseTabs;
