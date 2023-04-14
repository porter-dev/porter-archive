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
import Button from "components/porter/Button";

type Props = {
  currentTemplate: any;
  goBack: () => void;
};

const ExpandedTemplate: React.FC<Props> = ({
  currentTemplate,
  goBack,
}) => {
  const { capabilities, currentProject } = useContext(Context);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState("");
  const [addOnTemplates, setAddOnTemplates] = useState<any[]>([]);

  return (
    <StyledExpandedTemplate>
      <Button 
        onClick={goBack}
        alt
      >
        <I className="material-icons">first_page</I>
        <Spacer inline x={1} />
        Select template
      </Button>
    </StyledExpandedTemplate>
  );
};

export default ExpandedTemplate;

const I = styled.i`
  color: white;
  font-size: 16px;
`;

const StyledExpandedTemplate = styled.div`
  width: 100%;
  height: 100%;
`;