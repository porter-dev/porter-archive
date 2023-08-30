import { RouteComponentProps, withRouter } from "react-router";
import styled from "styled-components";
import React, { useContext, useEffect, useState } from "react";

import Modal from "components/porter/Modal";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import { Context } from "shared/Context";
import { DetailedClusterType, ProjectType } from "shared/types";
import gradient from "assets/gradient.png";
import { pushFiltered } from "shared/routing";
import SearchBar from "components/porter/SearchBar";
import { search } from "shared/search";
import _ from 'lodash';
import { useMemo } from 'react';
import api from "shared/api";
import Button from "components/porter/Button";
import Container from "components/porter/Container";

type Props = RouteComponentProps & {
  closeModal: () => void;
  projects: ProjectType[];
  currentProject: ProjectType;
}

const ProjectSelectionModal: React.FC<Props> = ({
  closeModal,
  projects,
  currentProject,
  ...props
}) => {
  const context = useContext(Context);
  const { setCurrentProject, setCurrentCluster, user } = context;
  const [searchValue, setSearchValue] = useState("");
  const [clusters, setClusters] = useState<DetailedClusterType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const filteredProjects = useMemo(() => {
    const filteredBySearch = projects.filter((project) => {
      return project.id === Number(searchValue) || project.name.toLowerCase().includes(searchValue.toLowerCase());
    });

    // sort and return all the projects
    const sortedProjects = _.sortBy(filteredBySearch, 'name');

    // move the selected project to the top
    const selectedProjectIndex = sortedProjects.findIndex(project => project.id === currentProject.id);
    if (selectedProjectIndex !== -1) {
      const selectedProject = sortedProjects.splice(selectedProjectIndex, 1)[0];
      sortedProjects.unshift(selectedProject);
    }

    return sortedProjects;
  }, [projects, searchValue, currentProject]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" || e.keyCode === 27) {
          closeModal();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [closeModal]);

  const updateClusterList = async (projectId: number) => {
    try {
      setLoading(true)
      const res = await api.getClusters(
        "<token>",
        {},
        { id: projectId }
      );

      if (res.data) {
        setClusters(res.data);
        setLoading(false);
        setError("");
        return res.data;
      } else {
        setLoading(false);
        setError("Response data missing");
      }
    } catch (err) {
      setError(err.toString());
    }
  };
  const renderBlockList = () => {
    return filteredProjects.map((project: ProjectType, i: number) => {
      return (
        <IdContainer
          key={i}
          selected={project.id === currentProject.id}
          onClick={async () => {

            setCurrentProject(project);

            const clusters_list = await updateClusterList(project.id);
            console.log(clusters_list);

            if (clusters_list?.length > 0) {
              setCurrentCluster(clusters_list[0]);
              if (project.simplified_view_enabled) {
                pushFiltered(props, "/onboarding/source", ["project_id"], {});
              }
              else {
                pushFiltered(props, "/applications", ["project_id"], {});
              }
            } else {
              pushFiltered(props, "/onboarding", ["project_id"], {});
            }
            closeModal();
          }}
        >
          {/* <BlockIcon src={gradient} /> */}
          <BlockTitle>{project.name}</BlockTitle>


          <BlockDescription>
            Project ID: {project.id}
          </BlockDescription>
        </IdContainer>
      );
    });
  };

  return (
    <Modal closeModal={closeModal} width={'600px'}>
      <Text size={16} style={{ marginRight: '10px' }}>
        Switch Project
      </Text>
      <Spacer y={1} />

      <Container row spaced>
        <SearchBar
          value={searchValue}
          setValue={(x) => {
            setSearchValue(x);
          }}
          placeholder="Search projects..."
          width="100%"
          autoFocus={true}
        />

        <Spacer inline x={1} />

        {user.isPorterUser && <Button onClick={() =>
          pushFiltered(props, "/new-project", ["project_id"], {
            new_project: true,
          })} height="30px" width="130px">
          <I className="material-icons">add</I> New Project
        </Button>}
      </Container>

      <Spacer y={1} />

      <ScrollableContent>  {/* Wrap the block list */}
        {/* <BlockList>
          {renderBlockList()}
        </BlockList> */}
        {renderBlockList()}
        <Spacer height="15px" />
      </ScrollableContent>
    </Modal >
  )
}

export default withRouter(ProjectSelectionModal);

const IdContainer = styled.div`
    color: #ffffff;
    border-radius: 5px;
    padding: 5px;
    display: block;
    width: 100%;
    border-radius: 5px;
    background:${(props) => props.theme.clickable.bg};
    border: 1px solid ${({ theme }) => theme.border};
    margin-bottom: 10px;
    margin-top: 5px;
      border: ${props => props.selected ? "2px solid #8590ff" : "1px solid #494b4f"};
      :hover {
        border: ${({ selected }) => (!selected && "1px solid #7a7b80")};
      }
      cursor: pointer;

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

const BlockDescription = styled.div`
  color: #ffffff66;
  margin-left: -10px;
  margin-top: 4px;
  text-align: center;
  font-weight: default;
  font-size: 13px;
  padding: 0px 25px;
  height: 2.4em;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const BlockTitle = styled.div`
  margin-top: 12px;
  width: 100%;  
  margin-left: -10px;
  text-align: center;
  font-size: 16px;
  justify-content: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const ScrollableContent = styled.div`
  overflow-y: auto; /* Enable vertical scrolling */
  height: calc(100vh - 500px); /* Set the maximum height */
  padding-right: 15px; /* Add some right padding to account for scrollbar */
`;
const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
`;