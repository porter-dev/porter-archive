import React, {
  useMemo
} from "react";
import { useHistory } from "react-router";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";

import { CloudProviderDatastore } from "./types";

import DatabaseEnvTab from "./tabs/DatabaseEnvTab";
import MetricsTab from "./tabs/MetricsTab";
import SettingsTab from "./tabs/SettingsTab";

// commented out tabs are not yet implemented
// will be included as support is available based on data from app revisions rather than helm releases
const validTabs = [

  "metrics",
  // "debug",
  "environment",
  "settings",
] as const;
const DEFAULT_TAB = "environment";
type ValidTab = (typeof validTabs)[number];

type DbTabProps = {
  tabParam?: string;
  item: CloudProviderDatastore;
};

// todo(ianedwards): refactor button to use more predictable state
export type ButtonStatus = "" | "loading" | JSX.Element | "success";

const DatabaseTabs: React.FC<DbTabProps> = ({ tabParam, item }) => {
  const history = useHistory();

  const currentTab = useMemo(() => {
    if (tabParam && validTabs.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab;
    }

    return DEFAULT_TAB;
  }, [tabParam]);

  const tabs = useMemo(() => {
    const base = [
      { label: "Connection Info", value: "environment" },
    ];
    base.push({ label: "Settings", value: "settings" });
    return base;
  }, [

  ]);

  return (
    <>
      <TabSelector
        noBuffer
        options={tabs}
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          history.push(
            `/databases/${item.project_id}/${item.cloud_provider_name}/${item.cloud_provider_id}/${item.datastore.name}/${tab}`
          );
        }} /><Spacer y={1} />
      {match(currentTab)
        .with("environment", () => (
          <DatabaseEnvTab envData={item.datastore.env} />
        ))
        .with("settings", () => <SettingsTab dbData={item.datastore} />)
        .with("metrics", () => <MetricsTab />)

        .otherwise(() => null)}
      <Spacer y={2} />
    </>
  );
};

export default DatabaseTabs;
