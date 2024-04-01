import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import semver from "semver";
import _ from "lodash";

import addOnGrad from "assets/add-on-grad.svg";
import notFound from "assets/not-found.png";

import { Context } from "shared/Context";
import api from "shared/api";
import { search } from "shared/search";

import TemplateList from "../launch/TemplateList";
import SearchBar from "components/porter/SearchBar";
import Spacer from "components/porter/Spacer";
import Loading from "components/Loading";
import ExpandedTemplate from "./ExpandedTemplate";
import ConfigureTemplate from "./ConfigureTemplate";
import Back from "components/porter/Back";
import Fieldset from "components/porter/Fieldset";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Select from "components/porter/Select";

type Props = {
};

const HIDDEN_CHARTS = [
  "agent",
  "elasticache-chart",
  "elasticache-memcached",
  "elasticache-redis",
  "loki",
  "porter-agent",
  "rds-chart",
  "rds-postgresql",
  "rds-postgresql-aurora",
  "postgresql-managed",
  "redis-managed",
];

//For Charts that don't exist locally we need to add them in manually
const TAG_MAPPING = {
  "DATA_STORE": ["mysql"],
  "DATA_BASE": ["mysql"]
}

const NewAddOnFlow: React.FC<Props> = ({
}) => {
  const { capabilities, currentProject, currentCluster, user } = useContext(Context);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState("");
  const [addOnTemplates, setAddOnTemplates] = useState<any[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [currentForm, setCurrentForm] = useState<any>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allFilteredTemplates = useMemo(() => {
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

  const appTemplates = useMemo(() => {
    return allFilteredTemplates.filter(template =>
      template.tags?.includes("APP"));
  }, [allFilteredTemplates]);

  const dataStoreTemplates = useMemo(() => {
    return allFilteredTemplates.filter(template => template.tags?.includes("DATA_STORE"));
  }, [allFilteredTemplates]);

  const filteredTemplates = useMemo(() => {
    return _.differenceBy(
      allFilteredTemplates,
      [...appTemplates, ...dataStoreTemplates]
    );
  }, [allFilteredTemplates, appTemplates, dataStoreTemplates]);

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

      sortedVersionData = sortedVersionData.map((template: any) => {
        let testTemplate: string[] = template?.tags || []
        // Assign tags based on TAG_MAPPING
        for (let tag in TAG_MAPPING) {
          if (TAG_MAPPING[tag].includes(template.name)) {
            testTemplate?.push(tag);
          }
        }

        return { ...template, tags: testTemplate };
      });
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
      {
        (currentForm && currentTemplate) ? (
          <ConfigureTemplate
            currentTemplate={currentTemplate}
            currentForm={currentForm}
            goBack={() => setCurrentForm(null)}
          />
        ) : (
          <>
            <Back to="/addons" />
            <DashboardHeader
              image={addOnGrad}
              title="Create a new add-on"
              capitalize={false}
              description="Select an add-on to deploy to this project."
              disableLineBreak

            />
            {
              currentTemplate ? (
                <ExpandedTemplate
                  currentTemplate={currentTemplate}
                  proceed={(form?: any) => setCurrentForm(form)}
                  goBack={() => setCurrentTemplate(null)}
                />
              ) : (
                <>
                  <Container row>
                    <SearchBar
                      value={searchValue}
                      setValue={setSearchValue}
                      placeholder="Search available add-ons . . ."
                      width="100%"
                    />
                    <Spacer inline x={1} />
                    {/* <Select
                      width={"150px"}
                      options={[
                        { label: "Filter...", value: "" },
                        { label: "Worker", value: "worker" },
                        { label: "Cron Job", value: "job" },]}
                      height={"25px"} /> */}
                  </Container>
                  <Spacer y={1} />

                  {allFilteredTemplates.length === 0 && (
                    <Fieldset>
                      <Container row>
                        <PlaceholderIcon src={notFound} />
                        <Text color="helper">No matching add-ons were found.</Text>
                      </Container>
                    </Fieldset>
                  )}
                  {isLoading ? <Loading offset="-150px" /> : (
                    <>
                      <DarkMatter />

                      {appTemplates?.length > 0 &&
                        <>
                          <Spacer y={1.5} />
                          <div>
                            <Text color="#fff" size={15}>Apps and Services</Text>
                          </div>
                          <div>
                            <Text color="helper">For developer productivity.</Text>
                          </div>
                          <TemplateList
                            templates={appTemplates} // This is where you provide only APP templates
                            setCurrentTemplate={(x) => setCurrentTemplate(x)}
                          />
                        </>}

                      {dataStoreTemplates?.length > 0 &&
                        <>
                          <div>
                            <Text color="#fff" size={15}>Pre-Production Datastores</Text>
                          </div>
                          <div>
                            <Text color="helper">Pre-production datastores are not highly available and use ephemeral storage.</Text>
                          </div>
                          <TemplateList
                            templates={dataStoreTemplates} // This is where you provide only DATA_STORE templates
                            setCurrentTemplate={(x) => setCurrentTemplate(x)}
                          />
                        </>}


                      {filteredTemplates?.length > 0 && (currentProject?.full_add_ons || user.isPorterUser) &&
                        <>
                          <div>
                            <Text color="#fff" size={15}>All Add-Ons</Text>
                          </div>
                          <div>
                            <Text color="helper">Full list of add-ons</Text>
                          </div>

                          <TemplateList
                            templates={filteredTemplates} // This is where you provide only DATA_STORE templates
                            setCurrentTemplate={(x) => setCurrentTemplate(x)}
                          />
                        </>
                      }
                    </>
                  )}
                </>
              )
            }
          </>
        )
      }
    </StyledTemplateComponent >
  );
};

export default NewAddOnFlow;

const PlaceholderIcon = styled.img`
      height: 13px;
      margin-right: 12px;
      opacity: 0.65;
      `;

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
