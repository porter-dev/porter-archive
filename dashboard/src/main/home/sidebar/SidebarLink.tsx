import React, { useContext } from "react";
import { NavLink, NavLinkProps, useParams } from "react-router-dom";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";

const SidebarLink: React.FC<{ path: string } & Omit<NavLinkProps, "to">> = ({
  children,
  path,
  ...props
}) => {
  const params = useParams<{ namespace: string }>();
  const { getQueryParam } = useRouting();
  const { currentCluster, currentProject } = useContext(Context);

  /**
   * Helper function that will keep the query params before redirect the user to a new page
   *
   */
  const withQueryParams = (path: string) => (location: any) => {
    let pathNamespace = params.namespace;
    let search = `?cluster=${currentCluster.name}&project_id=${currentProject.id}`;

    if (!pathNamespace) {
      pathNamespace = getQueryParam("namespace");
    }

    if (pathNamespace) {
      search = search.concat(`&namespace=${pathNamespace}`);
    }

    return {
      ...location,
      pathname: path,
      search,
    };
  };

  return (
    <NavLink to={withQueryParams(path)} {...props}>
      {children}
    </NavLink>
  );
};

export default SidebarLink;
