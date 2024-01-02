import React, {
  useMemo
} from "react";
import { useHistory } from "react-router";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";




import EnvTab from "./tabs/DatabaseEnvTab";
import MetricsTab from "./tabs/MetricsTab";
import Settings from "./tabs/SettingsTab";

// commented out tabs are not yet implemented
// will be included as support is available based on data from app revisions rather than helm releases
const validTabs = [

  "metrics",
  // "debug",
  "environment",
  "settings",
] as const;
const DEFAULT_TAB = "metrics";
type ValidTab = (typeof validTabs)[number];

type DbTabProps = {
  tabParam?: string;
  dbData: any;
};

// todo(ianedwards): refactor button to use more predictable state
export type ButtonStatus = "" | "loading" | JSX.Element | "success";

const DatabaseTabs: React.FC<DbTabProps> = ({ tabParam, dbData }) => {
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
            `/databases/dashboard/${dbData?.type}/${dbData?.name}/${tab}`
          );
        }} /><Spacer y={1} />
      {match(currentTab)
        .with("environment", () => (
          <EnvTab envData={dbData?.env} connectionString={dbData.connection_string} />
        ))
        .with("settings", () => <Settings dbData={dbData} />)
        .with("metrics", () => <MetricsTab />)

        .otherwise(() => null)}
      <Spacer y={2} />
    </>
  );
};

export default DatabaseTabs;
