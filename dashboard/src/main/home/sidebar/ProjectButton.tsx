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

  const { setCurrentProject, setCurrentCluster } = context;

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
        >
          <ProjectIcon>
            <ProjectImage src={gradient} />
            <Letter>{currentProject.name[0].toUpperCase()}</Letter>
          </ProjectIcon>
          <ProjectName>{currentProject.name}</ProjectName>
          <Spacer inline x={.5} />

          {props.projects.length > 1 && <RefreshButton onClick={() => setShowGHAModal(true)}>
            <img src={swap} />
          </RefreshButton>}
          {showGHAModal && currentProject != null && (
            <ProjectSelectionModal
              currentProject={props.currentProject}
              projects={props.projects}
              closeModal={() => setShowGHAModal(false)}
            />
          )}
          {/* <i className="material-icons">arrow_drop_down</i> */}
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

const Option = styled.div`
  width: 100%;
  border-top: 1px solid #00000000;
  border-bottom: 1px solid
    ${(props: { selected: boolean; lastItem?: boolean }) =>
    props.lastItem ? "#ffffff00" : "#ffffff15"};
  height: 45px;
  display: flex;
  align-items: center;
  font-size: 13px;
  align-items: center;
  padding-left: 10px;
  cursor: pointer;
  padding-right: 10px;
  background: ${(props: { selected: boolean; lastItem?: boolean }) =>
    props.selected ? "#ffffff11" : ""};
  :hover {
    background: ${(props: { selected: boolean; lastItem?: boolean }) =>
    props.selected ? "" : "#ffffff22"};
  }

  > i {
    font-size: 18px;
    margin-right: 12px;
    margin-left: 5px;
    color: #ffffff44;
  }
`;

const Dropdown = styled.div`
  position: absolute;
  right: 13px;
  top: calc(100% + 5px);
  background: #26282f;
  width: 210px;
  max-height: 500px;
  border-radius: 3px;
  z-index: 999;
  overflow-y: auto;
  margin-bottom: 10px;
  box-shadow: 0 5px 15px 5px #00000077;
`;

const ProjectName = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 17px 
`;

const Letter = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  padding-bottom: 2px;
  font-weight: 600;
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
  width: 30px;
  min-width: 25px;
  height: 30px;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  margin-right: 10px;
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
  margin-left: 3px;
  color: ${props => props.theme.text.primary};
`;

const MainSelector = styled.div`
  display: flex;
  align-items: center;
  margin: 10px 0 0;
  font-size: 14px;
  cursor: pointer;
  padding: 10px 0;
  padding-left: 20px;
  position: relative;  // <-- Add relative positioning here
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
    background: ${(props: { expanded: boolean }) =>
    props.expanded ? "#ffffff22" : ""};
  }
`;

const RefreshButton = styled.div`
  color: #ffffff;
  display: flex;
  align-items: center;
  cursor: pointer;
  position: absolute;  // <-- Add absolute positioning here
  right: 20px;  // <-- Adjust as needed
  :hover {
    > img {
      opacity: 1;
    }
  }

  > img {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 15px;
    
  }
`;
