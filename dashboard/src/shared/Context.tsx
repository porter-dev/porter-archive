import React, { Component } from "react";

import {
  CapabilityType,
  ClusterType,
  ContextProps,
  ProjectListType,
  ProjectType,
  UsageData,
} from "shared/types";

import { pushQueryParams } from "shared/routing";
import api from "./api";

const Context = React.createContext<Partial<ContextProps>>(null);

const { Provider } = Context;
const ContextConsumer = Context.Consumer;

type PropsType = {
  history: any;
  location: any;
};

type StateType = GlobalContextType;

export interface GlobalContextType {
  currentModal: string;
  currentModalData: any;
  setCurrentModal: (currentModal: string, currentModalData?: any) => void;
  currentOverlay: {
    message: string;
    onYes: any;
    onNo: any;
  };
  setCurrentOverlay: (x: any) => void;
  currentError: string | null;
  setCurrentError: (currentError: string) => void;
  currentCluster: ClusterType;
  setCurrentCluster: (currentCluster: ClusterType, callback?: any) => void;
  currentProject: ProjectType | null;
  setCurrentProject: (
    currentProject: ProjectType,
    callback?: () => void
  ) => void;
  projects: ProjectListType[];
  setProjects: (projects: ProjectListType[]) => void;
  user: any;
  setUser: (userId: number, email: string) => void;
  devOpsMode: boolean;
  setDevOpsMode: (devOpsMode: boolean) => void;
  capabilities: CapabilityType;
  setCapabilities: (capabilities: CapabilityType) => void;
  clearContext: () => void;
  edition: "ee" | "ce";
  setEdition: (appVersion: string) => void;
  hasBillingEnabled: boolean;
  setHasBillingEnabled: (isBillingEnabled: boolean) => void;
  usage: UsageData;
  setUsage: (usage: UsageData) => void;
  queryUsage: (retry?: number) => Promise<void>;
  hasFinishedOnboarding: boolean;
  setHasFinishedOnboarding: (onboardingStatus: boolean) => void;
  canCreateProject: boolean;
  setCanCreateProject: (canCreateProject: boolean) => void;
  enableGitlab: boolean;
  setEnableGitlab: (enableGitlab: boolean) => void;
  shouldRefreshClusters: boolean;
  setShouldRefreshClusters: (shouldRefreshClusters: boolean) => void;
  featurePreview: boolean;
  setFeaturePreview: (featurePreview: boolean) => void;
  soc2Data: any;
  setSoc2Data: (x: any) => void;
}

/**
 * Component managing a universal (application-wide) data store.
 *
 * Important Usage Notes:
 * 1) Each field must have an accompanying setter
 * 2) No function calls are allowed from within Context (not counting
 *    initialization)
 * 3) Context should be used as a last-resort (changes will re-render ALL
 *    components consuming Context)
 * 4) As a rule of thumb, Context should not be used for UI-related state
 */
