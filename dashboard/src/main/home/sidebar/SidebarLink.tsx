import React, { useContext } from "react";
import { NavLink, NavLinkProps, useParams } from "react-router-dom";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import sidebarHighlight from "assets/sidebar-highlight.png";

import styled from "styled-components";

const SidebarLink: React.FC<
  { path: string; targetClusterName?: string, active?: boolean, noHighlight?: boolean } & Omit<NavLinkProps, "to">
> = ({ children, path, targetClusterName, active, noHighlight, ...rest }) => {
  const params = useParams<{ namespace: string }>();
  const { getQueryParam } = useRouting();
  const { currentCluster, currentProject } = useContext(Context);

  /**
   * Helper function that will keep the query params before redirect the user to a new page
   *
   */
  const withQueryParams = (path: string) => (location: any) => {
    let pathNamespace = params.namespace;
    const search = new URLSearchParams();
    if (currentCluster?.name) {
      search.append("cluster", targetClusterName || currentCluster.name);
    }

    if (currentProject?.id) {
      search.append("project_id", String(currentProject.id));
    }

    if (!pathNamespace) {
      pathNamespace = getQueryParam("namespace");
    }

    if (pathNamespace) {
      search.append("namespace", pathNamespace);
    }

    return {
      ...location,
      pathname: path,
      search: search.toString(),
    };
  };

  return (
      <NavLink to={withQueryParams(path)} {...rest}>
        {!noHighlight && window.location.pathname.split("/")[1] === path?.split("/")[1] && <Highlight src={sidebarHighlight} />}
        <StyledSideBarLink active={window.location.pathname.split("/")[1] === path?.split("/")[1]}>
          {children}
        </StyledSideBarLink>
      </NavLink>
  );
};

export default SidebarLink;

const Highlight = styled.img`
  position: absolute;
  top: 1px; 
  left: -22px; 
  height: 43px;
`;

const StyledSideBarLink = styled.div<{ active: boolean }>`
  height: 100%;
  display: flex;
  align-items: center;
  color: ${(props) => props.theme.text.primary};
  opacity: ${(props) => (props.active ? 1 : 0.6)};
`;
