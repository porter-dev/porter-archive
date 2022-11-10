import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { PorterTemplate } from "shared/types";
import semver from "semver";
import Loading from "components/Loading";
import Placeholder from "components/OldPlaceholder";
import { BackButton, Card } from "../../launch/components/styles";
import DynamicLink from "components/DynamicLink";
import { VersionSelector } from "../../launch/components/VersionSelector";
import TitleSection from "components/TitleSection";
import { Context } from "shared/Context";

const TemplateSelector = () => {
  const { capabilities } = useContext(Context);

  const [templates, setTemplates] = useState<PorterTemplate[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<{
    [template_name: string]: string;
  }>({});

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    setIsLoading(true);
    getTemplates()
      .then((porterTemplates) => {
        const latestVersions = porterTemplates.reduce((acc, template) => {
          return {
            ...acc,
            [template.name]: template.versions[0],
          };
        }, {} as Record<string, string>);

        if (isSubscribed) {
          setTemplates(porterTemplates);
          setSelectedVersion(latestVersions);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setHasError(true);
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  if (hasError) {
    return (
      <Placeholder>
        <div>
          <h2>Unexpected error</h2>
          <p>
            We had an error retrieving the available templates, please try
            again.
          </p>
        </div>
      </Placeholder>
    );
  }

  return (
    <>
      <TitleSection>
        <DynamicLink to={`../`}>
          <BackButton>
            <i className="material-icons">keyboard_backspace</i>
          </BackButton>
        </DynamicLink>
        Select a template
      </TitleSection>
      <Card.Grid>
        {templates.map((template) => {
          return (
            <Card.Wrapper
              key={template.name}
              as={DynamicLink}
              to={`settings/${template.name}/${selectedVersion[template.name]}`}
            >
              <Card.Title>
                New {template.name} with version:
                <div
                  onClickCapture={(e) => {
                    e.preventDefault();
                  }}
                >
                  <VersionSelector
                    value={selectedVersion[template.name]}
                    options={template.versions}
                    onChange={(newVersion) => {
                      setSelectedVersion((prev) => ({
                        ...prev,
                        [template.name]: newVersion,
                      }));
                    }}
                  />
                </div>
              </Card.Title>
              <Card.Actions>
                <i className="material-icons-outlined">arrow_forward</i>
              </Card.Actions>
            </Card.Wrapper>
          );
        })}
      </Card.Grid>
    </>
  );
};

export default TemplateSelector;