class ContextProvider extends Component<PropsType, StateType> {
  state: GlobalContextType = {
    currentModal: null,
    currentModalData: null,
    setCurrentModal: (currentModal: string, currentModalData?: any) => {
      this.setState({ currentModal, currentModalData });
    },
    currentOverlay: null,
    setCurrentOverlay: (x: any) => this.setState({ currentOverlay: x }),
    currentError: null,
    setCurrentError: (currentError: string) => {
      this.setState({ currentError });
    },
    currentCluster: {
      id: -1,
      name: "",
      server: "",
      service_account_id: -1,
      infra_id: -1,
      service: "",
      agent_integration_enabled: false,
    },
    setCurrentCluster: (currentCluster: ClusterType, callback?: any) => {
      localStorage.setItem(
        this.state.currentProject.id + "-cluster",
        JSON.stringify(currentCluster)
      );
      this.setState({ currentCluster }, () => {
        callback && callback();
      });
      if (window.intercomSettings) {
        window.intercomSettings["Cluster ID"] = currentCluster.id;
      }
    },
    currentProject: null,
    setCurrentProject: (currentProject: ProjectType, callback?: any) => {
      if (currentProject) {
        localStorage.setItem("currentProject", currentProject.id.toString());
        pushQueryParams(this.props, {
          project_id: currentProject.id.toString(),
        });
      } else {
        localStorage.removeItem("currentProject");
      }
      this.setState({ currentProject }, () => {
        callback && callback();
      });
      if (window.intercomSettings) {
        window.intercomSettings["Project ID"] = currentProject.id;
        window.intercomSettings.project_id = currentProject.id;
      }
    },
    projects: [],
    setProjects: (projects: ProjectListType[]) => {
      projects.sort((a: any, b: any) => (a.name > b.name ? 1 : -1));
      this.setState({ projects });
    },
    user: null,
    setUser: (userId: number, email: string) => {
      this.setState({
        user: { userId, email, isPorterUser: email?.endsWith("@porter.run") },
      });
      if (window.intercomSettings) {
        window.intercomSettings["Porter User ID"] = userId;
        window.intercomSettings["Porter User Email"] = email;
      }
    },
    devOpsMode: true,
    setDevOpsMode: (devOpsMode: boolean) => {
      this.setState({ devOpsMode });
    },
    capabilities: null,
    setCapabilities: (capabilities: CapabilityType) => {
      this.setState({ capabilities });
    },
    clearContext: () => {
      this.setState({
        currentModal: null,
        currentModalData: null,
        currentError: null,
        currentCluster: null,
        currentProject: null,
        projects: [],
        user: null,
        devOpsMode: true,
      });
    },
    edition: "ce",
    setEdition: (version: string) => {
      const [edition] = version.split("-").reverse();
      // typesafe just in case we mess up something it will default to ce
      if (edition === "ce" || edition === "ee") {
        this.setState({ edition });
      }
    },
    hasBillingEnabled: false,
    setHasBillingEnabled: (isBillingEnabled: boolean) => {
      this.setState({ hasBillingEnabled: isBillingEnabled });
    },
    usage: null,
    setUsage: (usage: UsageData) => {
      this.setState({ usage });
    },
    queryUsage: async (retry: number = 0) => {
      api
        .getUsage("<token>", {}, { project_id: this.state?.currentProject?.id })
        .then((res) => {
          if (JSON.stringify(res.data) !== JSON.stringify(this.state.usage)) {
            this.state.setUsage(res.data);
          } else {
            if (retry < 10) {
              setTimeout(() => {
                this.state.queryUsage(retry + 1);
              }, 1000);
            }
          }
        });
    },
    hasFinishedOnboarding: false,
    setHasFinishedOnboarding: (onboardingStatus) => {
      this.setState({ hasFinishedOnboarding: onboardingStatus });
    },
    canCreateProject: false,
    setCanCreateProject: (canCreateProject: boolean) => {
      this.setState({ canCreateProject });
    },
    enableGitlab: false,
    setEnableGitlab: (enableGitlab) => {
      this.setState({ enableGitlab });
    },
    shouldRefreshClusters: false,
    setShouldRefreshClusters: (shouldRefreshClusters) => {
      this.setState({ shouldRefreshClusters });
    },
    featurePreview: false,
    setFeaturePreview: (featurePreview) => {
      this.setState({ featurePreview });
    },
    soc2Data: {
      "preflight_checks": {
        "EBS Volume": {
          "message": "EBS volume is enabled for the cluster by default.",
          "enabled": true,
          "hideToggle": true,
          "status": "ENABLED"
        },
        "AWS KMS Secret Encryption": {
          "message": "KMS encryption is enabled for the cluster.",
          "enabled": false,
          "disabledTooltip": "Enable KMS encryption for the cluster to enable SOC 2 compliance.",
          "locked": true,
          "status": "",
        },
        "EKS CloudTrail Forwarding": {
          "message": "Forward all application and control plane logs to CloudTrail.",
          "enabled": false,
          "enabledField": "Retain CloudTrail logs for 365 days",
          "status": "",
        },
        "Enhanced ECR Forwarding": {
          "message": "ECR Forwarding is not enabled for the cluster. Please enable ECR Forwarding for the cluster to enable SOC 2 compliance.",
          "link": "https://docs.aws.amazon.com/AmazonECR/latest/userguide/log-forwarding.html",
          "enabled": false,
          "info": "",
          "status": ""
        },
      }
    },
    setSoc2Data: (soc2Data) => {
      localStorage.setItem("soc2Data", JSON.stringify(soc2Data));
    }
  };

  render() {
    return <Provider value={{ ...this.state }}>{this.props.children}</Provider>;
  }
}

export { Context, ContextProvider, ContextConsumer };