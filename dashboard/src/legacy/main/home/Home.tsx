import React, { useContext, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import ConfirmOverlay from "legacy/components/ConfirmOverlay";
import Loading from "legacy/components/Loading";
import NoClusterPlaceHolder from "legacy/components/NoClusterPlaceHolder";
import Button from "legacy/components/porter/Button";
import Link from "legacy/components/porter/Link";
import Modal from "legacy/components/porter/Modal";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { useCustomerPlan } from "legacy/lib/hooks/useLago";
import { checkIfProjectHasPayment } from "legacy/lib/hooks/useStripe";
import api from "legacy/shared/api";
import {
  pushFiltered,
  pushQueryParams,
  type PorterUrl,
} from "legacy/shared/routing";
import midnight from "legacy/shared/themes/midnight";
import standard from "legacy/shared/themes/standard";
import {
  type ClusterType,
  type ProjectListType,
  type ProjectType,
} from "legacy/shared/types";
import { createPortal } from "react-dom";
import {
  Route,
  Switch,
  withRouter,
  type RouteComponentProps,
} from "react-router";
import { Redirect } from "react-router-dom";
import styled, { ThemeProvider } from "styled-components";

import { useAuthn } from "shared/auth/AuthnContext";
import { withAuth, type WithAuthProps } from "shared/auth/AuthorizationHoc";
import { fakeGuardedRoute } from "shared/auth/RouteGuard";
import { Context } from "shared/Context";
import DeploymentTargetProvider from "shared/DeploymentTargetContext";

import OryLogin from "../auth/OryLogin";
import AddonDashboard from "./add-on-dashboard/AddOnDashboard";
import AddonTemplates from "./add-on-dashboard/AddonTemplates";
import AddonView from "./add-on-dashboard/AddonView";
import LegacyAddOnDashboard from "./add-on-dashboard/legacy_AddOnDashboard";
import LegacyNewAddOnFlow from "./add-on-dashboard/legacy_NewAddOnFlow";
import AppView from "./app-dashboard/app-view/AppView";
import Apps from "./app-dashboard/apps/Apps";
import CreateApp from "./app-dashboard/create-app/CreateApp";
import DashboardRouter from "./cluster-dashboard/DashboardRouter";
import PreviewEnvs from "./cluster-dashboard/preview-environments/v2/PreviewEnvs";
import SetupApp from "./cluster-dashboard/preview-environments/v2/setup-app/SetupApp";
import ComplianceDashboard from "./compliance-dashboard/ComplianceDashboard";
import Dashboard from "./dashboard/Dashboard";
import DatabaseDashboard from "./database-dashboard/DatabaseDashboard";
import DatabaseView from "./database-dashboard/DatabaseView";
import CreateDatastore from "./database-dashboard/forms/CreateDatastore";
import CreateEnvGroup from "./env-dashboard/CreateEnvGroup";
import EnvDashboard from "./env-dashboard/EnvDashboard";
import ExpandedEnv from "./env-dashboard/ExpandedEnv";
import ClusterContextProvider from "./infrastructure-dashboard/ClusterContextProvider";
import ClusterDashboard from "./infrastructure-dashboard/ClusterDashboard";
import ClusterView from "./infrastructure-dashboard/ClusterView";
import CreateClusterForm from "./infrastructure-dashboard/forms/CreateClusterForm";
import Integrations from "./integrations/Integrations";
import LaunchWrapper from "./launch/LaunchWrapper";
import ModalHandler from "./ModalHandler";
import BillingModal from "./modals/BillingModal";
import Navbar from "./navbar/Navbar";
import { NewProjectFC } from "./new-project/NewProject";
import Onboarding from "./onboarding/Onboarding";
import ProjectSettings from "./project-settings/ProjectSettings";
import Sidebar from "./sidebar/Sidebar";

dayjs.extend(relativeTime);

// Guarded components
const GuardedProjectSettings = fakeGuardedRoute("settings", "", [
  "get",
  "list",
  "update",
  "create",
  "delete",
])(ProjectSettings);

const GuardedIntegrations = fakeGuardedRoute("integrations", "", [
  "get",
  "list",
  "update",
  "create",
  "delete",
])(Integrations);

type Props = RouteComponentProps &
  WithAuthProps & {
    logOut: () => void;
    currentProject: ProjectType;
    currentCluster: ClusterType;
    currentRoute: PorterUrl;
  };

const Home: React.FC<Props> = (props) => {
  const {
    user,
    projects,
    currentCluster,
    currentProject,
    currentModal,
    currentOverlay,
    hasFinishedOnboarding,
    shouldRefreshClusters,
    setProjects,
    setCurrentProject,
    setCapabilities,
    setCanCreateProject,
    setHasFinishedOnboarding,
    setCurrentError,
    setCurrentModal,
    setUsage,
    setShouldRefreshClusters,
  } = useContext(Context);

  const { authenticate } = useAuthn();

  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [forceRefreshClusters, setForceRefreshClusters] = useState(false);
  const [ghRedirect, setGhRedirect] = useState(false);
  const [forceSidebar, setForceSidebar] = useState(true);
  const [theme, setTheme] = useState(standard);
  const [showWrongEmailModal, setShowWrongEmailModal] = useState(false);

  const redirectToNewProject = () => {
    pushFiltered(props, "/new-project", ["project_id"]);
  };

  const redirectToOnboarding = () => {
    pushFiltered(props, "/onboarding", []);
  };

  const getMetadata = () => {
    api
      .getMetadata("<token>", {}, {})
      .then((res) => {
        setCapabilities(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const getProjects = async (id?: number) => {
    const { currentProject } = props;
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const projectId = urlParams.get("project_id");
    if (!projectId && currentProject?.id) {
      pushQueryParams(props, { project_id: currentProject.id.toString() });
    }

    try {
      const projectList = await api
        .getProjects("<token>", {}, { id: user.userId })
        .then((res) => res.data as ProjectListType[]);

      if (projectList.length === 0) {
        redirectToNewProject();
      } else if (projectList.length > 0 && !currentProject) {
        setProjects(projectList);

        if (!id) {
          id =
            Number(localStorage.getItem("currentProject")) || projectList[0].id;
        }

        const foundProjectListEntry = projectList.find(
          (item: ProjectListType) => item.id === id
        );
        if (foundProjectListEntry === undefined) {
          id = projectList[0].id;
        }

        const project = await api
          .getProject("<token>", {}, { id })
          .then((res) => res.data as ProjectType);

        setCurrentProject(project);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const checkIfCanCreateProject = () => {
    api
      .getCanCreateProject("<token>", {}, {})
      .then((res) => {
        if (res.status === 403) {
          setCanCreateProject(false);
          return;
        }
        setCanCreateProject(true);
      })
      .catch((err) => {
        setCanCreateProject(false);
        console.error(err);
      });
  };

  const checkOnboarding = async () => {
    try {
      const project_id = currentProject?.id;
      if (!project_id) {
        return;
      }
      const res = await api.getOnboardingState("<token>", {}, { project_id });

      if (res.status === 404) {
        setHasFinishedOnboarding(true);
        return;
      }

      if (res?.data && res?.data.current_step !== "clean_up") {
        setHasFinishedOnboarding(false);
      } else {
        setHasFinishedOnboarding(true);
      }
    } catch (error) {}
  };

  useEffect(() => {
    checkOnboarding();
    checkIfCanCreateProject();
    const { match } = props;

    // Handle redirect from DO
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    const err = urlParams.get("error");
    if (err) {
      setCurrentError(err);
    }

    const defaultProjectId = parseInt(urlParams.get("project_id"));

    setGhRedirect(urlParams.get("gh_oauth") !== null);
    urlParams.delete("gh_oauth");
    getProjects(defaultProjectId);
    getMetadata();

    if (err === "Wrong email for invite") {
      setShowWrongEmailModal(true);
    } else if (
      !hasFinishedOnboarding &&
      props.history.location.pathname &&
      !props.history.location.pathname.includes("onboarding")
    ) {
      setCurrentModal("RedirectToOnboardingModal");
    }

    return () => {
      setCanCreateProject(false);
    };
  }, []);

  // Hacky legacy shim for remote cluster refresh until Context is properly split
  useEffect(() => {
    if (shouldRefreshClusters) {
      setForceRefreshClusters(true);
      setShouldRefreshClusters(false);
    }
  }, [shouldRefreshClusters]);

  useEffect(() => {
    getMetadata();
    checkOnboarding();
  }, [props.currentProject?.id]);

  useEffect(() => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const err = urlParams.get("error");
    if (
      !hasFinishedOnboarding &&
      props.history.location.pathname &&
      !props.history.location.pathname.includes("onboarding") &&
      !props.history.location.pathname.includes("new-project") &&
      !props.history.location.pathname.includes("project-settings") &&
      err !== "Wrong email for invite"
    ) {
      setCurrentModal("RedirectToOnboardingModal");
    }
  }, [props.match.url]);

  const prevCurrentCluster: any = useRef();
  useEffect(() => {
    if (!prevCurrentCluster.current && props.currentCluster) {
      getMetadata();
    }

    // Store previous value (legacy retrofit)
    prevCurrentCluster.current = props.currentCluster;
  }, [props.currentCluster]);

  const projectOverlayCall = async () => {
    try {
      const projectList = await api
        .getProjects("<token>", {}, { id: user.userId })
        .then((res) => res.data as ProjectListType[]);

      if (!projectList) {
        setCurrentModal(null, null);
        return;
      }

      setProjects(projectList);
      if (!projectList.length) {
        setCurrentProject(null, () => {
          redirectToNewProject();
        });
      } else {
        const project = await api
          .getProject("<token>", {}, { id: projectList[0].id })
          .then((res) => res.data as ProjectType);

        setCurrentProject(project);
      }
      setCurrentModal(null, null);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async () => {
    if (currentProject?.id == null) {
      return;
    }

    localStorage.removeItem(currentProject.id + "-cluster");
    try {
      await api.updateOnboardingStep(
        "<token>",
        { step: "project-delete" },
        { project_id: currentProject.id }
      );
      await api.deleteProject("<token>", {}, { id: currentProject.id });
      projectOverlayCall();
    } catch (error) {
      console.log(error);
    }

    try {
      const res = await api.getClusters<
        Array<{
          infra_id?: number;
          name: string;
        }>
      >("<token>", {}, { id: currentProject?.id });

      const destroyInfraPromises = res.data.map(async (cluster) => {
        if (!cluster.infra_id) {
          return undefined;
        }

        return await api.destroyInfra(
          "<token>",
          {},
          { project_id: currentProject.id, infra_id: cluster.infra_id }
        );
      });

      await Promise.all(destroyInfraPromises);
    } catch (error) {
      console.log(error);
    }
    setCurrentModal(null, null);
    pushFiltered(props, "/dashboard", []);
  };

  const { cluster, baseRoute } = props.match.params as any;
  const { hasPaymentEnabled, refetchPaymentEnabled } =
    checkIfProjectHasPayment();
  const { plan } = useCustomerPlan();

  const isTrialExpired = (timestamp: string): boolean => {
    if (timestamp === "") {
      return true;
    }
    const timestampDate = dayjs(timestamp);
    return timestampDate.isBefore(dayjs(new Date()));
  };

  const showCardBanner = !hasPaymentEnabled;
  const trialExpired = plan && isTrialExpired(plan.trial_info.ending_before);

  return (
    <ThemeProvider
      theme={currentProject?.simplified_view_enabled ? midnight : standard}
    >
      <DeploymentTargetProvider>
        <StyledHome
          padTop={
            (!currentProject?.sandbox_enabled &&
              showCardBanner &&
              currentProject?.billing_enabled &&
              currentProject?.metronome_enabled &&
              !trialExpired &&
              plan &&
              true) ||
            currentProject?.freeze_enabled
          }
        >
          {!currentProject?.sandbox_enabled &&
            showCardBanner &&
            currentProject?.billing_enabled &&
            currentProject?.metronome_enabled && (
              <>
                {!trialExpired && plan && (
                  <GlobalBanner>
                    <i className="material-icons-round">warning</i>
                    Please
                    <Spacer width="5px" inline />
                    <Link
                      hasunderline
                      onClick={() => {
                        setShowBillingModal(true);
                      }}
                    >
                      connect a valid payment method
                    </Link>
                    . Your free trial is ending{" "}
                    {dayjs().to(dayjs(plan.trial_info.ending_before))}
                  </GlobalBanner>
                )}
              </>
            )}
          {currentProject?.freeze_enabled && (
            <GlobalBanner>
              <i className="material-icons-round">warning</i>
              This project has been disabled due to recurring issues with the
              connected payment method. Please contact support@porter.run to
              reenable this project.
            </GlobalBanner>
          )}
          {showBillingModal && (
            <BillingModal
              back={() => {
                setShowBillingModal(false);
              }}
              onCreate={async () => {
                setShowBillingModal(false);
                window.location.reload();
              }}
            />
          )}
          <ModalHandler setRefreshClusters={setForceRefreshClusters} />
          {currentOverlay &&
            createPortal(
              <ConfirmOverlay
                show={true}
                message={currentOverlay.message}
                onYes={currentOverlay.onYes}
                onNo={currentOverlay.onNo}
              />,
              document.body
            )}
          {/* Render sidebar when there's at least one project */}
          {projects?.length > 0 && baseRoute !== "new-project" && (
            <Sidebar
              key="sidebar"
              forceSidebar={forceSidebar}
              setWelcome={setShowWelcome}
              currentView={props.currentRoute}
              forceRefreshClusters={forceRefreshClusters}
              setRefreshClusters={setForceRefreshClusters}
            />
          )}
          <ViewWrapper id="HomeViewWrapper">
            <Navbar
              logOut={props.logOut}
              currentView={props.currentRoute} // For form feedback
            />

            <Switch>
              <Route path="/addons/new">
                {currentProject?.capi_provisioner_enabled &&
                currentProject?.simplified_view_enabled &&
                currentProject?.beta_features_enabled ? (
                  <AddonTemplates />
                ) : (
                  <LegacyNewAddOnFlow />
                )}
              </Route>
              <Route path="/addons/:addonName/:tab">
                <AddonView />
              </Route>
              <Route path="/addons/:addonName">
                <AddonView />
              </Route>
              <Route path="/addons">
                {currentProject?.capi_provisioner_enabled &&
                currentProject?.simplified_view_enabled &&
                currentProject?.beta_features_enabled ? (
                  <AddonDashboard />
                ) : (
                  <LegacyAddOnDashboard />
                )}
              </Route>
              <Route
                path="/new-project"
                render={() => {
                  return <NewProjectFC />;
                }}
              ></Route>
              <Route
                path="/ory"
                render={() => {
                  if (user.isPorterUser) {
                    return <OryLogin authenticate={authenticate} />;
                  } else {
                    return <Redirect to="/dashboard" />;
                  }
                }}
              ></Route>
              <Route
                path="/onboarding"
                render={() => {
                  return <Onboarding />;
                }}
              />
              <Route
                path="/dashboard"
                render={() => {
                  return (
                    <DashboardWrapper>
                      <Dashboard
                        projectId={currentProject?.id}
                        setRefreshClusters={setForceRefreshClusters}
                      />
                    </DashboardWrapper>
                  );
                }}
              />
              <Route
                path={[
                  "/cluster-dashboard",
                  "/applications",
                  "/jobs",
                  "/env-groups",
                  "/datastores",
                  "/stacks",
                  "/preview-environments",
                ]}
                render={() => {
                  if (currentCluster?.id === -1) {
                    return <Loading />;
                  } else if (!currentCluster?.name) {
                    return (
                      <DashboardWrapper>
                        <NoClusterPlaceHolder></NoClusterPlaceHolder>
                      </DashboardWrapper>
                    );
                  }
                  return (
                    <DashboardWrapper>
                      <DashboardRouter
                        currentCluster={currentCluster}
                        setSidebar={setForceSidebar}
                        currentView={props.currentRoute}
                      />
                    </DashboardWrapper>
                  );
                }}
              />
              <Route
                path={"/integrations"}
                render={() => <GuardedIntegrations />}
              />
              <Route
                exact
                path={"/project-settings"}
                render={() => <GuardedProjectSettings />}
              />
              <Route path={"*"} render={() => <LaunchWrapper />} />
            </Switch>
          </ViewWrapper>
          {createPortal(
            <ConfirmOverlay
              show={currentModal === "UpdateProjectModal"}
              message={
                currentProject
                  ? `Are you sure you want to delete ${currentProject.name}?`
                  : ""
              }
              onYes={handleDelete}
              onNo={() => {
                setCurrentModal(null, null);
              }}
            />,
            document.body
          )}
          {showWrongEmailModal && (
            <Modal>
              <Text size={16}>
                Oops! This invite link wasn't for {user?.email}
              </Text>
              <Spacer y={1} />
              <Text color="helper">
                Your account email does not match the email associated with this
                project invite. Please log out and sign up again with the
                correct email using the invite link.
              </Text>
              <Spacer y={1} />
              <Text color="helper">
                You should reach out to the person who sent you the invite link
                to get the correct email.
              </Text>
              <Spacer y={1} />
              <Button onClick={props.logOut}>Log out</Button>
            </Modal>
          )}
        </StyledHome>
      </DeploymentTargetProvider>
    </ThemeProvider>
  );
};

export default withRouter(withAuth(Home));

const GlobalBanner = styled.div`
  width: 100vw;
  z-index: 999;
  padding: 20px;
  position: fixed;
  top: 0;
  color: #fefefe;
  left: 0;
  height: 35px;
  background: #4752ba;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;

  > img {
    height: 16px;
    margin-right: 10px;
  }

  > i {
    margin-right: 10px;
    font-size: 16px;
    opacity: 0.8;
  }
`;

const ViewWrapper = styled.div`
  height: 100%;
  width: 100vw;
  padding: 45px;
  display: flex;
  flex: 1;
  overflow-y: auto;
  justify-content: center;
  background: ${(props) => props.theme.bg};
  position: relative;
`;

const CTA = styled.div`
  margin-left: 30px;
`;

const DashboardWrapper = styled.div`
  width: 100%;
  min-width: 300px;
  height: fit-content;
`;

const StyledHome = styled.div<{
  padTop: boolean | null | undefined;
}>`
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  margin: 0;
  padding-top: ${(props) => (props.padTop ? "35px" : "0")};
  user-select: none;
  display: flex;
  justify-content: center;

  @keyframes floatInModal {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const DiscordButton = styled.a`
  position: absolute;
  z-index: 1;
  text-decoration: none;
  bottom: 17px;
  display: flex;
  align-items: center;
  width: 170px;
  left: 15px;
  border: 2px solid #ffffff44;
  border-radius: 3px;
  color: #ffffff44;
  height: 40px;
  font-family:
    Work Sans,
    sans-serif;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  :hover {
    > img {
      opacity: 60%;
    }
    color: #ffffff88;
    border-color: #ffffff88;
  }
`;

const Icon = styled.img`
  height: 25px;
  width: 25px;
  opacity: 30%;
  margin-left: 7px;
  margin-right: 5px;
`;
