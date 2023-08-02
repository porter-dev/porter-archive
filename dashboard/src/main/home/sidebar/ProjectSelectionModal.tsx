import { RouteComponentProps, withRouter } from "react-router";
import styled from "styled-components";
import React, { useContext, useState } from "react";

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
  const [currentPage, setCurrentPage] = useState<number>(1); // add a currentPage state, starts at 1
  const projectsPerPage = 11
  const filteredProjects = useMemo(() => {
    const filteredBySearch = projects.filter((project) => {
      return project.id === Number(searchValue) || project.name.toLowerCase().includes(searchValue.toLowerCase());
    });

    return _.sortBy(filteredBySearch, 'name').slice(startIndex, endIndex);
  }, [projects, searchValue, currentPage]);
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
    const lastBlock = user && user.isPorterUser ? (
      <Block
        isLastBlock={true}
        key="initialize"
        onClick={() =>
          pushFiltered(props, "/new-project", ["project_id"], {
            new_project: true,
          })
        }
      >
        <BlockTitle>Create a project</BlockTitle>
        {/* <ProjectIcon>
          <ProjectImage src={gradient} />
          <Letter>{"+"}</Letter>
        </ProjectIcon> */}
        <BlockDescription>
          Initialize a new project
        </BlockDescription>
      </Block>
    ) : null;

    return filteredProjects.map((project: ProjectType, i: number) => {
      return (
        <Block
          key={i}
          selected={project.id === currentProject.id}
          onClick={async () => {
            // if (project.id !== currentProject.id) {
            //   setCurrentCluster(null);
            // }
            setCurrentProject(project);

            const clusters_list = await updateClusterList(project.id);
            console.log(clusters_list);

            if (clusters_list?.length > 0) {
              setCurrentCluster(clusters_list[0]);
              pushFiltered(props, "/apps", ["project_id"], {});
            } else {
              pushFiltered(props, "/onboarding", ["project_id"], {});
            }
            closeModal();
          }}
        >
          {/* <BlockIcon src={gradient} /> */}
          <BlockTitle>{project.name}</BlockTitle>
          {/* <ProjectIcon>
            <ProjectImage src={gradient} />
            <Letter>{project.name[0].toUpperCase()}</Letter>
          </ProjectIcon> */}

          <BlockDescription>
            Project Id: {project.id}
          </BlockDescription>
        </Block>
      );
    }).concat(lastBlock);
  };

  const renderPaginationButtons = () => {
    const totalProjects = projects.length;
    const totalPages = Math.ceil(totalProjects / projectsPerPage);

    // Only render pagination buttons if there are multiple pages
    if (totalPages > 1) {
      return (
        <PaginationButtonsContainer>
          <Button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
          >
            Previous
          </Button>

          <span>{currentPage} / {totalPages}</span>

          <Button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
          >
            Next
          </Button>
        </PaginationButtonsContainer>
      );
    }

    // If there is only one page, don't render the buttons
    return null;
  };

  return (
    <Modal closeModal={closeModal} width={'900px'}>
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
        />

        <Spacer inline x={1} />

        <Button onClick={() =>
          pushFiltered(props, "/new-project", ["project_id"], {
            new_project: true,
          })} height="30px" width="130px">
          <I className="material-icons">add</I> New Project
        </Button>
      </Container>

      <Spacer y={1} />

      <ScrollableContent>  {/* Wrap the block list and pagination buttons */}
        <BlockList>
          {renderBlockList()}
        </BlockList>
        <Spacer height="15px" />

        {renderPaginationButtons()}
      </ScrollableContent>
    </Modal >
  )
}

export default withRouter(ProjectSelectionModal);

const Block = styled.div<{ selected?: boolean }>`
  align-items: center;
  user-select: none;
  display: flex;
  font-size: 13px;
  overflow: hidden;
  font-weight: 500;
  padding: 3px 0px 12px;
  flex-direction: column;
  height: 170px;
  cursor: pointer;
  color: #ffffff;
  position: relative;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
  background: ${props => props.isLastBlock ? '#aaaabb' : props.theme.clickable.bg};

  border: ${props => props.selected ? "2px solid #8590ff" : "1px solid #494b4f"};
  :hover {
    border: ${({ selected }) => (!selected && "1px solid #7a7b80")};
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

const BlockList = styled.div`
  overflow: visible;
  margin-top: 6px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const Letter = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  padding-bottom: 2px;
  font-weight: 10000;
  font-size: 60px;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;
const BlockDescription = styled.div`
  color: #ffffff66;
  margin-left: -10px;
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

const Plus = styled.div`
  margin-right: 10px;
  font-size: 15px;
`;


const ProjectImage = styled.img`
width: 100%;
height: 100%;
`;

const ProjectIcon = styled.div`
width: 75px;
min-width: 25px;
height: 75px;
border-radius: 3px;
overflow: hidden;
position: relative;
margin-right: 10px;
font-weight: 400;
`;

const PaginationButtonsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
`;
const ScrollableContent = styled.div`
  overflow-y: auto; /* Enable vertical scrolling */
  height: calc(100vh - 200px); /* Set the maximum height */
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