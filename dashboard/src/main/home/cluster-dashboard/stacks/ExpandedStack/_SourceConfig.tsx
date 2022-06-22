import { Tooltip } from "@material-ui/core";
import ImageSelector from "components/image-selector/ImageSelector";
import React from "react";
import styled from "styled-components";
import { AppResource, FullStackRevision, SourceConfig } from "../types";

const _SourceConfig = ({ revision }: { revision: FullStackRevision }) => {
  return (
    <SourceConfigStyles.Wrapper>
      {revision.source_configs.map((sourceConfig) => {
        const apps = getAppsFromSourceConfig(revision.resources, sourceConfig);

        const appList = formatAppList(apps, 2);
        console.log({ appList });
        return (
          <SourceConfigStyles.ItemContainer>
            {appList.hiddenApps?.length ? (
              <Tooltip
                title={
                  <>
                    {appList.hiddenApps.map((appName) => (
                      <SourceConfigStyles.TooltipItem>
                        {appName}
                      </SourceConfigStyles.TooltipItem>
                    ))}
                  </>
                }
                placement={"bottom-end"}
              >
                <SourceConfigStyles.ItemTitle>
                  Used by {appList.value}
                </SourceConfigStyles.ItemTitle>
              </Tooltip>
            ) : (
              <SourceConfigStyles.ItemTitle>
                Used by {appList.value}
              </SourceConfigStyles.ItemTitle>
            )}
            <ImageSelector
              selectedImageUrl={sourceConfig.image_repo_uri}
              selectedTag={sourceConfig.image_tag}
              forceExpanded
              readOnly
            />
          </SourceConfigStyles.ItemContainer>
        );
      })}
    </SourceConfigStyles.Wrapper>
  );
};

export default _SourceConfig;

const getAppsFromSourceConfig = (
  apps: AppResource[],
  sourceConfig: SourceConfig
) => {
  return apps.filter((app) => {
    return app.stack_source_config.id === sourceConfig.id;
  });
};

const formatAppList = (apps: AppResource[], limit: number = 3) => {
  if (apps.length <= limit) {
    const formatter = new Intl.ListFormat("en", {
      style: "long",
      type: "conjunction",
    });
    return {
      value: formatter.format(apps.map((app) => app.name)),
      hiddenApps: [],
    };
  }

  const hiddenApps = [...apps]
    .splice(limit, apps.length)
    .map((app) => app.name);

  return {
    value: apps
      .map((app) => app.name)
      .splice(0, limit)
      .join(", ")
      .concat(` and ${apps.length - limit} more`),
    hiddenApps,
  };
};

const SourceConfigStyles = {
  Wrapper: styled.div`
    margin-top: 30px;
  `,
  ItemContainer: styled.div`
    background: #ffffff11;
    border-radius: 15px;
    padding: 20px 15px;
  `,
  ItemTitle: styled.div`
    font-size: 16px;
    width: fit-content;
  `,
  TooltipItem: styled.div`
    font-size: 14px;
  `,
};
