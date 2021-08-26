import React, { Component, useContext, useEffect, useState } from "react";
import styled from "styled-components";

import close from "assets/close.png";
import { isAlphanumeric } from "shared/common";
import api from "shared/api";
import { Context } from "shared/Context";
import { InfraType } from "shared/types";

import InputRow from "components/form-components/InputRow";
import CheckboxRow from "components/form-components/CheckboxRow";
import SelectRow from "components/form-components/SelectRow";
import Helper from "components/form-components/Helper";
import Heading from "components/form-components/Heading";
import SaveButton from "components/SaveButton";
import CheckboxList from "components/form-components/CheckboxList";

type PropsType = {
  setSelectedProvisioner: (x: string | null) => void;
  handleError: () => void;
  projectName: string;
  highlightCosts?: boolean;
  infras: InfraType[];
  trackOnSave: () => void;
};

const provisionOptions = [
  { value: "docr", label: "Digital Ocean Container Registry" },
  { value: "doks", label: "Digital Ocean Kubernetes Service" },
];

const tierOptions = [
  { value: "basic", label: "Basic" },
  { value: "professional", label: "Professional" },
];

const regionOptions = [
  { value: "ams3", label: "Amsterdam 3" },
  { value: "blr1", label: "Bangalore 1" },
  { value: "fra1", label: "Frankfurt 1" },
  { value: "lon1", label: "London 1" },
  { value: "nyc1", label: "New York 1" },
  { value: "nyc3", label: "New York 3" },
  { value: "sfo2", label: "San Francisco 2" },
  { value: "sfo3", label: "San Francisco 3" },
  { value: "sgp1", label: "Singapore 1" },
  { value: "tor1", label: "Toronto 1" },
];

