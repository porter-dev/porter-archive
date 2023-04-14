import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import semver from "semver";
import _ from "lodash";

import addOn from "assets/add-ons.png";

import { Context } from "shared/Context";
import api from "shared/api";
import { search } from "shared/search";

import Link from "components/porter/Link";
import TemplateList from "../launch/TemplateList";
import SearchBar from "components/porter/SearchBar";
import Spacer from "components/porter/Spacer";
import Loading from "components/Loading";

type Props = {
};

const ExpandedTemplate: React.FC<Props> = ({
}) => {
  const { capabilities, currentProject } = useContext(Context);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState("");
  const [addOnTemplates, setAddOnTemplates] = useState<any[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);

  return (
    <StyledExpandedTemplate>
      <DashboardHeader
        prefix={(
          <Link to="/addons">
            <I className="material-icons">keyboard_backspace</I>
          </Link>
        )}
        image={addOn}
        title="Deploy a new add-on"
        capitalize={false}
        description="Create a new add-ons for this project."
        disableLineBreak
      />
      <SearchBar 
        value={searchValue}
        setValue={setSearchValue}
        placeholder="Search available add-ons . . ."
        width="100%"
      />
      <Spacer y={1} />

      {/* Temporary space reducer for legacy template list */}
      {isLoading ? <Loading offset="-150px" /> : (
        <>
          <DarkMatter />
          <TemplateList
            templates={filteredTemplates}
            setCurrentTemplate={(x) => setCurrentTemplate(x)}
          />
        </>
      )}
    </StyledExpandedTemplate>
  );
};

export default ExpandedTemplate;

const StyledExpandedTemplate = styled.div`
  width: 100%;
  height: 100%;
`;