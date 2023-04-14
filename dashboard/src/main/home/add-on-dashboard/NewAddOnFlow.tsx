import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import semver from "semver";
import _ from "lodash";

import addOn from "assets/add-ons.png";

import { Context } from "shared/Context";
import api from "shared/api";
import { search } from "shared/search";

import Link from "components/porter/Link";
import TemplateList from "../launch/TemplateList";
import SearchBar from "components/porter/SearchBar";
import Spacer from "components/porter/Spacer";
import Loading from "components/Loading";
import ExpandedTemplate from "./ExpandedTemplate";

type Props = {
};

const HIDDEN_CHARTS = ["porter-agent", "loki"];

const NewAddOnFlow: React.FC<Props> = ({
}) => {
  const { capabilities, currentProject, currentCluster } = useContext(Context);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState("");
  const [addOnTemplates, setAddOnTemplates] = useState<any[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);

  const filteredTemplates = useMemo(() => {
    const filteredBySearch = search(
      addOnTemplates ?? [],
      searchValue,
      {
        keys: ["name"],
        isCaseSensitive: false,
      }
    );

    return _.sortBy(filteredBySearch);
  }, [addOnTemplates, searchValue]);
  
  const getTemplates = async () => {
    setIsLoading(true);
    const default_addon_helm_repo_url = capabilities?.default_addon_helm_repo_url;
    try {
      const res = await api.getTemplates(
        "<token>",
        {
          repo_url: default_addon_helm_repo_url,
        },
        {
          project_id: currentProject.id,
        }
      );
      setIsLoading(false);
      var sortedVersionData = res.data.map((template: any) => {
        let versions = template.versions.reverse();
        versions = template.versions.sort(semver.rcompare);
        return {
          ...template,
          versions,
          currentVersion: versions[0],
        };
      });
      sortedVersionData.sort((a: any, b: any) => (a.name > b.name ? 1 : -1));
      sortedVersionData = sortedVersionData.filter(
        (template: any) => !HIDDEN_CHARTS.includes(template?.name)
      );
      setAddOnTemplates(sortedVersionData);
    } catch (error) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getTemplates();
  }, [currentProject, currentCluster]);

  return (
    <StyledTemplateComponent>
      <DashboardHeader
        prefix={(
          <Link to="/addons">
            <I className="material-icons">keyboard_backspace</I>
          </Link>
        )}
        image={addOn}
        title="Deploy a new add-on"
        capitalize={false}
        description="Create a new add-ons for this project."
        disableLineBreak
      />
      <SearchBar 
        value={searchValue}
        setValue={setSearchValue}
        placeholder="Search available add-ons . . ."
        width="100%"
      />
      <Spacer y={1} />

      {/* Temporary space reducer for legacy template list */}
      {isLoading ? <Loading offset="-150px" /> : (
        currentTemplate ? (
          <ExpandedTemplate 
            currentTemplate={currentTemplate}
            goBack={() => setCurrentTemplate(null)}
          />
        ) : (
          <>
            <DarkMatter />
            <TemplateList
              templates={filteredTemplates}
              setCurrentTemplate={(x) => setCurrentTemplate(x)}
            />
          </>
        )
      )}
    </StyledTemplateComponent>
  );
};

export default NewAddOnFlow;

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -35px;
`;

const I = styled.i`
  font-size: 16px;
  padding: 4px;
  cursor: pointer;
  border-radius: 50%;
  margin-right: 15px;
  background: ${props => props.theme.fg};
  color: ${props => props.theme.text.primary};
  border: 1px solid ${props => props.theme.border};
  :hover {
    filter: brightness(150%);
  }
`;

const StyledTemplateComponent = styled.div`
  width: 100%;
  height: 100%;
`;