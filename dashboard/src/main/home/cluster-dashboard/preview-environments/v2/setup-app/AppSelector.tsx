import React, {
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { PorterApp } from "@porter-dev/api-contracts";
import styled from "styled-components";
import { match } from "ts-pattern";

import Loading from "components/Loading";
import Icon from "components/porter/Icon";
import SearchBar from "components/porter/SearchBar";
import { AppIcon } from "main/home/app-dashboard/apps/AppMeta";
import { type AppInstance } from "main/home/app-dashboard/apps/types";
import { type Environment } from "lib/environments/types";
import { useLatestAppRevisions } from "lib/hooks/useLatestAppRevisions";
import { useTemplateEnvs } from "lib/hooks/useTemplateEnvs";

import { Context } from "shared/Context";
import { search } from "shared/search";
import addOns from "assets/add-ons.svg";

type Props = {
  selectedApp: AppInstance | null;
  setSelectedApp: Dispatch<SetStateAction<AppInstance | null>>;
};

export const AppSelector: React.FC<Props> = ({
  selectedApp,
  setSelectedApp,
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [searchValue, setSearchValue] = useState("");

  const { revisions: apps } = useLatestAppRevisions({
    projectId: currentProject?.id ?? 0,
    clusterId: currentCluster?.id ?? 0,
  });

  const filteredApps = useMemo(() => {
    const withProto = apps.map((app) => {
      return {
        ...app,
        app_revision: {
          ...app.app_revision,
          proto: PorterApp.fromJsonString(
            atob(app.app_revision.b64_app_proto),
            {
              ignoreUnknownFields: true,
            }
          ),
        },
      };
    });

    return search(withProto, searchValue, {
      keys: ["app_revision.proto.name"],
      isCaseSensitive: false,
    });
  }, [apps, searchValue]);

  return (
    <ExpandedWrapper>
      <div style={{ display: "flex", marginBottom: "10px" }}>
        <SearchBar
          value={searchValue}
          setValue={setSearchValue}
          placeholder={"Search apps . . ."}
          width="100%"
        />
      </div>
      <ListContainer>
        <ListWrapper>
          {filteredApps.map((app, i) => {
            return (
              <AppItem
                key={i}
                onClick={() => {
                  setSelectedApp({
                    id: app.app_revision.app_instance_id,
                    name: app.source.name,
                    deployment_target: {
                      id: app.app_revision.deployment_target.id,
                      name: app.app_revision.deployment_target.name,
                    },
                  });
                }}
                isSelected={selectedApp?.name === app.app_revision.proto.name}
              >
                <AppIcon
                  buildpacks={app.app_revision.proto.build?.buildpacks ?? []}
                />
                {app.source.name}
              </AppItem>
            );
          })}
        </ListWrapper>
      </ListContainer>
    </ExpandedWrapper>
  );
};

type TemplateSelectorProps = {
  selectedTemplate: Environment | null;
  setSelectedTemplate: Dispatch<SetStateAction<Environment | null>>;
};

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  setSelectedTemplate,
}) => {
  const { environments, status } = useTemplateEnvs();

  return (
    <ListContainer>
      <ListWrapper maxHeight="156px">
        {match(status)
          .with("loading", () => {
            return <Loading />;
          })
          .otherwise(() => {
            return environments.map((env, i) => {
              return (
                <AppItem
                  key={i}
                  onClick={() => {
                    setSelectedTemplate(env);
                  }}
                  isSelected={selectedTemplate?.name === env.name}
                >
                  <Icon height="18px" src={addOns} />
                  {env.name}
                </AppItem>
              );
            });
          })}
      </ListWrapper>
    </ListContainer>
  );
};

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  max-height: 275px;
`;

const ListContainer = styled.div`
  border: 1px solid #ffffff55;
  border-radius: 3px;
  overflow-y: auto;
`;

const ListWrapper = styled.div<{ maxHeight?: string }>`
  width: 100%;
  border-radius: 3px;
  border: 0px solid #ffffff44;
  max-height: ${(props) => props.maxHeight ?? "221px"};
  top: 40px;

  > i {
    font-size: 18px;
    display: block;
    position: absolute;
    left: 10px;
    top: 10px;
  }
`;

const AppItem = styled.div<{
  isSelected?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  lastItem?: boolean;
}>`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid
    ${(props) => (props.lastItem ? "#00000000" : "#606166")};
  color: ${(props) => (props.disabled ? "#ffffff88" : "#ffffff")};
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: ${(props) =>
    props.readOnly || props.disabled ? "default" : "pointer"};
  pointer-events: ${(props) =>
    props.readOnly || props.disabled ? "none" : "auto"};

  ${(props) => {
    if (props.disabled) {
      return "";
    }

    if (props.isSelected) {
      return `background: #ffffff22;`;
    }

    return `background: #ffffff11;`;
  }}

  :hover {
    background: #ffffff22;

    > i {
      background: #ffffff22;
    }
  }

  > img,
  i {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
    font-size: 20px;
  }
`;
