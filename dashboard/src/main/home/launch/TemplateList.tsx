import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";

import Loading from "components/Loading";
import { DISPLAY_TAGS_MAP, hardcodedIcons, hardcodedNames } from "shared/hardcodedNameDict";
import { PorterTemplate } from "shared/types";
import semver from "semver";

import web from "assets/web.png";
import worker from "assets/worker.png";
import job from "assets/job.png";
import fire from "assets/fire.svg"
import Spacer from "components/porter/Spacer";
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

  const renderIcon = (icon: string, name?: string) => {
    if (name === "web") {
      return <NewIcon src={web} />;
    }
    if (name === "worker") {
      return <NewIcon src={worker} />;
    }
    if (name === "job") {
      return <NewIcon src={job} />;
    }
    if (hardcodedIcons[name]) {
      return <Icon src={hardcodedIcons[name]} />;
    }
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
        let { name, icon, description, tags } = template;
        if (hardcodedNames[name]) {
          name = hardcodedNames[name];
        }

        return (
          <TemplateBlock
            key={name}
            onClick={() => setCurrentTemplate(template)}
          >
            {/* {tags?.includes("POPULAR") && <FireIcon src={fire} size="15px" top="10px" right="10px" />} */}
            {renderIcon(icon, template.name)}
            <TemplateTitle>{name}</TemplateTitle>
            <TemplateDescription>{description}</TemplateDescription>
            <Spacer y={0.5} />

            {Object.keys(DISPLAY_TAGS_MAP).map(tagKey => (
              tags?.includes(tagKey) &&
              <Tag
                bottom="10px"
                left="12px"
                style={{ background: DISPLAY_TAGS_MAP[tagKey].color }}
              >
                {DISPLAY_TAGS_MAP[tagKey].label}
              </Tag>
            ))}
          </TemplateBlock>
        );
      })}
    </TemplateListWrapper>

  );
};

export default TemplateList;

const FireIcon = styled.img<{ size?: string, top?: string, right?: string }>`
  height: ${props => props.size || '25px'};
  position: absolute;
  top: ${props => props.top || 'auto'};
  right: ${props => props.right || 'auto'};
  
  &:hover::after {
    content: "Popular";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    background-color: white;
    color: black;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: bold;
    text-align: center;
  }
`;

const Tag = styled.div<{ size?: string, bottom?: string, left?: string }>`
  position: absolute;
  bottom: ${props => props.bottom || 'auto'};
  left: ${props => props.left || 'auto'};
  font-size: 10px;
  background: linear-gradient(45deg, rgba(88, 24, 219, 1) 0%, rgba(72, 12, 168, 1) 100%); // added gradient for shiny effect
  padding: 5px;
  border-radius: 4px; 
  opacity: 0.7;
  // box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1)
`;

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
  height: 25px;
  margin-top: 30px;
  margin-bottom: 5px;
`;

const NewIcon = styled.img`
  height: 25px;
  margin-top: 30px;
  margin-bottom: 5px;
`;

const Polymer = styled.div`
  > i {
    font-size: 25px;
    margin-top: 30px;
    margin-bottom: 5px;
  }
`;

const TemplateDescription = styled.div`
  margin-bottom: 26px;
  color: #ffffff66;
  text-align: center;
  font-weight: default;
  padding: 0px 25px;
  line-height: 1.4;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const TemplateTitle = styled.div`
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
  padding: 3px 0px 5px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 170px;
  cursor: pointer;
  color: #ffffff;
  position: relative;
  border-radius: 5px;
  background: ${props => props.theme.clickable.bg};
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
  margin-top: 15px;
  padding-bottom: 50px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
`;
