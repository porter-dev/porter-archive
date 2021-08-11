import React, { useState } from "react";
import Heading from "../../../../components/form-components/Heading";
import CheckboxRow from "../../../../components/form-components/CheckboxRow";
import Helper from "../../../../components/form-components/Helper";
import SaveButton from "../../../../components/SaveButton";

const NOTIF_CATEGORIES = ["deploy", "success", "fail"];

interface Props {
  disabled?: boolean;
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
        onClick={() => {}}
        text={"Save Changes"}
        clearPosition={true}
        statusPosition={"right"}
        disabled={props.disabled}
      />
    </>
  );
};

export default NotificationSettingsSection;
