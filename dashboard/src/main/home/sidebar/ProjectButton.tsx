import React, { useState, useEffect, useRef, useContext } from "react";
import styled from "styled-components";
import gradient from "assets/gradient.png";

import { Context } from "shared/Context";
import { ProjectType } from "shared/types";
import { pushFiltered } from "shared/routing";
import { RouteComponentProps, withRouter } from "react-router";
import Icon from "components/porter/Icon";
import swap from "assets/swap.svg";
import Spacer from "components/porter/Spacer";
import ProjectSelectionModal from "./ProjectSelectionModal";

type PropsType = RouteComponentProps & {
  currentProject: ProjectType;
  projects: ProjectType[];
};

const ProjectButton: React.FC<PropsType> = (props) => {
  const [expanded, setExpanded] = useState(false);
  const wrapperRef = useRef<any>(null);
  const context = useContext(Context);
  const [showGHAModal, setShowGHAModal] = useState<boolean>(false);

  const { setCurrentProject, setCurrentCluster, user } = context;

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleClickOutside = (e: any) => {
    if (
      wrapperRef &&
      wrapperRef.current &&
      !wrapperRef.current.contains(e.target)
    ) {
      setExpanded(false);
    }
  };

  const handleExpand = () => {
    setExpanded(!expanded);
  };

  // Render the component
  let { currentProject } = props;
  if (currentProject) {
    return (
      <StyledProjectSection ref={wrapperRef}>
        <MainSelector
          onClick={handleExpand}
          expanded={expanded}
          hasMultipleProjects={props.projects.length > 1}
        >
          <ProjectIcon>
            <ProjectImage src={gradient} />
            <Letter>{currentProject.name[0].toUpperCase()}</Letter>
          </ProjectIcon>
          <ProjectName
            hasMultipleProjects={props.projects.length > 1}
            title={currentProject.name} // Add this line
          >
            {currentProject.name}
          </ProjectName>
          <Spacer inline x={.5} />

          {(props.projects.length > 1 || user?.isPorterUser) && <RefreshButton onClick={() => setShowGHAModal(true)}>
            <img src={swap} />
          </RefreshButton>}
          {showGHAModal && currentProject != null && (
            <ProjectSelectionModal
              currentProject={props.currentProject}
              projects={props.projects}
              closeModal={() => setShowGHAModal(false)}
            />
          )}
        </MainSelector>
        {/* {renderDropdown()} */}
      </StyledProjectSection >
    );
  }
  return (
    <InitializeButton
      onClick={() =>
        pushFiltered(props, "/new-project", ["project_id"], {
          new_project: true,
        })
      }
    >
      <Plus>+</Plus> Create a project
    </InitializeButton>
  );
};

export default withRouter(ProjectButton);


const ProjectLabel = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Plus = styled.div`
  margin-right: 10px;
  font-size: 15px;
`;

const InitializeButton = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(100% - 30px);
  height: 38px;
  margin: 8px 15px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 3px;
  color: ${props => props.theme.text.primary};
  padding-bottom: 1px;
  cursor: pointer;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }
`;



const Letter = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  padding-bottom: 2px;
  font-weight: 500;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProjectImage = styled.img`
  width: 100%;
  height: 100%;
`;

const ProjectIcon = styled.div`
  width: 25px;
  min-width: 25px;
  height: 25px;
  border-radius: 2px;
  overflow: hidden;
  position: relative;
  margin-right: 6px;
  font-weight: 400;
`;
const ProjectIconAlt = styled(ProjectIcon)`
  border: 1px solid #ffffff44;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StyledProjectSection = styled.div`
  position: relative;
  margin-left: 2px;
  color: ${props => props.theme.text.primary};
`;

const MainSelector = styled.div<{ expanded: boolean, hasMultipleProjects: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${props => props.hasMultipleProjects ? 'space-between' : 'flex-start'};
  margin: 10px 0 0;
  font-size: 14px;
  cursor: pointer;
  padding: 10px 20px;
  position: relative;
  :hover {
    > i {
      background: #ffffff22;
    }
  }

  > i {
    margin-left: 7px;
    margin-right: 12px;
    font-size: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    background: ${props => props.expanded ? "#ffffff22" : ""};
  }
`;

const ProjectName = styled.div<{ hasMultipleProjects: boolean }>`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ${props => props.hasMultipleProjects ? 'ellipsis' : 'clip'};
  flex-grow: ${props => props.hasMultipleProjects ? 1 : 0};
  padding-right: ${props => props.hasMultipleProjects ? '1px' : '0'};
  max-width: ${props => props.hasMultipleProjects ? 'auto' : '26ch'}; // Limit to max 25 characters when no multiple projects
`;

const RefreshButton = styled.div`
  color: #ffffff;
  display: flex;
  align-items: center;
  cursor: pointer;
  :hover {
    > img {
      opacity: 1;
    }
  }

  > img {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 14px;
  }
`;