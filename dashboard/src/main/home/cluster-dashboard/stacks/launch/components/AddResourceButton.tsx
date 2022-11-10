import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { PorterTemplate } from "shared/types";
import semver from "semver";
import { AddResourceButtonStyles } from "./styles";
import { TemplateSelector } from "./TemplateSelector";
import { VersionSelector } from "./VersionSelector";
import DynamicLink from "components/DynamicLink";

import styled from "styled-components";
import { Context } from "shared/Context";

export const AddResourceButton = () => {
  const { capabilities } = useContext(Context);
  const [templates, setTemplates] = useState<PorterTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<PorterTemplate>();
  const [currentVersion, setCurrentVersion] = useState("");

  const getTemplates = async () => {
    try {
      const res = await api.getTemplates<PorterTemplate[]>(
        "<token>",
        {
          repo_url: capabilities?.default_app_helm_repo_url,
        },
        {}
      );
      let sortedVersionData = res.data
        .map((template: PorterTemplate) => {
          let versions = template.versions.reverse();

          versions = template.versions.sort(semver.rcompare);

          return {
            ...template,
            versions,
            currentVersion: versions[0],
          };
        })
        .sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        });

      return sortedVersionData;
    } catch (err) {}
  };

  useEffect(() => {
    getTemplates().then((templates) => {
      setTemplates(templates);
      setCurrentTemplate(templates[1]);
      setCurrentVersion(templates[1].currentVersion);
    });
  }, []);

  return (
    <AddResourceButtonStyles.Wrapper>
      <AddResourceButtonStyles.Flex>
        <LinkMask
          to={`/stacks/launch/new-app/${currentTemplate?.name}/${currentVersion}`}
        ></LinkMask>
        <Icon>
          <i className="material-icons">add</i>
        </Icon>
        Add a new{" "}
        <TemplateSelector
          options={templates}
          value={currentTemplate}
          onChange={(template) => {
            setCurrentTemplate(template);
            setCurrentVersion(template.currentVersion);
          }}
        />
        <VersionSelector
          options={currentTemplate?.versions || []}
          value={currentVersion}
          onChange={setCurrentVersion}
        />
      </AddResourceButtonStyles.Flex>
    </AddResourceButtonStyles.Wrapper>
  );
};

const LinkMask = styled(DynamicLink)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const Icon = styled.div`
  margin-bottom: -3px;
  > i {
    margin-right: 20px;
    margin-left: 9px;
    font-size: 20px;
    color: #aaaabb;
  }
`;
