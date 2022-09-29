import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";

import Loading from "components/Loading";
import { hardcodedNames } from "shared/hardcodedNameDict";
import { PorterTemplate } from "shared/types";
import semver from "semver";

type Props = {
  helm_repo_id?: number;
  templates?: PorterTemplate[];
  setCurrentTemplate: (template: PorterTemplate) => void;
};

const TemplateList: React.FC<Props> = ({
  helm_repo_id,
  templates,
  setCurrentTemplate,
}) => {
  const [isLoading, setIsLoading] = useState(!!helm_repo_id);
  const [hasError, setHasError] = useState(false);
  const [templateList, setTemplateList] = useState<PorterTemplate[]>(null);
  const { currentProject, setCurrentError } = useContext(Context);

  useEffect(() => {
    let isSubscribed = true;
    if (!currentProject || !helm_repo_id) {
      return () => {
        isSubscribed = false;
      };
    }

    api
      .getChartsFromHelmRepo(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          helm_repo_id: helm_repo_id,
        }
      )
      .then(({ data }) => {
        if (!isSubscribed) {
          return;
        }
        if (!Array.isArray(data)) {
          throw Error("Data is not an array");
        }

        let sortedVersionData = data
          .map((template: any) => {
            let versions = template.versions.reverse();

            versions = template.versions.sort(semver.rcompare);

            return {
              ...template,
              versions,
              currentVersion: versions[0],
            };
          })
          .sort((a: any, b: any) => (a.name > b.name ? 1 : -1));

        setTemplateList(sortedVersionData);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);

        setHasError(true);
        setCurrentError(err.response?.data?.error);
        setIsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentProject, helm_repo_id]);

  if (isLoading || (!templates && !templateList)) {
    return (
      <LoadingWrapper>
        <Loading />
      </LoadingWrapper>
    );
  } else if (hasError) {
    return (
      <Placeholder>
        <i className="material-icons">error</i> Error retrieving templates.
      </Placeholder>
    );
  } else if (templateList && templateList.length === 0) {
    return (
      <Placeholder>
        <i className="material-icons">category</i> No templates found.
      </Placeholder>
    );
  }

  const renderIcon = (icon: string) => {
    if (icon) {
      return <Icon src={icon} />;
    }

    return (
      <Polymer>
        <i className="material-icons">layers</i>
      </Polymer>
    );
  };

  return (
    <TemplateListWrapper>
      {(templates || templateList)?.map((template: PorterTemplate) => {
        let { name, icon, description } = template;
        if (hardcodedNames[name]) {
          name = hardcodedNames[name];
        }
        return (
          <TemplateBlock
            key={name}
            onClick={() => setCurrentTemplate(template)}
          >
            {renderIcon(icon)}
            <TemplateTitle>{name}</TemplateTitle>
            <TemplateDescription>{description}</TemplateDescription>
          </TemplateBlock>
        );
      })}
    </TemplateListWrapper>
  );
};

export default TemplateList;

const Placeholder = styled.div`
  padding-top: 200px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  font-size: 14px;

  > i {
    font-size: 18px;
    margin-right: 12px;
  }
`;

const LoadingWrapper = styled.div`
  padding-top: 300px;
`;

const Icon = styled.img`
  height: 42px;
  margin-top: 35px;
  margin-bottom: 13px;
`;

const Polymer = styled.div`
  > i {
    font-size: 34px;
    margin-top: 38px;
    margin-bottom: 20px;
  }
`;

const TemplateDescription = styled.div`
  margin-bottom: 26px;
  color: #ffffff66;
  text-align: center;
  font-weight: default;
  padding: 0px 25px;
  height: 2.4em;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const TemplateTitle = styled.div`
  margin-bottom: 12px;
  width: 80%;
  text-align: center;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TemplateBlock = styled.div`
  align-items: center;
  user-select: none;
  display: flex;
  font-size: 13px;
  font-weight: 500;
  padding: 3px 0px 5px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 200px;
  cursor: pointer;
  color: #ffffff;
  position: relative;
  border-radius: 5px;
  background: #262a30;
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const TemplateListWrapper = styled.div`
  overflow: visible;
  margin-top: 35px;
  padding-bottom: 150px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;
