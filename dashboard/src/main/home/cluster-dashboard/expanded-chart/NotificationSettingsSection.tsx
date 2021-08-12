import React, { useContext, useState } from "react";
import Heading from "../../../../components/form-components/Heading";
import CheckboxRow from "../../../../components/form-components/CheckboxRow";
import Helper from "../../../../components/form-components/Helper";
import SaveButton from "../../../../components/SaveButton";
import api from "../../../../shared/api";
import { Context } from "../../../../shared/Context";
import { ChartType } from "../../../../shared/types";

const NOTIF_CATEGORIES = ["deploy", "success", "fail"];

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

  const { currentProject, currentCluster } = useContext(Context);

  const saveChanges = () => {
    let payload = {
      enabled: notificationsOn,
      deploy: notificationsOn,
      ...categories,
    };

    api
      .updateNotificationConfig(
        "<token>",
        {
          payload: JSON.stringify(payload),
          namespace: props.currentChart.namespace,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          name: props.currentChart.name,
        }
      )
      .then((data) => {
        console.log(data);
      });
  };

  return (
    <>
      <Heading>Notification Settings</Heading>
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
        disabled={props.disabled}
      />
    </>
  );
};

export default NotificationSettingsSection;
