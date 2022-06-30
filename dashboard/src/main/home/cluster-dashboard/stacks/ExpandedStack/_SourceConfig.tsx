import { Tooltip } from "@material-ui/core";
import ImageSelector from "components/image-selector/ImageSelector";
import SaveButton from "components/SaveButton";
import React, { useContext, useMemo, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";
import { AppResource, FullStackRevision, SourceConfig, Stack } from "../types";
import SourceEditorDocker from "./components/SourceEditorDocker";

const _SourceConfig = ({
  namespace,
  revision,
  readOnly,
  onSourceConfigUpdate,
}: {
  namespace: string;
  revision: FullStackRevision;
  readOnly: boolean;
  onSourceConfigUpdate: () => void;
}) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [sourceConfigArrayCopy, setSourceConfigArrayCopy] = useState<
    SourceConfig[]
  >(() => revision.source_configs);
  const [buttonStatus, setButtonStatus] = useState("");

  const handleChange = (sourceConfig: SourceConfig) => {
    const newSourceConfigArray = [...sourceConfigArrayCopy];
    const index = newSourceConfigArray.findIndex(
      (sc) => sc.id === sourceConfig.id
    );
    newSourceConfigArray[index] = sourceConfig;
    setSourceConfigArrayCopy(newSourceConfigArray);
  };

  const handleSave = () => {
    setButtonStatus("loading");
    api
      .updateStackSourceConfig(
        "<token>",
        {
          source_configs: sourceConfigArrayCopy,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: namespace,
          stack_id: revision.stack_id,
        }
      )
      .then(() => {
        setButtonStatus("successful");
        onSourceConfigUpdate();
      })
      .catch((err) => {
        setButtonStatus("Something went wrong");
        setCurrentError(err);
      });
  };

  return (
    <SourceConfigStyles.Wrapper>
      {revision.source_configs.map((sourceConfig) => {
        const apps = getAppsFromSourceConfig(revision.resources, sourceConfig);

        const appList = formatAppList(apps, 2);
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
            <SourceEditorDocker
              sourceConfig={sourceConfig}
              onChange={handleChange}
              readOnly={readOnly || buttonStatus === "loading"}
            />
          </SourceConfigStyles.ItemContainer>
        );
      })}
      {readOnly ? null : (
        <SourceConfigStyles.SaveButtonRow>
          <SourceConfigStyles.SaveButton
            onClick={handleSave}
            text="Save"
            clearPosition={true}
            makeFlush={true}
            status={buttonStatus}
            statusPosition="left"
          />
        </SourceConfigStyles.SaveButtonRow>
      )}
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
    position: relative;
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
  SaveButtonRow: styled.div`
    margin-top: 15px;
    display: flex;
    justify-content: flex-end;
  `,
  SaveButton: styled(SaveButton)`
    z-index: unset;
  `,
};
