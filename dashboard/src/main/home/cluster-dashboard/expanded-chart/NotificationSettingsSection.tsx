import React, { useContext, useState, useEffect } from "react";
import Heading from "../../../../components/form-components/Heading";
import CheckboxRow from "../../../../components/form-components/CheckboxRow";
import Helper from "../../../../components/form-components/Helper";
import SaveButton from "../../../../components/SaveButton";
import api from "../../../../shared/api";
import { Context } from "../../../../shared/Context";
import { ChartType } from "../../../../shared/types";
import Loading from "../../../../components/Loading";

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
        {
        },
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
      {initLoading ? (
        <Loading />
      ) : !hasRelease ? (
        <Heading>
          This message appears when the release isn't in the database, so Porter
          can't laod in notifications for it
        </Heading>
      ) : (
        <>
          {hasNotifications != null && !hasNotifications && (
            <Helper>
              This message appears when there are no notification integrations
              for the project
            </Helper>
          )}
          <CheckboxRow
            label={"Notifications Enabled"}
            checked={notificationsOn}
            toggle={() => setNotificationsOn(!notificationsOn)}
            disabled={props.disabled}
          />
          {notificationsOn && (
            <>
              <Helper>Send notifications on:</Helper>
              {Object.entries(categories).map(([k, v]: [string, boolean]) => {
                return (
                  <React.Fragment key={k}>
                    <CheckboxRow
                      label={k}
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
              })}
            </>
          )}
          <SaveButton
            onClick={() => saveChanges()}
            text={"Save Changes"}
            clearPosition={true}
            statusPosition={"right"}
            disabled={props.disabled || initLoading || saveLoading}
            status={
              saveLoading ? "loading" : numSaves > 0 ? "successful" : null
            }
            saveText={"Saving . . ."}
          />
        </>
      )}
    </>
  );
};

export default NotificationSettingsSection;
