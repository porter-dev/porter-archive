import React, { useContext, useState, useEffect } from "react";
import Heading from "components/form-components/Heading";
import CheckboxRow from "components/form-components/CheckboxRow";
import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType } from "shared/types";
import Loading from "components/Loading";
import Banner from "components/Banner";
import styled from "styled-components";

const NOTIF_CATEGORIES = ["success", "fail"];

interface Props {
  disabled?: boolean;
  currentChart: ChartType;
}

const NotificationSettingsSection: React.FC<Props> = (props) => {
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [categories, setCategories] = useState(
    NOTIF_CATEGORIES.reduce((p, c) => {
      return {
        ...p,
        [c]: true,
      };
    }, {})
  );
  const [initLoading, setInitLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [numSaves, setNumSaves] = useState(0);
  const [hasNotifications, setHasNotifications] = useState(null);
  const [hasRelease, setHasRelease] = useState(true);

  const { currentProject, currentCluster } = useContext(Context);

  useEffect(() => {
    api
      .getNotificationConfig(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          namespace: props.currentChart.namespace,
          cluster_id: currentCluster.id,
          name: props.currentChart.name,
        }
      )
      .then(({ data }) => {
        setNotificationsOn(data.enabled);
        delete data.enabled;
        setCategories({
          success: data.success,
          failure: data.failure,
        });
        setInitLoading(false);
      })
      .catch(() => {
        setHasRelease(false);
        setInitLoading(false);
      });
    api
      .getSlackIntegrations(
        "<token>",
        {},
        {
          id: currentProject.id,
        }
      )
      .then(({ data }) => {
        setHasNotifications(data.length > 0);
      });
  }, []);

  const saveChanges = () => {
    setSaveLoading(true);
    let payload = {
      enabled: notificationsOn,
      ...categories,
    };

    api
      .updateNotificationConfig(
        "<token>",
        {
          payload,
        },
        {
          project_id: currentProject.id,
          namespace: props.currentChart.namespace,
          cluster_id: currentCluster.id,
          name: props.currentChart.name,
        }
      )
      .then(() => {
        setNumSaves(numSaves + 1);
        setSaveLoading(false);
      })
      .catch(() => {
        setHasRelease(false);
        setSaveLoading(false);
      });
  };

  return (
    <>
      <Heading>Notification Settings</Heading>
      <Helper>Configure notification settings for this application.</Helper>
      {initLoading ? (
        <Loading />
      ) : !hasRelease ? (
        <Banner type="error">
          Notifications unavailable. Porter could not find this application in
          the database.
        </Banner>
      ) : (
        <>
          {hasNotifications != null && !hasNotifications ? (
            <Banner type="warning">
              No integration has been set up for notifications.{" "}
              <A
                href={`${window.location.protocol}//${window.location.host}/integrations/slack`}
              >
                Connect to Slack
              </A>
            </Banner>
          ) : (
            <>
              <CheckboxRow
                label={"Enable notifications"}
                checked={notificationsOn}
                toggle={() => setNotificationsOn(!notificationsOn)}
                disabled={props.disabled}
              />
              {notificationsOn && (
                <>
                  <Helper>Send notifications on:</Helper>
                  {Object.entries(categories).map(
                    ([k, v]: [string, boolean]) => {
                      return (
                        <React.Fragment key={k}>
                          <CheckboxRow
                            label={`Deploy ${k}`}
                            checked={v}
                            toggle={() =>
                              setCategories((prev) => {
                                return {
                                  ...prev,
                                  [k]: !v,
                                };
                              })
                            }
                            disabled={props.disabled}
                          />
                        </React.Fragment>
                      );
                    }
                  )}
                </>
              )}
              <br />
              <SaveButton
                onClick={() => saveChanges()}
                text="Save Notification Settings"
                clearPosition={true}
                statusPosition={"right"}
                disabled={props.disabled || initLoading || saveLoading}
                status={
                  saveLoading ? "loading" : numSaves > 0 ? "successful" : null
                }
                saveText={"Saving . . ."}
              />
              <Br />
            </>
          )}
        </>
      )}
    </>
  );
};

export default NotificationSettingsSection;

const A = styled.a`
  text-decoration: underline;
  cursor: pointer;
  margin-left: 5px;
`;

const Br = styled.div`
  width: 100%;
  height: 10px;
`;