// TODO: Consolidate across forms w/ HOC
const DOFormSectionFC: React.FC<PropsType> = (props) => {
  const [selectedInfras, setSelectedInfras] = useState([...provisionOptions]);
  const [subscriptionTier, setSubscriptionTier] = useState("basic");
  const [doRegion, setDoRegion] = useState("nyc1");
  const [clusterName, setClusterName] = useState("");
  const [clusterNameSet, setClusterNameSet] = useState(false);
  const [provisionConfirmed, setProvisionConfirmed] = useState(false);

  const context = useContext(Context);

  // This is added only for tracking purposes
  // With this prop we will track down if the user has had an intent of filling the formulary
  const [isFormDirty, setIsFormDirty] = useState(false);

  useEffect(() => {
    if (!isFormDirty) {
      return;
    }

    window.analytics?.track("provision_form-dirty", {
      provider: "do",
    });
  }, [isFormDirty]);

  useEffect(() => {
    if (props.infras) {
      // From the dashboard, only uncheck and disable if "creating" or "created"
      let filtered = selectedInfras;
      props.infras.forEach((infra: InfraType, i: number) => {
        let { kind, status } = infra;
        if (status === "creating" || status === "created") {
          filtered = filtered.filter((item: any) => {
            return item.value !== kind;
          });
        }
      });
      setSelectedInfras(filtered);
    }
  }, [props.infras]);

  useEffect(() => {
    setClusterNameIfNotSet();
  }, [props.projectName]);

  const setClusterNameIfNotSet = () => {
    let projectName = props.projectName || context.currentProject?.name;

    if (!clusterNameSet && !clusterName.includes(`${projectName}-cluster`)) {
      setClusterName(
        `${projectName}-cluster-${Math.random().toString(36).substring(2, 8)}`
      );
    }
  };

  const checkFormDisabled = () => {
    if (!provisionConfirmed) {
      return true;
    }

    let { projectName } = props;
    if (projectName || projectName === "") {
      return (
        !isAlphanumeric(projectName) ||
        selectedInfras.length === 0 ||
        !clusterName
      );
    } else {
      return selectedInfras.length === 0 || !clusterName;
    }
  };

  const catchError = (err: any) => {
    console.log(err);
    props.handleError();
    return;
  };

  // Step 1: Create a project
  const createProject = (callback?: any) => {
    let { projectName } = props;
    let { user, setProjects, setCurrentProject } = context;

    api
      .createProject("<token>", { name: projectName }, {})
      .then(async (res) => {
        let proj = res.data;

        // Need to set project list for dropdown
        // TODO: consolidate into ProjectSection (case on exists in list on set)
        const res_1 = await api.getProjects(
          "<token>",
          {},
          {
            id: user.userId,
          }
        );
        setProjects(res_1.data);
        setCurrentProject(proj, () => callback && callback(proj.id));
      })
      .catch(catchError);
  };

  const doRedirect = (projectId: number) => {
    let redirectUrl = `/api/oauth/projects/${projectId}/digitalocean?project_id=${projectId}&provision=do`;
    redirectUrl += `&tier=${subscriptionTier}&region=${doRegion}&cluster_name=${clusterName}`;
    selectedInfras.forEach((option: { value: string; label: string }) => {
      redirectUrl += `&infras=${option.value}`;
    });
    redirectUrl += "&tab=provisioner";
    window.location.href = redirectUrl;
  };

  // TODO: handle generically (with > 2 steps)
  const onCreateDO = () => {
    props?.trackOnSave();
    let { projectName } = props;
    let { currentProject } = context;

    if (!projectName) {
      doRedirect(currentProject.id);
    } else {
      createProject((projectId: number) => doRedirect(projectId));
    }
  };

  const getButtonStatus = () => {
    if (props.projectName) {
      if (!isAlphanumeric(props.projectName)) {
        return "Project name contains illegal characters";
      }
    }
    if (!provisionConfirmed || props.projectName === "" || !clusterName) {
      return "Required fields missing";
    }
  };

  const renderClusterNameSection = () => {
    if (
      selectedInfras.length == 2 ||
      (selectedInfras.length == 1 && selectedInfras[0].value === "doks")
    ) {
      return (
        <InputRow
          type="text"
          value={clusterName}
          setValue={(x: string) => {
            setClusterName(x);
            setClusterNameSet(true);
            setIsFormDirty(true);
          }}
          label="Cluster Name"
          placeholder="ex: porter-cluster"
          width="100%"
          isRequired={true}
        />
      );
    }
  };

  return (
    <StyledAWSFormSection>
      <FormSection>
        <CloseButton onClick={() => props.setSelectedProvisioner(null)}>
          <CloseButtonImg src={close} />
        </CloseButton>
        <Heading isAtTop={true}>DigitalOcean Settings</Heading>
        <SelectRow
          options={tierOptions}
          width="100%"
          value={subscriptionTier}
          setActiveValue={(x: string) => {
            setSubscriptionTier(x);
            setIsFormDirty(true);
          }}
          label="💰 Subscription Tier"
        />
        <SelectRow
          options={regionOptions}
          width="100%"
          dropdownMaxHeight="240px"
          value={doRegion}
          setActiveValue={(x: string) => {
            setDoRegion(x);
            setIsFormDirty(true);
          }}
          label="📍 DigitalOcean Region"
        />
        <Br />
        <Heading>DigitalOcean Resources</Heading>
        <Helper>
          Porter will provision the following DigitalOcean resources in your own
          cloud.
        </Helper>
        <CheckboxList
          options={provisionOptions}
          selected={selectedInfras}
          setSelected={(x: { value: string; label: string }[]) => {
            setSelectedInfras(x);
            setIsFormDirty(true);
          }}
        />
        {renderClusterNameSection()}
        <Helper>
          By default, Porter creates a cluster with three Standard (2vCPUs / 2GB
          RAM) droplets. DigitalOcean will bill you for any provisioned
          resources. Learn more about DOKS pricing
          <Highlight
            href="https://www.digitalocean.com/products/kubernetes/"
            target="_blank"
          >
            here
          </Highlight>
          .
        </Helper>
        {/*
        <Helper>
          Estimated Cost:{" "}
          <CostHighlight highlight={this.props.highlightCosts}>
            $90/Month
          </CostHighlight>
          <Tooltip
            title={
              <div
                style={{
                  fontFamily: "Work Sans, sans-serif",
                  fontSize: "12px",
                  fontWeight: "normal",
                  padding: "5px 6px",
                }}
              >
                Cluster cost: ~$10/month <br />
                Machine (x3) cost: ~$60/month <br />
                Networking cost: ~$20/month
              </div>
            }
            placement="top"
          >
            <StyledInfoTooltip>
              <i className="material-icons">help_outline</i>
            </StyledInfoTooltip>
          </Tooltip>
        </Helper>
        */}
        <CheckboxRow
          isRequired={true}
          checked={provisionConfirmed}
          toggle={() => {
            setIsFormDirty(true);
            setProvisionConfirmed(!provisionConfirmed);
          }}
          label="I understand and wish to proceed"
        />
      </FormSection>
      {props.children ? props.children : <Padding />}
      <SaveButton
        text="Submit"
        disabled={checkFormDisabled()}
        onClick={onCreateDO}
        makeFlush={true}
        status={getButtonStatus()}
        helper="Note: Provisioning can take up to 15 minutes"
      />
    </StyledAWSFormSection>
  );
};

const Highlight = styled.a`
  color: #8590ff;
  cursor: pointer;
  text-decoration: none;
  margin-left: 5px;
`;

const Padding = styled.div`
  height: 15px;
`;

const Br = styled.div`
  width: 100%;
  height: 2px;
`;

const StyledAWSFormSection = styled.div`
  position: relative;
  padding-bottom: 35px;
`;

const FormSection = styled.div`
  background: #ffffff11;
  margin-top: 25px;
  background: #26282f;
  border-radius: 5px;
  margin-bottom: 25px;
  padding: 25px;
  padding-bottom: 16px;
  font-size: 13px;
  animation: fadeIn 0.3s 0s;
  position: relative;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const GuideButton = styled.a`
  display: flex;
  align-items: center;
  margin-left: 20px;
  color: #aaaabb;
  font-size: 13px;
  margin-bottom: -1px;
  border: 1px solid #aaaabb;
  padding: 5px 10px;
  padding-left: 6px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
    color: #ffffff;
    border: 1px solid #ffffff;

    > i {
      color: #ffffff;
    }
  }

  > i {
    color: #aaaabb;
    font-size: 16px;
    margin-right: 6px;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const CostHighlight = styled.span<{ highlight: boolean }>`
  background-color: ${(props) => props.highlight && "yellow"};
`;

const StyledInfoTooltip = styled.div`
  display: inline-block;
  position: relative;
  margin-right: 2px;
  > i {
    display: flex;
    align-items: center;
    position: absolute;
    top: -10px;
    font-size: 10px;
    color: #858faaaa;
    cursor: pointer;
    :hover {
      color: #aaaabb;
    }
  }
`;
