import React, { useEffect, useState } from "react";
import api from "shared/api";
import { PorterTemplate } from "shared/types";
import semver from "semver";
import { AddResourceButtonStyles } from "./styles";
import { TemplateSelector } from "./TemplateSelector";
import { VersionSelector } from "./VersionSelector";
import DynamicLink from "components/DynamicLink";

export const AddResourceButton = () => {
  const [templates, setTemplates] = useState<PorterTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<PorterTemplate>();
  const [currentVersion, setCurrentVersion] = useState("");

  const getTemplates = async () => {
    try {
      const res = await api.getTemplates<PorterTemplate[]>(
        "<token>",
        {
          repo_url: process.env.APPLICATION_CHART_REPO_URL,
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
      setCurrentTemplate(templates[0]);
      setCurrentVersion(templates[0].currentVersion);
    });
  }, []);

  return (
    <AddResourceButtonStyles.Wrapper>
      <AddResourceButtonStyles.Flex>
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

      <DynamicLink
        to={`/stacks/launch/new-app/${currentTemplate?.name}/${currentVersion}`}
      >
        Create
      </DynamicLink>
    </AddResourceButtonStyles.Wrapper>
  );
};
