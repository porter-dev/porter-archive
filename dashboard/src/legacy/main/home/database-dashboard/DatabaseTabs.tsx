import React, { useContext, useMemo } from "react";
import Spacer from "legacy/components/porter/Spacer";
import TabSelector from "legacy/components/TabSelector";
import { useHistory } from "react-router";
import { match } from "ts-pattern";

import { Context } from "shared/Context";

import { useDatastoreContext } from "./DatabaseContextProvider";
import DatastoreProvisioningIndicator from "./DatastoreProvisioningIndicator";

type DbTabProps = {
  tabParam?: string;
};

// todo(ianedwards): refactor button to use more predictable state
export type ButtonStatus = "" | "loading" | JSX.Element | "success";

const DatabaseTabs: React.FC<DbTabProps> = ({ tabParam }) => {
  const history = useHistory();
  const { datastore } = useDatastoreContext();
  const { user } = useContext(Context);

  const tabs = useMemo(() => {
    return datastore.template.tabs
      .filter(
        (t) =>
          !t.isOnlyForPorterOperators ||
          (t.isOnlyForPorterOperators && user.isPorterUser)
      )
      .map((tab) => ({
        label: tab.displayName,
        value: tab.name,
      }));
  }, [datastore.template]);

  const currentTab = useMemo(() => {
    if (tabParam && tabs.some((tab) => tab.value === tabParam)) {
      return tabParam;
    }
    return tabs.length ? tabs[0].value : "";
  }, [tabParam, tabs]);

  if (datastore.status !== "AVAILABLE") {
    return <DatastoreProvisioningIndicator />;
  }

  return (
    <div>
      <TabSelector
        noBuffer
        options={tabs}
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          history.push(`/datastores/${datastore.name}/${tab}`);
        }}
      />
      <Spacer y={1} />
      {datastore.template.tabs
        .filter(
          (t) =>
            !t.isOnlyForPorterOperators ||
            (t.isOnlyForPorterOperators && user.isPorterUser)
        )
        .map((tab) =>
          match(currentTab)
            .with(tab.name, () => <tab.component key={tab.name} />)
            .otherwise(() => null)
        )}
    </div>
  );
};

export default DatabaseTabs;
