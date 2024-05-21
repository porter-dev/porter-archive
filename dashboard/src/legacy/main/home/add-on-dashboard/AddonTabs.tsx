import React, { useContext, useEffect, useMemo } from "react";
import AnimateHeight from "react-animate-height";
import { useFormContext } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";

import Banner from "components/porter/Banner";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import { type ClientAddon } from "lib/addons";

import { Context } from "shared/Context";

import { useAddonContext } from "./AddonContextProvider";
import AddonSaveButton from "./AddonSaveButton";

type Props = {
  tabParam?: string;
};

const AddonTabs: React.FC<Props> = ({ tabParam }) => {
  const history = useHistory();
  const { addon } = useAddonContext();
  const { user } = useContext(Context);

  const {
    reset,
    formState: { isDirty },
  } = useFormContext<ClientAddon>();

  useEffect(() => {
    reset(addon);
  }, [addon]);

  const tabs = useMemo(() => {
    return addon.template.tabs
      .filter(
        (t) =>
          !t.isOnlyForPorterOperators ||
          (t.isOnlyForPorterOperators && user.isPorterUser)
      )
      .map((tab) => ({
        label: tab.displayName,
        value: tab.name,
      }));
  }, [addon.template]);

  const currentTab = useMemo(() => {
    if (tabParam && tabs.some((tab) => tab.value === tabParam)) {
      return tabParam;
    }
    return tabs.length ? tabs[0].value : "";
  }, [tabParam, tabs]);

  return (
    <DashboardWrapper>
      <AnimateHeight height={isDirty ? "auto" : 0}>
        <Banner
          type="warning"
          suffix={
            <AddonSaveButton
              height={"10px"}
              disabledTooltipPosition={"bottom"}
            />
          }
        >
          Changes you are currently previewing have not been saved.
          <Spacer inline width="5px" />
        </Banner>
        <Spacer y={1} />
      </AnimateHeight>
      <TabSelector
        options={tabs}
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          history.push(`/addons/${addon.name.value}/${tab}`);
        }}
      />
      <Spacer y={1} />
      {addon.template.tabs
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
    </DashboardWrapper>
  );
};

export default AddonTabs;

const DashboardWrapper = styled.div`
  width: 100%;
  min-width: 300px;
  height: fit-content;
`;
